export interface SLASettings {
  shopDrawings: number;
  materialSubmittals: number;
  rfi: number;
  ncr: number;
  sor: number;
  letters: number;
  default: number;
}

export interface ProjectSettings {
  id: string;
  projectName: string;
  projectCode: string;
  clientName: string;
  contractorName: string;
  consultantName: string;
  projectManager: string;
  documentControlManager: string;
  slaDays?: SLASettings;
  logoUrl?: string;
}

export interface SubmittalRow {
  id: string;
  logType: string;         // E.g. raw sheet name
  sourceFile?: string;     // The original filename this row came from
  
  // Normalized Standard Fields
  documentType: string;    // 'MIR', 'WIR', 'RFI', 'SHD', 'MAR', 'DOC', 'SNA'
  trade: string;           // 'Structural', 'Architectural', 'Mechanical', 'Electrical', 'Infrastructure', 'Civil', 'Landscape', 'General'
  workflowStage: string;   // 'Approved', 'Pending', 'Rejected', 'Returned', 'Waiting Consultant', 'Resubmit'
  isLatestRev: boolean;    // Used to filter duplicates
  isRev0: boolean;
  delayDays: number;
  overdue: boolean;

  docNo: string;
  rev: string;
  sheetNo: string;
  discipline: string;
  contractor: string;
  consultant: string;
  submissionDate: string; // YYYY-MM-DD
  dueDate: string;        // YYYY-MM-DD
  responseDate: string;   // YYYY-MM-DD
  status: string;         // Raw code A, B, C...
  remarks: string;
  area: string;
  tradeSystem: string;

  // NCR/SOR Specific fields
  ncrRef?: string;
  ncrLastRev?: string;
  ncrStatus?: string;
  ncrAction?: string;
  ncrSentDateCorrectiveAction?: string;

  // New fields for SOR & Letters
  sorStatus?: string;
  sorAction?: string;
  sorRef?: string;
  sorSentDateCorrectiveAction?: string;

  subject?: string;
  sentDateCorrectiveAction?: string;
  action?: string;           // e.g. Under Review, Open
  recordStatus?: string;     // e.g. Waiting, Closed, Open
  responseTime?: number;
  reviewTime?: number;
  totalDuration?: number;

  // Letter specific fields
  direction?: 'IN' | 'OUT';
  stakeholder?: 'Archimid' | 'ACE' | 'IMKAN' | string;
  normalizedRef?: string;
  actionRequired?: boolean;
  distributionStatus?: string;
  hyperlink?: string;
}

export interface KPIStats {
  totalSubmittedSheets: number;
  totalDrawingsRev0: number; // Unique Document Numbers in Rev 0
  totalDrawingsFurtherRev: number;
  totalSheetsRev0: number;
  totalSheetsFurtherRev: number;
  
  approved: number;
  rejectedOpen: number;
  rejectedClosed: number;
  pending: number;
  
  overdue: number;       // Pending and today > due date
  avgResponseTime: number; // Days

  approvalRate: number;
  rejectionOpenRate: number;
  rejectionClosedRate: number;
  delayRate: number;
}
