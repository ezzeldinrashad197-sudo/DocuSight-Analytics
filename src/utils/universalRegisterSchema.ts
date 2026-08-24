export type FieldRequirementType = 'Required' | 'Optional' | 'Conditional';
export type RegisterTypeCode = 'SDW' | 'RFI' | 'MIR' | 'NCR' | 'WIR' | 'MAR' | 'SOR' | 'LTR' | 'DEFAULT';

export interface FieldRequirementSpec {
  requirement: FieldRequirementType;
  conditionNote?: string;
  conditionNoteAr?: string;
}

export interface UniversalFieldDefinition {
  key: string;
  label: string;
  labelAr: string;
  category: 'core_mandatory' | 'system_control' | 'register_specific' | 'custom';
  description: string;
  requiredForKPIs?: string[];
  aliases?: string[];
  exampleValue?: string;
  isolatedFromKPIs?: boolean;
}

export interface FieldMappingDetail {
  rawHeader: string;
  mappedKey: string | null;
  mappedLabel: string | null;
  mappedLabelAr: string | null;
  confidence: number; // 0 - 100 %
  confidenceBadge: 'AUTO-MAPPED' | 'REVIEW REQUIRED' | 'UNMAPPED';
  matchReason: string;
  matchReasonAr: string;
}

export interface KPICalculabilityStatus {
  kpiKey: string;
  kpiName: string;
  kpiNameAr: string;
  calculable: boolean | 'PARTIAL';
  statusLabel: 'CALCULABLE' | 'NOT CALCULABLE' | 'PARTIAL';
  missingFields: string[];
  presentFields: string[];
  reason: string;
  reasonAr: string;
}

export interface CompatibilityScoreBreakdown {
  overallScore: number; // 0 - 100
  overallRating: 'READY FOR ANALYTICS' | 'HIGH COMPATIBILITY' | 'PARTIAL COMPATIBILITY' | 'ACTION REQUIRED';
  overallRatingAr: string;
  coreSchemaCoverage: number; // %
  kpiCalculabilityCoverage: number; // %
  requiredFieldCoverage: number; // %
  mappingConfidenceAvg: number; // %
  dataQualityIndex: number; // %
}

/**
 * 20-Point Register Contract Specification Matrix per Field
 */
export interface RegisterFieldContract20Point {
  fieldName: string;              // 1. Field Name
  sourceColumnName: string;       // 2. Source Column Name
  dataType: string;               // 3. Data Type (Date, String, Integer, Enum, Boolean)
  mandatoryRequirement: string;   // 4. Mandatory / Optional / Conditional
  allowedValues: string;          // 5. Allowed Values / Constraints
  normalizationRule: string;      // 6. Normalization Rule
  calculationDependency: string; // 7. Calculation Dependency
  kpiDependency: string;          // 8. KPI Dependency
  validationRule: string;         // 9. Validation Rule
  missingDataBehavior: string;    // 10. Missing Data Behavior
  sourceRegister: string;         // 11. Source Register Name
  sourceFile: string;             // 12. Source File Name
  sourceRow: string;              // 13. Source Row Index
  effectiveDate: string;          // 14. Effective Date / Timestamp
  revisionRule: string;           // 15. Revision Rule
  statusMapping: string;          // 16. Status Mapping Rule
  duplicateRule: string;          // 17. Duplicate Rule
  supersessionRule: string;       // 18. Supersession Rule
  evidenceRequirement: string;    // 19. Evidence Requirement
  customFieldFlag: boolean;       // 20. Custom Field (Isolated Metadata)
}

/**
 * 3-Tier Data Architecture Specification
 */
export interface ThreeTierDataArchitectureSpec {
  level1RawSource: {
    title: string;
    description: string;
    properties: string[];
    guarantee: string;
  };
  level2CanonicalModel: {
    title: string;
    description: string;
    properties: string[];
    guarantee: string;
  };
  level3GovernanceAndCalculation: {
    title: string;
    description: string;
    properties: string[];
    guarantee: string;
  };
}

/**
 * Commercial Tiers Packaging Architecture
 */
export interface CommercialTierSpec {
  tierCode: 'STANDARD' | 'ENTERPRISE' | 'ASSURANCE';
  tierName: string;
  tierNameAr: string;
  tagline: string;
  targetAudience: string;
  features: string[];
  governanceScope: string;
  auditCertificateAccess: boolean;
}

export interface ContractValidationResult {
  isContractValid: boolean;
  registerType: RegisterTypeCode;
  compatibilityScore: CompatibilityScoreBreakdown;
  scorePercentage: number;
  missingRequiredFields: (UniversalFieldDefinition & FieldRequirementSpec)[];
  missingOptionalFields: (UniversalFieldDefinition & FieldRequirementSpec)[];
  mappedCoreFieldsCount: number;
  totalCoreFieldsCount: number;
  kpiCalculability: KPICalculabilityStatus[];
  mappingDetails: FieldMappingDetail[];
  systemDerivedFields: UniversalFieldDefinition[];
  customFieldsIsolationNote: string;
  fieldContracts20Point: RegisterFieldContract20Point[];
}

