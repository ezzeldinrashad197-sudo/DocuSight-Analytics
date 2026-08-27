import { SubmittalRow, KPIStats } from '../types';
import { 
  buildCanonicalDataset, 
  evaluateSubmissionLayer, 
  evaluatePerformanceLayer, 
  getBusinessEntityKey, 
  parseDateTimestamp, 
  calculateCanonicalKPIs,
  calculateStats as calcStatsFoundation,
  calculateNCRStats as calcNCRStatsFoundation,
  calculateSORStats as calcSORStatsFoundation,
  calculateLTRStats as calcLTRStatsFoundation,
  resolveRowDiscipline,
  resolveCanonicalTrade
} from "../analytics/calculationFoundation";
export { parseDateTimestamp, buildCanonicalDataset, evaluateSubmissionLayer, evaluatePerformanceLayer, getBusinessEntityKey, calculateCanonicalKPIs, resolveRowDiscipline, resolveCanonicalTrade };
import { compareRevisions } from "../analytics/analyticsCore";
import { compareRevisionsCanonical, getRevisionWeight } from "../analytics/revisionResolver";
import { mapDocumentToWorkflow } from "./workflowMapping";
import { getStatusCodeCategory, getStatusCategory, getRecordNormalizedStatus, classifyNcrStatus, NcrClassificationResult } from '../analytics/statusResolver';
export { getStatusCodeCategory, getStatusCategory, getRecordNormalizedStatus, classifyNcrStatus, compareRevisions, compareRevisionsCanonical, getRevisionWeight, mapDocumentToWorkflow };
export type { NcrClassificationResult };

export const getUniqueNCRs = (rows: SubmittalRow[]): SubmittalRow[] => {
  if (!rows || rows.length === 0) return [];
  const map = new Map<string, SubmittalRow[]>();
  rows.forEach(r => {
    const ref = (r.ncrRef || (r as any).docNo || r.id || '').trim().toUpperCase();
    if (!map.has(ref)) {
      map.set(ref, []);
    }
    map.get(ref)!.push(r);
  });
  const result: SubmittalRow[] = [];
  map.forEach((list) => {
    list.sort((a, b) => compareRevisionsCanonical(a.rev, b.rev));
    result.push(list[list.length - 1]);
  });
  return result;
};

export const calculateStats = (rows: SubmittalRow[], fullDataset?: SubmittalRow[]): KPIStats & { totalUniqueDrawings: number } => {
  return calcStatsFoundation(rows, fullDataset);
};

export const calculateNCRStats = (rows: SubmittalRow[], fullDataset?: SubmittalRow[] | boolean): any => {
  return calcNCRStatsFoundation(rows, fullDataset);
};

export const calculateSORStats = (rows: SubmittalRow[], fullDataset?: SubmittalRow[] | boolean): any => {
  return calcSORStatsFoundation(rows, fullDataset);
};

export const calculateLTRStats = (rows: SubmittalRow[], fullDataset?: SubmittalRow[] | boolean): any => {
  return calcLTRStatsFoundation(rows, fullDataset);
};

export const normalizeData = (rows: SubmittalRow[]): SubmittalRow[] => {
  if (!rows || rows.length === 0) return [];
  
  // Group rows by docNoUpper to find highest revision
  const docHistory = new Map<string, string[]>();
  rows.forEach(r => {
    const docNoUpper = (r.docNo || (r as any).ncrRef || (r as any).sorRef || (r as any).rfiRef || r.id || '').trim().toUpperCase();
    const revUpper = (r.rev || '').trim().toUpperCase();
    if (!docHistory.has(docNoUpper)) {
      docHistory.set(docNoUpper, []);
    }
    const list = docHistory.get(docNoUpper)!;
    if (!list.includes(revUpper)) {
      list.push(revUpper);
    }
  });

  return rows.map(r => {
    const docNoUpper = (r.docNo || (r as any).ncrRef || (r as any).sorRef || (r as any).rfiRef || r.id || '').trim().toUpperCase();
    const revUpper = (r.rev || '').trim().toUpperCase();
    const allRevs = docHistory.get(docNoUpper) || [];
    allRevs.sort((a, b) => compareRevisionsCanonical(b, a));

    const latestRev = allRevs[0];
    const isLatestRev = revUpper === latestRev;

    // Resolve Canonical Trade & DocumentType via Unified SSOT
    const resolved = resolveCanonicalTrade(r);
    const trade = resolved.trade || r.trade;
    const tradeShort = resolved.tradeShort || (r as any).tradeShort || '';
    const logType = (r.logType || (r as any).compositeIdentity?.family || 'SDW').toUpperCase();

    const basePrefix = logType.startsWith('SDW') ? 'SDW' : (logType.startsWith('WIR') ? 'WIR' : (logType.startsWith('MIR') ? 'MIR' : (logType.startsWith('NCR') ? 'NCR' : (logType.startsWith('SOR') ? 'SOR' : (logType.startsWith('RFI') ? 'RFI' : logType)))));
    const documentType = tradeShort ? `${basePrefix}-${tradeShort}` : (r.documentType || basePrefix);

    const revWeight = getRevisionWeight(revUpper);
    const isRev0 = revWeight === 0 && revUpper !== 'AS-BUILT' && revUpper !== 'IFC';

    // Derive canonical status category
    const cat = getStatusCodeCategory(r);
    let workflowStage = r.workflowStage || '';
    if (!workflowStage) {
      if (cat === 'APPROVED') workflowStage = 'Approved';
      else if (cat === 'REJECTED_OPEN' || cat === 'REJECTED_CLOSED') workflowStage = 'Rejected';
      else if (cat === 'PENDING') workflowStage = 'Pending';
      else workflowStage = 'Pending';
    }

    const submissionDate = r.submissionDate || '';
    const responseDate = r.responseDate || '';
    const dueDate = r.dueDate || '';
    const delayDays = r.delayDays || getDelayDays(submissionDate, responseDate, dueDate);
    const isStatusActive = cat === 'PENDING' || cat === 'REJECTED_OPEN';
    const computedOverdue = isStatusActive && (dueDate ? (parseDateTimestamp(dueDate) > 0 && Date.now() > parseDateTimestamp(dueDate)) : checkIfOverdueDynamically(submissionDate, responseDate, 14));
    const overdue = isStatusActive ? (r.overdue !== undefined ? Boolean(r.overdue) : computedOverdue) : false;

    return {
      ...r,
      trade: trade || r.trade,
      tradeShort: tradeShort || (r as any).tradeShort,
      documentType,
      workflowStage,
      delayDays,
      overdue,
      isLatestRev,
      isRev0
    };
  });
};

