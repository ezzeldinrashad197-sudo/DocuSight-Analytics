import { AnyRecord } from './models';

export interface RegisterStats {
    totalSubmissions: number;
    totalUniqueDocs: number;
    approved: number;
    rejectedOpen: number;
    rejectedClosed: number;
    pending: number;
    overdue: number;
    approvalRate: number;
}

export interface CorrespondenceStats {
    totalSent: number;
    totalReceived: number;
    openItems: number;
    closedItems: number;
    responseRate: number;
}

export interface KPIReport {
    shd: RegisterStats;
    rfi: RegisterStats;
    ncr: RegisterStats;
    wir: RegisterStats;
    mir: RegisterStats;
    mar: RegisterStats;
    letters: CorrespondenceStats;
}

const buildEmptyStats = (): RegisterStats => ({
    totalSubmissions: 0,
    totalUniqueDocs: 0,
    approved: 0,
    rejectedOpen: 0,
    rejectedClosed: 0,
    pending: 0,
    overdue: 0,
    approvalRate: 0
});

const calculateStatsBatch = (items: AnyRecord[]): RegisterStats => {
    const stats = buildEmptyStats();
    if (!items.length) return stats;

    stats.totalSubmissions = items.length;
    stats.totalUniqueDocs = new Set(items.map(i => i.docNo)).size;

    const latestItems = items.filter(i => i.isLatestRev);

    latestItems.forEach(i => {
        if (i.normalizedStatus === 'APPROVED' || i.normalizedStatus === 'CLOSED') stats.approved++;
        else if (i.normalizedStatus === 'REJECTED_OPEN') stats.rejectedOpen++;
        else if (i.normalizedStatus === 'REJECTED_CLOSED') stats.rejectedClosed++;
        else if (i.normalizedStatus === 'PENDING' || i.normalizedStatus === 'OPEN') stats.pending++;

        if (i.overdue) stats.overdue++;
    });

    const totalResolved = stats.approved + stats.rejectedOpen + stats.rejectedClosed;
    stats.approvalRate = totalResolved > 0 ? (stats.approved / totalResolved) * 100 : 0;

    return stats;
};

export const generateKpiReport = (records: AnyRecord[]): KPIReport => {
    return {
        shd: calculateStatsBatch(records.filter(r => r.recordType === 'SHD')),
        rfi: calculateStatsBatch(records.filter(r => r.recordType === 'RFI')),
        ncr: calculateStatsBatch(records.filter(r => r.recordType === 'NCR')),
        wir: calculateStatsBatch(records.filter(r => r.recordType === 'WIR')),
        mir: calculateStatsBatch(records.filter(r => r.recordType === 'MIR')),
        mar: calculateStatsBatch(records.filter(r => r.recordType === 'MAR')),
        letters: {
            totalSent: records.filter(r => r.recordType === 'LTOUT').length,
            totalReceived: records.filter(r => r.recordType === 'LTIN').length,
            openItems: records.filter(r => (r.recordType === 'LTIN' || r.recordType === 'LTOUT') && (r.normalizedStatus === 'OPEN' || r.normalizedStatus === 'PENDING')).length,
            closedItems: records.filter(r => (r.recordType === 'LTIN' || r.recordType === 'LTOUT') && r.normalizedStatus === 'CLOSED').length,
            responseRate: 0
        }
    };
};
