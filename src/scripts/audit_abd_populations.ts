import { generateExpandedGoldenDataset } from '../utils/calculationVerificationEngine';
import { calculateStats } from '../utils/calculations';
import { getRevisionWeight } from '../analytics/revisionResolver';
import { buildCanonicalDataset, getBusinessEntityKey, evaluateSubmissionLayer, evaluatePerformanceLayer } from '../analytics/calculationFoundation';
import fs from 'fs';

console.log('=== POPULATION & METRIC DEFINITION RECONCILIATION AUDIT ===\n');

// 1. ABD_Reference.json
const abdRef = JSON.parse(fs.readFileSync('./src/test-datasets/ABD_Reference.json', 'utf8'));
console.log('--- Population 1: ABD_Reference.json ---');
console.log('Total Records:', abdRef.totalRecords);
console.log('KPIs:', abdRef.kpis);
console.log('Outputs ABD Calculations:', abdRef.outputs.abdCalculations);
console.log('Outputs Revision Analysis:', abdRef.outputs.revisionAnalysis);

// 2. GOLDEN_REGRESSION_BASELINE.json (registers.ABD)
const baseline = JSON.parse(fs.readFileSync('./src/test-datasets/GOLDEN_REGRESSION_BASELINE.json', 'utf8'));
console.log('\n--- Population 2: GOLDEN_REGRESSION_BASELINE.json (registers.ABD) ---');
console.log('ABD Register:', baseline.registers.ABD);

// 3. generateExpandedGoldenDataset() ABD subset (50 rows)
const expandedDataset = generateExpandedGoldenDataset();
const abdExpanded = expandedDataset.filter(r => {
  const dt = (r.documentType || '').toUpperCase();
  const lt = (r.logType || '').toUpperCase();
  const wf = (r.workflowFamily || '').toUpperCase();
  const docNo = (r.docNo || '').toUpperCase();
  return wf === 'ABD' || dt.startsWith('ABD') || dt.includes('AS-BUILT') || docNo.startsWith('ABD-') || lt.includes('ABD') || lt.includes('AS-BUILT');
});
console.log('\n--- Population 3: generateExpandedGoldenDataset() ABD subset ---');
console.log('Physical Rows:', abdExpanded.length);

const keysExpanded = new Map<string, any[]>();
abdExpanded.forEach(r => {
  const k = getBusinessEntityKey(r);
  if (!keysExpanded.has(k)) keysExpanded.set(k, []);
  keysExpanded.get(k)!.push(r);
});
console.log('Unique Business Entities:', keysExpanded.size);
console.log('calculateStats:', calculateStats(abdExpanded));
const canExpanded = buildCanonicalDataset(abdExpanded);
console.log('Submission Layer:', evaluateSubmissionLayer(canExpanded));
console.log('Performance Layer:', evaluatePerformanceLayer(canExpanded));

// 4. Runtime Dataset / Expanded Dataset Total Population (770 rows total across all logs)
console.log('\n--- Population 4: Total Runtime Dataset (All 770 rows) ---');
console.log('Total rows in dataset:', expandedDataset.length);
const allStats = calculateStats(expandedDataset);
console.log('All logs calculateStats:', allStats);
const allCan = buildCanonicalDataset(expandedDataset);
console.log('All logs Submission Layer:', evaluateSubmissionLayer(allCan));
console.log('All logs Performance Layer:', evaluatePerformanceLayer(allCan));

// Check logType distribution across 770 rows
const logTypeDist: Record<string, number> = {};
expandedDataset.forEach(r => {
  const lt = r.logType || r.workflowFamily || 'UNKNOWN';
  logTypeDist[lt] = (logTypeDist[lt] || 0) + 1;
});
console.log('Log Type distribution across 770 rows:', logTypeDist);

console.log('\n=== END OF POPULATION AUDIT ===');
