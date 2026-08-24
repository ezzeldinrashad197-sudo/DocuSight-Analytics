import { calculateCanonicalKPIs, getBusinessEntityKey, getStatusCodeCategory, processRevisionEngine } from '../analytics/calculationFoundation';
import { SubmittalRow } from '../types';

console.log('=== RUNNING FORENSIC DOC VERIFICATION & REGRESSION SUITE ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    failCount++;
    throw new Error(msg);
  } else {
    console.log(`[PASS] ${msg}`);
    passCount++;
  }
}

// -------------------------------------------------------------
// SEVEN REQUIRED REGRESSION SCENARIOS
// -------------------------------------------------------------

console.log('\n--- 1. SEVEN REQUIRED REGRESSION SCENARIOS ---');

// Test 1: Rev 00 C Closed -> Rev 01 B Closed
// Expected: Approved = 1, Rejected Closed = 0, Historical Rejection Event = 1
{
  const rows: SubmittalRow[] = [
    {
      id: 't1-1',
      docNo: 'DOC-TEST-001',
      rev: '00',
      documentType: 'DOC',
      discipline: 'STR',
      status: 'C',
      recordStatus: 'CLOSED',
      submissionDate: '2026-01-01',
      responseDate: '2026-01-05',
    } as any,
    {
      id: 't1-2',
      docNo: 'DOC-TEST-001',
      rev: '01',
      documentType: 'DOC',
      discipline: 'STR',
      status: 'B',
      recordStatus: 'CLOSED',
      submissionDate: '2026-01-10',
      responseDate: '2026-01-15',
    } as any,
  ];
  const kpi = calculateCanonicalKPIs(rows);
  assert(kpi.totalUniqueDrawings === 1, 'Test 1: Unique Items = 1');
  assert(kpi.approved === 1, 'Test 1: Approved = 1');
  assert(kpi.rejectedClosed === 0, 'Test 1: Rejected Closed = 0');
  assert(kpi.rejectedOpen === 0, 'Test 1: Rejected Open = 0');
  assert(kpi.rejectionEventsClosed === 1, 'Test 1: Historical rejection event recorded = 1');
  assert(kpi.resolvedRejections === 1, 'Test 1: Resolved rejection recorded = 1');
}

// Test 2: Rev 00 C Open
// Expected: Rejected Open = 1, Active = 1
{
  const rows: SubmittalRow[] = [
    {
      id: 't2-1',
      docNo: 'DOC-TEST-002',
      rev: '00',
      documentType: 'DOC',
      discipline: 'STR',
      status: 'C',
      recordStatus: 'OPEN',
      submissionDate: '2026-01-01',
    } as any,
  ];
  const kpi = calculateCanonicalKPIs(rows);
  assert(kpi.totalUniqueDrawings === 1, 'Test 2: Unique Items = 1');
  assert(kpi.rejectedOpen === 1, 'Test 2: Rejected Open = 1');
  assert(kpi.rejectedClosed === 0, 'Test 2: Rejected Closed = 0');
  assert(kpi.approved === 0, 'Test 2: Approved = 0');
  assert(kpi.pending === 0, 'Test 2: Pending = 0');
  assert(kpi.activeItems === 1, 'Test 2: Active = 1');
}

// Test 3: Rev 00 C Closed (no later rev)
// Expected: Rejected Closed = 1, Active = 0
{
  const rows: SubmittalRow[] = [
    {
      id: 't3-1',
      docNo: 'DOC-TEST-003',
      rev: '00',
      documentType: 'DOC',
      discipline: 'STR',
      status: 'C',
      recordStatus: 'CLOSED',
      submissionDate: '2026-01-01',
      responseDate: '2026-01-05',
    } as any,
  ];
  const kpi = calculateCanonicalKPIs(rows);
  assert(kpi.totalUniqueDrawings === 1, 'Test 3: Unique Items = 1');
  assert(kpi.rejectedClosed === 1, 'Test 3: Rejected Closed = 1');
  assert(kpi.rejectedOpen === 0, 'Test 3: Rejected Open = 0');
  assert(kpi.approved === 0, 'Test 3: Approved = 0');
  assert(kpi.totalRejected === 1, 'Test 3: Total Rejected = 1');
  assert(kpi.activeItems === 0, 'Test 3: Active = 0 (Rejected Closed is NOT Active)');
}

