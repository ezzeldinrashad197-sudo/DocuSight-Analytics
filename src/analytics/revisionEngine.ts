import { AnyRecord } from './models';
import { compareRevisions, isValidRevision } from './analyticsCore';
import { getRevisionWeight } from '../utils/enterpriseUpgradeEngine';

/**
 * Calculates which records are the latest revision, and flags Rev0 based on Latest Resolved Revision.
 * Ignore blank / invalid revision values when resolving latest revision.
 */
export const runRevisionEngine = (records: AnyRecord[]): AnyRecord[] => {
    const processed = [...records];
    
    // Reset flags
    processed.forEach(r => {
        r.isRev0 = false;
        r.isLatestRev = false;
    });

    // Group by document number
    const grouped = new Map<string, AnyRecord[]>();
    processed.forEach(r => {
        const key = (r.docNo || '').trim().toUpperCase();
        if (!key) {
            r.isLatestRev = true;
            r.isRev0 = isValidRevision(r.rev) && getRevisionWeight(r.rev) === 0;
            return;
        }
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(r);
    });

    // Determine Latest Rev per group and classify document
    grouped.forEach((history) => {
        const validHistory = history.filter(r => isValidRevision(r.rev));
        const sortedAll = [...history].sort((a, b) => {
             const da = new Date(a.submissionDate).getTime() || 0;
             const db = new Date(b.submissionDate).getTime() || 0;
             if (da !== db) return da - db;
             return compareRevisions(a.rev, b.rev);
        });

        const latestOverall = sortedAll[sortedAll.length - 1];

        let isLatestRev0 = false;
        if (validHistory.length > 0) {
            const sortedValid = [...validHistory].sort((a, b) => {
                 const da = new Date(a.submissionDate).getTime() || 0;
                 const db = new Date(b.submissionDate).getTime() || 0;
                 if (da !== db) return da - db;
                 return compareRevisions(a.rev, b.rev);
            });
            const latestValid = sortedValid[sortedValid.length - 1];
            isLatestRev0 = getRevisionWeight(latestValid.rev) === 0;
        }

        history.forEach(r => {
            r.isLatestRev = (r === latestOverall);
            r.isRev0 = isLatestRev0;
        });
    });

    return processed;
};
