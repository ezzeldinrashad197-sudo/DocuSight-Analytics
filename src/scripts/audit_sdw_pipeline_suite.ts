import { normalizeData, calculateStats } from '../utils/calculations';
import { resolveRowDiscipline, resolveCanonicalTrade, buildCanonicalDataset, evaluateSubmissionLayer, evaluatePerformanceLayer } from '../analytics/calculationFoundation';
import { detectDisciplineFromText, classifyRegisterSheet } from '../utils/classificationEngine';

console.log('=== RUNNING COMPREHENSIVE SDW PIPELINE & INTEGRITY AUDIT ===\n');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    throw new Error(msg);
  }
  console.log(`[PASS] ${msg}`);
}

// ---------------------------------------------------------
// SECTION 1: DISCIPLINE MAPPING & CANONICAL ISOLATION
// ---------------------------------------------------------
console.log('--- 1. DISCIPLINE MAPPING & CANONICAL ISOLATION ---');

const testRows = [
  { id: '1', docNo: 'INN-ARC-SDW-STR-001', rawDisc: 'STR', expectedDocType: 'SDW-STR', expectedDisc: 'STR', expectedTrade: 'Structural' },
  { id: '2', docNo: 'INN-ARC-SDW-002', rawDisc: 'Structural', expectedDocType: 'SDW-STR', expectedDisc: 'STR', expectedTrade: 'Structural' },
  { id: '3', docNo: 'INN-ARC-SDW-CIVIL-003', rawDisc: 'Civil', expectedDocType: 'SDW-STR', expectedDisc: 'STR', expectedTrade: 'Structural' },
  { id: '4', docNo: 'INN-ARC-SDW-ARC-004', rawDisc: 'ARC', expectedDocType: 'SDW-ARC', expectedDisc: 'Arch', expectedTrade: 'Architectural' },
  { id: '5', docNo: 'INN-ARC-SDW-005', rawDisc: 'Architectural', expectedDocType: 'SDW-ARC', expectedDisc: 'Arch', expectedTrade: 'Architectural' },
  { id: '6', docNo: 'INN-ARC-SDW-MEC-006', rawDisc: 'MECH', expectedDocType: 'SDW-MEC', expectedDisc: 'Mech', expectedTrade: 'Mechanical' },
  { id: '7', docNo: 'INN-ARC-SDW-007', rawDisc: 'Mechanical', expectedDocType: 'SDW-MEC', expectedDisc: 'Mech', expectedTrade: 'Mechanical' },
  { id: '8', docNo: 'INN-ARC-SDW-HVAC-008', rawDisc: 'HVAC', expectedDocType: 'SDW-MEC', expectedDisc: 'Mech', expectedTrade: 'Mechanical' },
  { id: '9', docNo: 'INN-ARC-SDW-ELE-009', rawDisc: 'ELEC', expectedDocType: 'SDW-ELE', expectedDisc: 'Elec', expectedTrade: 'Electrical' },
  { id: '10', docNo: 'INN-ARC-SDW-010', rawDisc: 'Electrical', expectedDocType: 'SDW-ELE', expectedDisc: 'Elec', expectedTrade: 'Electrical' },
  { id: '11', docNo: 'INN-ARC-SDW-INFRA-011', rawDisc: 'INFRA', expectedDocType: 'SDW-INFRA', expectedDisc: 'Infra', expectedTrade: 'Infrastructure' },
  { id: '12', docNo: 'INN-ARC-SDW-012', rawDisc: 'Infrastructure', expectedDocType: 'SDW-INFRA', expectedDisc: 'Infra', expectedTrade: 'Infrastructure' },
  { id: '13', docNo: 'INN-ARC-SDW-UTILITIES-013', rawDisc: 'Utilities', expectedDocType: 'SDW-INFRA', expectedDisc: 'Infra', expectedTrade: 'Infrastructure' },
  { id: '14', docNo: 'INN-ARC-SDW-LND-014', rawDisc: 'LAND', expectedDocType: 'SDW-LAND', expectedDisc: 'Landscape', expectedTrade: 'Landscape' },
  { id: '15', docNo: 'INN-ARC-SDW-015', rawDisc: 'Landscape', expectedType: 'SDW-LAND', expectedDocType: 'SDW-LAND', expectedDisc: 'Landscape', expectedTrade: 'Landscape' },
  { id: '16', docNo: 'INN-ARC-SDW-LANDSCAPE-016', rawDisc: 'Landscape', expectedDocType: 'SDW-LAND', expectedDisc: 'Landscape', expectedTrade: 'Landscape' },
  { id: '17', docNo: 'INN-ARC-SDW-SUR-017', rawDisc: 'SURVEY', expectedDocType: 'SDW-SUR', expectedDisc: 'SURVEY', expectedTrade: 'Survey' },
  { id: '18', docNo: 'INN-ARC-SDW-018', rawDisc: 'Survey', expectedDocType: 'SDW-SUR', expectedDisc: 'SURVEY', expectedTrade: 'Survey' },
  { id: '19', docNo: 'INN-ARC-SDW-019', rawDisc: '', expectedDocType: 'SDW', expectedDisc: 'General', expectedTrade: 'General' },
];

