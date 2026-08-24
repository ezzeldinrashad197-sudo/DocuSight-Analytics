(globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };

import { calculateCanonicalKPIs, getBusinessEntityKey, processRevisionEngine } from '../analytics/calculationFoundation';
import { compileStatsForBaseType, calculateExecutiveDashboardData } from '../analytics/exportHelpers';
import { normalizeData, calculateStats, calculateProjectPerformanceHealth } from '../utils/calculations';
import { SubmittalRow } from '../types';

console.log("=======================================================================");
console.log("   ROOT CAUSE ARCHITECTURAL AUDIT & GOLDEN RECONCILIATION SUITE");
console.log("=======================================================================");

let allPassed = true;
const assert = (condition: boolean, msg: string) => {
  if (condition) {
    console.log(`[PASS] ${msg}`);
  } else {
    console.error(`[FAIL] ${msg}`);
    allPassed = false;
  }
};

// -----------------------------------------------------------------------------
// PART 1: MANDATORY FORENSIC REGRESSION TESTS (TEST A, TEST B, TEST C)
// -----------------------------------------------------------------------------
console.log("\n--- PART 1: MANDATORY FORENSIC TESTS (TEST A, TEST B, TEST C) ---");

// TEST A: SUB-001 (Rev 00 C Closed -> Rev 01 C Open)
const testARows: SubmittalRow[] = [
  { id: "TA-00", docNo: "SUB-001", rev: "00", status: "C", recordStatus: "Closed", logType: "SDW", workflowFamily: "SDW", submissionDate: "2026-01-01" },
  { id: "TA-01", docNo: "SUB-001", rev: "01", status: "C", recordStatus: "Open", logType: "SDW", workflowFamily: "SDW", submissionDate: "2026-02-01" }
];
const kpiA = calculateCanonicalKPIs(testARows);
assert(kpiA.totalUniqueDrawings === 1, "TEST A: Unique === 1 (got: " + kpiA.totalUniqueDrawings + ")");
assert(kpiA.approved === 0, "TEST A: Approved === 0 (got: " + kpiA.approved + ")");
assert(kpiA.rejectedOpen === 1, "TEST A: Rejected Open === 1 (got: " + kpiA.rejectedOpen + ")");
assert(kpiA.rejectedClosed === 0, "TEST A: Rejected Closed === 0 (got: " + kpiA.rejectedClosed + ")");
assert(kpiA.pending === 0, "TEST A: Pending === 0 (got: " + kpiA.pending + ")");
assert(kpiA.rejectionEvents === 2, "TEST A: Historical Rejection Events === 2 (got: " + kpiA.rejectionEvents + ")");

// TEST B: SUB-002 (Rev 00 C Closed -> Rev 01 A Closed)
const testBRows: SubmittalRow[] = [
  { id: "TB-00", docNo: "SUB-002", rev: "00", status: "C", recordStatus: "Closed", logType: "SDW", workflowFamily: "SDW", submissionDate: "2026-01-01" },
  { id: "TB-01", docNo: "SUB-002", rev: "01", status: "A", recordStatus: "Closed", logType: "SDW", workflowFamily: "SDW", submissionDate: "2026-02-01" }
];
const kpiB = calculateCanonicalKPIs(testBRows);
assert(kpiB.totalUniqueDrawings === 1, "TEST B: Unique === 1 (got: " + kpiB.totalUniqueDrawings + ")");
assert(kpiB.approved === 1, "TEST B: Approved === 1 (got: " + kpiB.approved + ")");
assert(kpiB.rejectedOpen === 0, "TEST B: Rejected Open === 0 (got: " + kpiB.rejectedOpen + ")");
assert(kpiB.rejectedClosed === 0, "TEST B: Rejected Closed === 0 (got: " + kpiB.rejectedClosed + ")");
assert(kpiB.pending === 0, "TEST B: Pending === 0 (got: " + kpiB.pending + ")");
assert(kpiB.rejectionEvents === 1, "TEST B: Historical Rejection Events === 1 (got: " + kpiB.rejectionEvents + ")");
assert(kpiB.resolvedRejections === 1, "TEST B: Resolved Rejections === 1 (got: " + kpiB.resolvedRejections + ")");

// TEST C: SUB-003 (Rev 00 C Closed -> Rev 01 C Closed)
const testCRows: SubmittalRow[] = [
  { id: "TC-00", docNo: "SUB-003", rev: "00", status: "C", recordStatus: "Closed", logType: "SDW", workflowFamily: "SDW", submissionDate: "2026-01-01" },
  { id: "TC-01", docNo: "SUB-003", rev: "01", status: "C", recordStatus: "Closed", logType: "SDW", workflowFamily: "SDW", submissionDate: "2026-02-01" }
];
const kpiC = calculateCanonicalKPIs(testCRows);
assert(kpiC.totalUniqueDrawings === 1, "TEST C: Unique === 1 (got: " + kpiC.totalUniqueDrawings + ")");
assert(kpiC.approved === 0, "TEST C: Approved === 0 (got: " + kpiC.approved + ")");
assert(kpiC.rejectedOpen === 0, "TEST C: Rejected Open === 0 (got: " + kpiC.rejectedOpen + ")");
assert(kpiC.rejectedClosed === 1, "TEST C: Rejected Closed === 1 (got: " + kpiC.rejectedClosed + ")");
assert(kpiC.pending === 0, "TEST C: Pending === 0 (got: " + kpiC.pending + ")");
assert(kpiC.rejectionEvents === 2, "TEST C: Historical Rejection Events === 2 (got: " + kpiC.rejectionEvents + ")");

