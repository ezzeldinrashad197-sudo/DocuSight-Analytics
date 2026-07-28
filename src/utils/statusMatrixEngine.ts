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
  
  const rawStatus = (row.status || (row as any).recordStatus || (row as any).ncrStatus || '').trim().toUpperCase();
  if (!rawStatus) {
    return isOverdue ? 'OVERDUE' : 'OPEN';
  }
  
  const config = getProjectStatusMap(projectId);
  const cleanStatus = rawStatus.replace(/["':\-\s]+/g, ' ').trim();
  
  // Flexible token/prefix matching against configured status map
  const isClosed = config.closed.some(s => {
    const sClean = s.toUpperCase().trim();
    return cleanStatus === sClean || cleanStatus.startsWith(sClean + ' ') || cleanStatus.endsWith(' ' + sClean) || (sClean.length >= 3 && cleanStatus.includes(sClean));
  });
  if (isClosed) return 'CLOSED';
  
  const isRejected = config.rejected.some(s => {
    const sClean = s.toUpperCase().trim();
    return cleanStatus === sClean || cleanStatus.startsWith(sClean + ' ') || cleanStatus.endsWith(' ' + sClean) || (sClean.length >= 3 && cleanStatus.includes(sClean));
  });
  if (isRejected) return 'REJECTED';
  
  const isOpen = config.open.some(s => {
    const sClean = s.toUpperCase().trim();
    return cleanStatus === sClean || cleanStatus.startsWith(sClean + ' ') || cleanStatus.endsWith(' ' + sClean) || (sClean.length >= 3 && cleanStatus.includes(sClean));
  });
  if (isOpen) {
    return isOverdue ? 'OVERDUE' : 'OPEN';
  }

  // Fallback protections for standard codes A, B, D -> CLOSED; C -> REJECTED
  if (['A', 'B', 'D'].some(code => cleanStatus === code || cleanStatus.startsWith(code + ' ') || cleanStatus.includes('CODE ' + code) || cleanStatus.includes('APP') || cleanStatus.includes('CLOS'))) {
    return 'CLOSED';
  }
  if (cleanStatus === 'C' || cleanStatus.startsWith('C ') || cleanStatus.includes('CODE C') || cleanStatus.includes('REJ') || cleanStatus.includes('RET')) {
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
    else if (docType.includes('WIR')) days = sla.wir ?? sla.default ?? 14;
    else if (docType.includes('MIR')) days = sla.mir ?? sla.default ?? 14;
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
