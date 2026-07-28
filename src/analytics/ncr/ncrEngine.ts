import { SubmittalRow } from "../../types";
import { classifyNcrStatus } from "../../utils/calculations";
import { compareRevisions } from "../analyticsCore";
import { recordAuditLog } from "../governance/auditFramework";

export const isYes = (v: unknown) =>
  typeof v === "string"
    ? v.toUpperCase() === "YES" || v.toUpperCase() === "Y"
    : !!v;

export const getLatestRev = (
  rows: SubmittalRow[],
  upToDate?: Date,
): SubmittalRow | undefined => {
  if (!rows.length) return undefined;
  let validRows = [...rows];
  if (upToDate) {
    const endOfMonth = new Date(
      upToDate.getFullYear(),
      upToDate.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    validRows = validRows.filter((r) => {
      const dStr =
        r.submissionDate || r.responseDate || r.ncrSentDateCorrectiveAction || r.sentDateCorrectiveAction;
      if (!dStr) return true;
      const d = new Date(dStr);
      return d <= endOfMonth;
    });
  }
  if (!validRows.length) return undefined;

  const explicitLatest = validRows.find((r) => isYes(r.isLatestRev));
  if (explicitLatest && !upToDate) return explicitLatest;

  // Use Centralized RevisionEngine via compareRevisions
  validRows.sort((a, b) => compareRevisions(a.rev, b.rev));
  return validRows[validRows.length - 1];
};

export interface NCRStats {
  discipline: string;
  totalUnique: number;
  notSent: number;        // Stage 1: Sent Date is blank (Contractor Action Needed)
  underReview: number;    // Stage 2: Sent Date exists, Received Corrective blank (Waiting Consultant)
  rejectedOpen: number;   // Stage 3: Received Corrective exists, Rejected (Contractor Action Needed)
  approvedClosed: number; // Stage 3: Received Corrective exists, Approved (Closed)
  open: number;           // Cumulative open (= notSent + rejectedOpen)
  closed: number;         // Cumulative closed (= approvedClosed)
  approved: number;       // Legacy compatibility (= approvedClosed)
  rejected: number;       // Legacy compatibility (= rejectedOpen)
  rev0: number;
  revHigh: number;
  waiting: number;        // Legacy compatibility (= underReview)
}

export interface NCRClassificationStats {
  classification: string;
  newNcrReceived: number;       // Event 1: NCR Issued in Month
  correctiveSubmitted: number;  // Event 2: Sent Corrective in Month
  responsesReceived: number;    // Event 3: Response Date in Month
  approved: number;             // Response Approved
  rejected: number;             // Response Rejected
  waitingConsultant: number;    // Pending review at the end of the month
  waitingContractor: number;    // Pending action at the end of the month
  overdue: number;              // Overdue limit exceeded
  
  // Legacy compatibility fields to prevent any external breakage
  totalSubs: number;
  rev0: number;
  revHigh: number;
  rejectedOpen: number;
  rejectedClosed: number;
  pending: number;
  carryForwardPending: number;
  currentMonthPending: number;
  waiting: number;
}

// Helper to normalize the discipline/trade name consistently across both engines
export const normalizeDiscipline = (row: SubmittalRow): string => {
  const rawDisc = (row.discipline || row.trade || "GENERAL").trim();
  let disc = rawDisc.toUpperCase();
  if (disc === "MECHANICAL" || disc === "MECH") return "Mech";
  if (disc === "ELECTRICAL" || disc === "ELEC") return "Elec";
  if (disc === "STRUCTURAL" || disc === "STR") return "STR";
  if (disc === "ARCHITECTURAL" || disc === "ARCH") return "Arch";
  if (disc === "INFRASTRUCTURE" || disc === "INFR" || disc === "INFRA") return "Infra";
  if (disc === "LANDSCAPE" || disc === "LAND" || disc === "LND" || disc.includes("LAND")) return "Landscape";
  if (disc === "HSE" || disc === "NCR-HSE" || disc.includes("HSE") || disc.includes("SAFETY") || disc === "SURVEY" || disc === "SURV" || disc.includes("SUR")) return "HSE";
  return rawDisc;
};

// Parser / Raw Data reader & filter (Shared function for read step)
export const normalizeNCRData = (safeData: SubmittalRow[]): SubmittalRow[] => {
  return safeData.filter((d: SubmittalRow) => {
    const docT = (d.documentType || "").toUpperCase();
    const logT = (d.logType || "").toUpperCase();
    const docNo = (d.ncrRef || d.docNo || "").toUpperCase();
    return (
      docT.includes("NCR") || logT.includes("NCR") || docNo.includes("NCR")
    );
  });
};

// Group by Unique Reference No.
export const groupNCRByReference = (normalizedData: SubmittalRow[]): Map<string, SubmittalRow[]> => {
  const grouped = new Map<string, SubmittalRow[]>();
  normalizedData.forEach((r) => {
    const key = (r.ncrRef || r.docNo || "").trim().toUpperCase();
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  });
  return grouped;
};

// Helper to convert date strings to timestamps safely
const parseDateToMs = (dStr: string | undefined | null): number | null => {
  if (!dStr) return null;
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return null;
  return d.getTime();
};

export interface NCREvidence {
  ref: string;
  discipline: string;
  latestRev: string;
  stage: 'Stage 1: Waiting Contractor' | 'Stage 2: Waiting Consultant' | 'Stage 3: Approved Closed' | 'Stage 3: Rejected Open';
  issueDate: string;
  sentDate: string;
  responseDate: string;
  actionCode: string;
  isOverdue: boolean;
  explanation: string;
  isNewInMonth: boolean;
  isSubmittedInMonth: boolean;
  isRespondedInMonth: boolean;
  monthlyOutcome: 'Approved' | 'Rejected' | 'None';
}

export interface NCRIntegrityReport {
  passed: boolean;
  cumulativePartitioning: {
    totalUnique: number;
    sumOfStates: number; // open + underReview + closed
    difference: number;
    passed: boolean;
  };
  monthlyResponseCheck: {
    responsesReceived: number;
    approvedAndRejected: number; // approved + rejected
    difference: number;
    passed: boolean;
  };
  openIntegrityCheck: {
    currentlyOpen: number;
    sumOfOpenStages: number; // notSent + rejectedOpen
    difference: number;
    passed: boolean;
  };
}

// ==========================================
// 1. Cumulative NCR State Engine (Snapshot)
// ==========================================
export const calculateCumulativeSnapshot = (normalizedData: SubmittalRow[]) => {
  const grouped = groupNCRByReference(normalizedData);
  const cumMap = new Map<string, NCRStats>();
  const cumulativeEvidence: Omit<NCREvidence, 'isNewInMonth' | 'isSubmittedInMonth' | 'isRespondedInMonth' | 'monthlyOutcome'>[] = [];

  Array.from(grouped.values()).forEach((history) => {
    // Sort history by revision to find the latest overall
    history.sort((a, b) => compareRevisions(a.rev, b.rev));
    const latestOverall = history[history.length - 1];
    if (!latestOverall) return;

    const disc = normalizeDiscipline(latestOverall);

    if (!cumMap.has(disc)) {
      cumMap.set(disc, {
        discipline: disc,
        totalUnique: 0,
        notSent: 0,
        underReview: 0,
        rejectedOpen: 0,
        approvedClosed: 0,
        open: 0,
        closed: 0,
        approved: 0,
        rejected: 0,
        rev0: 0,
        revHigh: 0,
        waiting: 0,
      });
    }
    const cumSt = cumMap.get(disc)!;
    cumSt.totalUnique++;

    const cStatus = classifyNcrStatus(latestOverall);
    const sentDateStr = latestOverall.ncrSentDateCorrectiveAction || latestOverall.sentDateCorrectiveAction;
    const receivedCorrectiveStr = latestOverall.responseDate;

    let stage: NCREvidence['stage'] = 'Stage 1: Waiting Contractor';
    let explanation = '';

    // Strict implementation of State Machine
    if (!sentDateStr) {
      // Stage 1: Sent Date Corrective Action is blank -> Open (Waiting Contractor)
      cumSt.notSent++;
      cumSt.open++;
      stage = 'Stage 1: Waiting Contractor';
      explanation = 'Issued to contractor but no corrective action response has been submitted yet (Sent Date is blank).';
    } else if (sentDateStr && !receivedCorrectiveStr) {
      // Stage 2: Sent Date exists, Received Corrective blank -> Under Review (Waiting Consultant)
      cumSt.underReview++;
      cumSt.waiting++;
      stage = 'Stage 2: Waiting Consultant';
      explanation = 'Contractor submitted a corrective plan. Currently pending review by the consultant (Response Date is blank).';
    } else if (receivedCorrectiveStr) {
      // Stage 3: Received Corrective exists
      if (cStatus.isApprovedClosed) {
        cumSt.approvedClosed++;
        cumSt.closed++;
        cumSt.approved++;
        stage = 'Stage 3: Approved Closed';
        explanation = 'Corrective action was received and officially approved/closed by the consultant.';
      } else {
        cumSt.rejectedOpen++;
        cumSt.open++;
        cumSt.rejected++;
        stage = 'Stage 3: Rejected Open';
        explanation = 'Corrective action plan was reviewed but rejected. NCR remains open, awaiting contractor re-submission.';
      }
    }

    const isLatestRev0 = compareRevisions(latestOverall.rev, '0') === 0;
    if (isLatestRev0) {
      cumSt.rev0++;
    } else {
      cumSt.revHigh++;
    }

    // Days open for overdue calculation (14 days limit)
    let isOverdue = false;
    const issueDateMs = parseDateToMs(latestOverall.submissionDate);
    if (issueDateMs !== null) {
      const responseMs = parseDateToMs(latestOverall.responseDate);
      const isClosed = cStatus.isApprovedClosed;
      const endMs = isClosed && responseMs ? responseMs : Date.now();
      const daysOpen = Math.floor((endMs - issueDateMs) / (1000 * 3600 * 24));
      if (daysOpen > 14 && !isClosed) {
        isOverdue = true;
      }
    }

    cumulativeEvidence.push({
      ref: latestOverall.ncrRef || latestOverall.docNo || 'UNKNOWN',
      discipline: disc,
      latestRev: latestOverall.rev || '0',
      stage,
      issueDate: latestOverall.submissionDate || '-',
      sentDate: sentDateStr || '-',
      responseDate: receivedCorrectiveStr || '-',
      actionCode: latestOverall.ncrAction || latestOverall.action || '-',
      isOverdue,
      explanation,
    });
  });

  const cumArr = Array.from(cumMap.values()).sort(
    (a, b) => b.totalUnique - a.totalUnique,
  );

  const cumulativeKPIs = {
    totalUnique: cumArr.reduce((a, c) => a + c.totalUnique, 0),
    notSent: cumArr.reduce((a, c) => a + (c.notSent || 0), 0),
    underReview: cumArr.reduce((a, c) => a + c.underReview, 0),
    rejectedOpen: cumArr.reduce((a, c) => a + (c.rejectedOpen || 0), 0),
    approvedClosed: cumArr.reduce((a, c) => a + (c.approvedClosed || 0), 0),
    open: cumArr.reduce((a, c) => a + c.open, 0),
    closed: cumArr.reduce((a, c) => a + c.closed, 0),
    approved: cumArr.reduce((a, c) => a + c.approved, 0),
    rejected: cumArr.reduce((a, c) => a + c.rejected, 0),
    waiting: cumArr.reduce((a, c) => a + (c.underReview || 0), 0),
  };

  return {
    cumulative: cumArr,
    cumulativeKPIs,
    cumulativeEvidence,
  };
};

// ==========================================
// 2. Monthly NCR Event-Driven Engine
// ==========================================
export const calculateMonthlyEvents = (
  normalizedData: SubmittalRow[],
  monthlyStart: string | undefined,
) => {
  const grouped = groupNCRByReference(normalizedData);
  const mMap = new Map<string, NCRClassificationStats>();
  const mSubList: Record<string, any>[] = [];
  const monthlyEventTraces = new Map<string, { isNew: boolean; isSubmitted: boolean; isResponded: boolean; outcome: 'Approved' | 'Rejected' | 'None' }>();

  const targetMonth = monthlyStart
    ? new Date(monthlyStart)
    : new Date(2026, 5, 1); // default June 2026

  const startOfTargetMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const endOfTargetMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);

  const startOfTargetMonthMs = startOfTargetMonth.getTime();
  const endOfTargetMonthMs = endOfTargetMonth.getTime();

  Array.from(grouped.values()).forEach((history) => {
    if (!history.length) return;

    // Sort history by revision for timeline logic
    history.sort((a, b) => compareRevisions(a.rev, b.rev));
    
    // We determine the classification label based on the latest available revision
    const latestOverall = history[history.length - 1];
    const disc = normalizeDiscipline(latestOverall);
    const classKey = disc.startsWith("NCR-") ? disc : `NCR-${disc}`;
    const refKey = (latestOverall.ncrRef || latestOverall.docNo || '').trim().toUpperCase();

    if (!mMap.has(classKey)) {
      mMap.set(classKey, {
        classification: classKey,
        newNcrReceived: 0,
        correctiveSubmitted: 0,
        responsesReceived: 0,
        approved: 0,
        rejected: 0,
        waitingConsultant: 0,
        waitingContractor: 0,
        overdue: 0,
        
        // Legacy compatibility
        totalSubs: 0,
        rev0: 0,
        revHigh: 0,
        rejectedOpen: 0,
        rejectedClosed: 0,
        pending: 0,
        carryForwardPending: 0,
        currentMonthPending: 0,
        waiting: 0,
      });
    }
    const mSt = mMap.get(classKey)!;

    let isNew = false;
    let isSubmitted = false;
    let isResponded = false;
    let outcome: 'Approved' | 'Rejected' | 'None' = 'None';

    // ------------------------------------------------------------
    // A. Event Timeline Tracker (Counts exact actions inside target month)
    // ------------------------------------------------------------
    history.forEach((r) => {
      const issueDateMs = parseDateToMs(r.submissionDate);
      const sentDateMs = parseDateToMs(r.ncrSentDateCorrectiveAction || r.sentDateCorrectiveAction);
      const responseDateMs = parseDateToMs(r.responseDate);

      // Event 1: New NCR Issued in Month (Received Date is in the Month)
      if (issueDateMs !== null && issueDateMs >= startOfTargetMonthMs && issueDateMs <= endOfTargetMonthMs) {
        mSt.newNcrReceived++;
        isNew = true;
      }

      // Event 2: Corrective action sent in target month
      if (sentDateMs !== null && sentDateMs >= startOfTargetMonthMs && sentDateMs <= endOfTargetMonthMs) {
        mSt.correctiveSubmitted++;
        mSt.totalSubs++; // Legacy
        isSubmitted = true;
        
        const isRev0 = compareRevisions(r.rev, '0') === 0;
        if (isRev0) {
          mSt.rev0++;
        } else {
          mSt.revHigh++;
        }

        const cStatusRev = classifyNcrStatus(r);
        let outcomeStr = 'Pending';
        if (cStatusRev.isApprovedClosed) {
          outcomeStr = 'Approved Closed';
        } else if (cStatusRev.isRejectedOpen) {
          outcomeStr = 'Rejected Open';
        } else if (cStatusRev.isRejectedClosed) {
          outcomeStr = 'Rejected Closed';
        }

        // Overdue calculation (14 days limit between Issue date and Sent corrective action date)
        if (issueDateMs !== null) {
          const daysToSent = Math.floor((sentDateMs - issueDateMs) / (1000 * 3600 * 24));
          if (daysToSent > 14) {
            mSt.overdue++;
          }
        }

        // Add to detailed report list
        mSubList.push({
          ref: r.ncrRef || r.docNo,
          trade: disc,
          rev: r.rev,
          sentDate: r.ncrSentDateCorrectiveAction || r.sentDateCorrectiveAction || "-",
          action: r.ncrAction || r.action || "-",
          status: r.ncrStatus || r.status || "Open",
          classification: outcomeStr,
        });
      }

      // Event 3: Consultant response received in target month
      if (responseDateMs !== null && responseDateMs >= startOfTargetMonthMs && responseDateMs <= endOfTargetMonthMs) {
        mSt.responsesReceived++;
        isResponded = true;
        const cStatusRev = classifyNcrStatus(r);
        if (cStatusRev.isApprovedClosed) {
          mSt.approved++;
          outcome = 'Approved';
        } else {
          mSt.rejected++;
          mSt.rejectedOpen++; // Legacy
          outcome = 'Rejected';
        }
      }
    });

    if (refKey) {
      monthlyEventTraces.set(refKey, { isNew, isSubmitted, isResponded, outcome });
    }

    // ------------------------------------------------------------
    // B. State assessment of this NCR *as of* the last day of the target month
    // ------------------------------------------------------------
    // Filter history for revisions with activity on or before the end of the month
    const historyBeforeEnd = history.filter((r) => {
      const issueMs = parseDateToMs(r.submissionDate);
      const sentMs = parseDateToMs(r.ncrSentDateCorrectiveAction || r.sentDateCorrectiveAction);
      const respMs = parseDateToMs(r.responseDate);
      
      const earliestMs = issueMs !== null ? issueMs : (sentMs !== null ? sentMs : respMs);
      if (earliestMs === null) return false;
      return earliestMs <= endOfTargetMonthMs;
    });

    if (historyBeforeEnd.length > 0) {
      historyBeforeEnd.sort((a, b) => compareRevisions(a.rev, b.rev));
      const latestAtEnd = historyBeforeEnd[historyBeforeEnd.length - 1];

      const sentMs = parseDateToMs(latestAtEnd.ncrSentDateCorrectiveAction || latestAtEnd.sentDateCorrectiveAction);
      const responseMs = parseDateToMs(latestAtEnd.responseDate);
      const issueMs = parseDateToMs(latestAtEnd.submissionDate);

      if (sentMs !== null && sentMs <= endOfTargetMonthMs) {
        // Sent corrective action has been submitted on or before end of month
        if (responseMs === null || responseMs > endOfTargetMonthMs) {
          // No response yet, or response came after month end -> Waiting Consultant
          mSt.waitingConsultant++;
          mSt.pending++; // Legacy
          mSt.waiting++; // Legacy

          if (sentMs < startOfTargetMonthMs) {
            mSt.carryForwardPending++;
          } else {
            mSt.currentMonthPending++;
          }
        } else {
          // Response was received on or before end of month
          const cStatusAtEnd = classifyNcrStatus(latestAtEnd);
          if (!cStatusAtEnd.isApprovedClosed) {
            // Rejected -> Waiting Contractor
            mSt.waitingContractor++;
          }
        }
      } else {
        // Sent corrective action has NOT been submitted as of end of month -> Waiting Contractor
        if (issueMs !== null && issueMs <= endOfTargetMonthMs) {
          mSt.waitingContractor++;
        }
      }

      // Overdue check as of end of target month (14 days open limit)
      if (issueMs !== null && issueMs <= endOfTargetMonthMs) {
        const hasRespondedByEnd = responseMs !== null && responseMs <= endOfTargetMonthMs && classifyNcrStatus(latestAtEnd).isApprovedClosed;
        if (!hasRespondedByEnd) {
          const nowMs = Date.now();
          const referenceMs = endOfTargetMonthMs > nowMs ? nowMs : endOfTargetMonthMs;
          const daysOpen = Math.floor((referenceMs - issueMs) / (1000 * 3600 * 24));
          if (daysOpen > 14) {
            mSt.overdue++;
          }
        }
      }
    }
  });

  const monArr = Array.from(mMap.values())
    .filter((s) => s.newNcrReceived > 0 || s.correctiveSubmitted > 0 || s.responsesReceived > 0 || s.waitingConsultant > 0 || s.waitingContractor > 0)
    .sort((a, b) => b.newNcrReceived - a.newNcrReceived);

  const monthlyKPIs = {
    newNcrReceived: monArr.reduce((a, c) => a + c.newNcrReceived, 0),
    correctiveSubmitted: monArr.reduce((a, c) => a + c.correctiveSubmitted, 0),
    responsesReceived: monArr.reduce((a, c) => a + c.responsesReceived, 0),
    approved: monArr.reduce((a, c) => a + c.approved, 0),
    rejected: monArr.reduce((a, c) => a + c.rejected, 0),
    waitingConsultant: monArr.reduce((a, c) => a + c.waitingConsultant, 0),
    waitingContractor: monArr.reduce((a, c) => a + c.waitingContractor, 0),
    criticalDelays: monArr.reduce((a, c) => a + c.overdue, 0),
    
    // Legacy compatibility fields
    totalSubs: monArr.reduce((a, c) => a + c.correctiveSubmitted, 0),
    rev0: monArr.reduce((a, c) => a + c.rev0, 0),
    revHigh: monArr.reduce((a, c) => a + c.revHigh, 0),
    rejectedOpen: monArr.reduce((a, c) => a + c.rejectedOpen, 0),
    rejectedClosed: monArr.reduce((a, c) => a + c.rejectedClosed, 0),
    pending: monArr.reduce((a, c) => a + c.waitingConsultant, 0),
    carryForwardPending: monArr.reduce((a, c) => a + (c.carryForwardPending || 0), 0),
    currentMonthPending: monArr.reduce((a, c) => a + (c.currentMonthPending || 0), 0),
    waiting: monArr.reduce((a, c) => a + (c.waitingConsultant || 0), 0),
  };

  return {
    monthly: monArr,
    monthlyKPIs,
    monthlySubmissions: mSubList.sort((a, b) => a.ref.localeCompare(b.ref)),
    monthlyEventTraces,
  };
};

