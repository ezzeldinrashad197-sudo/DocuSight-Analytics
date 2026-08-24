import { calculateCanonicalKPIs, getBusinessEntityKey, getStatusCodeCategory, processRevisionEngine } from '../calculationFoundation';
import { SubmittalRow } from '../../types';
import { normalizeData } from '../../utils/calculations';

export function runCanonicalCalculationTests(): { name: string; passed: boolean; error?: string }[] {
  const testResults: { name: string; passed: boolean; error?: string }[] = [];

  const test = (name: string, fn: () => void) => {
    try {
      fn();
      testResults.push({ name, passed: true });
    } catch (e: any) {
      testResults.push({ name, passed: false, error: e.message || String(e) });
    }
  };

  // Test 1: One SUB Ref with Rev0 rejected + Rev1 approved
  test('ER-001: Rev0 Rejected + Rev1 Approved -> Current Approved=1, Current Rejected=0, ResolvedRejections=1', () => {
    const rows: SubmittalRow[] = [
      {
        id: '1',
        docNo: 'DOC-STR-001',
        rev: '00',
        sheetNo: '01',
        documentType: 'DOC',
        discipline: 'STR',
        trade: 'Structural',
        workflowStage: 'Rejected',
        status: 'C',
        submissionDate: '2026-01-01',
        dueDate: '2026-01-15',
        responseDate: '2026-01-10',
        logType: 'DOC',
        contractor: 'Main',
        consultant: 'Eng',
        remarks: '',
        area: '',
        tradeSystem: '',
        isLatestRev: false,
        isRev0: true,
        delayDays: 0,
        overdue: false
      },
      {
        id: '2',
        docNo: 'DOC-STR-001',
        rev: '01',
        sheetNo: '01',
        documentType: 'DOC',
        discipline: 'STR',
        trade: 'Structural',
        workflowStage: 'Approved',
        status: 'A',
        submissionDate: '2026-01-20',
        dueDate: '2026-02-05',
        responseDate: '2026-01-25',
        logType: 'DOC',
        contractor: 'Main',
        consultant: 'Eng',
        remarks: '',
        area: '',
        tradeSystem: '',
        isLatestRev: true,
        isRev0: false,
        delayDays: 0,
        overdue: false
      }
    ];

    const kpi = calculateCanonicalKPIs(rows);
    if (kpi.totalSubmittedSheets !== 2) throw new Error(`Expected 2 sheets submitted, got ${kpi.totalSubmittedSheets}`);
    if (kpi.totalUniqueDrawings !== 1) throw new Error(`Expected 1 unique drawing, got ${kpi.totalUniqueDrawings}`);
    if (kpi.approved !== 1) throw new Error(`Expected 1 Approved current item, got ${kpi.approved}`);
    if (kpi.rejectedOpen !== 0) throw new Error(`Expected 0 Rejected Open current items, got ${kpi.rejectedOpen}`);
    if (kpi.rejectedClosed !== 0) throw new Error(`Expected 0 Rejected Closed current items, got ${kpi.rejectedClosed}`);
    if (kpi.rejectionEvents !== 1) throw new Error(`Expected 1 Rejection Event, got ${kpi.rejectionEvents}`);
    if (kpi.resolvedRejections !== 1) throw new Error(`Expected 1 Resolved Rejection, got ${kpi.resolvedRejections}`);
    if (!kpi.reconciliationPassed) throw new Error(`Reconciliation equations failed`);
  });

  // Test 2: One SUB Ref with Rev0 rejected/open + Rev1 rejected/open
  test('ER-002: Rev0 Rejected/Open + Rev1 Rejected/Open -> Current Rejected Open=1, not 2', () => {
    const rows: SubmittalRow[] = [
      {
        id: '1',
        docNo: 'DOC-STR-002',
        rev: '00',
        sheetNo: '01',
        documentType: 'DOC',
        discipline: 'STR',
        trade: 'Structural',
        workflowStage: 'Rejected',
        status: 'C',
        recordStatus: 'OPEN',
        submissionDate: '2026-01-01',
        dueDate: '2026-01-15',
        responseDate: '2026-01-10',
        logType: 'DOC',
        contractor: 'Main',
        consultant: 'Eng',
        remarks: '',
        area: '',
        tradeSystem: '',
        isLatestRev: false,
        isRev0: true,
        delayDays: 0,
        overdue: false
      },
      {
        id: '2',
        docNo: 'DOC-STR-002',
        rev: '01',
        sheetNo: '01',
        documentType: 'DOC',
        discipline: 'STR',
        trade: 'Structural',
        workflowStage: 'Rejected',
        status: 'C',
        recordStatus: 'OPEN',
        submissionDate: '2026-01-20',
        dueDate: '2026-02-05',
        responseDate: '2026-01-25',
        logType: 'DOC',
        contractor: 'Main',
        consultant: 'Eng',
        remarks: '',
        area: '',
        tradeSystem: '',
        isLatestRev: true,
        isRev0: false,
        delayDays: 0,
        overdue: false
      }
    ];

    const kpi = calculateCanonicalKPIs(rows);
    if (kpi.totalSubmittedSheets !== 2) throw new Error(`Expected 2 sheets, got ${kpi.totalSubmittedSheets}`);
    if (kpi.totalUniqueDrawings !== 1) throw new Error(`Expected 1 unique drawing, got ${kpi.totalUniqueDrawings}`);
    if (kpi.rejectedOpen !== 1) throw new Error(`Expected 1 Rejected Open item, got ${kpi.rejectedOpen}`);
    if (kpi.rejectionEvents !== 2) throw new Error(`Expected 2 Rejection Events, got ${kpi.rejectionEvents}`);
    if (kpi.resolvedRejections !== 0) throw new Error(`Expected 0 Resolved Rejections, got ${kpi.resolvedRejections}`);
  });

  // Test 3: Blank status is not Pending
  test('ER-003: Blank status is classified as UNCLASSIFIED and flagged in DataQualityLedger', () => {
    const rows: SubmittalRow[] = [
      {
        id: '1',
        docNo: 'DOC-STR-003',
        rev: '00',
        sheetNo: '01',
        documentType: 'DOC',
        discipline: 'STR',
        trade: 'Structural',
        workflowStage: '',
        status: '',
        submissionDate: '2026-01-01',
        dueDate: '2026-01-15',
        responseDate: '',
        logType: 'DOC',
        contractor: 'Main',
        consultant: 'Eng',
        remarks: '',
        area: '',
        tradeSystem: '',
        isLatestRev: true,
        isRev0: true,
        delayDays: 0,
        overdue: false
      }
    ];

    const kpi = calculateCanonicalKPIs(rows);
    if (kpi.unclassified !== 1) throw new Error(`Expected 1 unclassified item, got ${kpi.unclassified}`);
    if (kpi.pending !== 0) throw new Error(`Blank status should not be Pending, got ${kpi.pending}`);
    if (kpi.dataQuality.blankStatusCount !== 1) throw new Error(`Expected 1 blank status issue in Data Quality Ledger`);
  });

  // Test 4: Survey (SUR) and Architectural (ARC) Separation
  test('ER-004: Survey and Architectural entities are resolved to distinct keys', () => {
    const rowArc: SubmittalRow = {
      id: '1',
      docNo: 'WIR-ARC-001',
      rev: '00',
      sheetNo: '01',
      documentType: 'WIR',
      discipline: 'ARC',
      trade: 'Architectural',
      workflowStage: 'Approved',
      status: 'A',
      submissionDate: '2026-01-01',
      dueDate: '',
      responseDate: '',
      logType: 'WIR',
      contractor: 'Main',
      consultant: 'Eng',
      remarks: '',
      area: '',
      tradeSystem: '',
      isLatestRev: true,
      isRev0: true,
      delayDays: 0,
      overdue: false
    };

    const rowSur: SubmittalRow = {
      id: '2',
      docNo: 'WIR-SUR-001',
      rev: '00',
      sheetNo: '01',
      documentType: 'WIR',
      discipline: 'SUR',
      trade: 'Survey',
      workflowStage: 'Approved',
      status: 'A',
      submissionDate: '2026-01-01',
      dueDate: '',
      responseDate: '',
      logType: 'WIR',
      contractor: 'Main',
      consultant: 'Eng',
      remarks: '',
      area: '',
      tradeSystem: '',
      isLatestRev: true,
      isRev0: true,
      delayDays: 0,
      overdue: false
    };

    const keyArc = getBusinessEntityKey(rowArc);
    const keySur = getBusinessEntityKey(rowSur);
    if (keyArc === keySur) throw new Error(`ARC and SUR collided on key: ${keyArc}`);
    if (!keyArc.includes('WIR') && !keyArc.includes('ARC')) throw new Error(`Unexpected key format for ARC: ${keyArc}`);
    if (!keySur.includes('WIR') && !keySur.includes('SUR')) throw new Error(`Unexpected key format for SUR: ${keySur}`);
  });

  // Test 5: Mathematical Reconciliation Invariants
  test('ER-005: Dual-dimension mathematical reconciliation invariant check', () => {
    const rows: SubmittalRow[] = [
      { id: '1', docNo: 'D-1', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Approved', status: 'A', submissionDate: '2026-01-01', dueDate: '', responseDate: '', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 0, overdue: false },
      { id: '2', docNo: 'D-2', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-01-01', dueDate: '', responseDate: '', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 0, overdue: false },
      { id: '3', docNo: 'D-3', rev: '01', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'D', recordStatus: 'CLOSED', submissionDate: '2026-01-01', dueDate: '', responseDate: '', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: false, delayDays: 0, overdue: false },
      { id: '4', docNo: 'D-4', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Pending', status: 'W', submissionDate: '2026-01-01', dueDate: '', responseDate: '', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 0, overdue: false },
    ];

    const kpi = calculateCanonicalKPIs(rows);
    if (!kpi.isWorkloadReconciled) throw new Error('Workload reconciliation failed');
    if (!kpi.isCurrentStateReconciled) throw new Error('Current-state reconciliation failed');
    if (!kpi.reconciliationPassed) throw new Error('Master reconciliation flag is false');
  });

  // Test 6: User Case A: Rev 0 (CLOSED/A) -> Rev 1 (OPEN/C)
  test('ER-006: Rev 0 (Closed/A) + Rev 1 (Open/C) -> Unique=1, Approved=0, RejectedOpen=1, RejectionEvents=1, ResolvedRejections=0', () => {
    const rows: SubmittalRow[] = [
      { id: '1', docNo: 'SUB-001', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Approved', status: 'A', recordStatus: 'CLOSED', submissionDate: '2026-01-01', dueDate: '', responseDate: '2026-01-05', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: false, isRev0: true, delayDays: 0, overdue: false },
      { id: '2', docNo: 'SUB-001', rev: '01', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-01-10', dueDate: '', responseDate: '2026-01-15', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: false, delayDays: 0, overdue: false },
    ];

    const kpi = calculateCanonicalKPIs(rows);
    if (kpi.totalUniqueDrawings !== 1) throw new Error(`Expected Unique=1, got ${kpi.totalUniqueDrawings}`);
    if (kpi.approved !== 0) throw new Error(`Expected Approved=0, got ${kpi.approved}`);
    if (kpi.rejectedOpen !== 1) throw new Error(`Expected Rejected Open=1, got ${kpi.rejectedOpen}`);
    if (kpi.rejectedClosed !== 0) throw new Error(`Expected Rejected Closed=0, got ${kpi.rejectedClosed}`);
    if (kpi.pending !== 0) throw new Error(`Expected Pending=0, got ${kpi.pending}`);
    if (kpi.rejectionEvents !== 1) throw new Error(`Expected Rejection Events=1, got ${kpi.rejectionEvents}`);
    if (kpi.resolvedRejections !== 0) throw new Error(`Expected Resolved Rejections=0, got ${kpi.resolvedRejections}`);
  });

  // Test 7: User Case B: Rev 0 (CLOSED/A) -> Rev 1 (OPEN/C) -> Rev 2 (CLOSED/A)
  test('ER-007: Rev 0 (Closed/A) + Rev 1 (Open/C) + Rev 2 (Closed/A) -> Unique=1, Approved=1, RejectedOpen=0, RejectionEvents=1, ResolvedRejections=1', () => {
    const rows: SubmittalRow[] = [
      { id: '1', docNo: 'SUB-001', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Approved', status: 'A', recordStatus: 'CLOSED', submissionDate: '2026-01-01', dueDate: '', responseDate: '2026-01-05', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: false, isRev0: true, delayDays: 0, overdue: false },
      { id: '2', docNo: 'SUB-001', rev: '01', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-01-10', dueDate: '', responseDate: '2026-01-15', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: false, isRev0: false, delayDays: 0, overdue: false },
      { id: '3', docNo: 'SUB-001', rev: '02', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Approved', status: 'A', recordStatus: 'CLOSED', submissionDate: '2026-01-20', dueDate: '', responseDate: '2026-01-25', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: false, delayDays: 0, overdue: false },
    ];

    const kpi = calculateCanonicalKPIs(rows);
    if (kpi.totalUniqueDrawings !== 1) throw new Error(`Expected Unique=1, got ${kpi.totalUniqueDrawings}`);
    if (kpi.approved !== 1) throw new Error(`Expected Approved=1, got ${kpi.approved}`);
    if (kpi.rejectedOpen !== 0) throw new Error(`Expected Rejected Open=0, got ${kpi.rejectedOpen}`);
    if (kpi.rejectedClosed !== 0) throw new Error(`Expected Rejected Closed=0, got ${kpi.rejectedClosed}`);
    if (kpi.pending !== 0) throw new Error(`Expected Pending=0, got ${kpi.pending}`);
    if (kpi.rejectionEvents !== 1) throw new Error(`Expected Rejection Events=1, got ${kpi.rejectionEvents}`);
    if (kpi.resolvedRejections !== 1) throw new Error(`Expected Resolved Rejections=1, got ${kpi.resolvedRejections}`);
  });

  // Test 8: User Case C: Rev 0 (OPEN/C) -> Rev 1 (CLOSED/D)
  test('ER-008: Rev 0 (Open/C) + Rev 1 (Closed/D) -> Unique=1, RejectedClosed=1, RejectedOpen=0', () => {
    const rows: SubmittalRow[] = [
      { id: '1', docNo: 'SUB-001', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-01-01', dueDate: '', responseDate: '2026-01-05', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: false, isRev0: true, delayDays: 0, overdue: false },
      { id: '2', docNo: 'SUB-001', rev: '01', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'D', recordStatus: 'CLOSED', submissionDate: '2026-01-10', dueDate: '', responseDate: '2026-01-15', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: false, delayDays: 0, overdue: false },
    ];

    const kpi = calculateCanonicalKPIs(rows);
    if (kpi.totalUniqueDrawings !== 1) throw new Error(`Expected Unique=1, got ${kpi.totalUniqueDrawings}`);
    if (kpi.rejectedClosed !== 1) throw new Error(`Expected Rejected Closed=1, got ${kpi.rejectedClosed}`);
    if (kpi.rejectedOpen !== 0) throw new Error(`Expected Rejected Open=0, got ${kpi.rejectedOpen}`);
  });

  // Test 9: Overdue Backlog Evaluation
  test('ER-009: Overdue Backlog strictly checks Active Items against Due Date vs As-Of Date', () => {
    const rows: SubmittalRow[] = [
      // 1. Active Pending past due date -> Overdue = 1
      { id: '1', docNo: 'SUB-OVERDUE-1', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Pending', status: 'W', submissionDate: '2026-01-01', dueDate: '2026-01-10', responseDate: '', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 5, overdue: true },
      // 2. Active Pending NOT past due date -> Overdue = 0
      { id: '2', docNo: 'SUB-PENDING-OK', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Pending', status: 'W', submissionDate: '2026-01-10', dueDate: '2026-01-25', responseDate: '', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 0, overdue: false },
      // 3. Approved item with past due date -> NOT Overdue (it is closed)
      { id: '3', docNo: 'SUB-CLOSED-LATE', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Approved', status: 'A', recordStatus: 'CLOSED', submissionDate: '2026-01-01', dueDate: '2026-01-10', responseDate: '2026-01-15', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 5, overdue: false },
    ];

    const kpi = calculateCanonicalKPIs(rows, undefined, '2026-01-15');
    if (kpi.pending !== 2) throw new Error(`Expected 2 Pending items, got ${kpi.pending}`);
    if (kpi.approved !== 1) throw new Error(`Expected 1 Approved item, got ${kpi.approved}`);
    if (kpi.overdue !== 1) throw new Error(`Expected exactly 1 Overdue item, got ${kpi.overdue}`);
    if (kpi.activeCurrentItems !== 2) throw new Error(`Expected activeCurrentItems=2, got ${kpi.activeCurrentItems}`);
  });

  // Test 10: Overdue is strictly an attribute/flag on Active Population and never exceeds it
  test('ER-010: Overdue is guaranteed to be a strict subset of Active Population (Pending + Rejected Open)', () => {
    const rows: SubmittalRow[] = [
      { id: '1', docNo: 'SUB-1', rev: '00', sheetNo: '01', documentType: 'DOC-GEN', discipline: 'GEN', trade: 'General', workflowStage: 'Pending', status: 'W', submissionDate: '2026-01-01', dueDate: '2026-01-10', responseDate: '', logType: 'DOC-GEN', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 5, overdue: true },
      { id: '2', docNo: 'SUB-2', rev: '00', sheetNo: '01', documentType: 'DOC-GEN', discipline: 'GEN', trade: 'General', workflowStage: 'Rejected', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-01-01', dueDate: '2026-01-10', responseDate: '', logType: 'DOC-GEN', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 5, overdue: true },
      { id: '3', docNo: 'SUB-3', rev: '00', sheetNo: '01', documentType: 'DOC-GEN', discipline: 'GEN', trade: 'General', workflowStage: 'Approved', status: 'A', recordStatus: 'CLOSED', submissionDate: '2026-01-01', dueDate: '2026-01-10', responseDate: '2026-01-15', logType: 'DOC-GEN', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 5, overdue: false },
    ];

    const kpi = calculateCanonicalKPIs(rows, undefined, '2026-01-20');
    if (kpi.activeCurrentItems !== 2) throw new Error(`Expected activeCurrentItems=2, got ${kpi.activeCurrentItems}`);
    if (kpi.overdue !== 2) throw new Error(`Expected overdue=2, got ${kpi.overdue}`);
    if (kpi.overdue > (kpi.activeCurrentItems || 0)) throw new Error('Overdue exceeded active population!');
    if (!kpi.reconciliationPassed) throw new Error('Master reconciliation flag failed');
  });

  // Test 11: CRITICAL is an attribute, never a distinct logType
  test('ER-011: CRITICAL does not corrupt Log Type taxonomy into DOC-GENCRITICAL', () => {
    const rawRow: SubmittalRow = {
      id: '1',
      docNo: 'DOC-GEN-001',
      rev: '00',
      sheetNo: '01',
      documentType: 'DOC',
      discipline: 'GENERAL CRITICAL',
      trade: 'General',
      workflowStage: 'Pending',
      status: 'W',
      submissionDate: '2026-01-01',
      dueDate: '',
      responseDate: '',
      logType: 'DOC-GEN CRITICAL',
      contractor: '',
      consultant: '',
      remarks: 'HIGHLY CRITICAL SUBMITTAL',
      area: '',
      tradeSystem: '',
      isLatestRev: true,
      isRev0: true,
      delayDays: 0,
      overdue: false
    };

    const norm = normalizeData([rawRow])[0];
    if (norm.documentType.includes('CRITICAL')) {
      throw new Error(`LogType corrupted with CRITICAL attribute: ${norm.documentType}`);
    }
    if (!norm.documentType.startsWith('DOC')) {
      throw new Error(`Expected DOC*, got ${norm.documentType}`);
    }
  });

  // Test 12: Dual Grain Validation: Historical Row-Level Rejection vs Current Unique Item Status
  test('ER-012: Historical Row Rejections are preserved independently from Current Unique Item Status', () => {
    const rows: SubmittalRow[] = [
      // Item 1: Rev 0 Rejected Open -> Rev 1 Approved
      { id: '1', docNo: 'ITEM-1', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-01-01', dueDate: '', responseDate: '2026-01-05', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: false, isRev0: true, delayDays: 0, overdue: false },
      { id: '2', docNo: 'ITEM-1', rev: '01', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Approved', status: 'A', recordStatus: 'CLOSED', submissionDate: '2026-01-10', dueDate: '', responseDate: '2026-01-15', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: false, delayDays: 0, overdue: false },
      // Item 2: Rev 0 Rejected Open -> Rev 1 Rejected Open -> Rev 2 Rejected Closed
      { id: '3', docNo: 'ITEM-2', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-01-01', dueDate: '', responseDate: '2026-01-05', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: false, isRev0: true, delayDays: 0, overdue: false },
      { id: '4', docNo: 'ITEM-2', rev: '01', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-01-08', dueDate: '', responseDate: '2026-01-12', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: false, isRev0: false, delayDays: 0, overdue: false },
      { id: '5', docNo: 'ITEM-2', rev: '02', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'D', recordStatus: 'CLOSED', submissionDate: '2026-01-15', dueDate: '', responseDate: '2026-01-20', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: false, delayDays: 0, overdue: false },
      // Item 3: Rev 0 Pending
      { id: '6', docNo: 'ITEM-3', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Pending', status: 'W', recordStatus: 'OPEN', submissionDate: '2026-01-01', dueDate: '', responseDate: '', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 0, overdue: false },
    ];

    const kpi = calculateCanonicalKPIs(rows);

    // 1. Workload / Row Grain Assertions
    if (kpi.totalSubmittedSheets !== 6) throw new Error(`Expected 6 total submitted sheets, got ${kpi.totalSubmittedSheets}`);
    if (kpi.totalRejectedRows !== 4) throw new Error(`Expected 4 total rejected rows, got ${kpi.totalRejectedRows}`);
    if (kpi.rejectedOpenRows !== 3) throw new Error(`Expected 3 rejected open rows, got ${kpi.rejectedOpenRows}`);
    if (kpi.rejectedClosedRows !== 1) throw new Error(`Expected 1 rejected closed row, got ${kpi.rejectedClosedRows}`);

    // 2. Current Unique Item Grain Assertions
    if (kpi.totalUniqueDrawings !== 3) throw new Error(`Expected 3 unique items, got ${kpi.totalUniqueDrawings}`);
    if (kpi.currentApproved !== 1 || kpi.approved !== 1) throw new Error(`Expected 1 current approved item, got ${kpi.currentApproved}`);
    if (kpi.currentRejectedClosed !== 1 || kpi.rejectedClosed !== 1) throw new Error(`Expected 1 current rejected closed item, got ${kpi.currentRejectedClosed}`);
    if (kpi.currentRejectedOpen !== 0 || kpi.rejectedOpen !== 0) throw new Error(`Expected 0 current rejected open items, got ${kpi.currentRejectedOpen}`);
    if (kpi.currentRejected !== 1) throw new Error(`Expected 1 current total rejected item, got ${kpi.currentRejected}`);
    if (kpi.currentPending !== 1 || kpi.pending !== 1) throw new Error(`Expected 1 current pending item, got ${kpi.currentPending}`);
    
    // 3. Historical Rejection Resolution Assertions
    if (kpi.resolvedRejections !== 1) throw new Error(`Expected 1 resolved rejection (ITEM-1), got ${kpi.resolvedRejections}`);
  });

  // Test 13: Case Normalization across lower/upper/mixed strings ('c', 'C', 'closed', 'w')
  test('ER-013: Centralized case normalization handles lowercase, whitespace, and mixed strings flawlessly', () => {
    const rows: SubmittalRow[] = [
      { id: '1', docNo: 'SUB-LOWER-1', rev: '00', sheetNo: '01', documentType: 'doc', discipline: 'str', trade: 'structural', workflowStage: 'rejected', status: 'c', recordStatus: 'open', submissionDate: '2026-01-01', dueDate: '', responseDate: '', logType: 'doc', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 0, overdue: false },
      { id: '2', docNo: 'SUB-LOWER-2', rev: '00', sheetNo: '01', documentType: 'doc', discipline: 'str', trade: 'structural', workflowStage: 'rejected', status: 'c closed', recordStatus: 'closed', submissionDate: '2026-01-01', dueDate: '', responseDate: '', logType: 'doc', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 0, overdue: false },
      { id: '3', docNo: 'SUB-LOWER-3', rev: '00', sheetNo: '01', documentType: 'doc', discipline: 'str', trade: 'structural', workflowStage: 'approved', status: 'a', recordStatus: 'closed', submissionDate: '2026-01-01', dueDate: '', responseDate: '', logType: 'doc', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 0, overdue: false },
      { id: '4', docNo: 'SUB-LOWER-4', rev: '00', sheetNo: '01', documentType: 'doc', discipline: 'str', trade: 'structural', workflowStage: 'pending', status: 'w', recordStatus: 'open', submissionDate: '2026-01-01', dueDate: '', responseDate: '', logType: 'doc', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: true, delayDays: 0, overdue: false }
    ];

    const kpi = calculateCanonicalKPIs(rows);
    if (kpi.totalRejectedRows !== 2) throw new Error(`Expected 2 total rejected rows, got ${kpi.totalRejectedRows}`);
    if (kpi.rejectedOpenRows !== 1) throw new Error(`Expected 1 rejected open row, got ${kpi.rejectedOpenRows}`);
    if (kpi.rejectedClosedRows !== 1) throw new Error(`Expected 1 rejected closed row, got ${kpi.rejectedClosedRows}`);
    if (kpi.approved !== 1) throw new Error(`Expected 1 approved item, got ${kpi.approved}`);
    if (kpi.pending !== 1) throw new Error(`Expected 1 pending item, got ${kpi.pending}`);
  });

  // Test 14: Cross-Register Rejection Consistency (NCR, MIR, WIR, RFI, SOR)
  test('ER-014: Cross-register status categorization handles NCR, MIR, WIR, RFI, SOR uniformly', () => {
    // 1. NCR
    const ncrRow: any = { id: 'NCR-1', ncrRef: 'NCR-001', rev: '0', ncrStatus: 'open', ncrAction: 'rejected', logType: 'NCR' };
    if (getStatusCodeCategory(ncrRow) !== 'REJECTED_OPEN') throw new Error(`NCR Rejection failed: ${getStatusCodeCategory(ncrRow)}`);

    // 2. MIR
    const mirRow: SubmittalRow = { id: 'MIR-1', docNo: 'MIR-001', rev: '0', status: 'c', recordStatus: 'open', logType: 'MIR' } as any;
    if (getStatusCodeCategory(mirRow) !== 'REJECTED_OPEN') throw new Error(`MIR Rejection failed: ${getStatusCodeCategory(mirRow)}`);

    // 3. WIR
    const wirRow: SubmittalRow = { id: 'WIR-1', docNo: 'WIR-001', rev: '0', status: 'c', recordStatus: 'closed', logType: 'WIR' } as any;
    if (getStatusCodeCategory(wirRow) !== 'REJECTED_CLOSED') throw new Error(`WIR Rejection failed: ${getStatusCodeCategory(wirRow)}`);

    // 4. RFI
    const rfiRow: SubmittalRow = { id: 'RFI-1', docNo: 'RFI-001', rev: '0', status: 'c', recordStatus: 'open', logType: 'RFI' } as any;
    if (getStatusCodeCategory(rfiRow) !== 'REJECTED_OPEN') throw new Error(`RFI Rejection failed: ${getStatusCodeCategory(rfiRow)}`);

    // 5. SOR
    const sorRow: any = { id: 'SOR-1', sorRef: 'SOR-001', rev: '0', sorStatus: 'closed', sorAction: 'rejected', logType: 'SOR' };
    if (getStatusCodeCategory(sorRow) !== 'REJECTED_CLOSED') throw new Error(`SOR Rejection failed: ${getStatusCodeCategory(sorRow)}`);
  });

  // Test 15: Sequence: Rev 0 (Rejected Open) -> Rev 1 (Rejected Closed) -> Rev 2 (Approved)
  test('ER-015: Sequence Rev0(Rej Open) -> Rev1(Rej Closed) -> Rev2(Approved) validates historical row counts vs unique current state', () => {
    const rows: SubmittalRow[] = [
      { id: '1', docNo: 'ITEM-SEQ-1', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-01-01', dueDate: '', responseDate: '2026-01-05', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: false, isRev0: true, delayDays: 0, overdue: false },
      { id: '2', docNo: 'ITEM-SEQ-1', rev: '01', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-01-10', dueDate: '', responseDate: '2026-01-15', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: false, isRev0: false, delayDays: 0, overdue: false },
      { id: '3', docNo: 'ITEM-SEQ-1', rev: '02', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Approved', status: 'A', recordStatus: 'CLOSED', submissionDate: '2026-01-20', dueDate: '', responseDate: '2026-01-25', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: false, delayDays: 0, overdue: false }
    ];

    const kpi = calculateCanonicalKPIs(rows);

    // Row-level grain assertions
    if (kpi.totalSubmittedSheets !== 3) throw new Error(`Expected 3 submitted sheets, got ${kpi.totalSubmittedSheets}`);
    if (kpi.totalRejectedRows !== 2) throw new Error(`Expected totalRejectedRows=2, got ${kpi.totalRejectedRows}`);
    if (kpi.rejectedOpenRows !== 1) throw new Error(`Expected rejectedOpenRows=1, got ${kpi.rejectedOpenRows}`);
    if (kpi.rejectedClosedRows !== 1) throw new Error(`Expected rejectedClosedRows=1, got ${kpi.rejectedClosedRows}`);

    // Unique current item grain assertions
    if (kpi.totalUniqueDrawings !== 1) throw new Error(`Expected totalUniqueDrawings=1, got ${kpi.totalUniqueDrawings}`);
    if (kpi.currentApproved !== 1) throw new Error(`Expected currentApproved=1, got ${kpi.currentApproved}`);
    if (kpi.currentRejected !== 0) throw new Error(`Expected currentRejected=0, got ${kpi.currentRejected}`);
    if (kpi.resolvedRejections !== 1) throw new Error(`Expected resolvedRejections=1, got ${kpi.resolvedRejections}`);
    if (kpi.approvalRate !== 100) throw new Error(`Expected approvalRate=100, got ${kpi.approvalRate}`);
  });

  // Test 16: Sequence: Rev 0 (Rejected Open) -> Rev 1 (Rejected Open) -> Rev 2 (Approved)
  test('ER-016: Sequence Rev0(Rej Open) -> Rev1(Rej Open) -> Rev2(Approved) tracks 2 Open rejection events and 1 current approved item', () => {
    const rows: SubmittalRow[] = [
      { id: '1', docNo: 'ITEM-SEQ-2', rev: '00', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-01-01', dueDate: '', responseDate: '2026-01-05', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: false, isRev0: true, delayDays: 0, overdue: false },
      { id: '2', docNo: 'ITEM-SEQ-2', rev: '01', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Rejected', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-01-10', dueDate: '', responseDate: '2026-01-15', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: false, isRev0: false, delayDays: 0, overdue: false },
      { id: '3', docNo: 'ITEM-SEQ-2', rev: '02', sheetNo: '01', documentType: 'DOC', discipline: 'STR', trade: 'Structural', workflowStage: 'Approved', status: 'A', recordStatus: 'CLOSED', submissionDate: '2026-01-20', dueDate: '', responseDate: '2026-01-25', logType: 'DOC', contractor: '', consultant: '', remarks: '', area: '', tradeSystem: '', isLatestRev: true, isRev0: false, delayDays: 0, overdue: false }
    ];

    const kpi = calculateCanonicalKPIs(rows);

    // Row-level grain assertions
    if (kpi.totalSubmittedSheets !== 3) throw new Error(`Expected 3 submitted sheets, got ${kpi.totalSubmittedSheets}`);
    if (kpi.totalRejectedRows !== 2) throw new Error(`Expected totalRejectedRows=2, got ${kpi.totalRejectedRows}`);
    if (kpi.rejectedOpenRows !== 2) throw new Error(`Expected rejectedOpenRows=2, got ${kpi.rejectedOpenRows}`);
    if (kpi.rejectedClosedRows !== 0) throw new Error(`Expected rejectedClosedRows=0, got ${kpi.rejectedClosedRows}`);

    // Unique current item grain assertions
    if (kpi.totalUniqueDrawings !== 1) throw new Error(`Expected totalUniqueDrawings=1, got ${kpi.totalUniqueDrawings}`);
    if (kpi.currentApproved !== 1) throw new Error(`Expected currentApproved=1, got ${kpi.currentApproved}`);
    if (kpi.currentRejected !== 0) throw new Error(`Expected currentRejected=0, got ${kpi.currentRejected}`);
    if (kpi.resolvedRejections !== 1) throw new Error(`Expected resolvedRejections=1, got ${kpi.resolvedRejections}`);
  });

  return testResults;
}
