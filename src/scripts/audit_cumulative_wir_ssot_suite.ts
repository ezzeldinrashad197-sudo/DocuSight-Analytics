import { calculateCanonicalKPIs } from '../analytics/calculationFoundation';
import { getStatusCodeCategory } from '../utils/calculations';
import { SubmittalRow } from '../types';

console.log('=== RUNNING CUMULATIVE WIR SSOT AUDIT SUITE (A+B+D=APPROVED, C=REJECTED, W=PENDING) ===\n');

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

// 1. WIR-STR AUDIT
console.log('--- 1. WIR-STR AUDIT (B=1780, A=9, D=15 -> Approved=1804, C=37 -> Rejected=37, W=10 -> Pending=10, Active=46, Overdue=37 -> 80.4%) ---');
const strRows: SubmittalRow[] = [];
let idCounter = 1;

// 1780 B (Closed)
for (let i = 0; i < 1780; i++) {
  idCounter++;
  strRows.push({
    id: `str-b-${idCounter}`,
    docNo: `INN-ARC-WIR-STR-${idCounter}`,
    rev: '00',
    discipline: 'STR',
    logType: 'WIR-STR',
    workflowFamily: 'WIR',
    status: 'B',
    recordStatus: 'CLOSED',
    submissionDate: '2026-05-01',
    responseDate: '2026-05-05',
  } as any);
}

// 9 A (Closed)
for (let i = 0; i < 9; i++) {
  idCounter++;
  strRows.push({
    id: `str-a-${idCounter}`,
    docNo: `INN-ARC-WIR-STR-${idCounter}`,
    rev: '00',
    discipline: 'STR',
    logType: 'WIR-STR',
    workflowFamily: 'WIR',
    status: 'A',
    recordStatus: 'CLOSED',
    submissionDate: '2026-05-01',
    responseDate: '2026-05-05',
  } as any);
}

// 15 D (Closed)
for (let i = 0; i < 15; i++) {
  idCounter++;
  strRows.push({
    id: `str-d-${idCounter}`,
    docNo: `INN-ARC-WIR-STR-${idCounter}`,
    rev: '00',
    discipline: 'STR',
    logType: 'WIR-STR',
    workflowFamily: 'WIR',
    status: 'D',
    recordStatus: 'CLOSED',
    submissionDate: '2026-05-01',
    responseDate: '2026-05-05',
  } as any);
}

// 36 C (Open) - all 36 overdue
for (let i = 0; i < 36; i++) {
  idCounter++;
  strRows.push({
    id: `str-c-open-${idCounter}`,
    docNo: `INN-ARC-WIR-STR-${idCounter}`,
    rev: '00',
    discipline: 'STR',
    logType: 'WIR-STR',
    workflowFamily: 'WIR',
    status: 'C',
    recordStatus: 'OPEN',
    submissionDate: '2026-06-01',
    overdue: true,
  } as any);
}

// 1 C (Closed)
idCounter++;
strRows.push({
  id: `str-c-closed-${idCounter}`,
  docNo: `INN-ARC-WIR-STR-${idCounter}`,
  rev: '00',
  discipline: 'STR',
  logType: 'WIR-STR',
  status: 'C',
  recordStatus: 'CLOSED',
  submissionDate: '2026-06-01',
  responseDate: '2026-06-10',
} as any);

// 10 W (Waiting / Pending) - 1 overdue (Total Overdue = 36 + 1 = 37)
for (let i = 0; i < 10; i++) {
  idCounter++;
  strRows.push({
    id: `str-w-${idCounter}`,
    docNo: `INN-ARC-WIR-STR-${idCounter}`,
    rev: '00',
    discipline: 'STR',
    logType: 'WIR-STR',
    workflowFamily: 'WIR',
    status: 'W',
    recordStatus: 'WAITING',
    submissionDate: '2026-08-01',
    overdue: i === 0,
  } as any);
}

