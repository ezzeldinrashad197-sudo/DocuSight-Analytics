import { runCalculationVerificationSuite, generateExpandedGoldenDataset } from '../utils/calculationVerificationEngine';
import { calculateStats } from '../utils/calculations';
import { getRevisionWeight } from '../utils/enterpriseUpgradeEngine';
import { buildCanonicalDataset, getBusinessEntityKey } from '../analytics/calculationFoundation';
import fs from 'fs';

console.log('=== ABD VERIFICATION AUDIT START ===\n');

// 1. Run Verification Suite
const res = await runCalculationVerificationSuite();
console.log('Suite Version:', res.version);
console.log('Golden Dataset Size:', res.goldenDatasetSize);
console.log('Total Tests:', res.totalTests, '| Passed:', res.passedCount, '| Failed:', res.failedCount);
console.log('Zero Variance Rate:', res.zeroVarianceComplianceRate);

// Module breakdown
console.log('\n--- Module Breakdown in Suite ---');
console.table(res.moduleBreakdown);

// Filter ABD tests in suite
const abdSuiteTests = res.testCases.filter(t => t.id?.includes('ABD') || t.testName?.includes('ABD') || t.description?.includes('ABD'));
console.log(`\n--- Suite Tests mentioning ABD (${abdSuiteTests.length}) ---`);
abdSuiteTests.forEach(t => {
  console.log(`[${t.status}] ${t.id} - ${t.testName} (${t.module}): Exp=${t.expectedValue}, Act=${t.actualValue}`);
});

// 2. Load Reference Datasets
const baselineRaw = JSON.parse(fs.readFileSync('./src/test-datasets/GOLDEN_REGRESSION_BASELINE.json', 'utf8'));
const abdRefRaw = JSON.parse(fs.readFileSync('./src/test-datasets/ABD_Reference.json', 'utf8'));

console.log('\n=== ABD_Reference.json vs GOLDEN_REGRESSION_BASELINE.json (ABD) ===');
console.log('ABD_Reference.json kpis:', abdRefRaw.kpis);
console.log('ABD_Reference.json abdCalculations:', abdRefRaw.outputs.abdCalculations);
console.log('Baseline registers.ABD.abdCalculations:', baselineRaw.registers.ABD.abdCalculations);

// 3. Runtime Expanded Dataset Inspection
const dataset = generateExpandedGoldenDataset();
const abdRows = dataset.filter(r => {
  const dt = (r.documentType || '').toUpperCase();
  const lt = (r.logType || '').toUpperCase();
  const wf = (r.workflowFamily || '').toUpperCase();
  const docNo = (r.docNo || '').toUpperCase();
  return wf === 'ABD' || dt.startsWith('ABD') || dt.includes('AS-BUILT') || docNo.startsWith('ABD-') || lt.includes('ABD') || lt.includes('AS-BUILT');
});

console.log('\n=== Runtime Expanded Golden Dataset ABD Analysis ===');
console.log('Total Rows in expanded dataset:', dataset.length);
console.log('ABD Rows count:', abdRows.length);

const keys = new Map<string, any[]>();
abdRows.forEach(r => {
  const key = getBusinessEntityKey(r);
  if (!keys.has(key)) keys.set(key, []);
  keys.get(key)!.push(r);
});

console.log('Unique Business Entity Keys count:', keys.size);

// Revision distribution in runtime dataset
const revDist: Record<string, number> = {};
abdRows.forEach(r => {
  const rev = (r.rev ?? 'BLANK').toString();
  revDist[rev] = (revDist[rev] || 0) + 1;
});
console.log('Runtime ABD Revision distribution:', revDist);

// Status distribution
const statusDist: Record<string, number> = {};
abdRows.forEach(r => {
  const st = (r.status ?? 'BLANK').toString();
  statusDist[st] = (statusDist[st] || 0) + 1;
});
console.log('Runtime ABD Status distribution:', statusDist);

// 4. Test Revision Weights & Edge Cases
console.log('\n=== REVISION WEIGHT AUDIT ===');
const revsToTest = ['0', '00', '1', '2', '3', 'A', 'B', 'P01', 'C1', 'IFC', 'AS-BUILT', 'ASBUILT', '', null, undefined];
revsToTest.forEach(rev => {
  console.log(`getRevisionWeight(${JSON.stringify(rev)}) => ${getRevisionWeight(rev as any)}`);
});

console.log('\n=== ABD AUDIT COMPLETE ===');
