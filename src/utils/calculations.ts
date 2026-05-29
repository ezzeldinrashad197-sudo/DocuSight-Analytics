import { SubmittalRow, KPIStats } from "../types";

export const getStatusCodeCategory = (code: string): 'APPROVED' | 'REJECTED_OPEN' | 'REJECTED_CLOSED' | 'PENDING' | 'UNKNOWN' => {
  const upper = code.toUpperCase().trim();
  if (!upper) return 'UNKNOWN';

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
      const upperLogType = (r.logType || '').toUpperCase();
      let docType = 'DOC';
      if (upperLogType.includes('SHD') || upperLogType.includes('SHOP DRAW')) docType = 'SHD';
      else if (upperLogType.includes('MIR') || upperLogType.includes('MATERIAL')) docType = 'MIR';
      else if (upperLogType.includes('WIR') || upperLogType.includes('INSPECTION')) docType = 'WIR';
      else if (upperLogType.includes('MAR')) docType = 'MAR';
      else if (upperLogType.includes('RFI')) docType = 'RFI';
      else if (upperLogType.includes('TRS')) docType = 'TRS';
      else if (upperLogType.includes('SOR')) docType = 'SOR';
      else if (upperLogType.includes('SNA')) docType = 'SNA';

      const upperDiscipline = (r.discipline || '').toUpperCase();
      const tradeSource = `${upperDiscipline} ${upperLogType}`;
      
      let trade = 'General';
      let tradeShort = 'GEN';
      if (tradeSource.includes('ARCH') || tradeSource.includes('ARC')) { trade = 'Architectural'; tradeShort = 'ARCH'; }
      else if (tradeSource.includes('STR') || tradeSource.includes('CIVIL')) { trade = 'Structural'; tradeShort = 'STR'; }
      else if (tradeSource.includes('MECH') || tradeSource.includes('MEC')) { trade = 'Mechanical'; tradeShort = 'MECH'; }
      else if (tradeSource.includes('ELEC') || tradeSource.includes('ELE')) { trade = 'Electrical'; tradeShort = 'ELE'; }
      else if (tradeSource.includes('INFRA') || tradeSource.includes('INFR') || tradeSource.includes('INF')) { trade = 'Infrastructure'; tradeShort = 'INFR'; }
      else if (tradeSource.includes('LAND') || tradeSource.includes('LND')) { trade = 'Landscape'; tradeShort = 'LAND'; }

      docType = `${docType}-${tradeShort}`;

      const statusCategory = getStatusCodeCategory(r.status || 'W');
      let workflowStage = 'Pending';
      if (statusCategory === 'APPROVED') workflowStage = 'Approved';
      else if (statusCategory === 'REJECTED_OPEN') workflowStage = 'Rejected';
      else if (statusCategory === 'REJECTED_CLOSED') workflowStage = 'Returned';
      else if (statusCategory === 'PENDING') workflowStage = 'Pending';
      
      const revUpper = r.rev.trim().toUpperCase();
      const isRev0 = revUpper === '00' || revUpper === '0' || revUpper === '';
      
      const docNoUpper = r.docNo.trim().toUpperCase();
      if (docNoUpper) {
          if (!docHistory.has(docNoUpper)) docHistory.set(docNoUpper, []);
          docHistory.get(docNoUpper)!.push(revUpper);
      }

      const delayDays = getDelayDays(r.submissionDate, r.responseDate, r.dueDate);
      const overdue = delayDays > 0 && (workflowStage === 'Pending' || workflowStage === 'Rejected');

      return {
          ...r,
          documentType: docType,
          trade,
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
      const revUpper = r.rev.trim().toUpperCase();
      if (!docNoUpper) return { ...r, isLatestRev: true }; // If no doc NO, consider it unique
      
      const allRevs = docHistory.get(docNoUpper) || [];
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

export const calculateStats = (data: SubmittalRow[]): KPIStats => {
  let approved = 0;
  let rejectedOpen = 0;
  let rejectedClosed = 0;
  let pending = 0;
  let overdue = 0;
  
  let totalResponseDays = 0;
  let responseCount = 0;

  const validData = data.filter(d => !!d.submissionDate);

  // For Drawing rules: 
  // - Total Sheets Submitted = validData.length
  // - Total Sheets Rev.00 = sheets with rev 00
  // - Total Sheets Further Rev = sheets with rev <> 00
  // - Total Drawings Rev.00 = unique docNo in rev 00

  let totalSheetsRev0 = 0;
  let totalSheetsFurtherRev = 0;
  const uniqueRev0Drawings = new Set<string>();
  const uniqueFurtherRevDrawings = new Set<string>();

  validData.forEach(row => {
     // Categorize revision
     const rev = row.rev.trim();
     if (rev === '00' || rev === '0' || rev === '') {
         totalSheetsRev0++;
         if (row.docNo) {
             uniqueRev0Drawings.add(row.docNo.toUpperCase());
         }
     } else {
         totalSheetsFurtherRev++;
         if (row.docNo) {
             uniqueFurtherRevDrawings.add(row.docNo.toUpperCase());
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

  const totalSubmittedSheets = validData.length;
  const totalDecided = approved + rejectedOpen + rejectedClosed;
  
  return {
     totalSubmittedSheets,
     totalSheetsRev0,
     totalSheetsFurtherRev,
     totalDrawingsRev0: uniqueRev0Drawings.size,
     totalDrawingsFurtherRev: uniqueFurtherRevDrawings.size,
     
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