// Test 4: Rev 00 C Closed -> Rev 01 C Open
// Expected: Rejected Open = 1, Rejected Closed = 0, Active = 1
{
  const rows: SubmittalRow[] = [
    {
      id: 't4-1',
      docNo: 'DOC-TEST-004',
      rev: '00',
      documentType: 'DOC',
      discipline: 'STR',
      status: 'C',
      recordStatus: 'CLOSED',
      submissionDate: '2026-01-01',
      responseDate: '2026-01-05',
    } as any,
    {
      id: 't4-2',
      docNo: 'DOC-TEST-004',
      rev: '01',
      documentType: 'DOC',
      discipline: 'STR',
      status: 'C',
      recordStatus: 'OPEN',
      submissionDate: '2026-01-10',
    } as any,
  ];
  const kpi = calculateCanonicalKPIs(rows);
  assert(kpi.totalUniqueDrawings === 1, 'Test 4: Unique Items = 1');
  assert(kpi.rejectedOpen === 1, 'Test 4: Rejected Open = 1');
  assert(kpi.rejectedClosed === 0, 'Test 4: Rejected Closed = 0');
  assert(kpi.approved === 0, 'Test 4: Approved = 0');
  assert(kpi.activeItems === 1, 'Test 4: Active = 1');
}

// Test 5: Rev 00 C Open -> Rev 01 B Closed
// Expected: Approved = 1, Rejected Open = 0, Rejected Closed = 0
{
  const rows: SubmittalRow[] = [
    {
      id: 't5-1',
      docNo: 'DOC-TEST-005',
      rev: '00',
      documentType: 'DOC',
      discipline: 'STR',
      status: 'C',
      recordStatus: 'OPEN',
      submissionDate: '2026-01-01',
    } as any,
    {
      id: 't5-2',
      docNo: 'DOC-TEST-005',
      rev: '01',
      documentType: 'DOC',
      discipline: 'STR',
      status: 'B',
      recordStatus: 'CLOSED',
      submissionDate: '2026-01-10',
      responseDate: '2026-01-15',
    } as any,
  ];
  const kpi = calculateCanonicalKPIs(rows);
  assert(kpi.totalUniqueDrawings === 1, 'Test 5: Unique Items = 1');
  assert(kpi.approved === 1, 'Test 5: Approved = 1');
  assert(kpi.rejectedOpen === 0, 'Test 5: Rejected Open = 0');
  assert(kpi.rejectedClosed === 0, 'Test 5: Rejected Closed = 0');
  assert(kpi.totalRejected === 0, 'Test 5: Total Rejected = 0');
  assert(kpi.resolvedRejections === 1, 'Test 5: Resolved Rejection = 1');
}

// Test 6: STR-0029 (Rev 00 C Closed -> Rev 01 C Closed)
// Expected: Workload = 2, Unique Items = 1, Historical C/D Events = 2, Current Rejected Closed = 1
{
  const rows: SubmittalRow[] = [
    {
      id: 't6-1',
      docNo: 'INN-ACE-1.03B-DOC-STR-0029',
      rev: '00',
      documentType: 'DOC-STR',
      discipline: 'STR',
      status: 'C',
      recordStatus: 'CLOSED',
      submissionDate: '2026-02-25',
      responseDate: '2026-03-04',
      subject: 'Takeoff-Parcel 1.03B-BBS-Foundation for Buildings 01,02,03&04',
    } as any,
    {
      id: 't6-2',
      docNo: 'INN-ACE-1.03B-DOC-STR-0029',
      rev: '01',
      documentType: 'DOC-STR',
      discipline: 'STR',
      status: 'C',
      recordStatus: 'CLOSED',
      submissionDate: '2026-04-01',
      responseDate: '2026-04-09',
      subject: 'Takeoff-Parcel 1.03B-BBS-Foundation for Buildings 01,02,03&04',
    } as any,
  ];
  const kpi = calculateCanonicalKPIs(rows);
  assert(kpi.totalSubmittedSheets === 2, 'Test 6 (STR-0029): Workload Sheets = 2');
  assert(kpi.totalUniqueDrawings === 1, 'Test 6 (STR-0029): Unique Items = 1');
  assert(kpi.rejectionEventsClosed === 2, 'Test 6 (STR-0029): Historical C/D Events = 2');
  assert(kpi.rejectedClosed === 1, 'Test 6 (STR-0029): Current Rejected Closed = 1');
  assert(kpi.rejectedOpen === 0, 'Test 6 (STR-0029): Current Rejected Open = 0');
  assert(kpi.activeItems === 0, 'Test 6 (STR-0029): Active Items = 0');
}

