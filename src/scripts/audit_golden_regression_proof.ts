(globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };

import { calculateCanonicalKPIs, getBusinessEntityKey, processRevisionEngine } from '../analytics/calculationFoundation';
import { normalizeData } from '../utils/calculations';
import { SubmittalRow } from '../types';

console.log("==========================================================================================");
console.log("               AUTOMATED REGRESSION TEST SUITE: CURRENT REJECTED CLOSED & STR");
console.log("==========================================================================================");

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

// -----------------------------------------------------------------------------
// TEST A: Rev 00 C Closed -> Rev 01 C Open
// Expected: Current Rej Open = 1, Current Rej Closed = 0
// -----------------------------------------------------------------------------
console.log("\n--- RUNNING TEST A (Rev 00 C Closed -> Rev 01 C Open) ---");
const testARows: SubmittalRow[] = [
  {
    id: 'TA-00',
    docNo: 'INN-ARC-SHD-TEST-0001',
    rev: '00',
    status: 'C',
    recordStatus: 'Closed',
    documentType: 'SDW-TEST',
    submissionDate: '2026-01-10',
    responseDate: '2026-01-20'
  },
  {
    id: 'TA-01',
    docNo: 'INN-ARC-SHD-TEST-0001',
    rev: '01',
    status: 'C',
    recordStatus: 'Open',
    documentType: 'SDW-TEST',
    submissionDate: '2026-02-10'
  }
];
const kpiA = calculateCanonicalKPIs(testARows);
assert(kpiA.totalUniqueDrawings === 1, 'TEST A: Unique Items = 1');
assert(kpiA.rejectedOpen === 1, 'TEST A: Current Rej Open = 1');
assert(kpiA.rejectedClosed === 0, 'TEST A: Current Rej Closed = 0');
assert(kpiA.approved === 0, 'TEST A: Approved = 0');
assert(kpiA.totalRejectedRows === 2, 'TEST A: Historical Rejection Rows = 2');

// -----------------------------------------------------------------------------
// TEST B: Rev 00 C Closed -> Rev 01 A Closed
// Expected: Approved = 1, Current Rej Open = 0, Current Rej Closed = 0
// -----------------------------------------------------------------------------
console.log("\n--- RUNNING TEST B (Rev 00 C Closed -> Rev 01 A Closed) ---");
const testBRows: SubmittalRow[] = [
  {
    id: 'TB-00',
    docNo: 'INN-ARC-SHD-TEST-0002',
    rev: '00',
    status: 'C',
    recordStatus: 'Closed',
    documentType: 'SDW-TEST',
    submissionDate: '2026-01-10',
    responseDate: '2026-01-20'
  },
  {
    id: 'TB-01',
    docNo: 'INN-ARC-SHD-TEST-0002',
    rev: '01',
    status: 'A',
    recordStatus: 'Closed',
    documentType: 'SDW-TEST',
    submissionDate: '2026-02-10',
    responseDate: '2026-02-18'
  }
];
const kpiB = calculateCanonicalKPIs(testBRows);
assert(kpiB.totalUniqueDrawings === 1, 'TEST B: Unique Items = 1');
assert(kpiB.approved === 1, 'TEST B: Approved = 1');
assert(kpiB.rejectedOpen === 0, 'TEST B: Current Rej Open = 0');
assert(kpiB.rejectedClosed === 0, 'TEST B: Current Rej Closed = 0');
assert(kpiB.resolvedRejections === 1, 'TEST B: Resolved Rejections = 1');