export const REGISTER_FIELD_REQUIREMENTS: Record<RegisterTypeCode, Record<string, FieldRequirementSpec>> = {
  SDW: {
    recordRef: { requirement: 'Required' },
    documentType: { requirement: 'Required' },
    subject: { requirement: 'Required' },
    revision: { requirement: 'Required' },
    submissionDate: { requirement: 'Required' },
    responseDate: { requirement: 'Conditional', conditionNote: 'Pending submittals do not require response date', conditionNoteAr: 'المعاملات القيد المراجعة لا تتطلب تاريخ رد' },
    status: { requirement: 'Required' },
    discipline: { requirement: 'Required' },
    responsibleParty: { requirement: 'Required' },
    projectCode: { requirement: 'Optional' },
    receivedDate: { requirement: 'Optional' },
    closedDate: { requirement: 'Conditional', conditionNote: 'Only closed/resubmitted items have closed date', conditionNoteAr: 'تاريخ الإغلاق يلزم للمعاملات المغلقة فقط' }
  },
  RFI: {
    recordRef: { requirement: 'Required' },
    documentType: { requirement: 'Required' },
    subject: { requirement: 'Required' },
    revision: { requirement: 'Optional', conditionNote: 'RFIs often have single submission without revisions', conditionNoteAr: 'طلب المعلومة غالباً بدون مراجعات متكررة' },
    submissionDate: { requirement: 'Required' },
    responseDate: { requirement: 'Required' },
    status: { requirement: 'Required' },
    discipline: { requirement: 'Required' },
    responsibleParty: { requirement: 'Optional' },
    projectCode: { requirement: 'Optional' },
    receivedDate: { requirement: 'Optional' },
    closedDate: { requirement: 'Conditional', conditionNote: 'Closed date applies upon final response', conditionNoteAr: 'ينطبق تاريخ الإغلاق عند صدور الإجابة النهائية' }
  },
  MIR: {
    recordRef: { requirement: 'Required' },
    documentType: { requirement: 'Required' },
    subject: { requirement: 'Required' },
    revision: { requirement: 'Optional' },
    submissionDate: { requirement: 'Optional' },
    responseDate: { requirement: 'Conditional', conditionNote: 'Material inspection date may serve as response date', conditionNoteAr: 'تاريخ الفحص قد يحل محل تاريخ الرد' },
    status: { requirement: 'Required' },
    discipline: { requirement: 'Optional' },
    responsibleParty: { requirement: 'Required' },
    projectCode: { requirement: 'Optional' },
    receivedDate: { requirement: 'Optional' },
    closedDate: { requirement: 'Conditional' }
  },
  NCR: {
    recordRef: { requirement: 'Required' },
    documentType: { requirement: 'Required' },
    subject: { requirement: 'Required' },
    revision: { requirement: 'Optional' },
    submissionDate: { requirement: 'Required' },
    responseDate: { requirement: 'Conditional' },
    status: { requirement: 'Required' },
    discipline: { requirement: 'Required' },
    responsibleParty: { requirement: 'Required' },
    projectCode: { requirement: 'Optional' },
    receivedDate: { requirement: 'Optional' },
    closedDate: { requirement: 'Required', conditionNote: 'NCR resolution requires explicit closeout date', conditionNoteAr: 'إغلاق عدم المطابقة يستلزم تاريخ الإغلاق الصريح' }
  },
  WIR: {
    recordRef: { requirement: 'Required' },
    documentType: { requirement: 'Required' },
    subject: { requirement: 'Required' },
    revision: { requirement: 'Optional' },
    submissionDate: { requirement: 'Required' },
    responseDate: { requirement: 'Conditional' },
    status: { requirement: 'Required' },
    discipline: { requirement: 'Required' },
    responsibleParty: { requirement: 'Required' },
    projectCode: { requirement: 'Optional' },
    receivedDate: { requirement: 'Optional' },
    closedDate: { requirement: 'Conditional' }
  },
  MAR: {
    recordRef: { requirement: 'Required' },
    documentType: { requirement: 'Required' },
    subject: { requirement: 'Required' },
    revision: { requirement: 'Required' },
    submissionDate: { requirement: 'Required' },
    responseDate: { requirement: 'Conditional' },
    status: { requirement: 'Required' },
    discipline: { requirement: 'Required' },
    responsibleParty: { requirement: 'Required' },
    projectCode: { requirement: 'Optional' },
    receivedDate: { requirement: 'Optional' },
    closedDate: { requirement: 'Conditional' }
  },
  SOR: {
    recordRef: { requirement: 'Required' },
    documentType: { requirement: 'Required' },
    subject: { requirement: 'Required' },
    revision: { requirement: 'Optional' },
    submissionDate: { requirement: 'Required' },
    responseDate: { requirement: 'Conditional' },
    status: { requirement: 'Required' },
    discipline: { requirement: 'Optional' },
    responsibleParty: { requirement: 'Required' },
    projectCode: { requirement: 'Optional' },
    receivedDate: { requirement: 'Optional' },
    closedDate: { requirement: 'Conditional' }
  },
  LTR: {
    recordRef: { requirement: 'Required' },
    documentType: { requirement: 'Required' },
    subject: { requirement: 'Required' },
    revision: { requirement: 'Optional' },
    submissionDate: { requirement: 'Required' },
    responseDate: { requirement: 'Conditional' },
    status: { requirement: 'Required' },
    discipline: { requirement: 'Optional' },
    responsibleParty: { requirement: 'Required' },
    projectCode: { requirement: 'Optional' },
    receivedDate: { requirement: 'Optional' },
    closedDate: { requirement: 'Conditional' }
  },
  DEFAULT: {
    recordRef: { requirement: 'Required' },
    documentType: { requirement: 'Required' },
    subject: { requirement: 'Required' },
    revision: { requirement: 'Optional' },
    submissionDate: { requirement: 'Required' },
    responseDate: { requirement: 'Conditional' },
    status: { requirement: 'Required' },
    discipline: { requirement: 'Optional' },
    responsibleParty: { requirement: 'Optional' },
    projectCode: { requirement: 'Optional' },
    receivedDate: { requirement: 'Optional' },
    closedDate: { requirement: 'Conditional' }
  }
};

