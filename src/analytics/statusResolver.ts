import { SubmittalRow } from '../types';
 
export type CanonicalStatus = 'APPROVED' | 'REJECTED_OPEN' | 'REJECTED_CLOSED' | 'FINAL_CLOSED' | 'PENDING' | 'UNCLASSIFIED';
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
 * 1. Single Row Classifier (SSOT)
 * Evaluates row review outcome strictly from Code.
 * Status is only used to distinguish whether an active Code C rejection is Open or Closed.
 */
export function classifyRow(code?: string, status?: string): CanonicalStatus {
  const c = normalizeCanonicalString(code);
  const s = String(status || '').trim();
  const sUpper = s.toUpperCase();

  if (!c && !s) {
    return 'UNCLASSIFIED';
  }

  let cleanCode = c;
  if (cleanCode.startsWith('CODE ')) {
    cleanCode = cleanCode.substring(5).trim();
  }

  // Code A or Code B or Code D or Closed -> Approved (Code D = Disapproved / Final Closed = No Further Submission)
  if (cleanCode === 'A' || cleanCode === 'B' || cleanCode === 'D' || cleanCode === 'APPROVED' || cleanCode === 'ACCEPTED' || cleanCode === 'DISAPPROVED' || cleanCode === 'CLOSED' || cleanCode === 'CLOSE') {
    return 'APPROVED';
  }

  // Code C -> "revise & resubmit". Status determines whether Open or Closed
  if (cleanCode === 'C' || cleanCode === 'REJECTED' || cleanCode === 'RETURNED' || cleanCode === 'REJ') {
    return (sUpper === 'OPEN' || s === 'Open') ? 'REJECTED_OPEN' : 'REJECTED_CLOSED';
  }

  // Pending / Under review / Waiting / Open
  if (cleanCode === 'W' || cleanCode === 'UNDER REVIEW' || cleanCode === 'PENDING' || cleanCode === 'WAITING' || cleanCode === 'OPEN' || sUpper === 'PENDING' || sUpper === 'UNDER REVIEW' || sUpper === 'WAITING') {
    return 'PENDING';
  }

  if (!cleanCode) {
    return 'UNCLASSIFIED';
  }

  // Fallback for unrecognized codes with review
  return 'PENDING';
}

/**
 * 2. Submission Resolver (Priority across sheets at latest revision)
 */
export function classifySubmission(
  sheetsAtLatestRevision: (CanonicalStatus | string)[]
): CanonicalStatus {
  const normalized = sheetsAtLatestRevision.map(s => String(s).toUpperCase());
   if (normalized.includes('REJECTED_OPEN')) return 'REJECTED_OPEN';   // highest priority — needs action
  if (normalized.includes('REJECTED_CLOSED')) return 'REJECTED_CLOSED'; // rejected via Code C and closed without ever being approved — must NOT collapse into Approved
  if (normalized.includes('PENDING')) return 'PENDING';
  if (normalized.includes('UNCLASSIFIED')) return 'UNCLASSIFIED';
  return 'APPROVED'; // only if every sheet at the latest revision is genuinely approved (Code A/B/D)
}

/**
 * 3. Deterministic Canonical Status Resolver (Section B & L of Master Prompt)
 */