const normalizedList = normalizeData(testRows.map(r => ({
  id: r.id,
  docNo: r.docNo,
  discipline: r.rawDisc,
  logType: 'SDW',
  workflowFamily: 'SDW',
  status: 'A',
  recordStatus: 'CLOSED',
  rev: '00'
} as any)));

testRows.forEach((r, idx) => {
  const norm = normalizedList[idx];
  const pres = resolveRowDiscipline(norm);
  assert(norm.documentType === r.expectedDocType, `Test ${r.id} (${r.docNo}) docType === '${r.expectedDocType}' (got: '${norm.documentType}')`);
  assert(pres === r.expectedDisc, `Test ${r.id} (${r.docNo}) presentationDisc === '${r.expectedDisc}' (got: '${pres}')`);
  assert(norm.trade === r.expectedTrade, `Test ${r.id} (${r.docNo}) trade === '${r.expectedTrade}' (got: '${norm.trade}')`);
});

// Explicit Negative Assertions:
console.log('\n--- 2. EXPLICIT ANTI-HIJACKING NEGATIVE TESTS ---');
const mechNorm = normalizedList[5];
assert(mechNorm.documentType !== 'SDW-ARC', 'MECH is NOT hijacked to SDW-ARC');
assert(mechNorm.trade !== 'Architectural', 'MECH trade is NOT Architectural');

const elecNorm = normalizedList[8];
assert(elecNorm.documentType !== 'SDW-ARC', 'ELEC is NOT hijacked to SDW-ARC');
assert(elecNorm.trade !== 'Architectural', 'ELEC trade is NOT Architectural');

const strNorm = normalizedList[0];
assert(strNorm.documentType !== 'SDW-INFRA', 'STR is NOT hijacked to SDW-INFRA');

const landNorm = normalizedList[13];
assert(landNorm.documentType === 'SDW-LAND', 'LANDSCAPE is explicitly SDW-LAND');
assert(landNorm.documentType !== 'SDW', 'LANDSCAPE is NOT Generic SDW');
assert(landNorm.documentType !== 'SDW-ARC', 'LANDSCAPE is NOT SDW-ARC');

const genericNorm = normalizedList[18];
assert(genericNorm.documentType === 'SDW', 'Unclassifiable item remains Generic SDW without invention');

// ---------------------------------------------------------
// SECTION 3: CUMULATIVE WORKLOAD SSOT (7619 ROWS)
// ---------------------------------------------------------
console.log('\n--- 3. CUMULATIVE WORKLOAD RECONCILIATION (7619 ROWS) ---');
const cumRows: any[] = [];
const addBatch = (count: number, disc: string, prefix: string) => {
  for (let i = 0; i < count; i++) {
    cumRows.push({
      id: `CUM-${disc}-${i}`,
      docNo: `${prefix}-${String(i).padStart(4, '0')}`,
      discipline: disc,
      logType: 'SDW',
      workflowFamily: 'SDW',
      status: 'A',
      recordStatus: 'CLOSED',
      rev: '00'
    });
  }
};

addBatch(2423, 'Structural', 'INN-ARC-SDW-STR');
addBatch(493, 'Infrastructure', 'INN-ARC-SDW-INFRA');
addBatch(1208, 'Architectural', 'INN-ARC-SDW-ARC');
addBatch(1552, 'Mechanical', 'INN-ARC-SDW-MEC');
addBatch(737, 'Electrical', 'INN-ARC-SDW-ELE');
addBatch(1206, 'Landscape', 'INN-ARC-SDW-LND');

const normCum = normalizeData(cumRows);
assert(normCum.length === 7619, `Total Cumulative Workload = 7619 (got: ${normCum.length})`);

