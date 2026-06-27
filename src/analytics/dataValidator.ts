import { AnyRecord, ValidationIssue } from './models';

const getNormalizedRevision = (rev?: string | number): string => {
    if (rev === undefined || rev === null) {
        return '0';
    }
    const r = String(rev).trim().toUpperCase();
    if (r === '00' || r === '0' || r === 'REV0' || r === 'REV00' || r === 'REV.0' || r === 'REV.00' || r === '') {
        return '0';
    }
    let cleaned = r.replace(/^REV\.?\s*/, '');
    if (cleaned === '00' || cleaned === '0' || cleaned === '') {
        return '0';
    }
    if (/^0+[1-9]\d*$/.test(cleaned)) {
        cleaned = cleaned.replace(/^0+/, '');
    }
    return cleaned;
};

export const validateDataset = (records: AnyRecord[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const docSet = new Set<string>();

    records.forEach(r => {
        if (!r.docNo) {
            issues.push({ id: r.id, rowId: r.id, recordType: r.recordType, issueType: 'MISSING_DOC_NO', description: 'Document Number is missing.' });
        }
        if (!r.submissionDate) {
            issues.push({ id: r.id, rowId: r.id, recordType: r.recordType, issueType: 'MISSING_DATE', description: 'Submission Date is missing.' });
        }
        
        const normRev = getNormalizedRevision(r.rev);
        const sheetNo = (r as any).sheetNo ? String((r as any).sheetNo).trim().toUpperCase() : '';
        const sheetKey = sheetNo ? `-${sheetNo}` : '';
        const strictKey = `${r.docNo}-${normRev}${sheetKey}`;
        if (docSet.has(strictKey) && r.docNo) {
            issues.push({ id: r.id, rowId: r.id, recordType: r.recordType, issueType: 'DUPLICATE_DOC', description: `Duplicate revision found for ${strictKey}.` });
        }
        docSet.add(strictKey);
    });

    return issues;
};
