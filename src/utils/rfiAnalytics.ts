import { SubmittalRow } from "../types";

export interface RFITradeStat {
  trade: string;
  issued: number;
  responded: number;
  open: number;
  overdue: number;
}

export interface RFIStats {
  issuedThisMonth: number;
  respondedThisMonth: number;
  open: number;
  overdue: number;
  avgResponseTime: number;
  responseRate: number;
  trades: RFITradeStat[];
  aging: {
    days0_7: number;
    days8_14: number;
    days15_30: number;
    daysMore30: number;
  };
  consultantPerformance: {
    avgResponseTime: number;
    fastestResponse: number;
    slowestResponse: number;
    slaComplianceRate: number;
  };
  topOverdue: SubmittalRow[];
}

export const getMonthStr = (d: Date | string) => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const calculateRFIStats = (data: SubmittalRow[], targetMonth?: Date): RFIStats => {
  const rfiMap = new Map<string, SubmittalRow[]>();

  const rfiData = data.filter(d => (d.documentType || '').includes('RFI') || (d.logType || '').toUpperCase().includes('RFI'));

  rfiData.forEach(row => {
    if (!row.docNo) return;
    const key = row.docNo.trim().toUpperCase();
    if (!rfiMap.has(key)) {
      rfiMap.set(key, []);
    }
    rfiMap.get(key)!.push(row);
  });

  const stats: RFIStats = {
    issuedThisMonth: 0,
    respondedThisMonth: 0,
    open: 0,
    overdue: 0,
    avgResponseTime: 0,
    responseRate: 0,
    trades: [],
    aging: { days0_7: 0, days8_14: 0, days15_30: 0, daysMore30: 0 },
    consultantPerformance: { avgResponseTime: 0, fastestResponse: Infinity, slowestResponse: 0, slaComplianceRate: 0 },
    topOverdue: []
  };

  const tradeMap = new Map<string, RFITradeStat>();
  let totalResponseDays = 0;
  let responseCount = 0;
  let totalSlaCompliant = 0;

  const targetMonthStr = targetMonth ? getMonthStr(targetMonth) : '';

  Array.from(rfiMap.values()).forEach(history => {
    history.sort((a, b) => {
        const revA = Number(a.rev.replace(/[^0-9]/g, '')) || 0;
        const revB = Number(b.rev.replace(/[^0-9]/g, '')) || 0;
        return revA - revB;
    });

    const firstSubmission = history[0];
    const latestSubmission = history[history.length - 1];

    const tradeName = latestSubmission.discipline || 'General';
    if (!tradeMap.has(tradeName)) {
      tradeMap.set(tradeName, { trade: tradeName, issued: 0, responded: 0, open: 0, overdue: 0 });
    }
    const tStat = tradeMap.get(tradeName)!;

    const issueDateStr = firstSubmission.submissionDate;
    const responseDateStr = latestSubmission.responseDate;
    
    const rawStatus = (latestSubmission.status || '').toUpperCase();
    const isClosed = rawStatus.includes('APP') || rawStatus.includes('CLOS') || rawStatus.includes('A') || rawStatus.includes('B');
    const isOpen = !isClosed;

    const issueMonth = getMonthStr(issueDateStr);
    const responseMonth = getMonthStr(responseDateStr);
    
    const isIssuedInTarget = !targetMonthStr || issueMonth === targetMonthStr;
    const isRespondedInTarget = !targetMonthStr || (responseDateStr && responseMonth === targetMonthStr);

    if (isIssuedInTarget) {
      stats.issuedThisMonth++;
      tStat.issued++;
    }
    
    if (isRespondedInTarget) {
      stats.respondedThisMonth++;
      tStat.responded++;
    }

    const targetSLA = 14; 
    let daysOpen = 0;

    if (isOpen) {
      stats.open++;
      tStat.open++;
      
      const start = issueDateStr ? new Date(issueDateStr).getTime() : 0;
      if (start) {
        daysOpen = Math.floor((new Date().getTime() - start) / (1000 * 3600 * 24));
        if (daysOpen > targetSLA) {
            stats.overdue++;
            tStat.overdue++;
            const rowCopy = { ...latestSubmission, delayDays: daysOpen };
            stats.topOverdue.push(rowCopy);
        }
        
        if (daysOpen <= 7) stats.aging.days0_7++;
        else if (daysOpen <= 14) stats.aging.days8_14++;
        else if (daysOpen <= 30) stats.aging.days15_30++;
        else stats.aging.daysMore30++;
      }
    }

    if (responseDateStr && issueDateStr) {
      const respTime = Math.floor((new Date(responseDateStr).getTime() - new Date(issueDateStr).getTime()) / (1000 * 3600 * 24));
      if (respTime >= 0) {
        responseCount++;
        totalResponseDays += respTime;
        if (respTime < stats.consultantPerformance.fastestResponse) stats.consultantPerformance.fastestResponse = respTime;
        if (respTime > stats.consultantPerformance.slowestResponse) stats.consultantPerformance.slowestResponse = respTime;
        if (respTime <= targetSLA) totalSlaCompliant++;
      }
    }
  });

  stats.avgResponseTime = responseCount > 0 ? totalResponseDays / responseCount : 0;
  stats.responseRate = stats.issuedThisMonth > 0 ? (stats.respondedThisMonth / stats.issuedThisMonth) * 100 : 0;
  
  stats.consultantPerformance.avgResponseTime = stats.avgResponseTime;
  if (stats.consultantPerformance.fastestResponse === Infinity) stats.consultantPerformance.fastestResponse = 0;
  stats.consultantPerformance.slaComplianceRate = responseCount > 0 ? (totalSlaCompliant / responseCount) * 100 : 0;

  stats.trades = Array.from(tradeMap.values());
  stats.topOverdue.sort((a, b) => (b.delayDays || 0) - (a.delayDays || 0));
  stats.topOverdue = stats.topOverdue.slice(0, 10);

  return stats;
};