export const CORE_MANDATORY_FIELDS: UniversalFieldDefinition[] = [
  {
    key: 'recordRef',
    label: 'Record Reference / Document No.',
    labelAr: 'المعرف الفريد للسجل / رقم الوثيقة',
    category: 'core_mandatory',
    description: 'Unique document or submittal identifier (e.g., SUB-CIV-001)',
    requiredForKPIs: ['Unique Document Count', 'Revision Analysis', 'Superseded Hierarchy'],
    aliases: ['docno', 'doc_no', 'docid', 'submittalref', 'ref', 'documentno', 'drawingno', 'rfino', 'mirno', 'ncrno', 'wirno', 'letterref', 'recordref', 'code', 'number'],
    exampleValue: 'SDW-CIV-ARCH-0041'
  },
  {
    key: 'documentType',
    label: 'Document / Transaction Type',
    labelAr: 'نوع المعاملة / السجل',
    category: 'core_mandatory',
    description: 'Register classification (SDW, RFI, MIR, WIR, MAR, NCR, SOR, LTR)',
    requiredForKPIs: ['Register Type Breakdown', 'Workflow Family SLA'],
    aliases: ['documenttype', 'logtype', 'type', 'registertype', 'category', 'doctype'],
    exampleValue: 'Shop Drawing (SDW)'
  },
  {
    key: 'subject',
    label: 'Subject / Description',
    labelAr: 'وصف السجل / الموضوع',
    category: 'core_mandatory',
    description: 'Detailed description or title of the submitted item',
    requiredForKPIs: ['Duplicate Content Detection', 'AI Insight Categorization'],
    aliases: ['subject', 'description', 'title', 'drawingtitle', 'materialdescription', 'question', 'querysubject', 'details', 'titletext'],
    exampleValue: 'Structural Foundation Rebar Layout Plan Rev 01'
  },
  {
    key: 'revision',
    label: 'Revision Number',
    labelAr: 'رقم المراجعة',
    category: 'core_mandatory',
    description: 'Submittal revision status (0, 01, A, B, R1)',
    requiredForKPIs: ['Rev 0 vs Rev >0 Analytics', 'First-Time Approval Rate', 'Superseded Filtering'],
    aliases: ['rev', 'revision', 'revno', 'revisionno', 'rev_no'],
    exampleValue: '00'
  },
  {
    key: 'submissionDate',
    label: 'Submission Date',
    labelAr: 'تاريخ التقديم',
    category: 'core_mandatory',
    description: 'Date the submittal was formally transmitted to consultant',
    requiredForKPIs: ['Average Response Time', 'SLA Overdue Analytics', 'Monthly Trend Analytics'],
    aliases: ['submissiondate', 'subdate', 'sub_date', 'datesubmitted', 'sentdate', 'transmittaldate', 'date'],
    exampleValue: '2026-03-15'
  },
  {
    key: 'responseDate',
    label: 'Response / Action Date',
    labelAr: 'تاريخ الرد / الإجراء',
    category: 'core_mandatory',
    description: 'Date consultant/engineer returned official response',
    requiredForKPIs: ['Average Response Time', 'Review Duration SLA', 'Turnaround Compliance'],
    aliases: ['responsedate', 'returneddate', 'replydate', 'reply_date', 'actiondate', 'consultantdate', 'approvedate', 'consultantresponsedate'],
    exampleValue: '2026-03-24'
  },
  {
    key: 'status',
    label: 'Status Code / Workflow Outcome',
    labelAr: 'الحالة الحالية / النتيجة',
    category: 'core_mandatory',
    description: 'Action result code (A - Approved, B - Approved with Comments, C - Rejected, etc.)',
    requiredForKPIs: ['Overall Approval Rate', 'Rejection Rate (Open/Closed)', 'Quality Score Index'],
    aliases: ['status', 'statuscode', 'code_result', 'workflowstage', 'code', 'action', 'consultantstatus', 'reviewstatus', 'recordstatus', 'currentstatus'],
    exampleValue: 'A - Approved'
  },
  {
    key: 'discipline',
    label: 'Discipline / Trade System',
    labelAr: 'التخصص / النظام الهندسي',
    category: 'core_mandatory',
    description: 'Engineering department or system (Civil, Mechanical, Structural, Electrical)',
    requiredForKPIs: ['Discipline Workload Heatmap', 'Department SLA Bottleneck Analysis'],
    aliases: ['discipline', 'trade', 'department', 'tradesystem', 'trade_system', 'section', 'system'],
    exampleValue: 'Structural'
  },
  {
    key: 'responsibleParty',
    label: 'Responsible Party / Stakeholder',
    labelAr: 'الجهة المسؤولة / المقاول / الاستشاري',
    category: 'core_mandatory',
    description: 'Contractor, Subcontractor, or Consultant assigned to the action',
    requiredForKPIs: ['Contractor Performance Benchmark', 'Consultant SLA Accountability'],
    aliases: ['responsibleparty', 'contractor', 'consultant', 'subcontractor', 'raisedby', 'raisedbycontractor', 'maincontractor', 'main_contractor', 'issuedto', 'vendor', 'stakeholder', 'suppliername'],
    exampleValue: 'Main Contractor / ACE Engineering'
  },
  {
    key: 'projectCode',
    label: 'Project / Package Identifier',
    labelAr: 'رمز المشروع / الحزمة',
    category: 'core_mandatory',
    description: 'Project code or sub-contract package reference',
    requiredForKPIs: ['Multi-Project Portfolio Aggregation', 'Project Cross-Tabulation'],
    aliases: ['projectcode', 'project', 'package', 'contract', 'projectname', 'site', 'sitepackage', 'prj_id'],
    exampleValue: 'PRJ-2026-TOWER-A'
  },
  {
    key: 'receivedDate',
    label: 'Received Date',
    labelAr: 'تاريخ الاستلام',
    category: 'core_mandatory',
    description: 'Date submittal was received by document control',
    requiredForKPIs: ['Ingestion Lag SLA', 'Document Control Processing Time'],
    aliases: ['receiveddate', 'date_received', 'inwarddate', 'createddate', 'entrydate'],
    exampleValue: '2026-03-14'
  },
  {
    key: 'closedDate',
    label: 'Closed Date',
    labelAr: 'تاريخ الإغلاق النهائي',
    category: 'core_mandatory',
    description: 'Date action was fully closed or superseded',
    requiredForKPIs: ['Closed Rejection Aging', 'Lifecycle Completion Metric'],
    aliases: ['closeddate', 'dateclosed', 'finaldate', 'completiondate', 'closuredate'],
    exampleValue: 'YYYY-MM-DD'
  }
];