const sdwStrCount = normCum.filter(r => r.documentType === 'SDW-STR').length;
const sdwInfraCount = normCum.filter(r => r.documentType === 'SDW-INFRA').length;
const sdwArcCount = normCum.filter(r => r.documentType === 'SDW-ARC').length;
const sdwMecCount = normCum.filter(r => r.documentType === 'SDW-MEC').length;
const sdwEleCount = normCum.filter(r => r.documentType === 'SDW-ELE').length;
const sdwLandCount = normCum.filter(r => r.documentType === 'SDW-LAND').length;

assert(sdwStrCount === 2423, `SDW-STR Cumulative Count = 2,423 (got: ${sdwStrCount})`);
assert(sdwInfraCount === 493, `SDW-INFRA Cumulative Count = 493 (got: ${sdwInfraCount})`);
assert(sdwStrCount + sdwInfraCount === 2916, `STR + INFRA Combined = 2,916 (got: ${sdwStrCount + sdwInfraCount})`);
assert(sdwStrCount !== 2916, `SDW-STR did NOT swallow INFRA (STR is not 2,916)`);
assert(sdwInfraCount !== 0, `SDW-INFRA is NOT missing (INFRA is not 0)`);
assert(sdwArcCount === 1208, `SDW-ARC Cumulative Count = 1,208 (got: ${sdwArcCount})`);
assert(sdwMecCount === 1552, `SDW-MEC Cumulative Count = 1,552 (got: ${sdwMecCount})`);
assert(sdwEleCount === 737, `SDW-ELE Cumulative Count = 737 (got: ${sdwEleCount})`);
assert(sdwLandCount === 1206, `SDW-LAND Cumulative Count = 1,206 (got: ${sdwLandCount})`);
assert(sdwStrCount + sdwInfraCount + sdwArcCount + sdwMecCount + sdwEleCount + sdwLandCount === 7619, 'Sum of all disciplines matches 7,619 exactly');

// ---------------------------------------------------------
// SECTION 4: MONTHLY WORKLOAD SSOT (24 ROWS)
// ---------------------------------------------------------
console.log('\n--- 4. MONTHLY WORKLOAD RECONCILIATION (24 ROWS) ---');
const monRows: any[] = [];
const addMonBatch = (count: number, disc: string, prefix: string) => {
  for (let i = 0; i < count; i++) {
    monRows.push({
      id: `MON-${disc}-${i}`,
      docNo: `${prefix}-${String(i).padStart(4, '0')}`,
      discipline: disc,
      logType: 'SDW',
      workflowFamily: 'SDW',
      status: 'A',
      recordStatus: 'CLOSED',
      rev: '00',
      submissionDate: '2026-08-05'
    });
  }
};

addMonBatch(6, 'Structural', 'INN-ARC-SDW-STR');
addMonBatch(2, 'Architectural', 'INN-ARC-SDW-ARC');
addMonBatch(9, 'Mechanical', 'INN-ARC-SDW-MEC');
addMonBatch(7, 'Landscape', 'INN-ARC-SDW-LND');

const normMon = normalizeData(monRows);
assert(normMon.length === 24, `Total Monthly Workload = 24 (got: ${normMon.length})`);

const monStr = normMon.filter(r => r.documentType === 'SDW-STR').length;
const monArc = normMon.filter(r => r.documentType === 'SDW-ARC').length;
const monMec = normMon.filter(r => r.documentType === 'SDW-MEC').length;
const monEle = normMon.filter(r => r.documentType === 'SDW-ELE').length;
const monLand = normMon.filter(r => r.documentType === 'SDW-LAND').length;

assert(monStr === 6, `SDW-STR Monthly Count = 6 (got: ${monStr})`);
assert(monArc === 2, `SDW-ARC Monthly Count = 2 (got: ${monArc})`);
assert(monMec === 9, `SDW-MEC Monthly Count = 9 (got: ${monMec})`);
assert(monEle === 0, `SDW-ELE Monthly Count = 0 (got: ${monEle})`);
assert(monLand === 7, `SDW-LAND Monthly Count = 7 (got: ${monLand})`);
assert(monStr + monArc + monMec + monEle + monLand === 24, 'Sum of monthly disciplines matches 24 exactly');

console.log('\n======================================================');
console.log('ALL SDW PIPELINE INTEGRITY CHECKS PASSED SUCCESSFULLY!');
console.log('======================================================');
