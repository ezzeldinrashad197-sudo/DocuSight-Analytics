import { calculateCanonicalKPIs, getBusinessEntityKey } from '../analytics/calculationFoundation';
import { normalizeData, calculateStats } from '../utils/calculations';
import { classifyRegisterSheet, detectDisciplineFromText } from '../utils/classificationEngine';
import { SubmittalRow } from '../types';

console.log('=== RUNNING MANDATORY E2E DISCIPLINE SEPARATION & REGRESSION SUITE ===\n');

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

// -------------------------------------------------------------------------------------------------
// TEST 1 & 2: RECOGNITION & NEGATIVE TESTS
// -------------------------------------------------------------------------------------------------
console.log('--- 1. PATTERN & NEGATIVE TESTS ---');

const surRef = 'INN-ARC-WIR-SUR-01938';
const arcRef = 'INN-ARC-WIR-ARC-07311';

const surDetect = detectDisciplineFromText(surRef);
assert(surDetect !== null && surDetect.discipline === 'SURVEY', 'Test 1.1: INN-ARC-WIR-SUR-01938 detected as SURVEY');
assert(surDetect?.discipline !== 'ARCH', 'Negative Test 1.2: INN-ARC-WIR-SUR-01938 is NOT ARCH');

const arcDetect = detectDisciplineFromText(arcRef);
assert(arcDetect !== null && arcDetect.discipline === 'ARCH', 'Test 2.1: INN-ARC-WIR-ARC-07311 detected as ARCH');
assert(arcDetect?.discipline !== 'SURVEY', 'Negative Test 2.2: INN-ARC-WIR-ARC-07311 is NOT SURVEY');

// Sheet Classification Test
const surSheetRes = classifyRegisterSheet({
  fileName: '03- (WIR) - SUR-ELBurouj.xlsx',
  sheetName: 'SUR',
  headers: ['WIR Ref.', 'Discipline', 'Sub-Discipline', 'Date Sent', 'Status'],
  sampleRows: [['INN-ARC-WIR-SUR-01938', 'SUR', 'IC TO MANHOLE', '23-Jul-2026', 'waiting']],
  projectId: 'p1'
});
assert(surSheetRes.compositeIdentity?.compositeCode === 'WIR-SUR', 'Test 1.3: SUR Sheet classified as WIR-SUR');
assert(surSheetRes.compositeIdentity?.discipline === 'SURVEY', 'Test 1.4: SUR Sheet discipline is SURVEY');

const arcSheetRes = classifyRegisterSheet({
  fileName: '02- (WIR) - ARCH-ELBurouj.xlsx',
  sheetName: 'ARCH',
  headers: ['WIR Ref.', 'Discipline', 'Sub-Discipline', 'Date Sent', 'Status'],
  sampleRows: [['INN-ARC-WIR-ARC-07311', 'ARCH', 'Block Works', '23-Jul-2026', 'waiting']],
  projectId: 'p1'
});
assert(arcSheetRes.compositeIdentity?.compositeCode === 'WIR-ARC', 'Test 2.3: ARCH Sheet classified as WIR-ARC');
assert(arcSheetRes.compositeIdentity?.discipline === 'ARCH', 'Test 2.4: ARCH Sheet discipline is ARCH');

// -------------------------------------------------------------------------------------------------
// TEST 3: BUSINESS ENTITY KEY ISOLATION
// -------------------------------------------------------------------------------------------------
console.log('\n--- 2. BUSINESS ENTITY KEY ISOLATION ---');

const rowSur: SubmittalRow = {
  id: 'sur-1',
  docNo: 'INN-ARC-WIR-SUR-01938',
  rev: '00',
  discipline: 'SUR',
  logType: 'WIR-SUR',
  sourceFile: '03- (WIR) - SUR-ELBurouj.xlsx',
  rawSourceIdentity: '03- (WIR) - SUR-ELBurouj.xlsx::SUR',
  documentType: 'WIR-SUR',
  trade: 'Survey',
  submissionDate: '2026-07-23',
  status: 'waiting',
  isLatestRev: true,
  isRev0: true,
} as any;