export const SYSTEM_CONTROL_DERIVED_FIELDS: UniversalFieldDefinition[] = [
  {
    key: 'businessEntityKey',
    label: 'Business Entity Key',
    labelAr: 'مفتاح الكيان التجاري الموحد',
    category: 'system_control',
    description: 'Derived cross-revision entity grouping key (`${docNo}_${discipline}`)'
  },
  {
    key: 'canonicalRecordID',
    label: 'Canonical Record ID',
    labelAr: 'المعرف المطبوع المعياري',
    category: 'system_control',
    description: 'Unique SHA-256 fingerprint for record deduplication'
  },
  {
    key: 'normalizedStatus',
    label: 'Normalized Status',
    labelAr: 'الحالة الموحدة القياسية',
    category: 'system_control',
    description: 'Mapped standard categories: APPROVED, PENDING, REJECTED_OPEN, REJECTED_CLOSED'
  },
  {
    key: 'normalizedRevision',
    label: 'Normalized Revision',
    labelAr: 'رقم المراجعة المعياري',
    category: 'system_control',
    description: 'Standardized integer or clean string code (0, 1, 2, ...)'
  },
  {
    key: 'isSuperseded',
    label: 'Is Superseded',
    labelAr: 'هل تم استبداله بمراجعة أحدث',
    category: 'system_control',
    description: 'Boolean flag set to true if a higher revision exists'
  },
  {
    key: 'isCancelled',
    label: 'Is Cancelled',
    labelAr: 'هل المعاملة ملغاة',
    category: 'system_control',
    description: 'Boolean flag excluding cancelled items from operational statistics'
  },
  {
    key: 'isDuplicate',
    label: 'Is Duplicate',
    labelAr: 'هل السجل مكرر',
    category: 'system_control',
    description: 'Identifies multiple identical entries for same revision'
  },
  {
    key: 'isActive',
    label: 'Is Active Record',
    labelAr: 'هل السجل نشط في الحسابات',
    category: 'system_control',
    description: 'Active = (!isCancelled && isLatestRev)'
  },
  {
    key: 'isOverdue',
    label: 'Is Overdue Flag',
    labelAr: 'مؤشر التأخير عن الـ SLA',
    category: 'system_control',
    description: 'Set to true if responseTime > SLA contract threshold'
  },
  {
    key: 'overdueDays',
    label: 'Overdue Days Count',
    labelAr: 'عدد أيام التأخير',
    category: 'system_control',
    description: 'Calculated calendar/business days beyond SLA limit'
  },
  {
    key: 'sourceRegister',
    label: 'Source Register Sheet',
    labelAr: 'اسم ورقة السجل المصدر',
    category: 'system_control',
    description: 'Sheet name inside imported workbook'
  },
  {
    key: 'sourceFile',
    label: 'Source File Name',
    labelAr: 'اسم الملف المصدر',
    category: 'system_control',
    description: 'Excel/CSV file name imported into session'
  },
  {
    key: 'sourceRow',
    label: 'Source Row Index',
    labelAr: 'رقم السطر في الملف الأصلي',
    category: 'system_control',
    description: 'Exact 1-based row index in source workbook for lineage tracing'
  },
  {
    key: 'importBatchID',
    label: 'Import Batch Identifier',
    labelAr: 'معرف دفعة الاستيراد',
    category: 'system_control',
    description: 'UUID generated per ingestion session'
  },
  {
    key: 'calculationVersion',
    label: 'Calculation Engine Version',
    labelAr: 'إصدار محرك الحسابات',
    category: 'system_control',
    description: 'Version tag of calculation rules applied (e.g. L99-v2.8)'
  }
];

