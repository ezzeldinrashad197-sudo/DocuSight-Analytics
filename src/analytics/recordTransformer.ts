import { SubmittalRow } from '../types';
import { AnyRecord } from './models';
import { normalizeStatus, normalizeNcrStatus } from './statusEngine';
import { runRevisionEngine } from './revisionEngine';

export const transformRecords = (rows: SubmittalRow[]): AnyRecord[] => {
    const records = rows.map(r => {
        const rawStatus = r.status || '';
        let normStatus = normalizeStatus(rawStatus);
        
        let typeStr = r.documentType?.toUpperCase() || '';
        const logStr = r.logType?.toUpperCase() || '';
        
        // Determine type
        let recordType: 'SHD' | 'MAR' | 'QS' | 'RFI' | 'NCR' | 'WIR' | 'MIR' | 'LTIN' | 'LTOUT' | 'SI' | 'EI' | 'SWI' | 'MOM' = 'QS';
        if (typeStr.includes('RFI') || logStr.includes('RFI')) recordType = 'RFI';
        else if (typeStr.includes('NCR') || logStr.includes('NCR')) recordType = 'NCR';
        else if (typeStr.includes('WIR') || logStr.includes('WIR')) recordType = 'WIR';
        else if (typeStr.includes('MIR') || logStr.includes('MIR')) recordType = 'MIR';
        else if (typeStr.includes('SHD') || logStr.includes('SHD')) recordType = 'SHD';
        else if (typeStr.includes('MAR') || logStr.includes('MAR')) recordType = 'MAR';
        else if (typeStr.includes('QS') || logStr.includes('QS') || typeStr.includes('DOC') || logStr.includes('DOC')) recordType = 'QS';
        else if (typeStr.includes('LT-IN') || logStr.includes('LT-IN')) recordType = 'LTIN';
        else if (typeStr.includes('LT-OUT') || logStr.includes('LT-OUT')) recordType = 'LTOUT';
        else if (typeStr.includes('EI') || logStr.includes('EI')) recordType = 'EI';
        else if (typeStr.includes('SWI') || logStr.includes('SWI')) recordType = 'SWI';
        else if (typeStr.includes('SI') || logStr.includes('SI')) recordType = 'SI';
        else if (typeStr.includes('MOM') || logStr.includes('MOM')) recordType = 'MOM';

        if (recordType === 'NCR') {
            normStatus = normalizeNcrStatus(r);
        }

        const base = {
            id: r.id,
            sourceFile: r.sourceFile || '',
            docNo: r.docNo || '',
            rev: r.rev || '',
            discipline: r.discipline || 'General',
            submissionDate: r.submissionDate || '',
            responseDate: r.responseDate || '',
            dueDate: r.dueDate || '',
            rawStatus,
            normalizedStatus: normStatus,
            isRev0: r.isRev0,
            isLatestRev: r.isLatestRev,
            delayDays: r.delayDays,
            overdue: r.overdue,
            contractor: r.contractor || '',
            consultant: r.consultant || ''
        };

        switch (recordType) {
            case 'SHD':
            case 'MAR':
            case 'QS':
                return { ...base, recordType, sheetNo: r.sheetNo || '', area: r.area || '', tradeSystem: r.tradeSystem || '' };
            case 'RFI':
                return { ...base, recordType, remarks: r.remarks || '' };
            case 'NCR':
                return { ...base, recordType, ncrRef: r.ncrRef || '', ncrLastRev: r.ncrLastRev || '', ncrSentDateCorrectiveAction: r.ncrSentDateCorrectiveAction || '', ncrStatus: r.ncrStatus || '', ncrAction: r.ncrAction || '' };
            case 'WIR':
                return { ...base, recordType, area: r.area || '' };
            case 'MIR':
                return { ...base, recordType, tradeSystem: r.tradeSystem || '' };
            case 'LTIN':
                return { ...base, recordType, sender: r.contractor || '', topic: r.remarks || '' };
            case 'LTOUT':
                return { ...base, recordType, recipient: r.consultant || '', destination: r.area || '', topic: r.remarks || '' };
            case 'SI':
            case 'EI':
            case 'SWI':
                return { ...base, recordType, topic: r.remarks || '' };
            case 'MOM':
                return { ...base, recordType, meetingTitle: r.remarks || '' };
        }
        
    });

    return runRevisionEngine(records as AnyRecord[]);
};
