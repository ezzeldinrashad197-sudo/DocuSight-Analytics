import { SubmittalRow } from '../types';
 
export type CanonicalStatus = 'APPROVED' | 'REJECTED_OPEN' | 'REJECTED_CLOSED' | 'PENDING' | 'UNCLASSIFIED';
export type StatusCategory = 'OPEN' | 'CLOSED' | 'REJECTED' | 'UNKNOWN';

/**
 * Canonical string normalization: converts any input into trimmed uppercase string.
 * Ensures consistent case-insensitivity across all registers and engines (e.g. 'C' vs 'c', 'W' vs 'w').
 */
export const normalizeCanonicalString = (val: unknown): string => {
  return String(val ?? '').trim().toUpperCase();
};

/** Exact project/status-map category resolver. No partial matching and no unsafe OPEN fallback. */
export const getStatusCategory = (
  rawStatus: string | undefined | null,
  config: { open: string[]; closed: string[]; rejected: string[] } = {
    open: ['DRAFT', 'SUBMITTED', 'UNDER REVIEW', 'PENDING', 'PENDING RESPONSE', 'W', 'WAITING', 'PEND', 'OPEN', 'CODE W'],
    closed: ['APPROVED', 'ACCEPTED', 'CLOSED', 'A', 'B', 'CODE A', 'CODE B', 'APPROVED WITH COMMENTS', 'CLOSED WITH COMMENTS'],
    rejected: ['REJECTED', 'RETURNED', 'C', 'CODE C', 'REJ', 'RETURNED WITH COMMENTS']
  }
): StatusCategory => {
  const val = normalizeCanonicalString(rawStatus);
  if (!val) return 'UNKNOWN';
  if (config.closed.some(s => normalizeCanonicalString(s) === val)) return 'CLOSED';
  if (config.rejected.some(s => normalizeCanonicalString(s) === val)) return 'REJECTED';
  if (config.open.some(s => normalizeCanonicalString(s) === val)) return 'OPEN';
  return 'UNKNOWN';
};

/**
 * 2. Deterministic Canonical Status Resolver (Section B & L of Master Prompt)
 */