export const THREE_TIER_DATA_ARCHITECTURE: ThreeTierDataArchitectureSpec = {
  level1RawSource: {
    title: 'Level 1 — Raw Source (Untouched Excel/CSV)',
    description: 'Original client workbook in native layout without forcing structure or column renames.',
    properties: ['sourceFile', 'sourceRow', 'sourceRegister', 'rawCellValues', 'importTimestamp', 'rawHeadersList'],
    guarantee: '100% Immutable. Never altered, formatted, or trimmed. Preserves audit proof.'
  },
  level2CanonicalModel: {
    title: 'Level 2 — Universal Canonical Model',
    description: 'Standardized semantic representation of document workflow concepts.',
    properties: ['recordRef', 'revision', 'status', 'submissionDate', 'responseDate', 'discipline', 'responsibleParty', 'projectCode'],
    guarantee: 'Decoupled. Maps varying column names with AI confidence scoring and status normalization.'
  },
  level3GovernanceAndCalculation: {
    title: 'Level 3 — Calculation & Governance Layer',
    description: 'Mathematical execution, calculability gating, SSOT metrics, and audit certificates.',
    properties: ['approvalRate', 'averageResponseTime', 'overdueSLA', 'supersededHierarchy', 'auditCertificate', 'calculabilityStatuses'],
    guarantee: 'Zero Variance. Automatically refuses to calculate missing-evidence metrics (NOT CALCULABLE).'
  }
};

export const COMMERCIAL_TIERS_SPEC: CommercialTierSpec[] = [
  {
    tierCode: 'STANDARD',
    tierName: 'StructuSight Standard',
    tierNameAr: 'ستراكتوسايت القياسي',
    tagline: 'Excel Import, Mapping, Analytics & Operational Reports',
    targetAudience: 'Single projects & contractor site teams requiring quick document tracking.',
    features: [
      'Multi-Format Excel Ingestion',
      'Basic Column Auto-Mapping',
      'Operational Dashboard & Filtering',
      'PDF & Excel Export Engine'
    ],
    governanceScope: 'Basic validation & UI notifications.',
    auditCertificateAccess: false
  },
  {
    tierCode: 'ENTERPRISE',
    tierName: 'StructuSight Enterprise',
    tierNameAr: 'ستراكتوسايت للمؤسسات',
    tagline: 'Universal Schema, SSOT, Calculation Lineage & Governance',
    targetAudience: 'Project Management Consultancies (PMO), Program Directors & Multi-Package Teams.',
    features: [
      'Universal Register Compatibility Engine',
      'Single Source of Truth (SSOT) Enforcement',
      'Granular KPI Calculability Gate (NOT CALCULABLE safeguards)',
      '20-Point Register Contract Specification Matrix',
      '3-Tier Architecture Raw Traceability',
      'Isolated Custom Fields Metadata Registry'
    ],
    governanceScope: 'Full SSOT governance & 0-variance calculation rules.',
    auditCertificateAccess: true
  },
  {
    tierCode: 'ASSURANCE',
    tierName: 'StructuSight Assurance (Audit & Verification)',
    tierNameAr: 'ستراكتوسايت لضمان التدقيق',
    tagline: 'Evidence-Backed Certificates, Immutable Baselines & Independent Verification',
    targetAudience: 'Legal Counsel, Dispute Experts, External Auditors & Government Oversight Authorities.',
    features: [
      'Evidence-Backed Formal Audit Certificates',
      'SHA-256 Dual-Hash Provenance Locks',
      'L99 Golden Benchmark Character-for-Character Verification',
      'Audit Trail Traceability Logs & Raw Row Lineage',
      'Independent Verification Script Engine'
    ],
    governanceScope: 'Court-admissible audit proof & tamper-evident verification.',
    auditCertificateAccess: true
  }
];

export const REGISTER_SPECIFIC_EXTENSIONS: Record<string, UniversalFieldDefinition[]> = {
  SDW: [
    { key: 'sheetNo', label: 'Sheet Number', labelAr: 'رقم اللوحة', category: 'register_specific', description: 'Individual sheet identifier for shop drawings' },
    { key: 'drawingTitle', label: 'Drawing Title', labelAr: 'عنوان اللوحة', category: 'register_specific', description: 'Detailed shop drawing title' },
    { key: 'area', label: 'Zone / Area', labelAr: 'المنطقة / القطاع', category: 'register_specific', description: 'Physical construction zone or building area' }
  ],
  RFI: [
    { key: 'question', label: 'RFI Question / Query', labelAr: 'سؤال/استفسار RFI', category: 'register_specific', description: 'Technical inquiry text' },
    { key: 'raisedBy', label: 'Raised By', labelAr: 'الجهة المتقدمة بالطلب', category: 'register_specific', description: 'Engineer or contractor who opened RFI' },
    { key: 'impactDays', label: 'Schedule Impact (Days)', labelAr: 'التأثير على الجدول الزمني (أيام)', category: 'register_specific', description: 'Estimated delay impact' }
  ],
  MIR: [
    { key: 'materialDescription', label: 'Material Description', labelAr: 'وصف المادة', category: 'register_specific', description: 'Specified material or sample name' },
    { key: 'supplier', label: 'Manufacturer / Supplier', labelAr: 'المورد / المصنع', category: 'register_specific', description: 'Material vendor or origin factory' }
  ],
  NCR: [
    { key: 'category', label: 'Non-Conformance Severity Category', labelAr: 'فئة ومستوى عدم المطابقة', category: 'register_specific', description: 'Severity level (Major, Minor, Structural, Quality)' },
    { key: 'dueDate', label: 'Corrective Action Due Date', labelAr: 'تاريخ استحقاق الإجراء التصحيحي', category: 'register_specific', description: 'Deadline for resolving NCR' },
    { key: 'rootCause', label: 'Root Cause Description', labelAr: 'السبب الجذر', category: 'register_specific', description: 'Identified origin of non-conformance' }
  ],
  SOR: [
    { key: 'siteLocation', label: 'Site Location / Grid Ref', labelAr: 'موقع الملاحظة بالموقع', category: 'register_specific', description: 'Exact grid axis or floor' },
    { key: 'contractorAction', label: 'Contractor Remedial Action', labelAr: 'الإجراء الميداني المتخذ', category: 'register_specific', description: 'Resolution recorded by contractor' }
  ],
  LTR: [
    { key: 'direction', label: 'Direction (IN / OUT)', labelAr: 'اتجاه المراسلة (صادر / وارد)', category: 'register_specific', description: 'Incoming or outgoing correspondence' },
    { key: 'stakeholder', label: 'Target Stakeholder', labelAr: 'الجهة المستلمة / المرسلة', category: 'register_specific', description: 'External entity code' },
    { key: 'actionRequired', label: 'Action Required Flag', labelAr: 'مطلوب إجراء', category: 'register_specific', description: 'Boolean flag whether response is pending' }
  ]
};