const rowArc: SubmittalRow = {
  id: 'arc-1',
  docNo: 'INN-ARC-WIR-ARC-07311',
  rev: '00',
  discipline: 'ARCH',
  logType: 'WIR-ARC',
  sourceFile: '02- (WIR) - ARCH-ELBurouj.xlsx',
  rawSourceIdentity: '02- (WIR) - ARCH-ELBurouj.xlsx::ARCH',
  documentType: 'WIR-ARC',
  trade: 'Architectural',
  submissionDate: '2026-07-23',
  status: 'waiting',
  isLatestRev: true,
  isRev0: true,
} as any;

const keySur = getBusinessEntityKey(rowSur);
const keyArc = getBusinessEntityKey(rowArc);

assert(keySur.includes('WIR-SUR') || keySur.includes('SUR'), `Key SUR isolated: ${keySur}`);
assert(keyArc.includes('WIR-ARC') || keyArc.includes('ARC'), `Key ARC isolated: ${keyArc}`);
assert(keySur !== keyArc, 'Test 3.1: SUR and ARC keys are completely distinct');

// -------------------------------------------------------------------------------------------------
// TEST 4: NORMALIZATION & TRADE ALLOCATION
// -------------------------------------------------------------------------------------------------
console.log('\n--- 3. NORMALIZATION & TRADE ALLOCATION ---');

const normalized = normalizeData([rowSur, rowArc]);
assert(normalized[0].trade === 'Survey', 'Test 4.1: rowSur trade is Survey');
assert(normalized[0].documentType === 'WIR-SUR', 'Test 4.2: rowSur documentType is WIR-SUR');
assert(normalized[1].trade === 'Architectural', 'Test 4.3: rowArc trade is Architectural');
assert(normalized[1].documentType === 'WIR-ARC', 'Test 4.4: rowArc documentType is WIR-ARC');

// -------------------------------------------------------------------------------------------------
// TEST 5: TOP 5 BOTTLENECKS SPOTLIGHT AUDIT
// -------------------------------------------------------------------------------------------------
console.log('\n--- 4. TOP 5 BOTTLENECKS SPOTLIGHT AUDIT ---');

const bottleneckRows: SubmittalRow[] = [
  {
    id: 'b1',
    docNo: 'INN-ARC-WIR-SUR-01938',
    rev: '00',
    discipline: 'SUR',
    logType: 'WIR-SUR',
    sourceFile: '03- (WIR) - SUR-ELBurouj.xlsx',
    rawSourceIdentity: '03- (WIR) - SUR-ELBurouj.xlsx::SUR',
    submissionDate: '2026-07-23',
    status: 'waiting',
    recordStatus: 'OPEN',
    delayDays: 28,
    overdue: true,
    subject: 'IC TO MANHOLE',
    actionParty: 'Consultant',
  } as any,
  {
    id: 'b2',
    docNo: 'INN-ARC-WIR-ARC-07311',
    rev: '00',
    discipline: 'ARCH',
    logType: 'WIR-ARC',
    sourceFile: '02- (WIR) - ARCH-ELBurouj.xlsx',
    rawSourceIdentity: '02- (WIR) - ARCH-ELBurouj.xlsx::ARCH',
    submissionDate: '2026-07-24',
    status: 'waiting',
    recordStatus: 'OPEN',
    delayDays: 27,
    overdue: true,
    subject: 'Block Works',
    actionParty: 'Consultant',
  } as any,
  {
    id: 'b3',
    docNo: 'INN-ARC-WIR-ARC-07314',
    rev: '00',
    discipline: 'ARCH',
    logType: 'WIR-ARC',
    sourceFile: '02- (WIR) - ARCH-ELBurouj.xlsx',
    rawSourceIdentity: '02- (WIR) - ARCH-ELBurouj.xlsx::ARCH',
    submissionDate: '2026-07-25',
    status: 'waiting',
    recordStatus: 'OPEN',
    delayDays: 26,
    overdue: true,
    subject: 'Plaster Works',
    actionParty: 'Consultant',
  } as any,
  {
    id: 'b4',
    docNo: 'INN-ARC-WIR-ARC-07315',
    rev: '00',
    discipline: 'ARCH',
    logType: 'WIR-ARC',
    sourceFile: '02- (WIR) - ARCH-ELBurouj.xlsx',
    rawSourceIdentity: '02- (WIR) - ARCH-ELBurouj.xlsx::ARCH',
    submissionDate: '2026-07-26',
    status: 'waiting',
    recordStatus: 'OPEN',
    delayDays: 25,
    overdue: true,
    subject: 'Painting Works',
    actionParty: 'Consultant',
  } as any,
  {
    id: 'b5',
    docNo: 'INN-ARC-WIR-SUR-01947',
    rev: '00',
    discipline: 'SUR',
    logType: 'WIR-SUR',
    sourceFile: '03- (WIR) - SUR-ELBurouj.xlsx',
    rawSourceIdentity: '03- (WIR) - SUR-ELBurouj.xlsx::SUR',
    submissionDate: '2026-07-27',
    status: 'waiting',
    recordStatus: 'OPEN',
    delayDays: 24,
    overdue: true,
    subject: 'IC TO MANHOLE',
    actionParty: 'Consultant',
  } as any,
];