// -----------------------------------------------------------------------------
// TEST C: Rev 00 C Closed -> Rev 01 C Closed
// Expected: Current Rej Open = 0, Current Rej Closed = 1
// -----------------------------------------------------------------------------
console.log("\n--- RUNNING TEST C (Rev 00 C Closed -> Rev 01 C Closed) ---");
const testCRows: SubmittalRow[] = [
  {
    id: 'TC-00',
    docNo: 'INN-ARC-SHD-TEST-0003',
    rev: '00',
    status: 'C',
    recordStatus: 'Closed',
    documentType: 'SDW-TEST',
    submissionDate: '2026-01-10',
    responseDate: '2026-01-20'
  },
  {
    id: 'TC-01',
    docNo: 'INN-ARC-SHD-TEST-0003',
    rev: '01',
    status: 'C',
    recordStatus: 'Closed',
    documentType: 'SDW-TEST',
    submissionDate: '2026-02-10',
    responseDate: '2026-02-22'
  }
];
const kpiC = calculateCanonicalKPIs(testCRows);
assert(kpiC.totalUniqueDrawings === 1, 'TEST C: Unique Items = 1');
assert(kpiC.rejectedOpen === 0, 'TEST C: Current Rej Open = 0');
assert(kpiC.rejectedClosed === 1, 'TEST C: Current Rej Closed = 1');
assert(kpiC.approved === 0, 'TEST C: Approved = 0');

// -----------------------------------------------------------------------------
// TEST D: Rev 00 C Closed -> Rev 01 C Closed -> Rev 02 C Open (STR-0363 reproduction)
// Expected: Current Rej Open = 1, Current Rej Closed = 0
// -----------------------------------------------------------------------------
console.log("\n--- RUNNING TEST D (STR-0363 reproduction: Rev 00 C Closed -> Rev 01 C Closed -> Rev 02 C Open) ---");
const testDRows: SubmittalRow[] = [
  {
    id: 'TD-00',
    docNo: 'INN-ARC-SHD-STR-0363',
    rev: '00',
    status: 'C',
    recordStatus: 'Closed',
    documentType: 'SDW-STR',
    submissionDate: '2026-01-10',
    responseDate: '2026-01-20'
  },
  {
    id: 'TD-01',
    docNo: 'INN-ARC-SHD-STR-0363',
    rev: '01',
    status: 'C',
    recordStatus: 'Closed',
    documentType: 'SDW-STR',
    submissionDate: '2026-02-10',
    responseDate: '2026-02-20'
  },
  {
    id: 'TD-02',
    docNo: 'INN-ARC-SHD-STR-0363',
    rev: '02',
    status: 'C',
    recordStatus: 'Open',
    documentType: 'SDW-STR',
    submissionDate: '2026-03-10'
  }
];
const kpiD = calculateCanonicalKPIs(testDRows);
assert(kpiD.totalUniqueDrawings === 1, 'TEST D: Unique Items = 1');
assert(kpiD.rejectedOpen === 1, 'TEST D: Current Rej Open = 1');
assert(kpiD.rejectedClosed === 0, 'TEST D: Current Rej Closed = 0');
assert(kpiD.approved === 0, 'TEST D: Approved = 0');
assert(kpiD.totalRejectedRows === 3, 'TEST D: Historical Rejection Rows = 3');

// -----------------------------------------------------------------------------
// TEST E: Full STR Golden Dataset (371 Unique: 368 Approved, 3 Rej Open, 0 Rej Closed, 0 Pending)
// -----------------------------------------------------------------------------
console.log("\n--- RUNNING TEST E (Full STR Invariant Verification) ---");
const strDataset: SubmittalRow[] = [];

// 368 Approved (excluding 179, 346, 363)
for (let i = 1; i <= 371; i++) {
  if (i === 179 || i === 346 || i === 363) continue;
  strDataset.push({
    id: `STR-APP-${i}`,
    docNo: `INN-ARC-SHD-STR-${String(i).padStart(4, '0')}`,
    rev: '00',
    status: 'A',
    recordStatus: 'Closed',
    documentType: 'SDW-STR',
    trade: 'Structural',
    tradeShort: 'STR',
    submissionDate: '2026-01-15',
    responseDate: '2026-01-25'
  });
}

// 0179: Rev 00 C Open
strDataset.push({
  id: 'STR-0179-00',
  docNo: 'INN-ARC-SHD-STR-0179',
  rev: '00',
  status: 'C',
  recordStatus: 'Open',
  documentType: 'SDW-STR',
  trade: 'Structural',
  tradeShort: 'STR',
  submissionDate: '2026-03-01',
  dueDate: '2026-03-15',
  overdue: true
});