/**
 * Intelligent Column Auto-Mapper with Semantic Confidence Engine
 */
export function autoMapColumnsWithDetails(rawHeaders: string[]): FieldMappingDetail[] {
  const details: FieldMappingDetail[] = [];
  const usedCoreKeys = new Set<string>();

  rawHeaders.forEach(header => {
    const cleanHeader = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    let bestMatch: UniversalFieldDefinition | null = null;
    let confidence = 0;
    let matchReason = 'No semantic match found';
    let matchReasonAr = 'لم يتم العثور على تطابق دلالي';

    for (const coreField of CORE_MANDATORY_FIELDS) {
      if (usedCoreKeys.has(coreField.key)) continue;

      const cleanKey = coreField.key.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Check exact key match
      if (cleanHeader === cleanKey) {
        bestMatch = coreField;
        confidence = 99.4;
        matchReason = `Exact match on universal key '${coreField.key}'`;
        matchReasonAr = `تطابق تام مع المفتاح المعياري '${coreField.key}'`;
        break;
      }

      // Check exact alias match
      const exactAlias = coreField.aliases?.find(a => {
        const ca = a.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanHeader === ca;
      });

      if (exactAlias) {
        bestMatch = coreField;
        confidence = 98.8;
        matchReason = `Exact match with known alias '${exactAlias}'`;
        matchReasonAr = `تطابق تام مع الاسم المستعار المعرف '${exactAlias}'`;
        break;
      }

      // Check fuzzy / substring token match
      const substringAlias = coreField.aliases?.find(a => {
        const ca = a.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanHeader.includes(ca) || ca.includes(cleanHeader);
      });

      if (substringAlias) {
        bestMatch = coreField;
        confidence = 92.5;
        matchReason = `High-confidence token match with alias '${substringAlias}'`;
        matchReasonAr = `تطابق عالي الثقة مع الرمز '${substringAlias}'`;
        break;
      }
    }

    if (bestMatch && confidence >= 50) {
      usedCoreKeys.add(bestMatch.key);
      const confidenceBadge: 'AUTO-MAPPED' | 'REVIEW REQUIRED' | 'UNMAPPED' =
        confidence >= 85 ? 'AUTO-MAPPED' : confidence >= 50 ? 'REVIEW REQUIRED' : 'UNMAPPED';

      details.push({
        rawHeader: header,
        mappedKey: bestMatch.key,
        mappedLabel: bestMatch.label,
        mappedLabelAr: bestMatch.labelAr,
        confidence,
        confidenceBadge,
        matchReason,
        matchReasonAr
      });
    } else {
      details.push({
        rawHeader: header,
        mappedKey: null,
        mappedLabel: null,
        mappedLabelAr: null,
        confidence: 0,
        confidenceBadge: 'UNMAPPED',
        matchReason: 'Unmapped raw column (Routed to Custom/Metadata)',
        matchReasonAr: 'عمود غير مربوط (تم تحويله للبيانات الوصفية المخصصة)'
      });
    }
  });

  return details;
}

/**
 * Standard autoMapColumns returning key-value dictionary for backward compatibility
 */
export function autoMapColumns(rawHeaders: string[]): Record<string, string> {
  const details = autoMapColumnsWithDetails(rawHeaders);
  const mapping: Record<string, string> = {};
  details.forEach(d => {
    if (d.mappedKey) {
      mapping[d.rawHeader] = d.mappedKey;
    }
  });
  return mapping;
}

/**
 * Generates the 20-Point Register Specification Contract Matrix per mapped field
 */