const normBottlenecks = normalizeData(bottleneckRows);
const stats = calculateStats(normBottlenecks);

// Check Top 5 Bottlenecks in stats:
const top5 = normBottlenecks.sort((a, b) => (b.delayDays || 0) - (a.delayDays || 0)).slice(0, 5);

assert(top5[0].docNo === 'INN-ARC-WIR-SUR-01938', 'Rank #1 is INN-ARC-WIR-SUR-01938');
assert(top5[0].trade === 'Survey', 'Rank #1 trade is Survey (NOT Architectural)');
assert(top5[0].documentType === 'WIR-SUR', 'Rank #1 documentType is WIR-SUR (NOT WIR-ARC)');

assert(top5[1].trade === 'Architectural', 'Rank #2 trade is Architectural');
assert(top5[2].trade === 'Architectural', 'Rank #3 trade is Architectural');
assert(top5[3].trade === 'Architectural', 'Rank #4 trade is Architectural');

assert(top5[4].docNo === 'INN-ARC-WIR-SUR-01947', 'Rank #5 is INN-ARC-WIR-SUR-01947');
assert(top5[4].trade === 'Survey', 'Rank #5 trade is Survey (NOT Architectural)');
assert(top5[4].documentType === 'WIR-SUR', 'Rank #5 documentType is WIR-SUR (NOT WIR-ARC)');

// -------------------------------------------------------------------------------------------------
// TEST 6: FULL DISCIPLINE BREAKDOWN & AGGREGATION INTEGRITY
// -------------------------------------------------------------------------------------------------
console.log('\n--- 5. AGGREGATION & BREAKDOWN INDEPENDENCE ---');

const surRows = normBottlenecks.filter(r => r.documentType === 'WIR-SUR');
const arcRows = normBottlenecks.filter(r => r.documentType === 'WIR-ARC');

assert(surRows.length === 2, 'WIR-SUR total rows = 2');
assert(arcRows.length === 3, 'WIR-ARC total rows = 3');

const surKPI = calculateCanonicalKPIs(surRows);
const arcKPI = calculateCanonicalKPIs(arcRows);

assert(surKPI.totalSubmittedSheets === 2, 'WIR-SUR Workload = 2');
assert(surKPI.totalUniqueDrawings === 2, 'WIR-SUR Unique = 2');
assert(surKPI.activeItems === 2, 'WIR-SUR Active = 2');

assert(arcKPI.totalSubmittedSheets === 3, 'WIR-ARC Workload = 3');
assert(arcKPI.totalUniqueDrawings === 3, 'WIR-ARC Unique = 3');
assert(arcKPI.activeItems === 3, 'WIR-ARC Active = 3');

console.log(`\n======================================================`);
console.log(`ALL E2E DISCIPLINE SEPARATION CHECKS PASSED: ${passCount} passed, ${failCount} failed.`);
console.log(`======================================================\n`);