export function getStatusCodeCategory(codeOrRow?: string | SubmittalRow): CanonicalStatus {
  if (!codeOrRow) return 'UNCLASSIFIED';

  let rawCode = '';
  let recordStatus = '';
  let workflowStage = '';
  let action = '';
  let rawStatusCombined = '';
  let isWIR = false;

  if (typeof codeOrRow === 'object') {
    rawCode = normalizeCanonicalString(codeOrRow.code);
    rawStatusCombined = normalizeCanonicalString(codeOrRow.status || (codeOrRow as any).ncrStatus || (codeOrRow as any).sorStatus);
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
    rawStatusCombined = normalizeCanonicalString(codeOrRow);
  }

  if (!rawCode && !rawStatusCombined && !recordStatus && !workflowStage && !action) {
    return 'UNCLASSIFIED';
  }

  // WIR Specific Formula (SSOT Excel Formula: Approved = A + B + D, Rejected = C, Pending = W)
  if (isWIR) {
    const checkStr = rawCode || rawStatusCombined;
    const normalized = checkStr.replace(/["':\-\s]+/g, ' ').trim();
    const hasWord = (word: string) => new RegExp(`(?:^| )${word}(?: |$)`).test(normalized);
    const isClosed = recordStatus === 'CLOSED' || recordStatus === 'CLOSE' || workflowStage === 'CLOSED' || action === 'CLOSED' || hasWord('CLOSED') || hasWord('CLOSE');
    const isCodeD = normalized === 'D' || normalized === 'CODE D' || normalized.startsWith('D ') || normalized.endsWith(' D') || normalized.includes('CODE D') || normalized.includes('DISAPPROVED');

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

  // Determine code and status for general / SDW / MAR / NCR / etc.
  let effectiveCode = rawCode;
  let effectiveStatus = recordStatus || workflowStage || (rawStatusCombined.includes('OPEN') ? 'OPEN' : rawStatusCombined.includes('CLOSED') ? 'CLOSED' : '');

  if (action.includes('REJECT')) {
    effectiveCode = 'C';
  } else if (action.includes('APPROV') || action.includes('ACCEPT')) {
    effectiveCode = 'A';
  } else if (action.includes('DISAPPROV')) {
    effectiveCode = 'D';
  }

  if (!effectiveCode && rawStatusCombined) {
    if (rawStatusCombined.includes(' - ')) {
      const parts = rawStatusCombined.split(' - ');
      effectiveCode = parts[0].trim();
      if (!effectiveStatus) effectiveStatus = parts.slice(1).join(' - ').trim();
    } else if (rawStatusCombined.startsWith('CODE ') && rawStatusCombined.length > 5) {
      const remaining = rawStatusCombined.substring(5).trim();
      const firstToken = remaining.split(' ')[0];
      effectiveCode = firstToken;
      if (!effectiveStatus && remaining.length > firstToken.length) {
        effectiveStatus = remaining.substring(firstToken.length).trim();
      }
    } else if (rawStatusCombined.includes('CLOSED')) {
      effectiveStatus = 'CLOSED';
      const isCodeC = rawStatusCombined === 'C' || rawStatusCombined.startsWith('C ') || rawStatusCombined.endsWith(' C') || rawStatusCombined.includes(' C ') || rawStatusCombined.includes('CODE C') || rawStatusCombined.includes('REJECT');
      const isCodeD = rawStatusCombined === 'D' || rawStatusCombined.startsWith('D ') || rawStatusCombined.endsWith(' D') || rawStatusCombined.includes(' D ') || rawStatusCombined.includes('CODE D') || rawStatusCombined.includes('DISAPPROV');
      const isCodeAB = rawStatusCombined.includes('APPROVED') || rawStatusCombined.includes('ACCEPTED') || rawStatusCombined === 'A' || rawStatusCombined === 'B' || rawStatusCombined.startsWith('A ') || rawStatusCombined.startsWith('B ') || rawStatusCombined.includes('CODE A') || rawStatusCombined.includes('CODE B');
      if (isCodeC) {
        effectiveCode = 'C';
      } else if (isCodeD) {
        effectiveCode = 'D';
      } else if (isCodeAB) {
        effectiveCode = 'A';
      } else {
        effectiveCode = 'CLOSED';
      }
    } else if (rawStatusCombined.includes('OPEN')) {
      effectiveStatus = 'OPEN';
      const isCodeC = rawStatusCombined === 'C' || rawStatusCombined.startsWith('C ') || rawStatusCombined.endsWith(' C') || rawStatusCombined.includes(' C ') || rawStatusCombined.includes('CODE C') || rawStatusCombined.includes('REJECT');
      if (isCodeC) {
        effectiveCode = 'C';
      } else {
        effectiveCode = 'OPEN';
      }
    } else {
      effectiveCode = rawStatusCombined;
    }
  }

  const result = classifyRow(effectiveCode, effectiveStatus);
  return result;
}



/** Canonical adapter for downstream record/KPI models. */
export type RecordNormalizedStatus = 'APPROVED' | 'REJECTED_OPEN' | 'REJECTED_CLOSED' | 'FINAL_CLOSED' | 'PENDING' | 'CLOSED' | 'OPEN' | 'UNCLASSIFIED';

export const getRecordNormalizedStatus = (row: SubmittalRow): RecordNormalizedStatus => {
  const category = getStatusCodeCategory(row);
  if (category === 'APPROVED') return 'APPROVED';
  if (category === 'REJECTED_OPEN') return 'REJECTED_OPEN';
  if (category === 'REJECTED_CLOSED') return 'REJECTED_CLOSED';
  if (category === 'FINAL_CLOSED') return 'FINAL_CLOSED';
  if (category === 'PENDING') return 'PENDING';

  const raw = normalizeCanonicalString(row.status || row.recordStatus || row.workflowStage || row.action);
  if (raw === 'CLOSED' || raw === 'CLOSE') return 'CLOSED';
  if (raw === 'OPEN') return 'OPEN';
  return 'UNCLASSIFIED';
};

export interface NcrClassificationResult {
  status: string;
  isOpen: boolean;
  isClosed: boolean;
  isUnderReview: boolean;
  isApprovedClosed: boolean;
  isRejectedClosed: boolean;
  isRejectedOpen: boolean;
  isPending: boolean;
  isWaiting: boolean;
  isApproved: boolean;
  isRejected: boolean;
}

/** Deterministic NCR / Register status classifier (SSOT Canonical Implementation) */
export const classifyNcrStatus = (rowOrStatus?: any): NcrClassificationResult => {
  if (!rowOrStatus) {
    return {
      status: 'UNKNOWN',
      isOpen: false,
      isClosed: false,
      isUnderReview: false,
      isApprovedClosed: false,
      isRejectedClosed: false,
      isRejectedOpen: false,
      isPending: false,
      isWaiting: false,
      isApproved: false,
      isRejected: false,
    };
  }

  let code = '';
  let action = '';
  let status = '';

  if (typeof rowOrStatus === 'object') {
    code = (rowOrStatus.ncrStatus || rowOrStatus.sorStatus || rowOrStatus.status || rowOrStatus.recordStatus || '').toUpperCase().trim();
    action = (rowOrStatus.ncrAction || rowOrStatus.sorAction || rowOrStatus.action || '').toUpperCase().trim();
    status = (rowOrStatus.status || rowOrStatus.recordStatus || '').toUpperCase().trim();
  } else {
    code = String(rowOrStatus).toUpperCase().trim();
  }

  const closedSet = new Set(['CLOSED', 'CLOSE', 'C CLOSED', 'CODE C CLOSED', 'D CLOSED', 'APPROVED', 'ACCEPTED']);
  const openSet = new Set(['OPEN', 'UNDER INVESTIGATION', 'CORRECTIVE ACTION SUBMITTED', 'REJECTED OPEN', 'C OPEN']);
  const pendingSet = new Set(['W', 'CODE W', 'PENDING', 'WAITING', 'UNDER REVIEW', 'WAITING CONSULTANT']);
  const approvedSet = new Set(['A', 'B', 'CODE A', 'CODE B', 'APPROVED', 'ACCEPTED', 'APPROVED WITH COMMENTS', 'CLOSED WITH COMMENTS']);
  const rejectedSet = new Set(['C', 'CODE C', 'D', 'CODE D', 'REJECTED', 'RETURNED', 'REJECTED OPEN', 'REJECTED CLOSED', 'C CLOSED', 'C OPEN']);

  const isClosedStatus = closedSet.has(code) || closedSet.has(status) || action === 'APPROVED';
  const isOpenStatus = openSet.has(code) || openSet.has(status);
  const isPendingStatus = pendingSet.has(code) || pendingSet.has(status) || action === 'UNDER REVIEW';
  const isApproved = approvedSet.has(code) || approvedSet.has(status) || action === 'APPROVED';
  const isRejected = rejectedSet.has(code) || rejectedSet.has(status) || action === 'REJECTED';

  if (isPendingStatus || action === 'UNDER REVIEW') {
    return {
      status: 'Pending',
      isOpen: true,
      isClosed: false,
      isUnderReview: true,
      isApprovedClosed: false,
      isRejectedClosed: false,
      isRejectedOpen: false,
      isPending: true,
      isWaiting: true,
      isApproved: false,
      isRejected: false
    };
  }

  if (isRejected && (isOpenStatus || (!isClosedStatus && !isApproved))) {
    return {
      status: 'Rejected Open',
      isOpen: false,
      isClosed: false,
      isUnderReview: false,
      isApprovedClosed: false,
      isRejectedClosed: false,
      isRejectedOpen: true,
      isPending: false,
      isWaiting: false,
      isApproved: false,
      isRejected: true
    };
  }

  if (isApproved || (isClosedStatus && !isRejected)) {
    return {
      status: 'Approved Closed',
      isOpen: false,
      isClosed: true,
      isUnderReview: false,
      isApprovedClosed: true,
      isRejectedClosed: false,
      isRejectedOpen: false,
      isPending: false,
      isWaiting: false,
      isApproved: true,
      isRejected: false
    };
  }

  if (isRejected && isClosedStatus) {
    return {
      status: 'Rejected Closed',
      isOpen: false,
      isClosed: true,
      isUnderReview: false,
      isApprovedClosed: false,
      isRejectedClosed: true,
      isRejectedOpen: false,
      isPending: false,
      isWaiting: false,
      isApproved: false,
      isRejected: true
    };
  }

  if (isOpenStatus) {
    return {
      status: 'Open',
      isOpen: true,
      isClosed: false,
      isUnderReview: false,
      isApprovedClosed: false,
      isRejectedClosed: false,
      isRejectedOpen: false,
      isPending: false,
      isWaiting: false,
      isApproved: false,
      isRejected: false
    };
  }

  return {
    status: 'Closed',
    isOpen: false,
    isClosed: true,
    isUnderReview: false,
    isApprovedClosed: true,
    isRejectedClosed: false,
    isRejectedOpen: false,
    isPending: false,
    isWaiting: false,
    isApproved: true,
    isRejected: false
  };
};
