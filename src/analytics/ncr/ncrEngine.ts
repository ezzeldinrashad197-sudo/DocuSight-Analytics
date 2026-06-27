import { SubmittalRow } from "../../types";
import { classifyNcrStatus } from "../../utils/calculations";
import { compareRevisions } from "../analyticsCore";

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
        r.submissionDate || r.responseDate || r.ncrSentDateCorrectiveAction;
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
  totalUnique: number;
  open: number;
  closed: number;
  underReview: number;
  approved: number;
  rejected: number;
  rev0: number;
  revHigh: number;
}

export interface NCRClassificationStats {
  classification: string;
  rev0: number;
  revHigh: number;
  totalSubs: number;
  approved: number;
  rejectedOpen: number;
  rejectedClosed: number;
  pending: number;
  overdue: number;
}

export const processNCRData = (
  safeData: SubmittalRow[],
  monthlyStart: string | undefined,
) => {
  // 1. Filter only NCRs
  const ncrData = safeData.filter((d: SubmittalRow) => {
    const docT = (d.documentType || "").toUpperCase();
    const logT = (d.logType || "").toUpperCase();
    const docNo = (d.ncrRef || d.docNo || "").toUpperCase();
    return (
      docT.includes("NCR") || logT.includes("NCR") || docNo.includes("NCR")
    );
  });

  const grouped = new Map<string, SubmittalRow[]>();
  ncrData.forEach((r) => {
    const key = (r.ncrRef || r.docNo || "").trim().toUpperCase();
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  });

  const targetMonth = monthlyStart
    ? new Date(monthlyStart)
    : new Date(2026, 4, 1);
  const tMonthStr = `${targetMonth.getFullYear()}-${targetMonth.getMonth()}`;

  const cumMap = new Map<string, NCRStats & { discipline: string }>();
  const mMap = new Map<string, NCRClassificationStats>();
  const mSubList: Record<string, any>[] = [];

  Array.from(grouped.values()).forEach((history) => {
    const latest = getLatestRev(history);
    if (!latest) return;

    const rawDisc = (latest.discipline || latest.trade || "GENERAL").trim();
    let disc = rawDisc.toUpperCase();
    if (disc === "MECHANICAL" || disc === "MECH") disc = "Mech";
    else if (disc === "ELECTRICAL" || disc === "ELEC") disc = "Elec";
    else if (disc === "STRUCTURAL" || disc === "STR") disc = "STR";
    else if (disc === "ARCHITECTURAL" || disc === "ARCH") disc = "Arch";
    else if (disc === "INFRASTRUCTURE" || disc === "INFR" || disc === "INFRA") disc = "Infra";
    else if (disc === "LANDSCAPE" || disc === "LAND" || disc === "LND" || disc.includes("LAND")) disc = "Landscape";
    else if (disc === "HSE" || disc === "NCR-HSE" || disc.includes("HSE") || disc.includes("SAFETY") || disc === "SURVEY" || disc === "SURV" || disc.includes("SUR")) disc = "NCR-HSE";
    else {
      disc = rawDisc;
    }

    if (!cumMap.has(disc))
      cumMap.set(disc, {
        discipline: disc,
        totalUnique: 0,
        open: 0,
        closed: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
        rev0: 0,
        revHigh: 0,
      });
    const st = cumMap.get(disc)!;

    st.totalUnique++;

    // Count all revs across history to track Rev.00 and high revisions correctly in cumulative report
    history.forEach((r) => {
      const rVal = String(r.rev).trim();
      const isRev0 = rVal === "0" || rVal === "00" || rVal === "";
      if (isRev0) {
        st.rev0++;
      } else {
        st.revHigh++;
      }
    });

    const cStatus = classifyNcrStatus(latest);
    const isUnderReview = cStatus.isUnderReview;
    const isClosed = cStatus.isClosed;
    const isOpen = cStatus.isOpen;

    if (isOpen) st.open++;
    if (isClosed) st.closed++;
    if (isUnderReview) st.underReview++;

    if (cStatus.isApproved) st.approved++;
    if (cStatus.isRejected) st.rejected++;
  });

  Array.from(grouped.values()).forEach((history) => {
    const latestOfMon = getLatestRev(history, targetMonth);
    if (!latestOfMon) return;

    const sentDateStr = latestOfMon.ncrSentDateCorrectiveAction;
    const dSent = sentDateStr ? new Date(sentDateStr) : null;

    let isSentInMonth = false;
    if (dSent && !isNaN(dSent.getTime())) {
      isSentInMonth =
        `${dSent.getFullYear()}-${dSent.getMonth()}` === tMonthStr;
    }

    const cStatus = classifyNcrStatus(latestOfMon);
    const isUnderReview = cStatus.isUnderReview;
    const isClosed = cStatus.isClosed;
    const isOpen = cStatus.isOpen;
    const isApp = cStatus.isApproved;
    const isRej = cStatus.isRejected;

    let classification = cStatus.status;

    const rawDisc = (latestOfMon.discipline || latestOfMon.trade || "GENERAL").trim();
    let disc = rawDisc.toUpperCase();
    if (disc === "MECHANICAL" || disc === "MECH") disc = "Mech";
    else if (disc === "ELECTRICAL" || disc === "ELEC") disc = "Elec";
    else if (disc === "STRUCTURAL" || disc === "STR") disc = "STR";
    else if (disc === "ARCHITECTURAL" || disc === "ARCH") disc = "Arch";
    else if (disc === "INFRASTRUCTURE" || disc === "INFR" || disc === "INFRA") disc = "Infra";
    else if (disc === "LANDSCAPE" || disc === "LAND" || disc === "LND" || disc.includes("LAND")) disc = "Landscape";
    else if (disc === "HSE" || disc === "NCR-HSE" || disc.includes("HSE") || disc.includes("SAFETY") || disc === "SURVEY" || disc === "SURV" || disc.includes("SUR")) disc = "NCR-HSE";
    else {
      disc = rawDisc;
    }

    const classKey = disc.startsWith("NCR-") ? disc : `NCR-${disc}`;
    if (!mMap.has(classKey))
      mMap.set(classKey, {
        classification: classKey,
        rev0: 0,
        revHigh: 0,
        totalSubs: 0,
        approved: 0,
        rejectedOpen: 0,
        rejectedClosed: 0,
        pending: 0,
        overdue: 0,
      });
    const st = mMap.get(classKey)!;

    const createdDate = new Date(
      latestOfMon.submissionDate || latestOfMon.responseDate || 0,
    );
    const isCreatedBeforeOrInMonth =
      createdDate.getFullYear() < targetMonth.getFullYear() ||
      (createdDate.getFullYear() === targetMonth.getFullYear() &&
        createdDate.getMonth() <= targetMonth.getMonth());

    const isPending = !sentDateStr && !isClosed && isCreatedBeforeOrInMonth;

    if (isSentInMonth) {
      st.totalSubs++;
      const isRev0 = compareRevisions(latestOfMon.rev, '0') === 0;
      if (isRev0) st.rev0++;
      else st.revHigh++;

      if (classification === "Approved Closed" || (isApp && isClosed)) {
        st.approved++;
        classification = "Approved Closed";
      }
      if (classification === "Rejected Open") st.rejectedOpen++;
      if (classification === "Rejected Closed") st.rejectedClosed++;

      // Overdue calculation for sent/closed items
      const submission = latestOfMon.submissionDate;
      if (submission && sentDateStr) {
        const subT = new Date(submission).getTime();
        const sentT = new Date(sentDateStr).getTime();
        if (!isNaN(subT) && !isNaN(sentT)) {
          const daysToSent = Math.floor((sentT - subT) / (1000 * 3600 * 24));
          if (daysToSent > 14) {
            st.overdue++;
          }
        }
      }

      mSubList.push({
        ref: latestOfMon.ncrRef || latestOfMon.docNo,
        trade: disc,
        rev: latestOfMon.rev,
        sentDate: latestOfMon.ncrSentDateCorrectiveAction || "-",
        action: latestOfMon.ncrAction || "-",
        status: latestOfMon.ncrStatus || latestOfMon.status || "Open",
        classification,
      });
    } else if (isPending) {
      st.pending++;
      // Overdue calculation for pending items
      const created = new Date(
        latestOfMon.submissionDate || latestOfMon.responseDate || 0,
      );
      if (!isNaN(created.getTime())) {
        const limitDate = new Date(
          targetMonth.getFullYear(),
          targetMonth.getMonth() + 1,
          0,
          23,
          59,
          59,
        );
        const compareDate = limitDate > new Date() ? new Date() : limitDate;
        const daysOpen = Math.floor(
          (compareDate.getTime() - created.getTime()) / (1000 * 3600 * 24),
        );
        if (daysOpen > 14) {
          st.overdue++;
        }
      }
    }
  });

  const cumArr = Array.from(cumMap.values()).sort(
    (a, b) => b.totalUnique - a.totalUnique,
  );
  const monArr = Array.from(mMap.values())
    .filter((s) => s.totalSubs > 0 || s.pending > 0)
    .sort((a, b) => b.totalSubs - a.totalSubs);

  return {
    cumulative: cumArr,
    monthly: monArr,
    monthlySubmissions: mSubList.sort((a, b) => a.ref.localeCompare(b.ref)),
    monthlyKPIs: {
      totalSubs: monArr.reduce((a, c) => a + c.totalSubs, 0),
      rev0: monArr.reduce((a, c) => a + c.rev0, 0),
      revHigh: monArr.reduce((a, c) => a + c.revHigh, 0),
      approved: monArr.reduce((a, c) => a + c.approved, 0),
      rejectedOpen: monArr.reduce((a, c) => a + c.rejectedOpen, 0),
      rejectedClosed: monArr.reduce((a, c) => a + c.rejectedClosed, 0),
      pending: monArr.reduce((a, c) => a + c.pending, 0),
      criticalDelays: monArr.reduce((a, c) => a + c.overdue, 0),
    },
    cumulativeKPIs: {
      totalUnique: cumArr.reduce((a, c) => a + c.totalUnique, 0),
      open: cumArr.reduce((a, c) => a + c.open, 0),
      closed: cumArr.reduce((a, c) => a + c.closed, 0),
      underReview: cumArr.reduce((a, c) => a + c.underReview, 0),
      approved: cumArr.reduce((a, c) => a + c.approved, 0),
      rejected: cumArr.reduce((a, c) => a + c.rejected, 0),
    },
  };
};