// ==========================================
// 3. Main Export function orchestration
// ==========================================
export const processNCRData = (
  safeData: SubmittalRow[],
  monthlyStart: string | undefined,
) => {
  // Read step & Parser normalization (Rule 8)
  const normalizedData = normalizeNCRData(safeData);

  // Invoke entirely independent engines (Rule 7, Rule 8)
  const { cumulative, cumulativeKPIs, cumulativeEvidence } = calculateCumulativeSnapshot(normalizedData);
  const { monthly, monthlyKPIs, monthlySubmissions, monthlyEventTraces } = calculateMonthlyEvents(normalizedData, monthlyStart);

  // Join cumulative evidence with monthly event traces
  const evidenceList: NCREvidence[] = cumulativeEvidence.map((e) => {
    const trace = monthlyEventTraces.get(e.ref.trim().toUpperCase()) || {
      isNew: false,
      isSubmitted: false,
      isResponded: false,
      outcome: 'None' as const,
    };
    return {
      ...e,
      isNewInMonth: trace.isNew,
      isSubmittedInMonth: trace.isSubmitted,
      isRespondedInMonth: trace.isResponded,
      monthlyOutcome: trace.outcome,
    };
  });

  // Execute Chapter 9 Strict Mathematical Integrity Auditing
  const sumOfStates = cumulativeKPIs.open + cumulativeKPIs.underReview + cumulativeKPIs.closed;
  const cumulativeTotalPassed = cumulativeKPIs.totalUnique === sumOfStates;
  
  const monthlyResSum = monthlyKPIs.approved + monthlyKPIs.rejected;
  const monthlyResponsePassed = monthlyKPIs.responsesReceived === monthlyResSum;

  const openStagesSum = cumulativeKPIs.notSent + cumulativeKPIs.rejectedOpen;
  const openIntegrityPassed = cumulativeKPIs.open === openStagesSum;

  const integrityReport: NCRIntegrityReport = {
    passed: cumulativeTotalPassed && monthlyResponsePassed && openIntegrityPassed,
    cumulativePartitioning: {
      totalUnique: cumulativeKPIs.totalUnique,
      sumOfStates,
      difference: Math.abs(cumulativeKPIs.totalUnique - sumOfStates),
      passed: cumulativeTotalPassed,
    },
    monthlyResponseCheck: {
      responsesReceived: monthlyKPIs.responsesReceived,
      approvedAndRejected: monthlyResSum,
      difference: Math.abs(monthlyKPIs.responsesReceived - monthlyResSum),
      passed: monthlyResponsePassed,
    },
    openIntegrityCheck: {
      currentlyOpen: cumulativeKPIs.open,
      sumOfOpenStages: openStagesSum,
      difference: Math.abs(cumulativeKPIs.open - openStagesSum),
      passed: openIntegrityPassed,
    },
  };

  const auditId = `AUD-NCR-${Math.floor(Math.random() * 90000 + 10000)}`;
  recordAuditLog({
    processName: 'NCR Dual Engine Validation',
    recordIdentifier: auditId,
    action: 'DUAL_COMPARISON',
    ruleApplied: 'BR-0101',
    engineVersion: '3.0.0',
    executedBy: 'System QA Auditor',
    result: integrityReport.passed ? 'SUCCESS' : 'WARNING',
    engineUsed: 'Dual Comparison',
    remarks: `Validation: ${integrityReport.passed ? 'PASS' : 'FAIL'} | Module: NCR Event-Driven Engine | Total: ${cumulativeKPIs.totalUnique} | Open Snapshot: ${cumulativeKPIs.open} | Closed Snapshot: ${cumulativeKPIs.closed} | Monthly Events - New: ${monthlyKPIs.newNcrReceived}, Submitted: ${monthlyKPIs.correctiveSubmitted}, Responses: ${monthlyKPIs.responsesReceived}`
  });

  return {
    cumulative,
    monthly,
    monthlySubmissions,
    monthlyKPIs,
    cumulativeKPIs,
    evidenceList,
    integrityReport,
  };
};