// 0346: Rev 00 C Closed + Rev 01 C Open
strDataset.push({
  id: 'STR-0346-00',
  docNo: 'INN-ARC-SHD-STR-0346',
  rev: '00',
  status: 'C',
  recordStatus: 'Closed',
  documentType: 'SDW-STR',
  trade: 'Structural',
  tradeShort: 'STR',
  submissionDate: '2026-01-10',
  responseDate: '2026-01-20'
});
strDataset.push({
  id: 'STR-0346-01',
  docNo: 'INN-ARC-SHD-STR-0346',
  rev: '01',
  status: 'C',
  recordStatus: 'Open',
  documentType: 'SDW-STR',
  trade: 'Structural',
  tradeShort: 'STR',
  submissionDate: '2026-03-10',
  dueDate: '2026-03-24',
  overdue: true
});

// 0363: Rev 00 C Closed + Rev 01 C Closed + Rev 02 C Open
strDataset.push({
  id: 'STR-0363-00',
  docNo: 'INN-ARC-SHD-STR-0363',
  rev: '00',
  status: 'C',
  recordStatus: 'Closed',
  documentType: 'SDW-STR',
  trade: 'Structural',
  tradeShort: 'STR',
  submissionDate: '2026-01-10',
  responseDate: '2026-01-20'
});
strDataset.push({
  id: 'STR-0363-01',
  docNo: 'INN-ARC-SHD-STR-0363',
  rev: '01',
  status: 'C',
  recordStatus: 'Closed',
  documentType: 'SDW-STR',
  trade: 'Structural',
  tradeShort: 'STR',
  submissionDate: '2026-02-10',
  responseDate: '2026-02-20'
});
strDataset.push({
  id: 'STR-0363-02',
  docNo: 'INN-ARC-SHD-STR-0363',
  rev: '02',
  status: 'C',
  recordStatus: 'Open',
  documentType: 'SDW-STR',
  trade: 'Structural',
  tradeShort: 'STR',
  submissionDate: '2026-03-10',
  dueDate: '2026-09-03',
  overdue: false
});

const kpiSTR = calculateCanonicalKPIs(strDataset);
console.log(`STR Total Unique Drawings: ${kpiSTR.totalUniqueDrawings}`);
console.log(`STR Approved             : ${kpiSTR.approved}`);
console.log(`STR Current Rej Open     : ${kpiSTR.rejectedOpen}`);
console.log(`STR Current Rej Closed   : ${kpiSTR.rejectedClosed}`);
console.log(`STR Pending              : ${kpiSTR.pending}`);
console.log(`STR Active Items         : ${kpiSTR.activeItems}`);
console.log(`STR Overdue Items        : ${kpiSTR.overdue}`);

assert(kpiSTR.totalUniqueDrawings === 371, `STR Unique = 371 (got: ${kpiSTR.totalUniqueDrawings})`);
assert(kpiSTR.approved === 368, `STR Approved = 368 (got: ${kpiSTR.approved})`);
assert(kpiSTR.rejectedOpen === 3, `STR Current Rej Open = 3 (got: ${kpiSTR.rejectedOpen})`);
assert(kpiSTR.rejectedClosed === 0, `STR Current Rej Closed = 0 (got: ${kpiSTR.rejectedClosed})`);
assert(kpiSTR.pending === 0, `STR Pending = 0 (got: ${kpiSTR.pending})`);
assert(kpiSTR.activeItems === 3, `STR Active = 3 (got: ${kpiSTR.activeItems})`);
assert(kpiSTR.overdue === 2, `STR Overdue = 2 (got: ${kpiSTR.overdue})`);

console.log("\n==========================================================================================");
console.log("            ALL MANDATORY REGRESSION ASSERTIONS PASSED WITH ZERO VARIANCE! ✅");
console.log("==========================================================================================");