export function getStatusCodeCategory(codeOrRow?: string | SubmittalRow): 'APPROVED' | 'REJECTED_OPEN' | 'REJECTED_CLOSED' | 'PENDING' | 'UNCLASSIFIED' {
  if (!codeOrRow) return 'UNCLASSIFIED';

  let code = '';
  let recordStatus = '';
  let workflowStage = '';
  let action = '';
  let isWIR = false;

  if (typeof codeOrRow === 'object') {
    code = normalizeCanonicalString(codeOrRow.status || (codeOrRow as any).ncrStatus || (codeOrRow as any).sorStatus);
    recordStatus = normalizeCanonicalString(codeOrRow.recordStatus);
    workflowStage = normalizeCanonicalString(codeOrRow.workflowStage);
    action = normalizeCanonicalString(codeOrRow.action || (codeOrRow as any).ncrAction || (codeOrRow as any).sorAction);

    const family = normalizeCanonicalString(codeOrRow.workflowFamily);
    const docType = normalizeCanonicalString(codeOrRow.documentType);
    const logType = normalizeCanonicalString(codeOrRow.logType);
    const docNo = normalizeCanonicalString(codeOrRow.docNo);
    const rawIdentity = normalizeCanonicalString((codeOrRow as any).rawSourceIdentity);
    const sourceFile = normalizeCanonicalString((codeOrRow as any).sourceFile);

    isWIR = (
      family === 'WIR' ||
      docType.includes('WIR') ||
      logType.includes('WIR') ||
      docNo.includes('WIR') ||
      rawIdentity.includes('WIR') ||
      sourceFile.includes('WIR')
    );
  } else {
    code = normalizeCanonicalString(codeOrRow);
  }

  if (!code && !recordStatus && !workflowStage && !action) {
    return 'UNCLASSIFIED';
  }

  const normalized = code.replace(/["':\-\s]+/g, ' ').trim();
  const hasWord = (word: string) => new RegExp(`(?:^| )${word}(?: |$)`).test(normalized);
  const isClosed = recordStatus === 'CLOSED' || recordStatus === 'CLOSE' || workflowStage === 'CLOSED' || action === 'CLOSED' || hasWord('CLOSED') || hasWord('CLOSE');
  const isOpen = recordStatus === 'OPEN' || workflowStage === 'OPEN' || action === 'OPEN' || hasWord('OPEN');

  const isCodeD = normalized === 'D' || normalized === 'CODE D' || normalized.startsWith('D ') || normalized.endsWith(' D') || normalized.includes('CODE D') || normalized.includes('DISAPPROVED');

  // WIR Specific Formula (SSOT Excel Formula: Approved = A + B + D, Rejected = C, Pending = W)
  if (isWIR) {
    // In WIR, Code A, B, and D are Approved
    if (['A', 'B', 'CODE A', 'CODE B'].includes(normalized) || 
        hasWord('A') || hasWord('B') ||
        hasWord('APPROVED') || hasWord('ACCEPTED') || hasWord('SUPERSEDED') ||
        workflowStage === 'APPROVED' || isCodeD) {
      return 'APPROVED';
    }

    // In WIR, Code C is Rejected (divided into Open / Closed based on actual status)
    if (normalized === 'C' || normalized === 'CODE C' || normalized.startsWith('C ') || normalized.endsWith(' C') || normalized.includes('CODE C') || normalized.includes('REJ') || normalized.includes('REJECT')) {
      if (isClosed) return 'REJECTED_CLOSED';
      return 'REJECTED_OPEN';
    }

    // In WIR, Code W is Pending
    if (['W', 'CODE W'].includes(normalized) || hasWord('W') ||
        hasWord('PENDING') || hasWord('WAITING') || hasWord('REVIEW') || normalized === 'UNDER REVIEW' ||
        workflowStage === 'PENDING' || workflowStage === 'WAITING' || action === 'UNDER REVIEW') {
      return 'PENDING';
    }

    return 'UNCLASSIFIED';
  }

  // Non-WIR Document / Material Submittals Logic:
  const isRejectedCode = ['C', 'CODE C', 'D', 'CODE D'].includes(normalized) ||
                         action === 'REJECTED' || action.includes('REJECT') ||
                         isCodeD || hasWord('C') || (hasWord('CODE') && hasWord('C')) ||
                         hasWord('REJECTED') || hasWord('RETURNED') || hasWord('DISAPPROVED');

  // If it is a rejected code (Code C, Code D, Rejected, Disapproved):
  if (isRejectedCode) {
    // If explicitly marked or containing OPEN and NOT closed -> REJECTED_OPEN
    if (isOpen && !isClosed) {
      return 'REJECTED_OPEN';
    }
    // If explicitly marked CLOSED -> REJECTED_CLOSED
    if (isClosed) {
      return 'REJECTED_CLOSED';
    }
    // Default fallback when neither OPEN nor CLOSED is explicitly specified:
    // Code D / Disapproved defaults to REJECTED_CLOSED
    // Code C defaults to REJECTED_OPEN
    if (isCodeD) {
      return 'REJECTED_CLOSED';
    }
    return 'REJECTED_OPEN';
  }

  // 3. APPROVED (Code A, Code B, Approved, Accepted)
  if (['A', 'B', 'CODE A', 'CODE B'].includes(normalized) ||
      hasWord('A') || hasWord('B') || hasWord('APPROVED') || hasWord('ACCEPTED') || hasWord('SUPERSEDED') ||
      workflowStage === 'APPROVED' || action === 'APPROVED' || action.includes('APPROV') ||
      (isClosed && !isRejectedCode)) {
    return 'APPROVED';
  }

  // 4. PENDING (Code W, Waiting, Under Review, Pending)
  if (['W', 'CODE W'].includes(normalized) || hasWord('W') ||
      hasWord('PENDING') || hasWord('WAITING') || hasWord('REVIEW') || normalized === 'UNDER REVIEW' ||
      workflowStage === 'PENDING' || workflowStage === 'WAITING' || action === 'UNDER REVIEW' || action.includes('REVIEW') || action.includes('WAIT')) {
    return 'PENDING';
  }

  return 'UNCLASSIFIED';
}



/** Canonical adapter for downstream record/KPI models. */
export type RecordNormalizedStatus = 'APPROVED' | 'REJECTED_OPEN' | 'REJECTED_CLOSED' | 'PENDING' | 'CLOSED' | 'OPEN' | 'UNCLASSIFIED';

export const getRecordNormalizedStatus = (row: SubmittalRow): RecordNormalizedStatus => {
  const category = getStatusCodeCategory(row);
  if (category === 'APPROVED') return 'APPROVED';
  if (category === 'REJECTED_OPEN') return 'REJECTED_OPEN';
  if (category === 'REJECTED_CLOSED') return 'REJECTED_CLOSED';
  if (category === 'PENDING') return 'PENDING';

  const raw = normalizeCanonicalString(row.status || row.recordStatus || row.workflowStage || row.action);
  if (raw === 'CLOSED' || raw === 'CLOSE') return 'CLOSED';
  if (raw === 'OPEN') return 'OPEN';
  return 'UNCLASSIFIED';
};

/** Deterministic NCR / Register status classifier */
export const classifyNcrStatus = (rowOrStatus?: any): 'OPEN' | 'CLOSED' | 'UNKNOWN' => {
  if (!rowOrStatus) return 'UNKNOWN';
  const cat = getStatusCodeCategory(rowOrStatus);
  if (cat === 'APPROVED' || cat === 'REJECTED_CLOSED') return 'CLOSED';
  if (cat === 'REJECTED_OPEN' || cat === 'PENDING') return 'OPEN';
  const raw = normalizeCanonicalString(typeof rowOrStatus === 'object' ? (rowOrStatus?.status || rowOrStatus?.recordStatus || rowOrStatus?.ncrStatus) : rowOrStatus);
  if (raw === 'CLOSED' || raw === 'CLOSE') return 'CLOSED';
  if (raw === 'OPEN') return 'OPEN';
  return 'UNKNOWN';
};
