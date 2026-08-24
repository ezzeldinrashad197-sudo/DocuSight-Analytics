import { calculateCanonicalKPIs } from '../analytics/calculationFoundation';
import { getStatusCodeCategory } from '../utils/calculations';
import { SubmittalRow } from '../types';

console.log('=== RUNNING REJECTED STATUS PRECISION AUDIT (CODE D + OPEN vs CLOSED) ===\n');

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

// 1. SPECIFIC RECORD TEST: INN-ARC-WIR-SUR-01983
console.log('--- 1. INN-ARC-WIR-SUR-01983 (Code D + OPEN) ---');
const sur01983: SubmittalRow = {
  id: 'sur-1983',
  docNo: 'INN-ARC-WIR-SUR-01983',
  rev: '00',
  discipline: 'SUR',
  logType: 'WIR-SUR',
  sourceFile: '03- (WIR) - SUR-ELBurouj.xlsx',
  rawSourceIdentity: '03- (WIR) - SUR-ELBurouj.xlsx::SUR',
  status: 'D',
  recordStatus: 'OPEN',
  submissionDate: '2026-08-05',
} as any;

const cat01983 = getStatusCodeCategory(sur01983);
assert(cat01983 === 'REJECTED_OPEN', `Test 1.1: INN-ARC-WIR-SUR-01983 is REJECTED_OPEN (got: ${cat01983})`);
assert(cat01983 !== 'REJECTED_CLOSED', 'Test 1.2: INN-ARC-WIR-SUR-01983 is NOT REJECTED_CLOSED');

// Combined status variant test: "D - OPEN"
const sur01983_combined: SubmittalRow = {
  id: 'sur-1983-comb',
  docNo: 'INN-ARC-WIR-SUR-01983',
  rev: '00',
  discipline: 'SUR',
  logType: 'WIR-SUR',
  sourceFile: '03- (WIR) - SUR-ELBurouj.xlsx',
  rawSourceIdentity: '03- (WIR) - SUR-ELBurouj.xlsx::SUR',
  status: 'D - OPEN',
  recordStatus: 'OPEN',
  submissionDate: '2026-08-05',
} as any;
const cat01983_comb = getStatusCodeCategory(sur01983_combined);
assert(cat01983_comb === 'REJECTED_OPEN', `Test 1.3: "D - OPEN" is REJECTED_OPEN (got: ${cat01983_comb})`);

// 2. COMPLETE WIR-SUR AUGUST DATASET SIMULATION (33 UNIQUE ITEMS)
console.log('\n--- 2. WIR-SUR AUGUST 33-ITEM KPI CALCULATION ---');
// 30 Code B (Closed), 2 Code W (Waiting), 1 Code D (OPEN)
const surRows: SubmittalRow[] = [];

// 30 Approved Closed
for (let i = 1; i <= 30; i++) {
  surRows.push({
    id: `sur-app-${i}`,
    docNo: `INN-ARC-WIR-SUR-${1900 + i}`,
    rev: '00',
    discipline: 'SUR',
    logType: 'WIR-SUR',
    status: 'B',
    recordStatus: 'CLOSED',
    submissionDate: '2026-08-01',
    responseDate: '2026-08-05',
  } as any);
}

// 2 Pending / Waiting
for (let i = 1; i <= 2; i++) {
  surRows.push({
    id: `sur-pend-${i}`,
    docNo: `INN-ARC-WIR-SUR-${1950 + i}`,
    rev: '00',
    discipline: 'SUR',
    logType: 'WIR-SUR',
    status: 'W',
    recordStatus: 'WAITING',
    submissionDate: '2026-08-10',
  } as any);
}

// 1 Code D + OPEN
surRows.push(sur01983);

const surKPI = calculateCanonicalKPIs(surRows);
assert(surKPI.totalUniqueDrawings === 33, `SUR Total Unique = 33 (got: ${surKPI.totalUniqueDrawings})`);
assert(surKPI.approved === 30, `SUR Approved = 30 (got: ${surKPI.approved})`);
assert(surKPI.rejectedOpen === 1, `SUR Rejected Open = 1 (got: ${surKPI.rejectedOpen})`);
assert(surKPI.rejectedClosed === 0, `SUR Rejected Closed = 0 (got: ${surKPI.rejectedClosed})`);
assert(surKPI.totalRejected === 1, `SUR Total Rejected = 1 (got: ${surKPI.totalRejected})`);
assert(surKPI.pending === 2, `SUR Pending = 2 (got: ${surKPI.pending})`);
assert(surKPI.activeItems === 3, `SUR Active Items = 3 (got: ${surKPI.activeItems})`);

