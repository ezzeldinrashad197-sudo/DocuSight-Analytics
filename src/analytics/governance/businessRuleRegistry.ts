export interface BusinessRuleDefinition {
  ruleId: string;
  ruleName: string;
  description: string;
  appliesTo: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  version: string;
  status: 'Approved' | 'Implemented' | 'Validated';
}

export const ENGINE_RULE_VERSIONS = {
  revisionEngine: 'v1.0.0',
  statusEngine: 'v1.0.0',
  workflowEngine: 'v1.0.0',
  governanceRules: 'v1.0.0',
  baselineDate: '2026-07-29',
  status: 'Production Baseline Candidate'
};

export const OFFICIAL_BUSINESS_RULES: BusinessRuleDefinition[] = [
  {
    ruleId: 'BR-0001',
    ruleName: 'Immutable Raw Data',
    description: 'Raw data imported from Excel/SharePoint/ACC must never be mutated or overwritten.',
    appliesTo: 'Normalization Engine',
    priority: 'Critical',
    version: '1.0',
    status: 'Validated'
  },
  {
    ruleId: 'BR-0002',
    ruleName: 'Validation Before Calculation',
    description: 'No computational or aggregation operation may execute before validation successfully completes.',
    appliesTo: 'Validation Engine',
    priority: 'Critical',
    version: '1.0',
    status: 'Validated'
  },
  {
    ruleId: 'BR-0003',
    ruleName: 'Normalization Before Calculation',
    description: 'All field names, casing, whitespace, and dates must be normalized prior to business logic evaluation.',
    appliesTo: 'Normalization Engine',
    priority: 'Critical',
    version: '1.0',
    status: 'Validated'
  },
  {
    ruleId: 'BR-0004',
    ruleName: 'No Duplicate Calculation in Current Metrics',
    description: 'Duplicate records (IsDuplicate = true) must be excluded from current active KPI calculations.',
    appliesTo: 'KPI Engine & Aggregation Engines',
    priority: 'High',
    version: '1.0',
    status: 'Validated'
  },
  {
    ruleId: 'BR-0005',
    ruleName: 'Cumulative Latest Revision Policy',
    description: 'Cumulative reports and current dashboards rely exclusively on the latest valid revision per document reference.',
    appliesTo: 'Cumulative Aggregation Engine',
    priority: 'High',
    version: '1.0',
    status: 'Validated'
  },
  {
    ruleId: 'BR-0006',
    ruleName: 'Monthly Activity Period Policy',
    description: 'Monthly reports calculate activity occurring strictly within the defined reporting period.',
    appliesTo: 'Monthly Aggregation Engine',
    priority: 'High',
    version: '1.0',
    status: 'Validated'
  },
  {
    ruleId: 'BR-0007',
    ruleName: 'No Calculations in Presentation Layer',
    description: 'Dashboards, UI components, PDF exports, and PPTX generators must display final calculated results only.',
    appliesTo: 'Reporting & Dashboard Engines',
    priority: 'Critical',
    version: '1.0',
    status: 'Validated'
  },
  {
    ruleId: 'BR-0008',
    ruleName: 'Single Source of Truth',
    description: 'All KPIs must derive exclusively from the official calculation foundation datasets.',
    appliesTo: 'All Engines',
    priority: 'Critical',
    version: '1.0',
    status: 'Validated'
  },
  {
    ruleId: 'INV-01',
    ruleName: 'Invariant: Revision Sum Parity',
    description: 'Rev0 + Further Revision + Missing Revision must equal Total Unique Business Documents.',
    appliesTo: 'Revision Engine & Audit Center',
    priority: 'Critical',
    version: '1.0',
    status: 'Validated'
  },
  {
    ruleId: 'INV-02',
    ruleName: 'Invariant: Status Sum Parity',
    description: 'Approved + Pending + Rejected Open + Rejected Closed must equal Total Classified Documents.',
    appliesTo: 'Status Engine & KPI Engine',
    priority: 'Critical',
    version: '1.0',
    status: 'Validated'
  },
  {
    ruleId: 'INV-03',
    ruleName: 'Invariant: Workflow Family Isolation',
    description: 'Each document reference must belong strictly to a single Workflow Family without cross-type bleeding.',
    appliesTo: 'Workflow Engine',
    priority: 'Critical',
    version: '1.0',
    status: 'Validated'
  },
  {
    ruleId: 'INV-04',
    ruleName: 'Invariant: Mutually Exclusive Revision Classification',
    description: 'No document can be classified as both Rev0 and Further Revision simultaneously.',
    appliesTo: 'Revision Engine',
    priority: 'Critical',
    version: '1.0',
    status: 'Validated'
  }
];

export function getBusinessRule(ruleId: string): BusinessRuleDefinition | undefined {
  return OFFICIAL_BUSINESS_RULES.find(r => r.ruleId === ruleId);
}
