export interface FormulaDefinition {
  formulaId: string;
  formulaName: string;
  purpose: string;
  inputs: string[];
  formulaExpression: string;
  outputType: 'Integer' | 'Percentage' | 'Time';
  version: string;
}

export const OFFICIAL_FORMULAS: FormulaDefinition[] = [
  {
    formulaId: 'FORM-0001',
    formulaName: 'Total Documents',
    purpose: 'Calculate total unique valid documents in cumulative scope.',
    inputs: ['Latest Valid Records'],
    formulaExpression: 'COUNT(All Latest Valid Documents)',
    outputType: 'Integer',
    version: '1.0'
  },
  {
    formulaId: 'FORM-0002',
    formulaName: 'Monthly Submitted',
    purpose: 'Calculate count of documents submitted within reporting period.',
    inputs: ['Documents', 'Submission Date', 'Reporting Period'],
    formulaExpression: 'COUNT(Documents where Submission Date inside period)',
    outputType: 'Integer',
    version: '1.0'
  },
  {
    formulaId: 'FORM-0101',
    formulaName: 'Approval Rate',
    purpose: 'Calculate percentage of approved documents among reviewed items.',
    inputs: ['Approved Documents', 'Total Reviewed Documents'],
    formulaExpression: '(Approved Documents / Total Reviewed Documents) * 100',
    outputType: 'Percentage',
    version: '1.0'
  },
  {
    formulaId: 'FORM-0102',
    formulaName: 'Rejection Rate',
    purpose: 'Calculate percentage of rejected documents among reviewed items.',
    inputs: ['Rejected Documents', 'Total Reviewed Documents'],
    formulaExpression: '(Rejected Documents / Total Reviewed Documents) * 100',
    outputType: 'Percentage',
    version: '1.0'
  },
  {
    formulaId: 'FORM-0201',
    formulaName: 'Average Review Time',
    purpose: 'Calculate average duration between submission and response date.',
    inputs: ['Response Date', 'Submission Date', 'Reviewed Documents'],
    formulaExpression: 'SUM(Response Date - Submission Date) / Reviewed Documents',
    outputType: 'Time',
    version: '1.0'
  },
  {
    formulaId: 'FORM-0301',
    formulaName: 'Revision Count',
    purpose: 'Count total revisions registered for a document reference.',
    inputs: ['Document Reference', 'Revision Records'],
    formulaExpression: 'COUNT(All Revisions for same Document Reference)',
    outputType: 'Integer',
    version: '1.0'
  },
  {
    formulaId: 'FORM-0402',
    formulaName: 'Duplicate Rate',
    purpose: 'Calculate percentage of duplicate records imported.',
    inputs: ['Duplicate Records', 'Total Imported Records'],
    formulaExpression: '(Duplicate Records / Total Imported Records) * 100',
    outputType: 'Percentage',
    version: '1.0'
  },
  {
    formulaId: 'FORM-0210',
    formulaName: 'Approval Rate',
    purpose: 'Calculate percentage of monthly approved items against monthly submissions.',
    inputs: ['Approved Monthly', 'Monthly Total Submission'],
    formulaExpression: 'Approved Monthly / Monthly Total Submission * 100',
    outputType: 'Percentage',
    version: '1.0'
  },
  {
    formulaId: 'FORM-0211',
    formulaName: 'Carry Forward Pending',
    purpose: 'Calculate quantity of pending NCRs originating from months prior to the reporting window.',
    inputs: ['Pending Documents', 'Submission Date', 'Reporting Period Start'],
    formulaExpression: 'COUNT(Pending documents where Submission Date < Reporting Period Start)',
    outputType: 'Integer',
    version: '1.0'
  },
  {
    formulaId: 'FORM-0212',
    formulaName: 'Current Month Pending',
    purpose: 'Calculate quantity of pending NCRs originating within the active reporting window.',
    inputs: ['Pending Documents', 'Submission Date', 'Reporting Period Start'],
    formulaExpression: 'COUNT(Pending documents where Submission Date >= Reporting Period Start)',
    outputType: 'Integer',
    version: '1.0'
  },
  {
    formulaId: 'FORM-0213',
    formulaName: 'Open Status Deconstruction',
    purpose: 'Formally define the mathematical components of the active Open backlog to guarantee subset compliance.',
    inputs: ['Under Review', 'Pending (Carry Forward + Current Month)', 'Workflow Waiting', 'Other Active States'],
    formulaExpression: 'Open = Under Review + Pending + Workflow Waiting + Other Active States',
    outputType: 'Integer',
    version: '1.0'
  },
  {
    formulaId: 'FORM-0214',
    formulaName: 'Total Pending Balance',
    purpose: 'Deconstruct the Pending backlog into temporal categories to isolate heritage issues from fresh submissions.',
    inputs: ['Carry Forward Pending', 'Current Month Pending'],
    formulaExpression: 'Pending = Carry Forward Pending + Current Month Pending',
    outputType: 'Integer',
    version: '1.0'
  }
];

export function getFormula(formulaId: string): FormulaDefinition | undefined {
  return OFFICIAL_FORMULAS.find(f => f.formulaId === formulaId);
}
