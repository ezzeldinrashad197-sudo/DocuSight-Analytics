import { calculateCanonicalKPIs } from '../analytics/calculationFoundation';
import { calculateNCRStats, calculateSORStats, calculateLTRStats } from '../utils/calculations';
import { calculateRFIStats } from '../utils/rfiAnalytics';
import { normalizeData } from '../utils/calculations';
import { SubmittalRow } from '../types';

console.log('=== RUNNING MULTI-REGISTER INTEGRITY AUDIT (RFI, NCR, SOR, LTR) ===\n');

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

// 1. RFI TEST
console.log('--- 1. RFI REGISTER ISOLATION & ACCURACY ---');
const rfiRows: SubmittalRow[] = [
  { id: 'r1', docNo: 'INN-ARC-RFI-STR-001', logType: 'RFI', documentType: 'RFI', status: 'Closed', responseDate: '2026-08-01', submissionDate: '2026-07-20', rev: '00', isLatestRev: true, discipline: 'STR' } as any,
  { id: 'r2', docNo: 'INN-ARC-RFI-ARC-002', logType: 'RFI', documentType: 'RFI', status: 'Open', responseDate: '', submissionDate: '2026-08-10', rev: '00', isLatestRev: true, delayDays: 10, overdue: true, discipline: 'ARCH' } as any
];
const rfiNorm = normalizeData(rfiRows);
const rfiKPI = calculateRFIStats(rfiNorm);
assert(rfiKPI.issuedThisMonth === 2, 'RFI Issued = 2');
assert(rfiKPI.open === 1, 'RFI Open = 1');
assert(rfiKPI.trades.length === 2, 'RFI Trade Breakdown distinct');

// 2. NCR TEST
console.log('\n--- 2. NCR REGISTER ISOLATION & ACCURACY ---');
const ncrRows: SubmittalRow[] = [
  { id: 'n1', docNo: 'INN-ARC-NCR-CIV-001', ncrRef: 'INN-ARC-NCR-CIV-001', logType: 'NCR', documentType: 'NCR', status: 'Closed', ncrStatus: 'Closed', submissionDate: '2026-07-01', responseDate: '2026-07-15', rev: '00', isLatestRev: true } as any,
  { id: 'n2', docNo: 'INN-ARC-NCR-MEP-002', ncrRef: 'INN-ARC-NCR-MEP-002', logType: 'NCR', documentType: 'NCR', status: 'Open', ncrStatus: 'Open', ncrAction: 'REJECTED', submissionDate: '2026-08-01', responseDate: '', rev: '00', isLatestRev: true, delayDays: 19, overdue: true } as any
];
const ncrNorm = normalizeData(ncrRows);
const ncrKPI = calculateNCRStats(ncrNorm, false);
assert(ncrKPI.approved === 1, 'NCR Closed = 1');
assert(ncrKPI.rejectedOpen === 1, 'NCR Open = 1');

// 3. SOR TEST
console.log('\n--- 3. SOR REGISTER ISOLATION & ACCURACY ---');
const sorRows: SubmittalRow[] = [
  { id: 's1', docNo: 'INN-ARC-SOR-HSE-001', logType: 'SOR', documentType: 'SOR', status: 'Closed', submissionDate: '2026-07-01', responseDate: '2026-07-10', rev: '00', isLatestRev: true } as any,
  { id: 's2', docNo: 'INN-ARC-SOR-HSE-002', logType: 'SOR', documentType: 'SOR', status: 'Open', submissionDate: '2026-08-05', responseDate: '', rev: '00', isLatestRev: true } as any
];
const sorNorm = normalizeData(sorRows);
const sorKPI = calculateSORStats(sorNorm, false);
assert(sorKPI.totalSubmittedSheets === 2, 'SOR Workload = 2');
assert(sorKPI.totalUniqueDrawings === 2, 'SOR Unique = 2');

// 4. LTR TEST
console.log('\n--- 4. LTR REGISTER ISOLATION & ACCURACY ---');
const ltrRows: SubmittalRow[] = [
  { id: 'l1', docNo: 'INN-ACE-LTR-001', logType: 'LTR', documentType: 'LTR', status: 'Closed', submissionDate: '2026-07-01', responseDate: '2026-07-05', rev: '00', isLatestRev: true, direction: 'IN' } as any,
  { id: 'l2', docNo: 'INN-ACE-LTR-002', logType: 'LTR', documentType: 'LTR', status: 'Open', submissionDate: '2026-08-01', responseDate: '', rev: '00', isLatestRev: true, direction: 'OUT' } as any
];
const ltrNorm = normalizeData(ltrRows);
const ltrKPI = calculateLTRStats(ltrNorm, false);
assert(ltrKPI.totalSubmittedSheets === 2, 'LTR Total = 2');
assert(ltrKPI.totalDrawingsRev0 === 1, 'LTR Letters IN = 1');
assert(ltrKPI.totalDrawingsFurtherRev === 1, 'LTR Letters OUT = 1');

console.log(`\n======================================================`);
console.log(`ALL MULTI-REGISTER ISOLATION CHECKS PASSED: ${passCount} passed, ${failCount} failed.`);
console.log(`======================================================\n`);
