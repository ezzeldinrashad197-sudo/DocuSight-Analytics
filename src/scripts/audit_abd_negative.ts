import { calculateStats } from '../utils/calculations';
import { getRevisionWeight } from '../analytics/revisionResolver';
import { buildCanonicalDataset, evaluateSubmissionLayer, evaluatePerformanceLayer } from '../analytics/calculationFoundation';
import { SubmittalRow } from '../types';

console.log('=== ABD NEGATIVE & LIFECYCLE TEST SUITE ===\n');

function createDummyRow(id: string, docNo: string, rev: string, status: string, date: string): SubmittalRow {
  return {
    id,
    logType: 'ABD',
    documentType: 'ABD',
    docNo,
    rev,
    status,
    submissionDate: date,
    responseDate: status.includes('Code') || status === 'Approved' ? '2026-02-01' : '',
    discipline: 'Architectural',
    trade: 'Architectural',
    workflowStage: status.includes('Code') || status === 'Approved' ? 'Approved' : 'Pending',
    isRev0: getRevisionWeight(rev) === 0,
    isLatestRev: true,
    delayDays: 0,
    overdue: false,
    sheetNo: '1',
    contractor: 'Main Contractor',
    consultant: 'Consultant',
    dueDate: '2026-01-15',
    remarks: '',
    area: 'Area 1',
    tradeSystem: 'General'
  };
}

// Case 1: First submission = Rev 0
const case1 = [createDummyRow('1', 'ABD-ARC-001', '0', 'Approved', '2026-01-01')];
console.log('--- Case 1: First Submission = Rev 0 ---');
console.log('calculateStats:', calculateStats(case1));
const can1 = buildCanonicalDataset(case1);
console.log('Canonical isRev0:', can1[0].isRev0, '| isLatest:', can1[0].isLatestRevision);

// Case 2: Rev 0 -> Rev 1
const case2 = [
  createDummyRow('1', 'ABD-ARC-002', '0', 'Code C', '2026-01-01'),
  createDummyRow('2', 'ABD-ARC-002', '1', 'Code A', '2026-01-15')
];
console.log('\n--- Case 2: Rev 0 -> Rev 1 ---');
console.log('calculateStats:', calculateStats(case2));
const can2 = buildCanonicalDataset(case2);
console.log('Canonical count:', can2.length);
console.log('Canonical records:', can2.map(c => ({ rev: c.revision, isRev0: c.isRev0, isLatest: c.isLatestRevision, resolvedStatus: c.resolvedStatus })));
console.log('Submission Layer:', evaluateSubmissionLayer(can2));
console.log('Performance Layer:', evaluatePerformanceLayer(can2));

// Case 3: Rev 0 -> Rev 1 -> Rev 2
const case3 = [
  createDummyRow('1', 'ABD-ARC-003', '0', 'Code C', '2026-01-01'),
  createDummyRow('2', 'ABD-ARC-003', '1', 'Code C', '2026-01-15'),
  createDummyRow('3', 'ABD-ARC-003', '2', 'Code A', '2026-02-01')
];
console.log('\n--- Case 3: Rev 0 -> Rev 1 -> Rev 2 ---');
console.log('calculateStats:', calculateStats(case3));
const can3 = buildCanonicalDataset(case3);
console.log('Submission Layer:', evaluateSubmissionLayer(can3));
console.log('Performance Layer:', evaluatePerformanceLayer(can3));

// Case 4: First submission = AS-BUILT
const case4 = [createDummyRow('1', 'ABD-ARC-004', 'AS-BUILT', 'Approved', '2026-01-01')];
console.log('\n--- Case 4: First submission = AS-BUILT ---');
console.log('calculateStats:', calculateStats(case4));
const can4 = buildCanonicalDataset(case4);
console.log('Canonical record:', { rev: can4[0].revision, isRev0: can4[0].isRev0, isLatest: can4[0].isLatestRevision });

// Case 5: Rev 0 -> AS-BUILT
const case5 = [
  createDummyRow('1', 'ABD-ARC-005', '0', 'Code B', '2026-01-01'),
  createDummyRow('2', 'ABD-ARC-005', 'AS-BUILT', 'Approved', '2026-01-20')
];
console.log('\n--- Case 5: Rev 0 -> AS-BUILT ---');
console.log('calculateStats:', calculateStats(case5));
const can5 = buildCanonicalDataset(case5);
console.log('Canonical records:', can5.map(c => ({ rev: c.revision, isRev0: c.isRev0, isLatest: c.isLatestRevision })));

// Case 6: Blank Revision
const case6 = [createDummyRow('1', 'ABD-ARC-006', '', 'Pending', '2026-01-01')];
console.log('\n--- Case 6: Blank Revision ---');
console.log('calculateStats:', calculateStats(case6));
const can6 = buildCanonicalDataset(case6);
console.log('Canonical record:', { rev: can6[0].revision, isRev0: can6[0].isRev0, isLatest: can6[0].isLatestRevision });