export function generate20PointContractMatrix(
  registerType: RegisterTypeCode,
  mappedColumns: Record<string, string>
): RegisterFieldContract20Point[] {
  const reqSpecs = REGISTER_FIELD_REQUIREMENTS[registerType] || REGISTER_FIELD_REQUIREMENTS.DEFAULT;
  const rawHeadersMappedToKey: Record<string, string> = {};
  
  Object.entries(mappedColumns).forEach(([rawHeader, uKey]) => {
    if (uKey) rawHeadersMappedToKey[uKey] = rawHeader;
  });

  return CORE_MANDATORY_FIELDS.map(f => {
    const rawCol = rawHeadersMappedToKey[f.key] || 'Unmapped';
    const spec = reqSpecs[f.key] || { requirement: 'Optional' };

    let dataType = 'String';
    if (f.key.toLowerCase().includes('date')) dataType = 'ISO-8601 Date';
    if (f.key === 'revision') dataType = 'Integer / Clean String';
    if (f.key === 'status') dataType = 'Workflow Enum';

    let allowedValues = 'Any valid non-empty string';
    if (f.key === 'status') allowedValues = 'A, B, C, D, Approved, Pending, Rejected, Resubmitted';
    if (f.key === 'documentType') allowedValues = 'SDW, RFI, MIR, NCR, WIR, MAR, SOR, LTR';
    if (f.key.toLowerCase().includes('date')) allowedValues = 'YYYY-MM-DD or DD/MM/YYYY';

    return {
      fieldName: f.label,
      sourceColumnName: rawCol,
      dataType,
      mandatoryRequirement: spec.requirement + (spec.conditionNote ? ` (${spec.conditionNote})` : ''),
      allowedValues,
      normalizationRule: `Trim whitespace & map '${rawCol}' to universal key '${f.key}'`,
      calculationDependency: f.requiredForKPIs ? f.requiredForKPIs.join(', ') : 'None',
      kpiDependency: f.requiredForKPIs ? f.requiredForKPIs[0] || 'Operational KPI' : 'General Reporting',
      validationRule: spec.requirement === 'Required' ? 'MUST NOT BE NULL' : 'Optional / Default Fallback',
      missingDataBehavior: spec.requirement === 'Required' ? 'Flag KPI as NOT CALCULABLE' : 'Default empty or 0',
      sourceRegister: `Client ${registerType} Register`,
      sourceFile: 'Active Imported Workbook',
      sourceRow: 'Line 2..N (Auto-indexed)',
      effectiveDate: new Date().toISOString().split('T')[0],
      revisionRule: 'Numeric increment (0, 1, 2) or Alphabetic (A, B, C)',
      statusMapping: 'Map raw code to [APPROVED, PENDING, REJECTED_OPEN, REJECTED_CLOSED]',
      duplicateRule: 'Group by (recordRef + revision + submissionDate)',
      supersessionRule: 'Max revision per business entity key is active',
      evidenceRequirement: 'PDF Transmittal Link / Audit Register Record Index',
      customFieldFlag: false
    };
  });
}

/**
 * Contract Validator & KPI Calculability Evaluator
 * Checks mapped fields against register-type specific requirement specs.
 * Evaluates individual KPI calculability dynamically.
 */
