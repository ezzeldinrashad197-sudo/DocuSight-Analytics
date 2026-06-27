import { SubmittalRow, ProjectSettings } from '../types';

export interface StatusMapConfig {
  open: string[];
  closed: string[];
  rejected: string[];
}

export const DEFAULT_STATUS_MAP: StatusMapConfig = {
  open: ['DRAFT', 'SUBMITTED', 'UNDER REVIEW', 'PENDING', 'PENDING RESPONSE', 'W', 'WAITING', 'PEND', 'OPEN', 'CODE W'],
  closed: ['APPROVED', 'ACCEPTED', 'CLOSED', 'A', 'B', 'CODE A', 'CODE B', 'APPROVED WITH COMMENTS', 'CLOSED WITH COMMENTS'],
  rejected: ['REJECTED', 'RETURNED', 'C', 'CODE C', 'REJ', 'RETURNED WITH COMMENTS']
};

export const getProjectStatusMap = (projectId: string): StatusMapConfig => {
  if (!projectId) return DEFAULT_STATUS_MAP;
  const saved = localStorage.getItem(`statusMap_${projectId}`);
  return saved ? JSON.parse(saved) : DEFAULT_STATUS_MAP;
};

export const saveProjectStatusMap = (projectId: string, map: StatusMapConfig) => {
  localStorage.setItem(`statusMap_${projectId}`, JSON.stringify(map));
};

export type NormalizedStatus = 'OPEN' | 'CLOSED' | 'REJECTED' | 'OVERDUE' | 'UNKNOWN';

export const getNormalizedStatus = (
  row: SubmittalRow,
  projectId: string,
  projectSettings?: ProjectSettings | null
): NormalizedStatus => {
  const isOverdue = checkIfOverdueDynamically(row, projectSettings);
  
  const rawStatus = (row.status || '').trim().toUpperCase();
  if (!rawStatus) {
    return isOverdue ? 'OVERDUE' : 'OPEN';
  }
  
  const config = getProjectStatusMap(projectId);
  
  // Strict EXACT matching only - absolutely no partial string or wildcard includes() matching.
  const isClosed = config.closed.some(s => s.toUpperCase() === rawStatus);
  if (isClosed) return 'CLOSED';
  
  const isRejected = config.rejected.some(s => s.toUpperCase() === rawStatus);
  if (isRejected) return 'REJECTED';
  
  const isOpen = config.open.some(s => s.toUpperCase() === rawStatus);
  if (isOpen) {
    return isOverdue ? 'OVERDUE' : 'OPEN';
  }

  // Exact fallback protections for safety
  if (['A', 'B', 'CODE A', 'CODE B', 'APPROVED', 'CLOSED', 'ACCEPTED'].includes(rawStatus)) {
    return 'CLOSED';
  }
  if (['C', 'CODE C', 'REJECTED', 'RETURNED', 'REJ'].includes(rawStatus)) {
    return 'REJECTED';
  }
  
  return isOverdue ? 'OVERDUE' : 'OPEN';
};

export const checkIfOverdueDynamically = (
  row: SubmittalRow,
  projectSettings?: ProjectSettings | null
): boolean => {
  const hasResponse = !!row.responseDate;
  if (hasResponse) {
    if (row.dueDate && row.responseDate > row.dueDate) {
      return true;
    }
    return false;
  }
  
  // Hardcoded active reporting today's date for consistent calculations
  const todayStr = '2026-06-21';
  
  let finalDueDate = row.dueDate;
  if (!finalDueDate && row.submissionDate && projectSettings?.slaDays) {
    const sla = projectSettings.slaDays;
    const docType = (row.documentType || '').toUpperCase();
    let days = sla.default || 14;
    
    if (docType.includes('RFI')) days = sla.rfi;
    else if (docType.includes('NCR')) days = sla.ncr;
    else if (docType.includes('SOR')) days = sla.sor;
    else if (docType.includes('SHD') || docType.includes('SHOP')) days = sla.shopDrawings;
    else if (docType.includes('MAR') || docType.includes('MATERIAL')) days = sla.materialSubmittals;
    else if (docType.includes('LET') || docType.includes('LETTER')) days = sla.letters;
    
    const subDate = new Date(row.submissionDate);
    if (!isNaN(subDate.getTime())) {
      subDate.setDate(subDate.getDate() + days);
      finalDueDate = subDate.toISOString().substring(0, 10);
    }
  }
  
  if (finalDueDate && todayStr > finalDueDate) {
    return true;
  }
  return !!row.overdue;
};
