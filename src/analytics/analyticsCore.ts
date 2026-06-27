import { SubmittalRow, ProjectSettings } from '../types';
import { getNormalizedStatus, checkIfOverdueDynamically } from '../utils/statusMatrixEngine';
import { getRevisionWeight } from '../utils/enterpriseUpgradeEngine';

export type NormalizedStatus = 'OPEN' | 'CLOSED' | 'REJECTED' | 'OVERDUE' | 'UNKNOWN';

/**
 * Normalized Status Evaluation (Status Matrix Engine)
 */
export const getNormalizedStatusCore = (
  row: SubmittalRow,
  projectId: string,
  settings?: ProjectSettings | null
): NormalizedStatus => {
  return getNormalizedStatus(row, projectId, settings);
};

export const isStatusOpenCore = (
  row: SubmittalRow,
  projectId: string,
  settings?: ProjectSettings | null
): boolean => {
  const norm = getNormalizedStatus(row, projectId, settings);
  return norm === 'OPEN' || norm === 'OVERDUE';
};

export const isStatusClosedCore = (
  row: SubmittalRow,
  projectId: string,
  settings?: ProjectSettings | null
): boolean => {
  return getNormalizedStatus(row, projectId, settings) === 'CLOSED';
};

export const isStatusRejectedCore = (
  row: SubmittalRow,
  projectId: string,
  settings?: ProjectSettings | null
): boolean => {
  return getNormalizedStatus(row, projectId, settings) === 'REJECTED';
};

export const isStatusOverdueCore = (
  row: SubmittalRow,
  settings?: ProjectSettings | null
): boolean => {
  return checkIfOverdueDynamically(row, settings);
};

/**
 * Revision Engine Integration
 */
export const compareRevisions = (revA: string | undefined, revB: string | undefined): number => {
  const weightA = getRevisionWeight(revA);
  const weightB = getRevisionWeight(revB);
  return weightA - weightB;
};

export const getLatestRevision = (rows: SubmittalRow[]): SubmittalRow | undefined => {
  if (!rows || rows.length === 0) return undefined;
  let latest = rows[0];
  for (let i = 1; i < rows.length; i++) {
    if (compareRevisions(rows[i].rev, latest.rev) > 0) {
      latest = rows[i];
    }
  }
  return latest;
};

export const sortRevisions = (rows: SubmittalRow[]): SubmittalRow[] => {
  return [...rows].sort((a, b) => compareRevisions(a.rev, b.rev));
};

/**
 * Lifecycle Consistency Scans (Phase E)
 */
export interface LifecycleValidationResult {
  status: 'Valid' | 'Warning' | 'Critical Error';
  message: string;
  details?: string[];
}

export const validateLifecycle = (row: SubmittalRow): LifecycleValidationResult => {
  const details: string[] = [];
  const subDate = row.submissionDate ? new Date(row.submissionDate).getTime() : null;
  const revDate = row.responseDate ? new Date(row.responseDate).getTime() : null;
  
  const statusStr = (row.status || '').toUpperCase().trim();
  const isApproved = ['APPROVED', 'ACCEPTED', 'CODE A', 'A', 'B'].includes(statusStr);
  const isClosed = ['CLOSED', 'APPROVED', 'ACCEPTED', 'CODE A', 'A', 'B'].includes(statusStr);

  // 1. Response after Issue
  if (subDate && revDate && revDate < subDate) {
    details.push(`Response/Review date (${row.responseDate}) occurs before original Submission Date (${row.submissionDate}).`);
  }

  // 2. Closed before Submitted
  if (isClosed && revDate && subDate && revDate < subDate) {
    details.push(`Document marked Closed/Approved but final response date is before submission.`);
  }

  // 3. Approved before Reviewed (Approved means closed, must have review/response date)
  if (isApproved && !row.responseDate) {
    details.push(`Document approved/accepted without a documented Response/Review Date.`);
  }

  if (details.length > 0) {
    const hasTimelineInversion = details.some(d => d.includes('before') || d.includes('occurs before'));
    return {
      status: hasTimelineInversion ? 'Critical Error' : 'Warning',
      message: hasTimelineInversion ? 'Impossible sequence detected' : 'Lifecycle compliance warning',
      details
    };
  }

  return {
    status: 'Valid',
    message: 'All event logs and timestamps occur in a logically consistent, chronological order.'
  };
};

/**
 * Single Source Document Metrics
 */
export interface DocumentMetrics {
  totalCount: number;
  openCount: number;
  closedCount: number;
  rejectedCount: number;
  overdueCount: number;
}

export const getDocumentMetrics = (
  rows: SubmittalRow[],
  projectId: string,
  settings?: ProjectSettings | null
): DocumentMetrics => {
  let openCount = 0;
  let closedCount = 0;
  let rejectedCount = 0;
  let overdueCount = 0;

  rows.forEach(row => {
    const norm = getNormalizedStatus(row, projectId, settings);
    if (norm === 'OPEN') openCount++;
    else if (norm === 'CLOSED') closedCount++;
    else if (norm === 'REJECTED') rejectedCount++;
    else if (norm === 'OVERDUE') overdueCount++;
  });

  return {
    totalCount: rows.length,
    openCount,
    closedCount,
    rejectedCount,
    overdueCount
  };
};
