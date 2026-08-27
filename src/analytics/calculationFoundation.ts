import { SubmittalRow, KPIStats } from '../types';
import { compareRevisions, isValidRevision } from './analyticsCore';
import { getRevisionWeight } from './revisionResolver';
import { getStatusCodeCategory, classifyNcrStatus, normalizeCanonicalString } from './statusResolver';

export { getStatusCodeCategory, classifyNcrStatus, normalizeCanonicalString };

export interface DataQualityIssue {
  id: string;
  businessEntityKey: string;
  issueType: 'MISSING_DATE' | 'BLANK_STATUS' | 'FUTURE_DATE' | 'DUPLICATE_REVISION' | 'INVALID_REVISION';
  description: string;
  row: SubmittalRow;
}

export interface DataQualityLedger {
  issues: DataQualityIssue[];
  missingDatesCount: number;
  blankStatusCount: number;
  futureDatesCount: number;
  duplicateKeysCount: number;
  invalidRevisionsCount: number;
  totalIssuesCount: number;
}

export interface CanonicalRecord {
  id: string;
  originalRow: SubmittalRow;
  registerType: string;
  businessEntityKey: string;
  revision: string;
  submissionDate: string;
  responseDate: string;
  status: string;
  resolvedStatus: 'APPROVED' | 'REJECTED_OPEN' | 'REJECTED_CLOSED' | 'PENDING' | 'UNCLASSIFIED';
  isLatestRevision: boolean;
  isRev0: boolean;
  isHistoricalRev0: boolean;
  hadRejectionHistory: boolean;
  isResolvedRejection: boolean;
  firstSubmissionDate: string;
  includeInSubmission: boolean;
  includeInPerformance: boolean;
}

export interface CanonicalKPIResult extends KPIStats {
  dataQuality: DataQualityLedger;
}

/**
 * Helper to safely parse any date string into timestamp for comparison.
 */
export function parseDateTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const parsed = new Date(dateStr).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * 1. Business Entity Resolver
 * Explicitly resolved by register type without generic fallback chains.
 * Guarantees that Survey (SUR) is NEVER merged with Architectural (ARC).
 */
export function getBusinessEntityKey(row: SubmittalRow): string {
  const family = (row.workflowFamily || '').toUpperCase().trim();
  const type = (row.documentType || row.logType || 'DOC').toUpperCase().trim();
  const r = row as Record<string, any>;

  const extractRef = (...keys: string[]) => {
    for (const k of keys) {
      if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') {
        return String(r[k]).trim();
      }
    }
    return '';
  };

  const commonRef = extractRef('docNo', 'docNumber', 'documentNo', 'documentNumber', 'drawingNo', 'drawingNumber', 'submittalRef', 'subNo', 'subRef', 'sheetNo', 'ref', 'id');
  const upperDocNo = extractRef('docNo', 'docNumber', 'documentNo').toUpperCase();
  const upperLog = (row.logType || '').toUpperCase();
  const upperSrc = ((row as any).sourceFile || '').toUpperCase();

  const isABD = family === 'ABD' ||
                type.startsWith('ABD') || type.includes('AS-BUILT') || type.includes('AS BUILT') || type.includes('ASBUILT') ||
                upperDocNo.startsWith('ABD-') || upperDocNo.includes('AS-BUILT') || upperDocNo.includes('AS BUILT') || upperDocNo.includes('ASBUILT') ||
                upperLog.includes('ABD') || upperLog.includes('AS-BUILT') || upperLog.includes('AS BUILT') || upperLog.includes('ASBUILT') ||
                upperSrc.includes('ABD') || upperSrc.includes('AS-BUILT') || upperSrc.includes('AS BUILT') || upperSrc.includes('ASBUILT');

  let baseRef = commonRef;
  // Only strip trailing revision indicators when explicitly prefixed by REV, REVISION, or R (e.g. -REV01, _R0, /REV-A)
  baseRef = baseRef.replace(/[-_/\\s]+(?:REV|REVISION|R)\.?(?:[-_/\\s]*)([0-9]{1,2}|[A-Z])$/i, '').trim() || commonRef;

  if (isABD) {
    return `ABD:${baseRef.toUpperCase()}`;
  }

  if (family === 'NCR' || type.includes('NCR') || type === 'NCR') {
    const ref = extractRef('ncrRef', 'docNo', 'docNumber', 'documentNo', 'id');
    return `NCR:${ref.toUpperCase()}`;
  }
  if (family === 'SOR' || type.includes('SOR') || type === 'SOR') {
    const ref = extractRef('sorRef', 'docNo', 'docNumber', 'documentNo', 'id');
    return `SOR:${ref.toUpperCase()}`;
  }
  if (family === 'RFI' || type.includes('RFI') || type === 'RFI') {
    const ref = extractRef('rfiRef', 'docNo', 'docNumber', 'documentNo', 'id');
    return `RFI:${ref.toUpperCase()}`;
  }
  if (family === 'WIR' || type.includes('WIR') || type === 'WIR') {
    const ref = extractRef('wirRef', 'docNo', 'docNumber', 'documentNo', 'id');
    return `WIR:${ref.toUpperCase()}`;
  }
  if (family === 'MIR' || type.includes('MIR') || type === 'MIR') {
    const ref = extractRef('mirRef', 'docNo', 'docNumber', 'documentNo', 'id');
    return `MIR:${ref.toUpperCase()}`;
  }
  if (family === 'LETTER' || type.includes('LT') || type.includes('LETTER') || type === 'LTR') {
    const ref = extractRef('letterRef', 'docNo', 'subject', 'id');
    return `LTR:${ref.toUpperCase()}`;
  }
  if (family === 'SDW' || type.includes('SDW') || type.includes('SHD') || type.includes('SHOP') || upperDocNo.startsWith('SDW-') || upperDocNo.startsWith('SHD-')) {
    return `SDW:${baseRef.toUpperCase()}`;
  }
  if (family === 'MAR' || type.includes('MAR') || type.includes('MATERIAL') || type === 'MAR') {
    const ref = extractRef('materialRef', 'marRef', 'docNo', 'docNumber', 'id');
    return `MAR:${ref.toUpperCase()}`;
  }
  if (family === 'QS' || type.includes('QS') || type === 'QS') {
    const ref = extractRef('qsRef', 'docNo', 'docNumber', 'id');
    return `QS:${ref.toUpperCase()}`;
  }

  const disc = (r.discipline || '').trim().toUpperCase();
  const prefix = type.includes('-') ? type : (disc ? `${type}-${disc}` : type);
  return `${prefix}:${baseRef.toUpperCase()}`;
}

