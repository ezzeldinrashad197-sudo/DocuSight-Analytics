export type NormalizedStatus = 'APPROVED' | 'REJECTED_OPEN' | 'REJECTED_CLOSED' | 'PENDING' | 'CLOSED' | 'OPEN';

export interface BaseRecord {
    id: string;
    sourceFile: string;
    docNo: string;
    rev: string;
    discipline: string;
    submissionDate: string;
    responseDate: string;
    dueDate: string;
    rawStatus: string;
    normalizedStatus: NormalizedStatus;
    
    // Calculated by Revision Engine
    isRev0: boolean;
    isLatestRev: boolean;
    
    // Calculated by Delay Engine
    delayDays: number;
    overdue: boolean;
    
    // Basic refs
    contractor: string;
    consultant: string;
}

export interface DocumentRecord extends BaseRecord {
    recordType: 'SHD' | 'MAR' | 'DOC';
    sheetNo: string;
    area: string;
    tradeSystem: string;
}

export interface RFIRecord extends BaseRecord {
    recordType: 'RFI';
    remarks: string;
}

export interface NCRRecord extends BaseRecord {
    recordType: 'NCR';
    ncrRef: string;
    ncrLastRev: string;
    ncrSentDateCorrectiveAction: string;
    ncrStatus: string;
    ncrAction: string;
}

export interface WIRRecord extends BaseRecord {
    recordType: 'WIR';
    area: string;
}

export interface MIRRecord extends BaseRecord {
    recordType: 'MIR';
    tradeSystem: string;
}

export interface LetterInRecord extends BaseRecord {
    recordType: 'LTIN';
    sender: string;
    topic: string;
}

export interface LetterOutRecord extends BaseRecord {
    recordType: 'LTOUT';
    recipient: string;
    destination: string;
    topic: string;
}

export interface SiteInstructionRecord extends BaseRecord {
    recordType: 'SI' | 'EI' | 'SWI';
    topic: string;
}

export interface MeetingMinutesRecord extends BaseRecord {
    recordType: 'MOM';
    meetingTitle: string;
}

export type AnyRecord = DocumentRecord | RFIRecord | NCRRecord | WIRRecord | MIRRecord | LetterInRecord | LetterOutRecord | SiteInstructionRecord | MeetingMinutesRecord;

export interface ValidationIssue {
    id: string;
    rowId: string;
    recordType: string;
    issueType: 'MISSING_DATE' | 'MISSING_DOC_NO' | 'INVALID_REV' | 'DUPLICATE_DOC' | 'UNRECOGNIZED_STATUS' | 'INVALID_DISCIPLINE';
    description: string;
}

export interface ImportResult {
    records: AnyRecord[];
    validationIssues: ValidationIssue[];
}