const strKPI = calculateCanonicalKPIs(strRows);
assert(strKPI.totalUniqueDrawings === 1851, `STR Total Unique = 1851 (got: ${strKPI.totalUniqueDrawings})`);
assert(strKPI.approved === 1804, `STR Approved = 1804 (9 A + 1780 B + 15 D) (got: ${strKPI.approved})`);
assert(strKPI.rejectedOpen === 36, `STR Rejected Open = 36 (got: ${strKPI.rejectedOpen})`);
assert(strKPI.rejectedClosed === 1, `STR Rejected Closed = 1 (got: ${strKPI.rejectedClosed})`);
assert(strKPI.totalRejected === 37, `STR Total Rejected = 37 (got: ${strKPI.totalRejected})`);
assert(strKPI.pending === 10, `STR Pending = 10 (got: ${strKPI.pending})`);
assert(strKPI.activeItems === 46, `STR Active Items = 46 (36 Open + 10 Pending) (got: ${strKPI.activeItems})`);
assert(strKPI.overdue === 37, `STR Overdue = 37 (got: ${strKPI.overdue})`);
assert(strKPI.overdueRateOnActive === 80.4, `STR Overdue % = 80.4% (37 / 46) (got: ${strKPI.overdueRateOnActive})`);

// 2. WIR-SUR AUDIT
console.log('\n--- 2. WIR-SUR AUDIT (A=15, B=1941, D=10 -> Approved=1966, C=16 -> Rej=16 (15 Open, 1 Closed), W=5 -> Pending=5, Active=20, Overdue=18 -> 90.0%) ---');
const surRows: SubmittalRow[] = [];
// 15 A
for (let i = 0; i < 15; i++) {
  idCounter++;
  surRows.push({ id: `sur-a-${idCounter}`, docNo: `INN-ARC-WIR-SUR-${idCounter}`, rev: '00', discipline: 'SUR', logType: 'WIR-SUR', workflowFamily: 'WIR', status: 'A', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
// 1941 B
for (let i = 0; i < 1941; i++) {
  idCounter++;
  surRows.push({ id: `sur-b-${idCounter}`, docNo: `INN-ARC-WIR-SUR-${idCounter}`, rev: '00', discipline: 'SUR', logType: 'WIR-SUR', workflowFamily: 'WIR', status: 'B', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
// 10 D
for (let i = 0; i < 10; i++) {
  idCounter++;
  surRows.push({ id: `sur-d-${idCounter}`, docNo: `INN-ARC-WIR-SUR-${idCounter}`, rev: '00', discipline: 'SUR', logType: 'WIR-SUR', workflowFamily: 'WIR', status: 'D', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
// 15 C Open (all 15 overdue)
for (let i = 0; i < 15; i++) {
  idCounter++;
  surRows.push({ id: `sur-c-open-${idCounter}`, docNo: `INN-ARC-WIR-SUR-${idCounter}`, rev: '00', discipline: 'SUR', logType: 'WIR-SUR', workflowFamily: 'WIR', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-06-01', overdue: true } as any);
}
// 1 C Closed
idCounter++;
surRows.push({ id: `sur-c-closed-${idCounter}`, docNo: `INN-ARC-WIR-SUR-${idCounter}`, rev: '00', discipline: 'SUR', logType: 'WIR-SUR', workflowFamily: 'WIR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-06-01' } as any);
// 5 W (3 overdue -> Total Overdue = 15 + 3 = 18)
for (let i = 0; i < 5; i++) {
  idCounter++;
  surRows.push({ id: `sur-w-${idCounter}`, docNo: `INN-ARC-WIR-SUR-${idCounter}`, rev: '00', discipline: 'SUR', logType: 'WIR-SUR', workflowFamily: 'WIR', status: 'W', recordStatus: 'WAITING', submissionDate: '2026-08-01', overdue: i < 3 } as any);
}

const surKPI = calculateCanonicalKPIs(surRows);
assert(surKPI.totalUniqueDrawings === 1987, `SUR Total Unique = 1987 (got: ${surKPI.totalUniqueDrawings})`);
assert(surKPI.approved === 1966, `SUR Approved = 1966 (15 A + 1941 B + 10 D) (got: ${surKPI.approved})`);
assert(surKPI.rejectedOpen === 15, `SUR Rejected Open = 15 (got: ${surKPI.rejectedOpen})`);
assert(surKPI.rejectedClosed === 1, `SUR Rejected Closed = 1 (got: ${surKPI.rejectedClosed})`);
assert(surKPI.totalRejected === 16, `SUR Total Rejected = 16 (got: ${surKPI.totalRejected})`);
assert(surKPI.pending === 5, `SUR Pending = 5 (got: ${surKPI.pending})`);
assert(surKPI.activeItems === 20, `SUR Active Items = 20 (15 Open + 5 Pending) (got: ${surKPI.activeItems})`);
assert(surKPI.overdue === 18, `SUR Overdue = 18 (got: ${surKPI.overdue})`);
assert(surKPI.overdueRateOnActive === 90.0, `SUR Overdue % = 90.0% (18 / 20) (got: ${surKPI.overdueRateOnActive})`);

// 3. WIR-MEC AUDIT
console.log('\n--- 3. WIR-MEC AUDIT (A=112, B=1859, D=10 -> Approved=1981, C=103 -> Rej=103, W=3 -> Pending=3, Active=106, Overdue=84 -> 79.2%) ---');
const mecRows: SubmittalRow[] = [];
for (let i = 0; i < 112; i++) {
  idCounter++;
  mecRows.push({ id: `mec-a-${idCounter}`, docNo: `INN-ARC-WIR-MEC-${idCounter}`, rev: '00', discipline: 'MEC', logType: 'WIR-MEC', workflowFamily: 'WIR', status: 'A', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
for (let i = 0; i < 1859; i++) {
  idCounter++;
  mecRows.push({ id: `mec-b-${idCounter}`, docNo: `INN-ARC-WIR-MEC-${idCounter}`, rev: '00', discipline: 'MEC', logType: 'WIR-MEC', workflowFamily: 'WIR', status: 'B', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
for (let i = 0; i < 10; i++) {
  idCounter++;
  mecRows.push({ id: `mec-d-${idCounter}`, docNo: `INN-ARC-WIR-MEC-${idCounter}`, rev: '00', discipline: 'MEC', logType: 'WIR-MEC', workflowFamily: 'WIR', status: 'D', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
// 103 C Open (82 overdue)
for (let i = 0; i < 103; i++) {
  idCounter++;
  mecRows.push({ id: `mec-c-${idCounter}`, docNo: `INN-ARC-WIR-MEC-${idCounter}`, rev: '00', discipline: 'MEC', logType: 'WIR-MEC', workflowFamily: 'WIR', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-06-01', overdue: i < 82 } as any);
}
// 3 W (2 overdue -> Total Overdue = 82 + 2 = 84)
for (let i = 0; i < 3; i++) {
  idCounter++;
  mecRows.push({ id: `mec-w-${idCounter}`, docNo: `INN-ARC-WIR-MEC-${idCounter}`, rev: '00', discipline: 'MEC', logType: 'WIR-MEC', workflowFamily: 'WIR', status: 'W', recordStatus: 'WAITING', submissionDate: '2026-08-01', overdue: i < 2 } as any);
}

const mecKPI = calculateCanonicalKPIs(mecRows);
assert(mecKPI.totalUniqueDrawings === 2087, `MEC Total Unique = 2087 (got: ${mecKPI.totalUniqueDrawings})`);
assert(mecKPI.approved === 1981, `MEC Approved = 1981 (112 A + 1859 B + 10 D) (got: ${mecKPI.approved})`);
assert(mecKPI.rejectedOpen === 103, `MEC Rejected Open = 103 (got: ${mecKPI.rejectedOpen})`);
assert(mecKPI.rejectedClosed === 0, `MEC Rejected Closed = 0 (got: ${mecKPI.rejectedClosed})`);
assert(mecKPI.totalRejected === 103, `MEC Total Rejected = 103 (got: ${mecKPI.totalRejected})`);
assert(mecKPI.pending === 3, `MEC Pending = 3 (got: ${mecKPI.pending})`);
assert(mecKPI.activeItems === 106, `MEC Active Items = 106 (103 Open + 3 Pending) (got: ${mecKPI.activeItems})`);
assert(mecKPI.overdue === 84, `MEC Overdue = 84 (got: ${mecKPI.overdue})`);
assert(mecKPI.overdueRateOnActive === 79.2, `MEC Overdue % = 79.2% (84 / 106) (got: ${mecKPI.overdueRateOnActive})`);

// 4. WIR-ELE AUDIT
console.log('\n--- 4. WIR-ELE AUDIT (B=1178, D=4 -> Approved=1182, C=4 -> Rej=4, W=1 -> Pending=1, Active=5, Overdue=5 -> 100.0%) ---');
const eleRows: SubmittalRow[] = [];
for (let i = 0; i < 1178; i++) {
  idCounter++;
  eleRows.push({ id: `ele-b-${idCounter}`, docNo: `INN-ARC-WIR-ELE-${idCounter}`, rev: '00', discipline: 'ELE', logType: 'WIR-ELE', workflowFamily: 'WIR', status: 'B', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
for (let i = 0; i < 4; i++) {
  idCounter++;
  eleRows.push({ id: `ele-d-${idCounter}`, docNo: `INN-ARC-WIR-ELE-${idCounter}`, rev: '00', discipline: 'ELE', logType: 'WIR-ELE', workflowFamily: 'WIR', status: 'D', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
for (let i = 0; i < 4; i++) {
  idCounter++;
  eleRows.push({ id: `ele-c-${idCounter}`, docNo: `INN-ARC-WIR-ELE-${idCounter}`, rev: '00', discipline: 'ELE', logType: 'WIR-ELE', workflowFamily: 'WIR', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-06-01', overdue: true } as any);
}
idCounter++;
eleRows.push({ id: `ele-w-${idCounter}`, docNo: `INN-ARC-WIR-ELE-${idCounter}`, rev: '00', discipline: 'ELE', logType: 'WIR-ELE', workflowFamily: 'WIR', status: 'W', recordStatus: 'WAITING', submissionDate: '2026-08-01', overdue: true } as any);

const eleKPI = calculateCanonicalKPIs(eleRows);
assert(eleKPI.totalUniqueDrawings === 1187, `ELE Total Unique = 1187 (got: ${eleKPI.totalUniqueDrawings})`);
assert(eleKPI.approved === 1182, `ELE Approved = 1182 (1178 B + 4 D) (got: ${eleKPI.approved})`);
assert(eleKPI.rejectedOpen === 4, `ELE Rejected Open = 4 (got: ${eleKPI.rejectedOpen})`);
assert(eleKPI.rejectedClosed === 0, `ELE Rejected Closed = 0 (got: ${eleKPI.rejectedClosed})`);
assert(eleKPI.totalRejected === 4, `ELE Total Rejected = 4 (got: ${eleKPI.totalRejected})`);
assert(eleKPI.pending === 1, `ELE Pending = 1 (got: ${eleKPI.pending})`);
assert(eleKPI.activeItems === 5, `ELE Active Items = 5 (4 Open + 1 Pending) (got: ${eleKPI.activeItems})`);
assert(eleKPI.overdue === 5, `ELE Overdue = 5 (got: ${eleKPI.overdue})`);
assert(eleKPI.overdueRateOnActive === 100.0, `ELE Overdue % = 100.0% (5 / 5) (got: ${eleKPI.overdueRateOnActive})`);

// 5. WIR-INFRA AUDIT
console.log('\n--- 5. WIR-INFRA AUDIT (B=735, D=28 -> Approved=763, C=113 (111 Open, 2 Closed) -> Rej=113, W=7 -> Pending=7, Active=118, Overdue=110 -> 93.2%) ---');
const infraRows: SubmittalRow[] = [];
for (let i = 0; i < 735; i++) {
  idCounter++;
  infraRows.push({ id: `infra-b-${idCounter}`, docNo: `INN-ARC-WIR-INFRA-${idCounter}`, rev: '00', discipline: 'INFRA', logType: 'WIR-INFRA', workflowFamily: 'WIR', status: 'B', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
for (let i = 0; i < 28; i++) {
  idCounter++;
  infraRows.push({ id: `infra-d-${idCounter}`, docNo: `INN-ARC-WIR-INFRA-${idCounter}`, rev: '00', discipline: 'INFRA', logType: 'WIR-INFRA', workflowFamily: 'WIR', status: 'D', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
for (let i = 0; i < 111; i++) {
  idCounter++;
  infraRows.push({ id: `infra-c-open-${idCounter}`, docNo: `INN-ARC-WIR-INFRA-${idCounter}`, rev: '00', discipline: 'INFRA', logType: 'WIR-INFRA', workflowFamily: 'WIR', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-06-01', overdue: i < 103 } as any);
}
for (let i = 0; i < 2; i++) {
  idCounter++;
  infraRows.push({ id: `infra-c-closed-${idCounter}`, docNo: `INN-ARC-WIR-INFRA-${idCounter}`, rev: '00', discipline: 'INFRA', logType: 'WIR-INFRA', workflowFamily: 'WIR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-06-01' } as any);
}
for (let i = 0; i < 7; i++) {
  idCounter++;
  infraRows.push({ id: `infra-w-${idCounter}`, docNo: `INN-ARC-WIR-INFRA-${idCounter}`, rev: '00', discipline: 'INFRA', logType: 'WIR-INFRA', workflowFamily: 'WIR', status: 'W', recordStatus: 'WAITING', submissionDate: '2026-08-01', overdue: true } as any);
}

const infraKPI = calculateCanonicalKPIs(infraRows);
assert(infraKPI.totalUniqueDrawings === 883, `INFRA Total Unique = 883 (got: ${infraKPI.totalUniqueDrawings})`);
assert(infraKPI.approved === 763, `INFRA Approved = 763 (735 B + 28 D) (got: ${infraKPI.approved})`);
assert(infraKPI.rejectedOpen === 111, `INFRA Rejected Open = 111 (got: ${infraKPI.rejectedOpen})`);
assert(infraKPI.rejectedClosed === 2, `INFRA Rejected Closed = 2 (got: ${infraKPI.rejectedClosed})`);
assert(infraKPI.totalRejected === 113, `INFRA Total Rejected = 113 (got: ${infraKPI.totalRejected})`);
assert(infraKPI.pending === 7, `INFRA Pending = 7 (got: ${infraKPI.pending})`);
assert(infraKPI.activeItems === 118, `INFRA Active Items = 118 (111 Open + 7 Pending) (got: ${infraKPI.activeItems})`);
assert(infraKPI.overdue === 110, `INFRA Overdue = 110 (got: ${infraKPI.overdue})`);
assert(infraKPI.overdueRateOnActive === 93.2, `INFRA Overdue % = 93.2% (110 / 118) (got: ${infraKPI.overdueRateOnActive})`);

// 6. WIR-ARCH AUDIT (Approved=7294, RejOpen=180, RejClosed=2, Pending=31 -> Total Unique=7507, Active=211, Overdue=164 -> 77.7%)
console.log('\n--- 6. WIR-ARCH AUDIT (Approved=7294, RejOpen=180, RejClosed=2, Pending=31) ---');
const arcRows: SubmittalRow[] = [];
// 7294 Approved (A + B + D)
for (let i = 0; i < 7294; i++) {
  idCounter++;
  arcRows.push({ id: `arc-app-${idCounter}`, docNo: `INN-ARC-WIR-ARC-${idCounter}`, rev: '00', discipline: 'ARCH', logType: 'WIR-ARC', workflowFamily: 'WIR', status: 'B', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
// 180 C Open (133 overdue)
for (let i = 0; i < 180; i++) {
  idCounter++;
  arcRows.push({ id: `arc-c-open-${idCounter}`, docNo: `INN-ARC-WIR-ARC-${idCounter}`, rev: '00', discipline: 'ARCH', logType: 'WIR-ARC', workflowFamily: 'WIR', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-06-01', overdue: i < 133 } as any);
}
// 2 C Closed
for (let i = 0; i < 2; i++) {
  idCounter++;
  arcRows.push({ id: `arc-c-closed-${idCounter}`, docNo: `INN-ARC-WIR-ARC-${idCounter}`, rev: '00', discipline: 'ARCH', logType: 'WIR-ARC', workflowFamily: 'WIR', status: 'C', recordStatus: 'CLOSED', submissionDate: '2026-06-01' } as any);
}
// 31 W (Waiting / Pending) - 31 overdue (Total Overdue = 133 + 31 = 164)
const archPendingSamples: SubmittalRow[] = [];
for (let i = 0; i < 31; i++) {
  idCounter++;
  const row = { id: `arc-w-${idCounter}`, docNo: `INN-ARC-WIR-ARC-${idCounter}`, rev: '00', discipline: 'ARCH', logType: 'WIR-ARC', workflowFamily: 'WIR', status: 'W', recordStatus: 'WAITING', submissionDate: '2026-08-01', overdue: true } as any;
  arcRows.push(row);
  archPendingSamples.push(row);
}

const arcKPI = calculateCanonicalKPIs(arcRows);
assert(arcKPI.totalUniqueDrawings === 7507, `ARCH Total Unique = 7507 (got: ${arcKPI.totalUniqueDrawings})`);
assert(arcKPI.approved === 7294, `ARCH Approved = 7294 (got: ${arcKPI.approved})`);
assert(arcKPI.rejectedOpen === 180, `ARCH Rejected Open = 180 (got: ${arcKPI.rejectedOpen})`);
assert(arcKPI.rejectedClosed === 2, `ARCH Rejected Closed = 2 (got: ${arcKPI.rejectedClosed})`);
assert(arcKPI.totalRejected === 182, `ARCH Total Rejected = 182 (got: ${arcKPI.totalRejected})`);
assert(arcKPI.pending === 31, `ARCH Pending = 31 (got: ${arcKPI.pending})`);
assert(arcKPI.activeItems === 211, `ARCH Active Items = 211 (180 Open + 31 Pending) (got: ${arcKPI.activeItems})`);
assert(arcKPI.overdue === 164, `ARCH Overdue = 164 (got: ${arcKPI.overdue})`);
assert(arcKPI.overdueRateOnActive === 77.7, `ARCH Overdue % = 77.7% (164 / 211) (got: ${arcKPI.overdueRateOnActive})`);

// 7. WIR-LND AUDIT (Approved=215, RejOpen=32, RejClosed=0, Pending=0 -> Total Unique=247, Active=32, Overdue=29 -> 90.6%)
console.log('\n--- 7. WIR-LND AUDIT (Approved=215, RejOpen=32, Pending=0) ---');
const lndRows: SubmittalRow[] = [];
for (let i = 0; i < 215; i++) {
  idCounter++;
  lndRows.push({ id: `lnd-app-${idCounter}`, docNo: `INN-ARC-WIR-LND-${idCounter}`, rev: '00', discipline: 'LND', logType: 'WIR-LND', workflowFamily: 'WIR', status: 'B', recordStatus: 'CLOSED', submissionDate: '2026-05-01' } as any);
}
for (let i = 0; i < 32; i++) {
  idCounter++;
  lndRows.push({ id: `lnd-c-${idCounter}`, docNo: `INN-ARC-WIR-LND-${idCounter}`, rev: '00', discipline: 'LND', logType: 'WIR-LND', workflowFamily: 'WIR', status: 'C', recordStatus: 'OPEN', submissionDate: '2026-06-01', overdue: i < 29 } as any);
}
const lndKPI = calculateCanonicalKPIs(lndRows);
assert(lndKPI.totalUniqueDrawings === 247, `LND Total Unique = 247 (got: ${lndKPI.totalUniqueDrawings})`);
assert(lndKPI.approved === 215, `LND Approved = 215 (got: ${lndKPI.approved})`);
assert(lndKPI.rejectedOpen === 32, `LND Rejected Open = 32 (got: ${lndKPI.rejectedOpen})`);
assert(lndKPI.rejectedClosed === 0, `LND Rejected Closed = 0 (got: ${lndKPI.rejectedClosed})`);
assert(lndKPI.totalRejected === 32, `LND Total Rejected = 32 (got: ${lndKPI.totalRejected})`);
assert(lndKPI.pending === 0, `LND Pending = 0 (got: ${lndKPI.pending})`);
assert(lndKPI.activeItems === 32, `LND Active Items = 32 (got: ${lndKPI.activeItems})`);
assert(lndKPI.overdue === 29, `LND Overdue = 29 (got: ${lndKPI.overdue})`);
assert(lndKPI.overdueRateOnActive === 90.6, `LND Overdue % = 90.6% (29 / 32) (got: ${lndKPI.overdueRateOnActive})`);

// 8. GRAND TOTAL SSOT RECONCILIATION & ACTIVE ITEMS VERIFICATION
console.log('\n--- 8. GRAND TOTAL SSOT RECONCILIATION ---');
const allCumulativeWIRRows = [
  ...strRows,
  ...surRows,
  ...mecRows,
  ...eleRows,
  ...infraRows,
  ...arcRows,
  ...lndRows,
];

const grandKPI = calculateCanonicalKPIs(allCumulativeWIRRows);

assert(grandKPI.totalUniqueDrawings === 15749, `Grand Total Unique = 15,749 (got: ${grandKPI.totalUniqueDrawings})`);
assert(grandKPI.approved === 15205, `Grand Total Approved = 15,205 (got: ${grandKPI.approved})`);
assert(grandKPI.rejectedOpen === 481, `Grand Total Rejected Open = 481 (got: ${grandKPI.rejectedOpen})`);
assert(grandKPI.rejectedClosed === 6, `Grand Total Rejected Closed = 6 (got: ${grandKPI.rejectedClosed})`);
assert(grandKPI.totalRejected === 487, `Grand Total Rejected = 487 (got: ${grandKPI.totalRejected})`);
assert(grandKPI.pending === 57, `Grand Total Pending = 57 (got: ${grandKPI.pending})`);
assert(grandKPI.activeItems === 538, `Grand Total Active Items = 538 (481 + 57) (got: ${grandKPI.activeItems})`);
assert(grandKPI.overdue === 447, `Grand Total Overdue = 447 (got: ${grandKPI.overdue})`);
assert(grandKPI.overdueRateOnActive === 83.1, `Grand Total Overdue % = 83.1% (447 / 538) (got: ${grandKPI.overdueRateOnActive})`);

// 9. NON-WIR DOCUMENT REGRESSION CHECK (SDW / MAR: Code D MUST STILL BE REJECTED_CLOSED)
console.log('\n--- 9. NON-WIR DOCUMENT REGISTER REGRESSION (SDW / MAR) ---');
const sdwRow: SubmittalRow = {
  id: 'sdw-1',
  docNo: 'INN-ARC-SDW-STR-001',
  rev: '00',
  discipline: 'STR',
  logType: 'SDW-STR',
  workflowFamily: 'SDW',
  status: 'D',
  recordStatus: 'CLOSED',
} as any;
const catSDW = getStatusCodeCategory(sdwRow);
assert(catSDW === 'REJECTED_CLOSED', `SDW Code D is REJECTED_CLOSED (got: ${catSDW})`);

console.log(`\n======================================================`);
console.log(`ALL CUMULATIVE WIR SSOT CHECKS PASSED: ${passCount} passed, ${failCount} failed.`);
console.log(`======================================================\n`);