/**
 * 3. Revision & History Engine
 */
export function processRevisionEngine(rows: SubmittalRow[], asOfDate?: string): Map<string, { latest: SubmittalRow; all: SubmittalRow[]; hasRejection: boolean; isResolved: boolean }> {
  const groups = new Map<string, SubmittalRow[]>();
  const cutoffTime = parseDateTimestamp(asOfDate);

  rows.forEach(row => {
    if (cutoffTime > 0 && row.submissionDate) {
      const subTime = parseDateTimestamp(row.submissionDate);
      if (subTime > cutoffTime) {
        return; // Exclude future-dated rows from historical snapshot
      }
    }
    const key = getBusinessEntityKey(row);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  const result = new Map<string, { latest: SubmittalRow; all: SubmittalRow[]; hasRejection: boolean; isResolved: boolean }>();

  groups.forEach((groupRows, key) => {
    // Sort primarily by revision sequence (Rev 00 < Rev 01 < Rev 02), tie-broken by submission date
    const sorted = [...groupRows].sort((a, b) => {
      const revDiff = compareRevisions(a.rev, b.rev);
      if (revDiff !== 0) return revDiff;
      const timeA = parseDateTimestamp(a.submissionDate);
      const timeB = parseDateTimestamp(b.submissionDate);
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });

    const latest = sorted[sorted.length - 1];

    let hasRejection = false;
    sorted.forEach(r => {
      const cat = getStatusCodeCategory(r);
      if (cat === 'REJECTED_OPEN' || cat === 'REJECTED_CLOSED') {
        hasRejection = true;
      }
    });

    const latestCat = getStatusCodeCategory(latest);
    const isResolved = hasRejection && latestCat === 'APPROVED';

    result.set(key, { latest, all: sorted, hasRejection, isResolved });
  });

  return result;
}

/**
 * 4. Master Canonical KPI Calculation Engine
 * Implements the Dual Dimension:
 * Dimension 1 (Workload / Events): Count of physical rows
 * Dimension 2 (Current State): Count of unique items at latest valid revision
 * Dimension 3 (Rejection Events & Resolutions): Historical row events vs resolved entities
 */
export function calculateCanonicalKPIs(
  data: SubmittalRow[],
  fullDataset?: SubmittalRow[],
  asOfDate?: string
): CanonicalKPIResult {
  const rowsToUse = data || [];
  const cutoffTime = parseDateTimestamp(asOfDate);

  // Data Quality Ledger Collection
  const issues: DataQualityIssue[] = [];
  let missingDatesCount = 0;
  let blankStatusCount = 0;
  let futureDatesCount = 0;
  let duplicateKeysCount = 0;
  let invalidRevisionsCount = 0;

  const validRows: SubmittalRow[] = [];
  const seenKeyRevs = new Set<string>();

  rowsToUse.forEach(r => {
    const key = getBusinessEntityKey(r);
    const rev = (r.rev || '').trim();
    const keyRev = `${key}__REV__${rev}`;

    if (!r.submissionDate) {
      missingDatesCount++;
      issues.push({ id: r.id, businessEntityKey: key, issueType: 'MISSING_DATE', description: 'Missing Submission Date', row: r });
    }

    if (!r.status && !r.recordStatus && !r.workflowStage && !(r as any).ncrStatus && !(r as any).sorStatus) {
      blankStatusCount++;
      issues.push({ id: r.id, businessEntityKey: key, issueType: 'BLANK_STATUS', description: 'Blank Status Code and Workflow Stage', row: r });
    }

    if (cutoffTime > 0 && r.submissionDate) {
      const subTime = parseDateTimestamp(r.submissionDate);
      if (subTime > cutoffTime) {
        futureDatesCount++;
        issues.push({ id: r.id, businessEntityKey: key, issueType: 'FUTURE_DATE', description: `Submission date (${r.submissionDate}) exceeds snapshot date (${asOfDate})`, row: r });
        return; // Exclude from snapshot calculation
      }
    }

    if (seenKeyRevs.has(keyRev)) {
      duplicateKeysCount++;
      issues.push({ id: r.id, businessEntityKey: key, issueType: 'DUPLICATE_REVISION', description: `Duplicate submission for Key: ${key} Rev: ${rev}`, row: r });
    } else {
      seenKeyRevs.add(keyRev);
    }

    if (rev && !isValidRevision(rev)) {
      invalidRevisionsCount++;
      issues.push({ id: r.id, businessEntityKey: key, issueType: 'INVALID_REVISION', description: `Invalid revision format: ${rev}`, row: r });
    }

    validRows.push(r);
  });

  const dataQuality: DataQualityLedger = {
    issues,
    missingDatesCount,
    blankStatusCount,
    futureDatesCount,
    duplicateKeysCount,
    invalidRevisionsCount,
    totalIssuesCount: issues.length,
  };

  if (validRows.length === 0) {
    return {
      totalSubmittedSheets: 0,
      totalRows: 0,
      totalSheetsRev0: 0,
      totalSheetsFurtherRev: 0,
      totalDrawingsRev0: 0,
      totalDrawingsFurtherRev: 0,
      rowApproved: 0,
      rowApprovedClosed: 0,
      rowRejectedOpen: 0,
      rowRejectedClosed: 0,
      rowPending: 0,
      totalRejectedRows: 0,
      rejectedOpenRows: 0,
      rejectedClosedRows: 0,
      totalUniqueDrawings: 0,
      totalUniqueItems: 0,
      currentApproved: 0,
      currentRejectedOpen: 0,
      currentRejectedClosed: 0,
      currentRejected: 0,
      currentPending: 0,
      currentOpen: 0,
      currentClosed: 0,
      approved: 0,
      rejectedOpen: 0,
      rejectedClosed: 0,
      totalRejected: 0,
      pending: 0,
      unclassified: 0,
      rejectionEvents: 0,
      rejectionEventsOpen: 0,
      rejectionEventsClosed: 0,
      resolvedRejections: 0,
      rejectionResolutionRate: 0,
      overdue: 0,
      avgResponseTime: 0,
      approvalRate: 0,
      rejectionOpenRate: 0,
      rejectionClosedRate: 0,
      delayRate: 0,
      isWorkloadReconciled: true,
      isCurrentStateReconciled: true,
      reconciliationPassed: true,
      dataQuality,
    };
  }

  // 1. WORKLOAD / SUBMISSION LAYER (Physical Source Rows - Record Grain)
  const totalSubmittedSheets = validRows.length;
  let totalSheetsRev0 = 0;
  let totalSheetsFurtherRev = 0;
  let totalRejectedRows = 0;
  let rejectedOpenRows = 0;
  let rejectedClosedRows = 0;
  let rowApproved = 0;
  let rowPending = 0;

  validRows.forEach(r => {
    const revVal = normalizeCanonicalString(r.rev || (r as any).revision || (r as any).revNo);
    const w = getRevisionWeight(revVal);
    const isRev0 = (w === 0 && revVal !== 'AS-BUILT' && revVal !== 'IFC') || (r.isRev0 && w === 0);

    if (isRev0) {
      totalSheetsRev0++;
    } else {
      totalSheetsFurtherRev++;
    }

    // Historical Status (Row / Record Grain)
    const rowStatusCat = getStatusCodeCategory(r);
    if (rowStatusCat === 'APPROVED') {
      rowApproved++;
    } else if (rowStatusCat === 'REJECTED_OPEN') {
      totalRejectedRows++;
      rejectedOpenRows++;
    } else if (rowStatusCat === 'REJECTED_CLOSED') {
      totalRejectedRows++;
      rejectedClosedRows++;
    } else if (rowStatusCat === 'PENDING') {
      rowPending++;
    } else {
      rowPending++;
    }
  });

  const rowApprovedClosed = rowApproved + rejectedClosedRows;

  // 2. CURRENT STATE LAYER (Unique SUB Ref at Latest Valid Revision)
  const baseForRevisions = fullDataset && fullDataset.length > 0 ? fullDataset : validRows;
  const revisionMap = processRevisionEngine(baseForRevisions, asOfDate);

  // Filter revision map to entities present in the current dataset
  const targetEntityKeys = new Set(validRows.map(r => getBusinessEntityKey(r)));
  
  let approvedCurrent = 0;
  let rejectedOpenCurrent = 0;
  let rejectedClosedCurrent = 0;
  let pendingCurrent = 0;
  let unclassifiedCurrent = 0;
  let resolvedRejections = 0;
  let totalEntitiesWithRejectionHistory = 0;
  let overdueCurrent = 0;
  let slaEligibleActiveCount = 0;
  let totalResponseDays = 0;
  let responseCount = 0;

  targetEntityKeys.forEach(entityKey => {
    const groupInfo = revisionMap.get(entityKey);
    if (!groupInfo) return;

    if (groupInfo.hasRejection) {
      totalEntitiesWithRejectionHistory++;
      if (groupInfo.isResolved) {
        resolvedRejections++;
      }
    }

    const latest = groupInfo.latest;
    const cat = getStatusCodeCategory(latest);

    switch (cat) {
      case 'APPROVED':
        approvedCurrent++;
        break;
      case 'REJECTED_OPEN':
        rejectedOpenCurrent++;
        break;
      case 'REJECTED_CLOSED':
        rejectedClosedCurrent++;
        break;
      case 'PENDING':
        pendingCurrent++;
        break;
      case 'UNCLASSIFIED':
      default:
        unclassifiedCurrent++;
        break;
    }

    // SLA & Overdue: Only evaluate current active items (Pending or Rejected Open)
    const isActive = cat === 'PENDING' || cat === 'REJECTED_OPEN';
    if (isActive) {
      const nowTime = cutoffTime > 0 ? cutoffTime : Date.now();
      let isItemOverdue = false;
      if (latest.overdue !== undefined) {
        isItemOverdue = Boolean(latest.overdue);
      } else if (latest.dueDate) {
        slaEligibleActiveCount++;
        const dueTime = parseDateTimestamp(latest.dueDate);
        if (dueTime > 0 && nowTime > dueTime) {
          isItemOverdue = true;
        }
      } else if (latest.submissionDate) {
        const subTime = parseDateTimestamp(latest.submissionDate);
        if (subTime > 0) {
          const diffDays = (nowTime - subTime) / (1000 * 3600 * 24);
          if (diffDays > 14) {
            isItemOverdue = true;
          }
        }
      }
      if (isItemOverdue) {
        overdueCurrent++;
      }
    }

    // Turnaround time calculation for closed items
    if (latest.submissionDate && latest.responseDate) {
      const start = parseDateTimestamp(latest.submissionDate);
      const end = parseDateTimestamp(latest.responseDate);
      if (end >= start) {
        const days = Math.round((end - start) / (1000 * 3600 * 24));
        totalResponseDays += days;
        responseCount++;
      }
    }
  });

  const totalUniqueDrawings = targetEntityKeys.size;
  const totalEligible = approvedCurrent + rejectedOpenCurrent + rejectedClosedCurrent + pendingCurrent + unclassifiedCurrent;
  const activeCurrentItems = pendingCurrent + rejectedOpenCurrent;
  const overdueFinal = Math.min(overdueCurrent, activeCurrentItems);
  const overdueRateOnActive = activeCurrentItems > 0 ? Number(((overdueFinal / activeCurrentItems) * 100).toFixed(1)) : 0;

  const approvalRate = totalEligible > 0 ? (approvedCurrent / totalEligible) * 100 : 0;
  const rejectionOpenRate = totalEligible > 0 ? (rejectedOpenCurrent / totalEligible) * 100 : 0;
  const rejectionClosedRate = totalEligible > 0 ? (rejectedClosedCurrent / totalEligible) * 100 : 0;
  const delayRate = totalEligible > 0 ? (overdueFinal / totalEligible) * 100 : 0;
  const rejectionResolutionRate = totalEntitiesWithRejectionHistory > 0 ? (resolvedRejections / totalEntitiesWithRejectionHistory) * 100 : 0;
  const avgResponseTime = responseCount > 0 ? Number((totalResponseDays / responseCount).toFixed(1)) : 0;

  // Invariant & Reconciliation Checks
  const isWorkloadReconciled = totalSubmittedSheets === (totalSheetsRev0 + totalSheetsFurtherRev);
  const isCurrentStateReconciled = totalUniqueDrawings === totalEligible;
  const isOverdueValidSubset = overdueFinal <= activeCurrentItems;
  const reconciliationPassed = isWorkloadReconciled && isCurrentStateReconciled && isOverdueValidSubset;

  return {
    // 1. Workload / Physical Row Grain
    totalSubmittedSheets,
    totalRows: totalSubmittedSheets,
    totalSheetsRev0,
    totalSheetsFurtherRev,
    totalDrawingsRev0: totalSheetsRev0,
    totalDrawingsFurtherRev: totalSheetsFurtherRev,
    rowApproved,
    rowApprovedClosed,
    rowRejectedOpen: rejectedOpenRows,
    rowRejectedClosed: rejectedClosedRows,
    rowPending,
    totalRejectedRows,
    rejectedOpenRows,
    rejectedClosedRows,

    // Historical Aliases
    rejectionEvents: totalRejectedRows,
    rejectionEventsOpen: rejectedOpenRows,
    rejectionEventsClosed: rejectedClosedRows,
    resolvedRejections,
    rejectionResolutionRate,

    // 2. Current Unique Item Grain (Latest Valid Revision)
    totalUniqueDrawings,
    totalUniqueItems: totalUniqueDrawings,
    currentApproved: approvedCurrent,
    currentRejectedOpen: rejectedOpenCurrent,
    currentRejectedClosed: rejectedClosedCurrent,
    currentRejected: rejectedOpenCurrent + rejectedClosedCurrent,
    currentPending: pendingCurrent + unclassifiedCurrent,
    currentOpen: pendingCurrent + rejectedOpenCurrent + unclassifiedCurrent,
    currentClosed: approvedCurrent + rejectedClosedCurrent,

    // Standard & Backwards Compatible Aliases
    approved: approvedCurrent,
    rejectedOpen: rejectedOpenCurrent,
    rejectedClosed: rejectedClosedCurrent,
    totalRejected: rejectedOpenCurrent + rejectedClosedCurrent,
    pending: pendingCurrent,
    unclassified: unclassifiedCurrent,

    // 3. Overdue & Performance Metrics
    activeItems: activeCurrentItems,
    activeCurrentItems,
    slaEligibleActiveItems: slaEligibleActiveCount,
    overdue: overdueFinal,
    overdueRateOnActive,
    avgResponseTime,
    approvalRate,
    rejectionOpenRate,
    rejectionClosedRate,
    delayRate,

    // 4. Mathematical Invariants & Reconciliation
    isWorkloadReconciled,
    isCurrentStateReconciled,
    reconciliationPassed,
    dataQuality,
  };
}

/**
 * 5. Canonical calculateStats wrapper (Backwards Compatible SSOT)
 */
export function calculateStats(data: SubmittalRow[], fullDataset?: SubmittalRow[]): KPIStats & { totalUniqueDrawings: number } {
  return calculateCanonicalKPIs(data, fullDataset);
}

/**
 * 6. Canonical Dataset Builder
 */
export function buildCanonicalDataset(rows: SubmittalRow[], fullCumulativeRows?: SubmittalRow[], cutoffDate?: string): CanonicalRecord[] {
  const baseRows = fullCumulativeRows && fullCumulativeRows.length > 0 ? fullCumulativeRows : rows;
  const revisionMap = processRevisionEngine(baseRows, cutoffDate);

  const canonicalRecords: CanonicalRecord[] = [];
  const cutoffTime = parseDateTimestamp(cutoffDate);

  rows.forEach(row => {
    if (cutoffTime > 0 && row.submissionDate) {
      const subTime = parseDateTimestamp(row.submissionDate);
      if (subTime > cutoffTime) return;
    }

    const businessEntityKey = getBusinessEntityKey(row);
    const groupInfo = revisionMap.get(businessEntityKey);
    const isLatest = groupInfo ? groupInfo.latest.id === row.id : true;
    const revVal = (row.rev || '').trim();
    const isRev0 = isValidRevision(revVal) && getRevisionWeight(revVal) === 0;

    const registerType = (row.documentType || row.logType || 'DOC').toUpperCase().trim();
    const resolvedStatus = getStatusCodeCategory(row);

    canonicalRecords.push({
      id: row.id,
      originalRow: row,
      registerType,
      businessEntityKey,
      revision: revVal,
      submissionDate: row.submissionDate || '',
      responseDate: row.responseDate || '',
      status: row.status || '',
      resolvedStatus,
      isLatestRevision: isLatest,
      isRev0,
      isHistoricalRev0: isRev0,
      hadRejectionHistory: groupInfo ? groupInfo.hasRejection : false,
      isResolvedRejection: groupInfo ? groupInfo.isResolved : false,
      firstSubmissionDate: groupInfo && groupInfo.all.length > 0 ? groupInfo.all[0].submissionDate : (row.submissionDate || ''),
      includeInSubmission: true,
      includeInPerformance: isLatest,
    });
  });

  return canonicalRecords;
}

export function evaluateSubmissionLayer(canonicalRecords: CanonicalRecord[], fullCumulativeRows?: SubmittalRow[]) {
  const kpi = calculateCanonicalKPIs(canonicalRecords.map(r => r.originalRow), fullCumulativeRows);
  return {
    totalSubmitted: kpi.totalSubmittedSheets,
    rev00: kpi.totalSheetsRev0,
    furtherRevisions: kpi.totalSheetsFurtherRev,
  };
}

export function evaluatePerformanceLayer(canonicalRecords: CanonicalRecord[]) {
  const kpi = calculateCanonicalKPIs(canonicalRecords.map(r => r.originalRow));
  return {
    totalUniqueItems: kpi.totalUniqueDrawings || 0,
    approved: kpi.approved,
    rejectedOpen: kpi.rejectedOpen,
    rejectedClosed: kpi.rejectedClosed,
    pending: kpi.pending,
  };
}

export interface EngineeringItemClassification {
  businessEntityKey: string;
  trade: string;
  drawingNo: string;
  sheetNo: string;
  submissionRef: string;
  firstSubmissionDate: string;
  firstRevision: string;
  invalidRevCount: number;
  classification: 'Rev00' | 'Further Revision' | 'Missing Revision';
  ruleApplied: string;
  explanation: string;
  latestRevision: string;
  latestStatus: string;
  includeInPerformance: boolean;
}

export function evaluateEngineeringItemClassification(rows: SubmittalRow[]): EngineeringItemClassification[] {
  const revisionMap = processRevisionEngine(rows);
  const results: EngineeringItemClassification[] = [];

  revisionMap.forEach((groupInfo, key) => {
    const invalidRevCount = groupInfo.all.filter(r => !isValidRevision(r.rev)).length;
    const validRows = groupInfo.all.filter(r => isValidRevision(r.rev));

    const sorted = [...groupInfo.all].sort((a, b) => {
      const timeA = parseDateTimestamp(a.submissionDate);
      const timeB = parseDateTimestamp(b.submissionDate);
      if (timeA !== timeB) return timeA - timeB;
      return compareRevisions(a.rev, b.rev);
    });

    if (sorted.length === 0) return;

    const first = sorted[0];
    const latestOverall = groupInfo.latest || sorted[sorted.length - 1];
    const drawingNo = (latestOverall as any).drawingNo || latestOverall.docNo || '';
    const trade = latestOverall.trade || 'General';

    let classification: 'Rev00' | 'Further Revision' | 'Missing Revision' = 'Missing Revision';
    let latestRevStr = '(blank)';
    let ruleApplied = '';
    let explanation = '';

    if (validRows.length > 0) {
      const sortedValid = [...validRows].sort((a, b) => {
        const timeA = parseDateTimestamp(a.submissionDate);
        const timeB = parseDateTimestamp(b.submissionDate);
        if (timeA !== timeB) return timeA - timeB;
        return compareRevisions(a.rev, b.rev);
      });
      const latestValid = sortedValid[sortedValid.length - 1];
      latestRevStr = (latestValid.rev || '').trim();
      const isRev0 = getRevisionWeight(latestRevStr) === 0;

      if (isRev0) {
        classification = 'Rev00';
        ruleApplied = 'Rev00 Baseline Rule: Resolved latest valid revision is 0, 00, or Rev0.';
      } else {
        classification = 'Further Revision';
        ruleApplied = 'Further Revision Rule: Resolved latest valid revision is greater than 0 (e.g., 01, Rev1).';
      }
      explanation = `BusinessEntityKey '${key}' has ${sorted.length} total submission(s). Latest resolved valid revision: '${latestRevStr}'.${invalidRevCount > 0 ? ` (Ignored ${invalidRevCount} blank/invalid revision value(s)).` : ''}`;
    } else {
      classification = 'Missing Revision';
      ruleApplied = 'Missing Revision Rule: Document has no valid revision values across all history rows.';
      explanation = `BusinessEntityKey '${key}' has ${sorted.length} total submission(s), but all revision values are blank or invalid. Excluded from Rev00/Further Revision.`;
    }

    results.push({
      businessEntityKey: key,
      trade,
      drawingNo,
      sheetNo: latestOverall.sheetNo || '',
      submissionRef: latestOverall.docNo || latestOverall.sheetNo || latestOverall.id,
      firstSubmissionDate: first.submissionDate || 'N/A',
      firstRevision: first.rev || 'N/A',
      invalidRevCount,
      classification,
      ruleApplied,
      explanation,
      latestRevision: latestRevStr,
      latestStatus: latestOverall.status || 'Pending',
      includeInPerformance: classification !== 'Missing Revision',
    });
  });

  return results;
}

export interface PerformanceValidationRow {
  businessEntityKey: string;
  latestRevision: string;
  latestSubmissionDate: string;
  latestStatus: string;
  resolvedStatus: string;
  includedInPerformance: boolean;
}

export function getPerformanceValidationRows(rows: SubmittalRow[]): PerformanceValidationRow[] {
  const canonical = buildCanonicalDataset(rows, rows);
  const entityMap = new Map<string, CanonicalRecord[]>();
  canonical.forEach(r => {
    if (!entityMap.has(r.businessEntityKey)) {
      entityMap.set(r.businessEntityKey, []);
    }
    entityMap.get(r.businessEntityKey)!.push(r);
  });

  const result: PerformanceValidationRow[] = [];
  entityMap.forEach((records, key) => {
    const sorted = [...records].sort((a, b) => {
      const timeA = parseDateTimestamp(a.submissionDate);
      const timeB = parseDateTimestamp(b.submissionDate);
      if (timeA !== timeB) return timeA - timeB;
      return compareRevisions(a.revision, b.revision);
    });
    const latest = sorted[sorted.length - 1];

    result.push({
      businessEntityKey: key,
      latestRevision: latest.revision,
      latestSubmissionDate: latest.submissionDate,
      latestStatus: latest.status,
      resolvedStatus: latest.resolvedStatus,
      includedInPerformance: true,
    });
  });

  return result;
}

export interface CanonicalTradeResolution {
  trade: string;
  tradeShort: string;
  presentationDisc: string;
}

export function resolveCanonicalTrade(row: SubmittalRow): CanonicalTradeResolution {
  if (!row) {
    return { trade: 'General', tradeShort: '', presentationDisc: 'GENERAL' };
  }

  const checkText = (text?: string): CanonicalTradeResolution | null => {
    if (!text) return null;
    const clean = text.trim().toUpperCase();
    if (!clean || ["YES", "NO", "N/A", "-", "NONE", "NULL", "UNCLASSIFIED", "GENERAL", "GEN"].includes(clean)) {
      return null;
    }

    if (clean.includes('STR/SUR') || clean.includes('STR-SUR')) {
      return { trade: 'Structural / Survey', tradeShort: 'STR', presentationDisc: 'STR/SUR' };
    }

    // Infrastructure (checked before Structural to avoid 'STRUCT' substring in INFRASTRUCTURE)
    if (
      clean === 'INF' || clean === 'INFRA' || clean.startsWith('INFRA') || clean === 'INFR' ||
      clean.includes('INFRASTRUCTURE') || clean.includes('UTILITIES') ||
      clean.includes('بنية تحتية') || clean.includes('طرق') || clean.includes('مرافق')
    ) {
      return { trade: 'Infrastructure', tradeShort: 'INFRA', presentationDisc: 'Infra' };
    }

    // Structural
    if (
      clean === 'STR' || clean === 'STRUCT' || clean.startsWith('STRUCTUR') ||
      clean === 'CIVIL' || clean === 'CVL' || clean.startsWith('CIVIL') ||
      clean.includes('إنشائي') || clean.includes('انشائي') || clean.includes('مدني') || clean.includes('مدنى')
    ) {
      return { trade: 'Structural', tradeShort: 'STR', presentationDisc: 'STR' };
    }

    // Architectural
    if (
      clean === 'ARC' || clean === 'ARCH' || clean.startsWith('ARCHITECT') ||
      clean.includes('معماري') || clean.includes('معمارى')
    ) {
      return { trade: 'Architectural', tradeShort: 'ARC', presentationDisc: 'Arch' };
    }

    // Mechanical
    if (
      clean === 'MEC' || clean === 'MECH' || clean.startsWith('MECHANIC') || clean === 'HVAC' ||
      clean.includes('ميكانيك') || clean.includes('ميكانيكا') || clean.includes('تكييف')
    ) {
      return { trade: 'Mechanical', tradeShort: 'MEC', presentationDisc: 'Mech' };
    }

    // Electrical
    if (
      clean === 'ELE' || clean === 'ELEC' || clean.startsWith('ELECTR') ||
      clean.includes('كهرباء') || clean.includes('كهربائي') || clean.includes('كهربائى')
    ) {
      return { trade: 'Electrical', tradeShort: 'ELE', presentationDisc: 'Elec' };
    }

    // MEP
    if (
      clean === 'MEP' || clean === 'M.E.P' ||
      clean.includes('كهروميكانيك') || clean.includes('اليكتروميكانيك') || clean.includes('الكتروميكانيك')
    ) {
      return { trade: 'MEP', tradeShort: 'MEP', presentationDisc: 'MEP' };
    }

    // Landscape
    if (
      clean === 'LAND' || clean === 'LND' || clean.startsWith('LANDSCAP') || clean === 'LNDSCP' ||
      clean.includes('لاندسكيب') || clean.includes('تنسيق مواقع') || clean.includes('تنسيق الموقع') ||
      clean.includes('حدائق') || clean.includes('زراعة')
    ) {
      return { trade: 'Landscape', tradeShort: 'LAND', presentationDisc: 'Landscape' };
    }

    // Survey
    if (
      clean === 'SUR' || clean === 'SURV' || clean.startsWith('SURVEY') ||
      clean.includes('مساحة') || clean.includes('مساحه')
    ) {
      return { trade: 'Survey', tradeShort: 'SUR', presentationDisc: 'SURVEY' };
    }

    // HSE / Safety
    if (
      clean === 'HSE' || clean === 'SAFETY' || clean === 'HEALTH' || clean === 'ENV' ||
      clean.includes('سلامة') || clean.includes('سلامه') || clean.includes('بيئة') || clean.includes('بيئه')
    ) {
      return { trade: 'HSE', tradeShort: 'HSE', presentationDisc: 'HSE' };
    }

    // Irrigation
    if (
      clean === 'IRR' || clean.startsWith('IRRIGAT') || clean.includes('ري') || clean.includes('رى')
    ) {
      return { trade: 'Irrigation', tradeShort: 'IRR', presentationDisc: 'IRR' };
    }

    return null;
  };

  // 1. Priority: Explicit discipline from raw row
  const fromDisc = checkText(row.discipline);
  if (fromDisc) return fromDisc;

  // 2. Priority: Explicit trade from raw row
  const fromTrade = checkText(row.trade);
  if (fromTrade) return fromTrade;

  // 3. Priority: contextDiscipline or compositeIdentity
  const fromContext = checkText((row as any).contextDiscipline) || checkText((row as any).compositeIdentity?.discipline);
  if (fromContext) return fromContext;

  // 4. Priority: tradeShort from previous step
  const fromTradeShort = checkText((row as any).tradeShort);
  if (fromTradeShort) return fromTradeShort;

  // 5. Priority: documentType suffix (e.g. SDW-STR -> STR)
  if (row.documentType) {
    const parts = row.documentType.split(/[-_/ ]+/);
    if (parts.length > 1) {
      const suffix = parts[parts.length - 1];
      const fromDocType = checkText(suffix);
      if (fromDocType) return fromDocType;
    }
  }

  // 6. Priority: Strict Token match in docNo (ONLY isolated token like "-STR-", "-ARC-", never substring)
  if (row.docNo) {
    let tokens = row.docNo.split(/[-_ \/(),&.]+/).filter(Boolean);
    // If docNo starts with contractor-consultant prefix INN-ARC or INN-ACE, strip it so partner prefix does not contaminate discipline
    if (tokens.length > 2 && tokens[0].toUpperCase() === 'INN' && (tokens[1].toUpperCase() === 'ARC' || tokens[1].toUpperCase() === 'ACE')) {
      tokens = tokens.slice(2);
    }
    for (const t of tokens) {
      const fromToken = checkText(t);
      if (fromToken) return fromToken;
    }
  }

  const rawD = (row.discipline || row.trade || '').trim();
  return {
    trade: rawD || 'General',
    tradeShort: '',
    presentationDisc: rawD || 'GENERAL'
  };
}

export function resolveRowDiscipline(row: SubmittalRow, baseType?: string): string {
  if (!row) return 'GENERAL';
  const resolved = resolveCanonicalTrade(row);
  return resolved.presentationDisc;
}

export function calculateNCRStats(data: SubmittalRow[], fullDataset?: SubmittalRow[] | boolean): any {
  const dataset = Array.isArray(fullDataset) ? fullDataset : undefined;
  const kpi = calculateCanonicalKPIs(data, dataset);
  return {
    ...kpi,
    discipline: '',
    totalUnique: kpi.totalUniqueDrawings,
    notSent: 0,
    underReview: kpi.pending,
    rejectedOpen: kpi.rejectedOpen,
    approvedClosed: kpi.approved,
    open: kpi.pending + kpi.rejectedOpen,
    closed: kpi.approved + kpi.rejectedClosed,
    approved: kpi.approved,
    rejected: kpi.rejectedOpen,
    waiting: kpi.pending,
  };
}

export function calculateSORStats(data: SubmittalRow[], fullDataset?: SubmittalRow[] | boolean): any {
  const dataset = Array.isArray(fullDataset) ? fullDataset : undefined;
  const kpi = calculateCanonicalKPIs(data, dataset);
  return {
    ...kpi,
    discipline: '',
    totalUnique: kpi.totalUniqueDrawings,
    notSent: 0,
    underReview: kpi.pending,
    rejectedOpen: kpi.rejectedOpen,
    approvedClosed: kpi.approved,
    open: kpi.pending + kpi.rejectedOpen,
    closed: kpi.approved + kpi.rejectedClosed,
    approved: kpi.approved,
    rejected: kpi.rejectedOpen,
    waiting: kpi.pending,
  };
}

export function calculateLTRStats(data: SubmittalRow[], fullDataset?: SubmittalRow[] | boolean): any {
  const dataset = Array.isArray(fullDataset) ? fullDataset : undefined;
  const kpi = calculateCanonicalKPIs(data, dataset);
  let inCount = 0;
  let outCount = 0;
  (data || []).forEach(r => {
    const dir = ((r as any).direction || (r as any).letterDirection || '').toUpperCase();
    if (dir === 'IN' || (r as any).direction === 'IN') {
      inCount++;
    } else if (dir === 'OUT' || (r as any).direction === 'OUT') {
      outCount++;
    } else {
      inCount++;
    }
  });
  return {
    ...kpi,
    totalDrawingsRev0: inCount,
    totalDrawingsFurtherRev: outCount,
    totalSheetsRev0: inCount,
    totalSheetsFurtherRev: outCount,
    stakeholder: '',
    totalUnique: kpi.totalUniqueDrawings,
    open: kpi.pending + kpi.rejectedOpen,
    closed: kpi.approved + kpi.rejectedClosed,
    approved: kpi.approved,
    rejected: kpi.rejectedOpen,
    pending: kpi.pending,
    overdue: kpi.overdue,
  };
}

export function exportPerformanceValidationCsv(rows: SubmittalRow[]): string {
  const perfRows = getPerformanceValidationRows(rows);
  let csv = 'BusinessEntityKey,Latest Revision,Latest Submission Date,Latest Status,Resolved Status,Included In Performance\n';
  perfRows.forEach(r => {
    csv += `"${r.businessEntityKey}","${r.latestRevision}","${r.latestSubmissionDate}","${r.latestStatus}","${r.resolvedStatus}","${r.includedInPerformance}"\n`;
  });
  return csv;
}