// Test 7: STR-0053 (3 Physical Rows with same SUB Ref + Rev 00 C Closed, different Subjects)
// Expected: Workload = 3, Unique Items = 1, Historical C/D Events = 3, Current Rejected Closed = 1
{
  const rows: SubmittalRow[] = [
    {
      id: 't7-1',
      docNo: 'INN-ACE-1.03B-DOC-STR-0053',
      rev: '00',
      documentType: 'DOC-STR',
      discipline: 'STR',
      status: 'C',
      recordStatus: 'CLOSED',
      submissionDate: '2026-05-06',
      responseDate: '2026-05-24',
      subject: 'Concrete Mix Design for Green Mix – (P.C. 200 kg/cm² / 300 kg Cement)',
    } as any,
    {
      id: 't7-2',
      docNo: 'INN-ACE-1.03B-DOC-STR-0053',
      rev: '00',
      documentType: 'DOC-STR',
      discipline: 'STR',
      status: 'C',
      recordStatus: 'CLOSED',
      submissionDate: '2026-05-06',
      responseDate: '2026-05-24',
      subject: 'Concrete Mix Design for Green Mix – (S.O.G. 250 kg/cm² / 320 kg Cement)',
    } as any,
    {
      id: 't7-3',
      docNo: 'INN-ACE-1.03B-DOC-STR-0053',
      rev: '00',
      documentType: 'DOC-STR',
      discipline: 'STR',
      status: 'C',
      recordStatus: 'CLOSED',
      submissionDate: '2026-05-06',
      responseDate: '2026-05-24',
      subject: 'Concrete Mix Design for Green Mix – (R.C. 300 kg/cm² / 350 kg Cement)',
    } as any,
  ];
  const kpi = calculateCanonicalKPIs(rows);
  assert(kpi.totalSubmittedSheets === 3, 'Test 7 (STR-0053): Workload Sheets = 3');
  assert(kpi.totalUniqueDrawings === 1, 'Test 7 (STR-0053): Unique Business Submittal = 1');
  assert(kpi.rejectionEventsClosed === 3, 'Test 7 (STR-0053): Historical C/D Events = 3');
  assert(kpi.rejectedClosed === 1, 'Test 7 (STR-0053): Current Rejected Closed = 1');
  assert(kpi.rejectedOpen === 0, 'Test 7 (STR-0053): Current Rejected Open = 0');
  assert(kpi.dataQuality.duplicateKeysCount === 2, 'Test 7 (STR-0053): Flagged in Data Quality Ledger');
}

// -------------------------------------------------------------
// SOURCE EXTRACT 11-ITEM FORENSIC RECONCILIATION
// -------------------------------------------------------------
console.log('\n--- 2. SOURCE EXTRACT 11-ITEM FORENSIC RECONCILIATION ---');

const sourceExtract: SubmittalRow[] = [
  { id: 'se-1', docNo: 'INN-ACE-1.03B-DOC-STR-0002', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2025-11-12' } as any,
  { id: 'se-2', docNo: 'INN-ACE-1.03B-DOC-STR-0003', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2025-11-12' } as any,
  { id: 'se-3', docNo: 'INN-ACE-1.03B-DOC-STR-0012', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-02-02' } as any,
  { id: 'se-4', docNo: 'INN-ACE-1.03B-DOC-STR-0016', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-02-03' } as any,
  { id: 'se-5a', docNo: 'INN-ACE-1.03B-DOC-STR-0029', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-02-25' } as any,
  { id: 'se-5b', docNo: 'INN-ACE-1.03B-DOC-STR-0029', rev: '01', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-04-01' } as any,
  { id: 'se-6', docNo: 'INN-ACE-1.03B-DOC-STR-0036', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-03-26' } as any,
  { id: 'se-7', docNo: 'INN-ACE-1.03B-DOC-STR-0050', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-04-27' } as any,
  { id: 'se-8a', docNo: 'INN-ACE-1.03B-DOC-STR-0053', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-05-06', subject: 'P.C. 200' } as any,
  { id: 'se-8b', docNo: 'INN-ACE-1.03B-DOC-STR-0053', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-05-06', subject: 'S.O.G. 250' } as any,
  { id: 'se-8c', docNo: 'INN-ACE-1.03B-DOC-STR-0053', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-05-06', subject: 'R.C. 300' } as any,
  { id: 'se-9', docNo: 'INN-ACE-1.03B-DOC-STR-0062', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-05-18' } as any,
  { id: 'se-10', docNo: 'INN-ACE-1.03B-DOC-STR-0069', rev: '00', documentType: 'DOC-STR', discipline: 'STR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-05-23' } as any,
  { id: 'se-11', docNo: 'INN-ACE-1.03B-DOC-ELE-0002', rev: '00', documentType: 'DOC-ELE', discipline: 'ELE', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-05-11' } as any,
];

const extractKpi = calculateCanonicalKPIs(sourceExtract);
assert(extractKpi.totalSubmittedSheets === 14, 'Extract: 14 physical rows in Workload');
assert(extractKpi.totalUniqueDrawings === 11, 'Extract: 11 Unique SUB Refs');
assert(extractKpi.rejectedClosed === 11, 'Extract: 11 Current Rejected Closed');
assert(extractKpi.rejectedOpen === 0, 'Extract: 0 Current Rejected Open');
assert(extractKpi.totalRejected === 11, 'Extract: Total Rejected = 11');
assert(extractKpi.activeItems === 0, 'Extract: Active Items = 0');
assert(extractKpi.rejectionEventsClosed === 14, 'Extract: 14 Historical Rejection Events across all physical rows');

console.log(`\n======================================================`);
console.log(`ALL 7 FORENSIC REGRESSION SUITE CHECKS PASSED: ${passCount} passed, ${failCount} failed.`);
console.log(`======================================================\n`);