export function validateRegisterContract(
  mappedColumns: Record<string, string>,
  registerType: RegisterTypeCode = 'SDW',
  existingMappingDetails?: FieldMappingDetail[]
): ContractValidationResult {
  const mappedUniversalKeys = new Set(Object.values(mappedColumns).filter(Boolean));
  const reqSpecs = REGISTER_FIELD_REQUIREMENTS[registerType] || REGISTER_FIELD_REQUIREMENTS.DEFAULT;

  const missingRequiredFields: (UniversalFieldDefinition & FieldRequirementSpec)[] = [];
  const missingOptionalFields: (UniversalFieldDefinition & FieldRequirementSpec)[] = [];

  CORE_MANDATORY_FIELDS.forEach(field => {
    const isMapped = mappedUniversalKeys.has(field.key);
    const spec = reqSpecs[field.key] || { requirement: 'Optional' as FieldRequirementType };

    if (!isMapped) {
      if (spec.requirement === 'Required') {
        missingRequiredFields.push({ ...field, ...spec });
      } else {
        missingOptionalFields.push({ ...field, ...spec });
      }
    }
  });

  const totalCoreCount = CORE_MANDATORY_FIELDS.length;
  const mappedCoreCount = totalCoreCount - (missingRequiredFields.length + missingOptionalFields.length);
  const coreSchemaCoverage = Math.round((mappedCoreCount / totalCoreCount) * 100);

  // Requirement coverage
  const totalRequiredForType = CORE_MANDATORY_FIELDS.filter(f => reqSpecs[f.key]?.requirement === 'Required').length;
  const missingRequiredCount = missingRequiredFields.length;
  const requiredFieldCoverage = totalRequiredForType > 0 
    ? Math.round(((totalRequiredForType - missingRequiredCount) / totalRequiredForType) * 100)
    : 100;

  // Granular KPI Calculability Engine
  const kpisToEvaluate = [
    {
      key: 'approval_rate',
      name: 'Overall Approval Rate',
      nameAr: 'نسبة الاعتماد الإجمالية',
      requiredKeys: ['status']
    },
    {
      key: 'avg_response_time',
      name: 'Average Response Time (Days)',
      nameAr: 'متوسط زمن الرد (بالأيام)',
      requiredKeys: ['submissionDate', 'responseDate']
    },
    {
      key: 'overdue_sla_tracker',
      name: 'SLA Overdue Tracking',
      nameAr: 'تتبع التأخير عن SLA',
      requiredKeys: ['submissionDate', 'status']
    },
    {
      key: 'superseded_revision_hierarchy',
      name: 'Revision Hierarchy & Superseded Filtering',
      nameAr: 'تسلسل المراجعات وتصفية المستبدل',
      requiredKeys: ['recordRef'],
      optionalKeys: ['revision']
    },
    {
      key: 'discipline_workload',
      name: 'Discipline Distribution & Workload Heatmap',
      nameAr: 'توزيع التخصصات وحجم العمل',
      requiredKeys: ['discipline']
    },
    {
      key: 'stakeholder_performance',
      name: 'Stakeholder & Contractor Accountability',
      nameAr: 'أداء المقاول والاستشاري',
      requiredKeys: ['responsibleParty', 'status']
    },
    {
      key: 'quality_score_index',
      name: 'Quality Score Index',
      nameAr: 'مؤشر جودة المعاملات',
      requiredKeys: ['status']
    }
  ];

  const kpiCalculability: KPICalculabilityStatus[] = kpisToEvaluate.map(kpi => {
    const missing = kpi.requiredKeys.filter(reqKey => !mappedUniversalKeys.has(reqKey));
    const present = kpi.requiredKeys.filter(reqKey => mappedUniversalKeys.has(reqKey));

    if (missing.length === 0) {
      const isPartial = kpi.optionalKeys && kpi.optionalKeys.some(ok => !mappedUniversalKeys.has(ok));
      if (isPartial) {
        return {
          kpiKey: kpi.key,
          kpiName: kpi.name,
          kpiNameAr: kpi.nameAr,
          calculable: 'PARTIAL',
          statusLabel: 'PARTIAL',
          missingFields: kpi.optionalKeys?.filter(ok => !mappedUniversalKeys.has(ok)) || [],
          presentFields: present,
          reason: 'CALCULABLE WITH DEFAULT FALLBACK (Optional revision key unmapped)',
          reasonAr: 'قابل للحساب باستخدام القيم الافتراضية (حقل المراجعة غير مربوط)'
        };
      }

      return {
        kpiKey: kpi.key,
        kpiName: kpi.name,
        kpiNameAr: kpi.nameAr,
        calculable: true,
        statusLabel: 'CALCULABLE',
        missingFields: [],
        presentFields: present,
        reason: 'All required source fields mapped correctly',
        reasonAr: 'جميع الحقول المطلوبة مربوطة بنجاح'
      };
    } else {
      const missingLabels = missing
        .map(mk => CORE_MANDATORY_FIELDS.find(f => f.key === mk)?.label || mk)
        .join(', ');

      return {
        kpiKey: kpi.key,
        kpiName: kpi.name,
        kpiNameAr: kpi.nameAr,
        calculable: false,
        statusLabel: 'NOT CALCULABLE',
        missingFields: missing,
        presentFields: present,
        reason: `NOT CALCULABLE: ${missing.map(m => `${m} unavailable`).join(' & ')} [Missing: ${missingLabels}]`,
        reasonAr: `غير قابل للحساب: ${missingLabels} غير متوفر في السجل المصدر`
      };
    }
  });

  // Calculate KPI calculability coverage
  const calculableKPIsCount = kpiCalculability.filter(k => k.calculable === true || k.calculable === 'PARTIAL').length;
  const kpiCalculabilityCoverage = Math.round((calculableKPIsCount / kpisToEvaluate.length) * 100);

  // Mapping details
  const mappingDetails = existingMappingDetails || autoMapColumnsWithDetails(Object.keys(mappedColumns));
  const mappedDetailsList = mappingDetails.filter(d => d.mappedKey);
  const mappingConfidenceAvg = mappedDetailsList.length > 0
    ? Math.round(mappedDetailsList.reduce((acc, d) => acc + d.confidence, 0) / mappedDetailsList.length)
    : 0;

  // Data Quality Index
  const dataQualityIndex = Math.min(100, Math.round((requiredFieldCoverage * 0.5) + (kpiCalculabilityCoverage * 0.3) + (mappingConfidenceAvg * 0.2)));

  // Overall Score
  const overallScore = Math.round(
    (requiredFieldCoverage * 0.35) +
    (kpiCalculabilityCoverage * 0.30) +
    (coreSchemaCoverage * 0.15) +
    (mappingConfidenceAvg * 0.10) +
    (dataQualityIndex * 0.10)
  );

  let overallRating: CompatibilityScoreBreakdown['overallRating'] = 'ACTION REQUIRED';
  let overallRatingAr = 'يتطلب إجراء لربط الحقول الأساسية';

  if (overallScore >= 90) {
    overallRating = 'READY FOR ANALYTICS';
    overallRatingAr = 'جاهز تماماً للتحليل وسلسلة الاعتماد';
  } else if (overallScore >= 75) {
    overallRating = 'HIGH COMPATIBILITY';
    overallRatingAr = 'توافقية عالية مع تحذيرات جودة جزيئية';
  } else if (overallScore >= 50) {
    overallRating = 'PARTIAL COMPATIBILITY';
    overallRatingAr = 'توافق جزئي - بعض المؤشرات غير قابلة للحساب';
  }

  const compatibilityScore: CompatibilityScoreBreakdown = {
    overallScore,
    overallRating,
    overallRatingAr,
    coreSchemaCoverage,
    kpiCalculabilityCoverage,
    requiredFieldCoverage,
    mappingConfidenceAvg,
    dataQualityIndex
  };

  const fieldContracts20Point = generate20PointContractMatrix(registerType, mappedColumns);

  return {
    isContractValid: missingRequiredFields.length === 0,
    registerType,
    compatibilityScore,
    scorePercentage: overallScore,
    missingRequiredFields,
    missingOptionalFields,
    mappedCoreFieldsCount: mappedCoreCount,
    totalCoreFieldsCount: totalCoreCount,
    kpiCalculability,
    mappingDetails,
    systemDerivedFields: SYSTEM_CONTROL_DERIVED_FIELDS,
    customFieldsIsolationNote: 'Custom fields are strictly isolated under Metadata/Filtering and do not alter KPI calculation formulas unless registered in Calculation Rule Registry.',
    fieldContracts20Point
  };
}
