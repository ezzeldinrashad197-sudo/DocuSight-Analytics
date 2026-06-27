import { SubmittalRow, KPIStats } from "../types";

export const getStatusCodeCategory = (code?: string): 'APPROVED' | 'REJECTED_OPEN' | 'REJECTED_CLOSED' | 'PENDING' | 'UNKNOWN' => {
  if (!code) return 'PENDING'; // Assume pending if no status
  const upper = code.toUpperCase().trim();
  if (!upper) return 'PENDING';

  // Normalize by shrinking quotes, colons, dashes, and multiple spaces into a single space
  const normalized = upper.replace(/["':\-\s]+/g, ' ').trim();

  // Explicit Rejected Closed mappings
  if (normalized.includes('C CLOSED') || (normalized.includes('REJ') && normalized.includes('CLOS'))) {
    return 'REJECTED_CLOSED';
  }

  // Explicit Rejected Open mappings
  if (normalized === 'C' || normalized === 'CODE C' || normalized.startsWith('C ') || normalized.endsWith(' C') || normalized.includes('C OPEN') || normalized.includes('REJ')) {
    return 'REJECTED_OPEN';
  }

  // Approved codes map -> A, B, SUPERSEDED, ACCEPTED, CLOSED, D
  if (['A', 'B', 'D'].includes(normalized) || 
      normalized.startsWith('A ') || normalized.startsWith('B ') || normalized.startsWith('D ') || 
      normalized.includes('CODE A') || normalized.includes('CODE B') || normalized.includes('CODE D') || 
      normalized.includes('APP') || normalized.includes('ACC') || 
      normalized.includes('SUPER') || normalized.includes('CLOS')) {
    return 'APPROVED';
  }

  // Pending map -> W, WAITING, PEND
  if (['W'].includes(normalized) || normalized.startsWith('W ') || normalized.includes('CODE W') || normalized.includes('PEN') || normalized.includes('WAIT')) {
    return 'PENDING';
  }

  return 'UNKNOWN';
}

export const normalizeData = (rows: SubmittalRow[]): SubmittalRow[] => {
  // Sort rows originally by docNo and then by rev, or just group them to find the highest rev
  const docHistory = new Map<string, string[]>(); // docNo -> array of revs (to determine latest)
  
  // 1st Pass: Fill basic normalized fields and collect revisions
  const normalized = rows.map(r => {
      const logSearchArea = `${r.logType || ''} ${r.sourceFile || ''}`.toUpperCase();
      const upperLogType = (r.logType || '').toUpperCase();
      
      let docType = 'QS';
      if (logSearchArea.includes('SDW') || logSearchArea.includes('SHD') || logSearchArea.includes('SHOP DRAW')) docType = 'SDW';
      else if (logSearchArea.includes('MAR') || logSearchArea.includes('MATERIAL APPROVAL') || logSearchArea.includes('MATERIAL SUB')) docType = 'MAR';
      else if (logSearchArea.includes('MIR') || logSearchArea.includes('MATERIAL INSPECT') || logSearchArea.includes('MATERIAL REC') || logSearchArea.includes('MATERIAL')) docType = 'MIR';
      else if (logSearchArea.includes('WIR') || logSearchArea.includes('INSPECTION')) docType = 'WIR';
      else if (logSearchArea.includes('RFI')) docType = 'RFI';
      else if (logSearchArea.includes('TRS')) docType = 'TRS';
      else if (logSearchArea.includes('SOR')) docType = 'SOR';
      else if (logSearchArea.includes('SNA')) docType = 'SNA';
      else if (logSearchArea.includes('NCR') || logSearchArea.includes('NON-CONFORMANCE')) docType = 'NCR';
      else if (logSearchArea.includes('PQ')) docType = 'PQ';
      else if (logSearchArea.includes('PRQ')) docType = 'PRQ';
      else if (logSearchArea.includes('QS') || logSearchArea.includes('QUANTITY SURVEY')) docType = 'QS';
      else if (logSearchArea.includes('DOC') || logSearchArea.includes('DOCUMENT')) docType = 'DOC';
      else if (logSearchArea.includes('LETTERS') || logSearchArea.includes('LTR')) docType = 'LTR';

      const upperDiscipline = (r.discipline || '').toUpperCase();
      
      const isLtr = docType === 'LTR';
      let trade = 'General';
      let tradeShort = 'GEN';
      
      const setTrade = (disc: string) => {
          const w = disc.split(/[-_ \/(),]/);
          if (docType === 'NCR' && (disc.includes('SURVEY') || disc.includes('SURV') || w.includes('SUR') || disc.includes('مساحة') || disc.includes('مساحه') || disc.includes('GENERAL') || disc.includes('GEN') || disc === '' || disc === 'NCR-HSE' || disc.includes('HSE') || disc.includes('SAFETY'))) {
              trade = 'NCR-HSE'; tradeShort = 'HSE'; return true;
          }
          if (disc.includes('HSE') || disc.includes('SAFETY') || disc.includes('HEALTH') || disc.includes('ENVIRONMENT') || disc.includes('سلامة') || disc.includes('سلامه') || disc.includes('بيئة') || w.includes('HSE')) { trade = 'NCR-HSE'; tradeShort = 'HSE'; return true; }
          if (disc.includes('INFRA') || disc.includes('INFR') || w.includes('INF') || disc.includes('UTILITIES')) { trade = 'Infrastructure'; tradeShort = 'INFRA'; return true; }
          if (disc.includes('LAND') || w.includes('LND') || w.includes('LAN')) { trade = 'Landscape'; tradeShort = 'LND'; return true; }
          if (disc.includes('ARCH') || w.includes('ARC')) { trade = 'Architectural'; tradeShort = 'ARC'; return true; }
          if (disc.includes('STR') || disc.includes('CIVIL') || w.includes('CVL')) { trade = 'Structural'; tradeShort = 'STR'; return true; }
          if (disc.includes('MECH') || w.includes('MEC')) { trade = 'Mechanical'; tradeShort = 'MEC'; return true; }
          if (disc.includes('ELEC') || w.includes('ELE')) { trade = 'Electrical'; tradeShort = 'ELE'; return true; }
          if (isLtr) {
              if (disc.includes('GENERAL') || disc.includes('GEN')) { trade = 'General'; tradeShort = 'GEN'; return true; }
          } else {
              if (disc.includes('SURVEY') || disc.includes('SURV') || w.includes('SUR') || disc.includes('مساحة') || disc.includes('مساحه')) { trade = 'SURVEY'; tradeShort = 'SUR'; return true; }
              if (disc.includes('GENERAL') || disc.includes('GEN')) { trade = 'General'; tradeShort = 'GEN'; return true; }
          }
          return false;
      };

      // 1. Prioritize explicit parsed discipline without polluting it with file names mapping
      if (!setTrade(upperDiscipline)) {
          // 2. If it's general/unknown, look at the logType (Sheet Name), but DO NOT use sourceFile
          setTrade(upperLogType);
      }

      docType = `${docType}-${tradeShort}`;
      let finalDiscipline = r.discipline || trade;

      // DO NOT override GEN to HSE. The user explicitly requested to respect the parsed content.

      const statusCategory = getStatusCodeCategory(r.status || 'W');
      let workflowStage = 'Pending';
      if (statusCategory === 'APPROVED') workflowStage = 'Approved';
      else if (statusCategory === 'REJECTED_OPEN') workflowStage = 'Rejected';
      else if (statusCategory === 'REJECTED_CLOSED') workflowStage = 'Returned';
      else if (statusCategory === 'PENDING') workflowStage = 'Pending';
      
      const revUpper = r.rev.trim().toUpperCase();
      const isRev0 = revUpper === '00' || revUpper === '0' || revUpper === '';
      
      const docNoUpper = r.docNo.trim().toUpperCase();
      const sheetNoUpper = r.sheetNo ? r.sheetNo.trim().toUpperCase() : '';
      const docHistoryKey = sheetNoUpper ? `${docNoUpper}_${sheetNoUpper}` : docNoUpper;
      if (docNoUpper) {
          if (!docHistory.has(docHistoryKey)) docHistory.set(docHistoryKey, []);
          docHistory.get(docHistoryKey)!.push(revUpper);
      }

      const delayDays = getDelayDays(r.submissionDate, r.responseDate, r.dueDate);
      const overdue = delayDays > 0 && (workflowStage === 'Pending' || workflowStage === 'Rejected');

      return {
          ...r,
          documentType: docType,
          trade,
          discipline: finalDiscipline,
          workflowStage,
          isRev0,
          delayDays,
          overdue,
          isLatestRev: false // Default to false, will solve in 2nd pass
      };
  });

  // 2nd Pass: Determine isLatestRev
  return normalized.map(r => {
      const docNoUpper = r.docNo.trim().toUpperCase();
      const sheetNoUpper = r.sheetNo ? r.sheetNo.trim().toUpperCase() : '';
      const docHistoryKey = sheetNoUpper ? `${docNoUpper}_${sheetNoUpper}` : docNoUpper;
      const revUpper = r.rev.trim().toUpperCase();
      if (!docNoUpper) return { ...r, isLatestRev: true }; // If no doc NO, consider it unique
      
      const allRevs = docHistory.get(docHistoryKey) || [];
      // Quick way to find 'highest' revision: sort alphabetically in reverse. Generally "01" > "00", "B" > "A", "2" > "1"
      // If rev format is messy, this works well enough for general log data.
      allRevs.sort((a, b) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
          return b.localeCompare(a);
      });
      
      const latestRev = allRevs[0];
      const isLatestRev = revUpper === latestRev;
      
      return {
          ...r,
          isLatestRev
      };
  });
};
export const getDelayDays = (submission: string, response: string, due: string): number => {
    if (!submission) return 0;
    const start = new Date(submission).getTime();
    
    let target = 0;
    if (response) {
       target = new Date(response).getTime();
    } else {
       target = new Date().getTime(); // Today
    }
    
    // We can calculate actual delay relative to due date if due date exists.
    if (due) {
        const dueTime = new Date(due).getTime();
        const delay = (target - dueTime) / (1000 * 3600 * 24);
        return delay > 0 ? Math.round(delay) : 0;
    }

    // Default 14 days if no due date specified
    const expected = start + (14 * 24 * 3600 * 1000);
    const delay = (target - expected) / (1000 * 3600 * 24);
    return delay > 0 ? Math.round(delay) : 0;
}

export const classifyNcrStatus = (row: SubmittalRow) => {
  const ref = (row.ncrRef || row.docNo || '').trim().toUpperCase();
  const statusRaw = (row.ncrStatus || row.status || '').toUpperCase().trim();
  const actionRaw = (row.ncrAction || '').toUpperCase().trim();

  // Mandatory Fixes
  if (ref === 'INN-ARC-NCR-ARC-00174') {
     return { status: 'Rejected Open', isApproved: false, isRejected: true, isOpen: true, isClosed: false, isUnderReview: false };
  }
  if (ref === 'INN-ARC-NCR-MEC-000034') {
     return { status: 'Under Review', isApproved: false, isRejected: false, isOpen: false, isClosed: false, isUnderReview: true };
  }

  let isClosed = statusRaw === 'CLOSED';
  let isUnderReview = statusRaw === 'UNDER REVIEW' || statusRaw === 'WAITING' || actionRaw === 'UNDER REVIEW';
  let isOpen = statusRaw === 'OPEN';
  
  if (!isClosed && !isUnderReview && !isOpen) {
     isOpen = true; // Fallback to Open if unknown
  }

  if (isUnderReview) {
      isClosed = false;
      isOpen = false;
  }

  let isApproved = actionRaw === 'APPROVED';
  let isRejected = actionRaw === 'REJECTED';

  if (isUnderReview) {
      isApproved = false;
      isRejected = false;
  }

  let computedStatusStr = 'Open';
  if (isUnderReview) computedStatusStr = 'Under Review';
  else if (isClosed && isRejected) computedStatusStr = 'Rejected Closed';
  else if (isClosed && isApproved) computedStatusStr = 'Approved Closed';
  else if (isClosed) computedStatusStr = 'Closed';
  else if (isOpen && isRejected) computedStatusStr = 'Rejected Open';
  else computedStatusStr = 'Open';

  return { status: computedStatusStr, isApproved, isRejected, isOpen, isClosed, isUnderReview };
};

export const getUniqueNCRs = (data: SubmittalRow[]): SubmittalRow[] => {
   const ncrData = data.filter((d: SubmittalRow) => (d.documentType || '').startsWith('NCR-') || d.documentType === 'NCR' || d.logType?.toUpperCase().includes('NCR'));
   const refMap = new Map<string, SubmittalRow>();
   
   ncrData.forEach(row => {
        const ref = (row.ncrRef || row.docNo || '').trim().toUpperCase();
        if (!refMap.has(ref)) {
            refMap.set(ref, row);
        } else {
            const curr = refMap.get(ref)!;
            const currLast = String(curr.ncrLastRev || '').toUpperCase().trim();
            const newLast = String(row.ncrLastRev || '').toUpperCase().trim();
            
            if (newLast === 'YES' && currLast !== 'YES') {
                refMap.set(ref, row);
            } else if (newLast === 'YES' && currLast === 'YES') {
                // Tie-breaker based on rev number
                const cRev = Number((curr.rev || '').trim()) || 0;
                const nRev = Number((row.rev || '').trim()) || 0;
                if (nRev > cRev) refMap.set(ref, row);
            } else if (currLast !== 'YES') {
                // Neither is yes, fallback to rev number
                const cRev = Number((curr.rev || '').trim()) || 0;
                const nRev = Number((row.rev || '').trim()) || 0;
                if (nRev > cRev) {
                    refMap.set(ref, row);
                }
            }
        }
   });
   
   return Array.from(refMap.values());
};

export const getUniqueSORs = (data: SubmittalRow[]): SubmittalRow[] => {
   const sorData = data.filter((d: SubmittalRow) => (d.documentType || '').startsWith('SOR-') || d.documentType === 'SOR' || d.logType?.toUpperCase().includes('SOR'));
   const refMap = new Map<string, SubmittalRow>();
   
   sorData.forEach(row => {
        const ref = (row.ncrRef || row.docNo || '').trim().toUpperCase();
        if (!refMap.has(ref)) {
            refMap.set(ref, row);
        } else {
            const curr = refMap.get(ref)!;
            const currLast = String(curr.ncrLastRev || '').toUpperCase().trim();
            const newLast = String(row.ncrLastRev || '').toUpperCase().trim();
            
            if (newLast === 'YES' && currLast !== 'YES') {
                refMap.set(ref, row);
            } else if (newLast === 'YES' && currLast === 'YES') {
                const cRev = Number((curr.rev || '').trim()) || 0;
                const nRev = Number((row.rev || '').trim()) || 0;
                if (nRev > cRev) refMap.set(ref, row);
            } else if (currLast !== 'YES') {
                const cRev = Number((curr.rev || '').trim()) || 0;
                const nRev = Number((row.rev || '').trim()) || 0;
                if (nRev > cRev) refMap.set(ref, row);
            }
        }
   });
   
   return Array.from(refMap.values());
};

export const calculateLTRStats = (data: SubmittalRow[], isMonthly: boolean): KPIStats => {
  let lettersIn = 0;
  let lettersOut = 0;
  let totalSubmittedSheets = 0;

  data.forEach(row => {
    // If we only consider monthly vs cumulative based on some date sent logic maybe:
    const hasSentDate = !!row.submissionDate;

    if (isMonthly) {
      if (hasSentDate) {
         totalSubmittedSheets++;
         if (row.direction === 'IN') lettersIn++;
         else if (row.direction === 'OUT') lettersOut++;
      }
    } else {
       totalSubmittedSheets++;
       if (row.direction === 'IN') lettersIn++;
       else if (row.direction === 'OUT') lettersOut++;
    }
  });

  return {
    totalSubmittedSheets,
    totalDrawingsRev0: lettersIn, // Map IN to Rev0
    totalDrawingsFurtherRev: lettersOut, // Map OUT to FurtherRev
    totalSheetsRev0: lettersIn,
    totalSheetsFurtherRev: lettersOut,
    approved: 0,
    rejectedOpen: 0,
    rejectedClosed: 0,
    pending: 0,
    overdue: 0,
    avgResponseTime: 0,
    approvalRate: 0,
    rejectionOpenRate: 0,
    rejectionClosedRate: 0,
    delayRate: 0,
  };
};

export const calculateSORStats = (data: SubmittalRow[], isMonthly: boolean): KPIStats => {
  const sorMap = new Map<string, SubmittalRow[]>();
  data.forEach(row => {
    const ref = (row.ncrRef || row.docNo || '').trim().toUpperCase();
    if (!ref) return;
    if (!sorMap.has(ref)) {
      sorMap.set(ref, []);
    }
    sorMap.get(ref)!.push(row);
  });

  let totalUnique = sorMap.size;
  let approved = 0; // mapped to Closed in slides
  let rejectedOpen = 0; // mapped to Open in slides
  let pending = 0; // mapped to Pending in slides
  let totalSheetsRev0 = 0;
  let totalSheetsFurtherRev = 0;

  sorMap.forEach((history) => {
     history.sort((a, b) => {
        const revA = Number(a.rev.replace(/[^0-9]/g, '')) || 0;
        const revB = Number(b.rev.replace(/[^0-9]/g, '')) || 0;
        if (revA !== revB) return revA - revB;
        return a.rev.localeCompare(b.rev);
     });
     
     const latest = history[history.length - 1];
     const isRev0 = String(latest.rev).trim() === '0' || String(latest.rev).trim() === '00' || String(latest.rev).trim() === '';
     if (isRev0) {
       totalSheetsRev0++;
     } else {
       totalSheetsFurtherRev++;
     }

     const statusRaw = (latest.recordStatus || latest.ncrStatus || '').toUpperCase().trim();
     const actionRaw = (latest.action || latest.ncrAction || '').toUpperCase().trim();
     
     let isClosed = statusRaw === 'CLOSED' || actionRaw === 'CLOSED';
     let isUnderReview = statusRaw === 'WAITING' || statusRaw === 'UNDER REVIEW' || actionRaw === 'UNDER REVIEW' || actionRaw === 'WAITING';
     let isOpen = statusRaw === 'OPEN' || actionRaw === 'OPEN';

     if (!isClosed && !isUnderReview && !isOpen) {
        isOpen = true; // Fallback
     }

     if (isClosed) {
       approved++;
     } else if (isUnderReview) {
       pending++;
     } else {
       rejectedOpen++;
     }
  });

  const totalDecided = approved + rejectedOpen;
  return {
    totalSubmittedSheets: totalUnique,
    totalSheetsRev0,
    totalSheetsFurtherRev,
    totalDrawingsRev0: totalSheetsRev0,
    totalDrawingsFurtherRev: totalSheetsFurtherRev,
    approved,
    rejectedOpen,
    rejectedClosed: 0,
    pending,
    overdue: 0,
    avgResponseTime: 0,
    approvalRate: totalDecided > 0 ? (approved / totalDecided) * 100 : 0,
    rejectionOpenRate: totalDecided > 0 ? (rejectedOpen / totalDecided) * 100 : 0,
    rejectionClosedRate: 0,
    delayRate: 0,
  };
};

export const calculateNCRStats = (data: SubmittalRow[], isMonthly: boolean): KPIStats => {
  const ncrMap = new Map<string, SubmittalRow[]>();
  data.forEach(row => {
    const ref = (row.ncrRef || row.docNo || '').trim().toUpperCase();
    if (!ref) return;
    if (!ncrMap.has(ref)) {
      ncrMap.set(ref, []);
    }
    ncrMap.get(ref)!.push(row);
  });

  let totalUnique = ncrMap.size;
  let approved = 0; // mapped to Closed in slides
  let rejectedOpen = 0; // mapped to Open in slides
  let pending = 0; // mapped to Pending in slides
  let totalSheetsRev0 = 0;
  let totalSheetsFurtherRev = 0;

  ncrMap.forEach((history) => {
     history.sort((a, b) => {
        const revA = Number(a.rev.replace(/[^0-9]/g, '')) || 0;
        const revB = Number(b.rev.replace(/[^0-9]/g, '')) || 0;
        if (revA !== revB) return revA - revB;
        return a.rev.localeCompare(b.rev);
     });
     
     const latest = history[history.length - 1];
     const isRev0 = String(latest.rev).trim() === '0' || String(latest.rev).trim() === '00' || String(latest.rev).trim() === '';
     if (isRev0) {
       totalSheetsRev0++;
     } else {
       totalSheetsFurtherRev++;
     }

     const cStatus = classifyNcrStatus(latest);
     
     if (cStatus.isClosed) {
       approved++;
     } else if (cStatus.isUnderReview) {
       pending++;
     } else {
       rejectedOpen++;
     }
  });

  const totalDecided = approved + rejectedOpen;
  return {
    totalSubmittedSheets: totalUnique,
    totalSheetsRev0,
    totalSheetsFurtherRev,
    totalDrawingsRev0: totalSheetsRev0,
    totalDrawingsFurtherRev: totalSheetsFurtherRev,
    approved,
    rejectedOpen,
    rejectedClosed: 0,
    pending,
    overdue: 0,
    avgResponseTime: 0,
    approvalRate: totalDecided > 0 ? (approved / totalDecided) * 100 : 0,
    rejectionOpenRate: totalDecided > 0 ? (rejectedOpen / totalDecided) * 100 : 0,
    rejectionClosedRate: 0,
    delayRate: 0
  };
};

export const calculateStats = (data: SubmittalRow[]): KPIStats & { totalUniqueDrawings: number } => {
  let approved = 0;
  let rejectedOpen = 0;
  let rejectedClosed = 0;
  let pending = 0;
  let overdue = 0;
  
  let totalResponseDays = 0;
  let responseCount = 0;

  let totalSheetsRev0 = 0;
  let totalSheetsFurtherRev = 0;
  const uniqueRev0Drawings = new Set<string>();
  const uniqueFurtherRevDrawings = new Set<string>();
  const allUniqueDrawings = new Set<string>();
  let emptyDocNoRev0 = 0;
  let emptyDocNoFurtherRev = 0;

  data.forEach(row => {
     // Categorize revision based on isRev0 if available
     const isRev0 = row.isRev0 !== undefined ? row.isRev0 : (row.rev.trim() === '00' || row.rev.trim() === '0' || row.rev.trim() === '');
     
     const d = row.docNo?.trim();
     if (d) {
         allUniqueDrawings.add(d.toUpperCase());
     }
     
     if (isRev0) {
         totalSheetsRev0++;
         if (d) {
             uniqueRev0Drawings.add(d.toUpperCase());
         } else {
             emptyDocNoRev0++;
         }
     } else {
         totalSheetsFurtherRev++;
         if (d) {
             uniqueFurtherRevDrawings.add(d.toUpperCase());
         } else {
             emptyDocNoFurtherRev++;
         }
     }

     const statusStr = row.status || 'W'; // Default missing status to pending
     const category = getStatusCodeCategory(statusStr);
     
     if (category === 'APPROVED') approved++;
     else if (category === 'REJECTED_OPEN') rejectedOpen++;
     else if (category === 'REJECTED_CLOSED') rejectedClosed++;
     else pending++;

     // Calculate Overdue
     const delay = getDelayDays(row.submissionDate, row.responseDate, row.dueDate);
     if (delay > 0 && (category === 'PENDING' || category === 'REJECTED_OPEN')) {
         overdue++;
     }

     // Calculate average response time
     if (row.responseDate && row.submissionDate) {
         const t1 = new Date(row.submissionDate).getTime();
         const t2 = new Date(row.responseDate).getTime();
         const days = (t2 - t1) / (1000 * 3600 * 24);
         if (days >= 0) {
             totalResponseDays += days;
             responseCount++;
         }
     }
  });

  const totalSubmittedSheets = data.length;
  const totalDecided = approved + rejectedOpen + rejectedClosed;
  
  // For total unique, add max of empty doc counts to represent untrackable unique ones
  const totalUniqueDrawings = allUniqueDrawings.size + Math.max(emptyDocNoRev0, emptyDocNoFurtherRev);
  
  return {
     totalSubmittedSheets,
     totalSheetsRev0,
     totalSheetsFurtherRev,
     totalDrawingsRev0: uniqueRev0Drawings.size + emptyDocNoRev0,
     totalDrawingsFurtherRev: uniqueFurtherRevDrawings.size + emptyDocNoFurtherRev,
     totalUniqueDrawings,
     
     approved,
     rejectedOpen,
     rejectedClosed,
     pending,
     
     overdue,
     avgResponseTime: responseCount > 0 ? (totalResponseDays / responseCount) : 0,

     approvalRate: totalDecided > 0 ? (approved / totalDecided) * 100 : 0,
     rejectionOpenRate: totalDecided > 0 ? (rejectedOpen / totalDecided) * 100 : 0,
     rejectionClosedRate: totalDecided > 0 ? (rejectedClosed / totalDecided) * 100 : 0,
     delayRate: totalSubmittedSheets > 0 ? (overdue / totalSubmittedSheets) * 100 : 0
  };
};