// -----------------------------------------------------------------------------
// PART 2: STR REAL-DATA ACCEPTANCE TEST (371 UNIQUE ITEMS)
// -----------------------------------------------------------------------------
console.log("\n--- PART 2: STR REAL-DATA ACCEPTANCE TEST ---");

const strDataset: SubmittalRow[] = [];

// 368 Approved Unique Items
for (let i = 1; i <= 371; i++) {
  if (i === 179 || i === 346 || i === 363) continue;
  const pad = String(i).padStart(4, "0");
  strDataset.push({
    id: `STR-APP-${pad}`,
    docNo: `INN-ARC-SHD-STR-${pad}`,
    rev: "00",
    status: "A",
    recordStatus: "Closed",
    documentType: "SDW-STR",
    trade: "Structural",
    tradeShort: "STR",
    logType: "SDW",
    workflowFamily: "SDW",
    submissionDate: "2026-03-01"
  });
}

// 1. SUB 0179 — Rev 00 — Code C — Open
strDataset.push({
  id: "STR-0179-00",
  docNo: "INN-ARC-SHD-STR-0179",
  rev: "00",
  status: "C",
  recordStatus: "Open",
  documentType: "SDW-STR",
  trade: "Structural",
  tradeShort: "STR",
  logType: "SDW",
  workflowFamily: "SDW",
  submissionDate: "2026-03-10"
});

// 2. SUB 0346 — Rev 00 (Closed C) + Rev 01 (Open C)
strDataset.push({
  id: "STR-0346-00",
  docNo: "INN-ARC-SHD-STR-0346",
  rev: "00",
  status: "C",
  recordStatus: "Closed",
  documentType: "SDW-STR",
  trade: "Structural",
  tradeShort: "STR",
  logType: "SDW",
  workflowFamily: "SDW",
  submissionDate: "2026-02-10"
});
strDataset.push({
  id: "STR-0346-01",
  docNo: "INN-ARC-SHD-STR-0346",
  rev: "01",
  status: "C",
  recordStatus: "Open",
  documentType: "SDW-STR",
  trade: "Structural",
  tradeShort: "STR",
  logType: "SDW",
  workflowFamily: "SDW",
  submissionDate: "2026-04-10"
});

// 3. SUB 0363 — Rev 00 (Closed C) + Rev 01 (Closed C) + Rev 02 (Open C)
strDataset.push({
  id: "STR-0363-00",
  docNo: "INN-ARC-SHD-STR-0363",
  rev: "00",
  status: "C",
  recordStatus: "Closed",
  documentType: "SDW-STR",
  trade: "Structural",
  tradeShort: "STR",
  logType: "SDW",
  workflowFamily: "SDW",
  submissionDate: "2026-01-10"
});
strDataset.push({
  id: "STR-0363-01",
  docNo: "INN-ARC-SHD-STR-0363",
  rev: "01",
  status: "C",
  recordStatus: "Closed",
  documentType: "SDW-STR",
  trade: "Structural",
  tradeShort: "STR",
  logType: "SDW",
  workflowFamily: "SDW",
  submissionDate: "2026-02-15"
});
strDataset.push({
  id: "STR-0363-02",
  docNo: "INN-ARC-SHD-STR-0363",
  rev: "02",
  status: "C",
  recordStatus: "Open",
  documentType: "SDW-STR",
  trade: "Structural",
  tradeShort: "STR",
  logType: "SDW",
  workflowFamily: "SDW",
  submissionDate: "2026-04-20"
});

const strNorm = normalizeData(strDataset);
const strKpi = calculateStats(strNorm, strNorm);

assert(strKpi.totalUniqueDrawings === 371, "STR Unique === 371 (got: " + strKpi.totalUniqueDrawings + ")");
assert(strKpi.approved === 368, "STR Approved === 368 (got: " + strKpi.approved + ")");
assert(strKpi.rejectedOpen === 3, "STR Rejected Open === 3 (got: " + strKpi.rejectedOpen + ")");
assert(strKpi.rejectedClosed === 0, "STR Rejected Closed === 0 (got: " + strKpi.rejectedClosed + ")");
assert(strKpi.pending === 0, "STR Pending === 0 (got: " + strKpi.pending + ")");
const activeSTR = strKpi.rejectedOpen + strKpi.pending;
assert(activeSTR === 3, "STR Active Population === 3 (got: " + activeSTR + ")");
assert(strKpi.approved + strKpi.rejectedOpen + strKpi.rejectedClosed + strKpi.pending === 371, "STR Invariant: 368 + 3 + 0 + 0 = 371");

