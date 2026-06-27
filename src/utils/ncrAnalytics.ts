import { SubmittalRow } from "../types";
import { getMonthStr } from "./rfiAnalytics";

export interface NCRStats {
  ncrRaised: number;
  ncrClosed: number;
  ncrOpen: number;
  ncrOverdue: number;
  avgClosureTime: number;

  statusBreakdown: {
    open: number;
    underInvestigation: number;
    correctiveActionSubmitted: number;
    underReview: number;
    closed: number;
  };

  severityAnalysis: {
    critical: number;
    major: number;
    minor: number;
  };

  rootCauseAnalysis: {
    workmanship: number;
    material: number;
    procedure: number;
    design: number;
    safety: number;
    other: number;
  };

  aging: {
    days0_30: number;
    days31_60: number;
    days61_90: number;
    daysMore90: number;
  };

  trackingTable: SubmittalRow[];
}

const parseSeverity = (subject: string): 'Critical' | 'Major' | 'Minor' => {
  const s = subject.toUpperCase();
  if (s.includes('CRITICAL')) return 'Critical';
  if (s.includes('MAJOR')) return 'Major';
  return 'Minor'; // Default to minor if not specified
};

const parseRootCause = (subject: string): string => {
  const s = subject.toUpperCase();
  if (s.includes('WORKMANSHIP') || s.includes('INSTALLATION')) return 'workmanship';
  if (s.includes('MATERIAL')) return 'material';
  if (s.includes('PROCEDURE') || s.includes('METHOD')) return 'procedure';
  if (s.includes('DESIGN') || s.includes('DRAWING')) return 'design';
  if (s.includes('SAFETY') || s.includes('HSE')) return 'safety';
  return 'other';
};

export const calculateNCRStats = (data: SubmittalRow[], targetMonth?: Date): NCRStats => {
  const ncrMap = new Map<string, SubmittalRow[]>();

  const ncrData = data.filter(d => (d.documentType || '').includes('NCR') || (d.logType || '').toUpperCase().includes('NCR'));

  ncrData.forEach(row => {
    const key = (row.ncrRef || row.docNo || '').trim().toUpperCase();
    if (!key) return;
    if (!ncrMap.has(key)) {
      ncrMap.set(key, []);
    }
    ncrMap.get(key)!.push(row);
  });

  const stats: NCRStats = {
    ncrRaised: 0,
    ncrClosed: 0,
    ncrOpen: 0,
    ncrOverdue: 0,
    avgClosureTime: 0,
    statusBreakdown: { open: 0, underInvestigation: 0, correctiveActionSubmitted: 0, underReview: 0, closed: 0 },
    severityAnalysis: { critical: 0, major: 0, minor: 0 },
    rootCauseAnalysis: { workmanship: 0, material: 0, procedure: 0, design: 0, safety: 0, other: 0 },
    aging: { days0_30: 0, days31_60: 0, days61_90: 0, daysMore90: 0 },
    trackingTable: []
  };

  const targetMonthStr = targetMonth ? getMonthStr(targetMonth) : '';
  let totalClosureDays = 0;
  let closureCount = 0;

  Array.from(ncrMap.values()).forEach(history => {
    history.sort((a, b) => {
        const revA = Number(a.rev.replace(/[^0-9]/g, '')) || 0;
        const revB = Number(b.rev.replace(/[^0-9]/g, '')) || 0;
        return revA - revB;
    });

    const firstSubmission = history[0];
    const latestSubmission = history[history.length - 1];

    const issueDateStr = firstSubmission.submissionDate;
    const closureDateStr = latestSubmission.responseDate;
    
    const rawStatus = (latestSubmission.status || latestSubmission.ncrStatus || '').toUpperCase();
    const actionRaw = (latestSubmission.ncrAction || '').toUpperCase();

    let statusType: keyof typeof stats.statusBreakdown = 'open';
    if (rawStatus.includes('CLOSED')) statusType = 'closed';
    else if (rawStatus.includes('UNDER REVIEW') || actionRaw.includes('UNDER REVIEW')) statusType = 'underReview';
    else if (latestSubmission.ncrSentDateCorrectiveAction) statusType = 'correctiveActionSubmitted';
    else if (rawStatus.includes('OPEN')) statusType = 'open';
    // Fallback mapping could be added here
    
    // Check target month for raised vs closed if applicable
    const issueMonth = getMonthStr(issueDateStr);
    const closureMonth = getMonthStr(closureDateStr);

    if (statusType !== 'closed') {
      stats.ncrOpen++;
    }

    if (!targetMonthStr || issueMonth === targetMonthStr) {
      stats.ncrRaised++;
      
      const sev = parseSeverity(latestSubmission.remarks || latestSubmission.discipline || '');
      if (sev === 'Critical') stats.severityAnalysis.critical++;
      else if (sev === 'Major') stats.severityAnalysis.major++;
      else stats.severityAnalysis.minor++;

      const cause = parseRootCause(latestSubmission.remarks || latestSubmission.discipline || '');
      if (cause === 'workmanship') stats.rootCauseAnalysis.workmanship++;
      else if (cause === 'material') stats.rootCauseAnalysis.material++;
      else if (cause === 'procedure') stats.rootCauseAnalysis.procedure++;
      else if (cause === 'design') stats.rootCauseAnalysis.design++;
      else if (cause === 'safety') stats.rootCauseAnalysis.safety++;
      else stats.rootCauseAnalysis.other++;
    }

    if (!targetMonthStr || closureMonth === targetMonthStr) {
      if (statusType === 'closed') stats.ncrClosed++;
    }

    stats.statusBreakdown[statusType]++;

    let daysOpen = 0;
    if (statusType !== 'closed' && issueDateStr) {
      daysOpen = Math.floor((new Date().getTime() - new Date(issueDateStr).getTime()) / (1000 * 3600 * 24));
      const targetSLA = 14; 
      if (daysOpen > targetSLA) stats.ncrOverdue++;

      if (daysOpen <= 30) stats.aging.days0_30++;
      else if (daysOpen <= 60) stats.aging.days31_60++;
      else if (daysOpen <= 90) stats.aging.days61_90++;
      else stats.aging.daysMore90++;
    }

    if (statusType === 'closed' && issueDateStr && closureDateStr) {
      const clsTime = Math.floor((new Date(closureDateStr).getTime() - new Date(issueDateStr).getTime()) / (1000 * 3600 * 24));
      if (clsTime >= 0) {
         closureCount++;
         totalClosureDays += clsTime;
      }
    }

    if (statusType !== 'closed' && issueDateStr) {
       stats.trackingTable.push({
           ...latestSubmission,
           delayDays: daysOpen
       });
    }
  });

  stats.avgClosureTime = closureCount > 0 ? totalClosureDays / closureCount : 0;
  
  stats.trackingTable.sort((a, b) => (b.delayDays || 0) - (a.delayDays || 0));

  return stats;
};
