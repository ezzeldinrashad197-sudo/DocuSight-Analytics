import { AnyRecord } from './models';

/**
 * Calculates which records are the latest revision, and flags Rev0.
 * Should be run on dataset after parsing but before analytics.
 */
export const runRevisionEngine = (records: AnyRecord[]): AnyRecord[] => {
    const processed = [...records];
    
    // 1. Mark Rev0
    processed.forEach(r => {
        const rev = r.rev.trim();
        r.isRev0 = (rev === '00' || rev === '0' || rev === '');
        r.isLatestRev = false; // Reset first
    });

    // Group by document number and sheet number
    const grouped = new Map<string, AnyRecord[]>();
    processed.forEach(r => {
        const docNo = r.docNo.trim().toUpperCase();
        if (!docNo) return; // Ignore empty document numbers
        const sheetNo = (r as any).sheetNo ? String((r as any).sheetNo).trim().toUpperCase() : '';
        const key = sheetNo ? `${docNo}_${sheetNo}` : docNo;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(r);
    });

    // 2. Determine Latest Rev per group
    grouped.forEach((history, docNo) => {
        if (history.length === 1) {
            history[0].isLatestRev = true;
            return;
        }

        // Sort by numeric revision value if possible, fallback to submission date
        const sorted = history.sort((a, b) => {
             const revA = parseInt(a.rev.replace(/\D/g, ''), 10) || 0;
             const revB = parseInt(b.rev.replace(/\D/g, ''), 10) || 0;
             if (revA !== revB) return revA - revB;
             
             // Fallback to date
             const da = new Date(a.submissionDate).getTime() || 0;
             const db = new Date(b.submissionDate).getTime() || 0;
             return da - db;
        });

        const latest = sorted[sorted.length - 1];
        latest.isLatestRev = true;
    });

    return processed;
};