// Verify individual Golden Records in Revision Engine
const revMap = processRevisionEngine(strNorm);
const r0179 = revMap.get(getBusinessEntityKey(strNorm.find(r => r.docNo.includes('0179'))!));
const r0346 = revMap.get(getBusinessEntityKey(strNorm.find(r => r.docNo.includes('0346'))!));
const r0363 = revMap.get(getBusinessEntityKey(strNorm.find(r => r.docNo.includes('0363'))!));

assert(r0179?.latest.rev === '00' && r0179?.latest.recordStatus === 'Open', "0179 Latest Rev is 00 & Open");
assert(r0346?.latest.rev === '01' && r0346?.latest.recordStatus === 'Open', "0346 Latest Rev is 01 & Open (Old Rev 00 Closed ignored)");
assert(r0363?.latest.rev === '02' && r0363?.latest.recordStatus === 'Open', "0363 Latest Rev is 02 & Open (Old Revs 00/01 Closed ignored)");

// -----------------------------------------------------------------------------
// PART 3: ACTIVE & OVERDUE MATHEMATICAL INVARIANTS (Requirement 7 & 8)
// -----------------------------------------------------------------------------
console.log("\n--- PART 3: ACTIVE & OVERDUE MATHEMATICAL INVARIANTS ---");

// Active = 33 Rejected Open + 4 Pending = 37, Overdue = 32 -> Overdue Rate = 86.5%
const testActiveRows: SubmittalRow[] = [];
// 33 Rejected Open
for (let i = 1; i <= 33; i++) {
  testActiveRows.push({
    id: `ACT-REJ-${i}`,
    docNo: `ACT-REJ-DOC-${i}`,
    rev: "00",
    status: "C",
    recordStatus: "Open",
    logType: "SDW",
    workflowFamily: "SDW",
    submissionDate: "2026-01-01",
    overdue: i <= 28
  });
}
// 4 Pending
for (let i = 1; i <= 4; i++) {
  testActiveRows.push({
    id: `ACT-PND-${i}`,
    docNo: `ACT-PND-DOC-${i}`,
    rev: "00",
    status: "Pending",
    recordStatus: "Open",
    logType: "SDW",
    workflowFamily: "SDW",
    submissionDate: "2026-01-01",
    overdue: i <= 4
  });
}

const normActive = normalizeData(testActiveRows);
const kpiActive = calculateStats(normActive, normActive);
const totalActive = kpiActive.rejectedOpen + kpiActive.pending;
const overdueRateActive = totalActive > 0 ? ((kpiActive.overdue / totalActive) * 100).toFixed(1) : "0.0";

assert(kpiActive.rejectedOpen === 33, "Active Test: Rejected Open === 33 (got: " + kpiActive.rejectedOpen + ")");
assert(kpiActive.pending === 4, "Active Test: Pending === 4 (got: " + kpiActive.pending + ")");
assert(totalActive === 37, "Active Test: Active Total === 37 (got: " + totalActive + ")");
assert(kpiActive.overdue === 32, "Active Test: Overdue === 32 (got: " + kpiActive.overdue + ")");
assert(overdueRateActive === "86.5", "Active Test: Overdue Rate on Active === 86.5% (got: " + overdueRateActive + "%)");
assert(kpiActive.overdue <= totalActive, "Active Test Invariant: Overdue (32) <= Active (37)");

// -----------------------------------------------------------------------------
// PART 4: FULL PIPELINE PARITY (Engine -> Export Engine -> Presentation)
// -----------------------------------------------------------------------------
console.log("\n--- PART 4: FULL PIPELINE PARITY CHECK ---");

const exportRes = compileStatsForBaseType(strNorm, "SDW", undefined, strNorm);
const strExportRow = exportRes.stats.find(s => s.discipline === "STR");

assert(strExportRow?.Approved === 368, "Export Row STR Approved === 368 (got: " + strExportRow?.Approved + ")");
assert(strExportRow?.RejectedOpen === 3, "Export Row STR RejectedOpen === 3 (got: " + strExportRow?.RejectedOpen + ")");
assert(strExportRow?.RejectedClosed === 0, "Export Row STR RejectedClosed === 0 (got: " + strExportRow?.RejectedClosed + ")");
assert(strExportRow?.Pending === 0, "Export Row STR Pending === 0 (got: " + strExportRow?.Pending + ")");

console.log("\n=======================================================================");
if (allPassed) {
  console.log("   ALL ROOT CAUSE ARCHITECTURAL CHECKS PASSED WITH ZERO ERRORS!");
} else {
  console.error("   AUDIT SUITE FAILED WITH ONE OR MORE ERRORS.");
  process.exit(1);
}
console.log("=======================================================================");