// 3. FULL AUGUST 7-DISCIPLINE RECONCILIATION
console.log('\n--- 3. FULL AUGUST 7-DISCIPLINE SUMMARY ---');
// STR: 17 Unique (B=7, W=10)
// ARCH: 193 Unique (B=141, C/Open=23, C/Closed=1, W=28)
// MEC: 54 Unique (B=30, C/Open=20, D/Closed=1, W=3)
// LND: 9 Unique (B=6, C/Open=3)
// INFRA: 34 Unique (B=26, C/Open=1, W=7)
// ELE: 4 Unique (B=4)
// SUR: 33 Unique (B=30, D/Open=1, W=2)

const augRows: SubmittalRow[] = [];
// Helper to add rows
let globalDocCounter = 1000;
const add = (docPrefix: string, disc: string, count: number, status: string, recStatus: string) => {
  for (let i = 1; i <= count; i++) {
    globalDocCounter++;
    augRows.push({
      id: `${disc}-${status}-${recStatus}-${globalDocCounter}`,
      docNo: `INN-ARC-WIR-${docPrefix}-${globalDocCounter}`,
      rev: '00',
      discipline: disc,
      logType: `WIR-${docPrefix}`,
      status,
      recordStatus: recStatus,
      submissionDate: '2026-08-05',
      responseDate: recStatus === 'CLOSED' ? '2026-08-08' : '',
    } as any);
  }
};

// STR (17)
add('STR', 'STR', 7, 'B', 'CLOSED');
add('STR', 'STR', 10, 'W', 'WAITING');

// ARCH (193)
add('ARC', 'ARCH', 141, 'B', 'CLOSED');
add('ARC', 'ARCH', 23, 'C', 'OPEN');
add('ARC', 'ARCH', 1, 'C', 'CLOSED');
add('ARC', 'ARCH', 28, 'W', 'WAITING');

// MEC (54)
add('MEC', 'MECH', 30, 'B', 'CLOSED');
add('MEC', 'MECH', 20, 'C', 'OPEN');
add('MEC', 'MECH', 1, 'D', 'CLOSED');
add('MEC', 'MECH', 3, 'W', 'WAITING');

// LND (9)
add('LND', 'LAND', 6, 'B', 'CLOSED');
add('LND', 'LAND', 3, 'C', 'OPEN');

// INFRA (34)
add('INFRA', 'INFRA', 26, 'B', 'CLOSED');
add('INFRA', 'INFRA', 1, 'C', 'OPEN');
add('INFRA', 'INFRA', 7, 'W', 'WAITING');

// ELE (4)
add('ELE', 'ELEC', 4, 'B', 'CLOSED');

// SUR (33)
add('SUR', 'SURVEY', 30, 'B', 'CLOSED');
add('SUR', 'SURVEY', 1, 'D', 'OPEN');
add('SUR', 'SURVEY', 2, 'W', 'WAITING');

const totalKPI = calculateCanonicalKPIs(augRows);

console.log(`Grand Total Unique: ${totalKPI.totalUniqueDrawings}`);
console.log(`Approved: ${totalKPI.approved}`);
console.log(`Rejected Open: ${totalKPI.rejectedOpen}`);
console.log(`Rejected Closed: ${totalKPI.rejectedClosed}`);
console.log(`Total Rejected: ${totalKPI.totalRejected}`);
console.log(`Pending: ${totalKPI.pending}`);
console.log(`Active Items: ${totalKPI.activeItems}`);

assert(totalKPI.totalUniqueDrawings === 344, `Grand Total Unique = 344 (got: ${totalKPI.totalUniqueDrawings})`);
assert(totalKPI.approved === 244, `Grand Total Approved = 244 (got: ${totalKPI.approved})`);
assert(totalKPI.rejectedOpen === 48, `Grand Total Rejected Open = 48 (got: ${totalKPI.rejectedOpen})`);
assert(totalKPI.rejectedClosed === 2, `Grand Total Rejected Closed = 2 (got: ${totalKPI.rejectedClosed})`);
assert(totalKPI.totalRejected === 50, `Grand Total Rejected = 50 (got: ${totalKPI.totalRejected})`);
assert(totalKPI.pending === 50, `Grand Total Pending = 50 (got: ${totalKPI.pending})`);
assert(totalKPI.activeItems === 98, `Grand Total Active Items = 98 (got: ${totalKPI.activeItems})`);

console.log(`\n======================================================`);
console.log(`ALL REJECTED STATUS AUDIT CHECKS PASSED: ${passCount} passed, ${failCount} failed.`);
console.log(`======================================================\n`);