export const getDelayDays = (submission: string, response: string, due: string, asOfDate?: Date | string): number => {
  if (!submission) return 0;
  const start = new Date(submission).getTime();
  let target: number;
  if (response) {
    target = new Date(response).getTime();
  } else {
    const reportingDate = asOfDate ? new Date(asOfDate) : new Date();
    target = isNaN(reportingDate.getTime()) ? new Date().getTime() : reportingDate.getTime();
  }
  if (isNaN(start) || isNaN(target)) return 0;
  const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
};

export const getMonthStr = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const calculateProjectPerformanceHealth = (
  globalStats: { approvalRate: number; pending: number; overdue: number; totalSubmittedSheets?: number; totalUniqueDrawings?: number },
  language: string = 'en'
) => {
  const appRate = globalStats.approvalRate || 0;
  const totalOverdue = globalStats.overdue || 0;
  const totalSubmitted = globalStats.totalSubmittedSheets || 0;

  let score = 100;
  // Penalty 1: Low approval rate (up to 35 points penalty, benchmark 80%)
  const approvalPenalty = appRate >= 80 ? 0 : Math.min(35, ((80 - appRate) / 80) * 35);
  score -= approvalPenalty;

  // Penalty 2: SLA Overdue ratio among total items (capped at 35 points max)
  const totalBase = globalStats.totalUniqueDrawings || totalSubmitted || 1;
  const overdueRatio = totalBase > 0 ? (totalOverdue / totalBase) : 0;
  const pendingOverduePenalty = Math.min(35, overdueRatio * 100 * 0.7);
  score -= pendingOverduePenalty;

  // Penalty 3: Overdue density relative to total workload sheets (capped at 30 points max)
  let overdueDensityPenalty = 0;
  if (totalSubmitted > 0) {
    overdueDensityPenalty = Math.min(30, (totalOverdue / totalSubmitted) * 100 * 0.5);
    score -= overdueDensityPenalty;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let ratingEn = "STABLE / EXCELLENT";
  let ratingAr = "مستقر وممتاز";
  let healthColor = "10B981";
  let colorClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
  let textClass = "text-emerald-600";

  if (finalScore >= 80) {
    ratingEn = "STABLE / EXCELLENT";
    ratingAr = "مستقر وممتاز";
    healthColor = "10B981";
    colorClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
    textClass = "text-emerald-600";
  } else if (finalScore >= 65) {
    ratingEn = "GOOD / SATISFACTORY";
    ratingAr = "جيد / أداء مقبول";
    healthColor = "2F75B5";
    colorClass = "bg-blue-50 text-blue-800 border-blue-200";
    textClass = "text-blue-600";
  } else if (finalScore >= 45) {
    ratingEn = "UNDER OBSERVATION";
    ratingAr = "تحت الملاحظة والمتابعة";
    healthColor = "F59E0B";
    colorClass = "bg-amber-50 text-amber-800 border-amber-200";
    textClass = "text-amber-600";
  } else {
    ratingEn = "CRITICAL RISK / BOTTLENECK";
    ratingAr = "مخاطر عالية / تكدس حرج";
    healthColor = "E11D48";
    colorClass = "bg-rose-50 text-rose-800 border-rose-200";
    textClass = "text-rose-600";
  }

  return {
    score: finalScore,
    rating: language === 'ar' ? ratingAr : ratingEn,
    ratingEn,
    ratingAr,
    color: healthColor,
    colorClass,
    textClass,
    breakdown: {
      approvalPenalty: Math.round(approvalPenalty),
      pendingOverduePenalty: Math.round(pendingOverduePenalty),
      overdueDensityPenalty: Math.round(overdueDensityPenalty)
    }
  };
};

export const checkIfOverdueDynamically = (submission: string, response: string, thresholdDays = 14): boolean => {
  const days = getDelayDays(submission, response, '');
  return days > thresholdDays;
};
export const getClosedOpenByDocType = (docType: string, s: { totalSubmittedSheets?: number; pending?: number; approved?: number; rejectedOpen?: number; rejectedClosed?: number }): { closed: number; open: number } => { const closed = docType === 'RFI' ? ((s.totalSubmittedSheets || 0) - (s.pending || 0)) : (docType === 'NCR' || docType === 'SOR' ? (s.approved || 0) : (s.approved || 0) + (s.rejectedClosed || 0)); const open = docType === 'NCR' || docType === 'SOR' ? (s.rejectedOpen || 0) : (docType === 'RFI' ? (s.pending || 0) : (s.rejectedOpen || 0) + (s.pending || 0)); return { closed, open }; };
