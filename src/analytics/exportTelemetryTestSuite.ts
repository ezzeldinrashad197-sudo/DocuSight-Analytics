import { compileStatsForBaseType } from './exportHelpers';
import { SubmittalRow } from '../types';

interface TestResult {
  suiteName: string;
  testCaseName: string;
  passed: boolean;
  durationMs: number;
  memoryDeltaMb: number;
  details: string;
}

export async function runExportTelemetrySuite(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const runTest = (suiteName: string, caseName: string, fn: () => void | Promise<void>): TestResult => {
    const memoryBefore = process.memoryUsage().heapUsed;
    const start = process.hrtime();
    let passed = false;
    let details = "";
    
    try {
      fn();
      passed = true;
      details = "Execution completed successfully with matching bounds.";
    } catch (err: any) {
      passed = false;
      details = `Failed with exception: ${err.message}`;
    }
    
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationMs = (seconds * 1000) + (nanoseconds / 1000000);
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryDeltaMb = Number(((memoryAfter - memoryBefore) / 1024 / 1024).toFixed(3));

    const res = {
      suiteName,
      testCaseName: caseName,
      passed,
      durationMs: Number(durationMs.toFixed(2)),
      memoryDeltaMb,
      details
    };
    results.push(res);
    return res;
  };

  // --- UNIT TESTS ---

  // 1. Empty Dataset Defense Check
  runTest("Unit Tests", "Empty Dataset Integrity", () => {
    const dummyData: SubmittalRow[] = [];
    const output = compileStatsForBaseType(dummyData, "NCR");
    if (output.stats.length === 0 && output.totalRow.Total !== 0) {
      throw new Error("Stats compiling on empty datasets returned unexpected elements.");
    }
    if (output.hasData !== false) {
      throw new Error("Expected zero data state flag, got true.");
    }
  });

  // 2. Missing Parameters Defense Check
  runTest("Unit Tests", "Missing Document Fields", () => {
    const dummyData: SubmittalRow[] = [
      {
        id: "SUB-001",
        logType: "raw",
        documentType: undefined as any, // missing doc type
        trade: "General",
        workflowStage: "Pending",
        isLatestRev: true,
        isRev0: true,
        delayDays: 0,
        overdue: false,
        docNo: "NCR-99",
        rev: "0",
        sheetNo: "1",
        discipline: null as any, // missing discipline
        contractor: "Enterprise",
        consultant: "Main Consultant",
        submissionDate: "",
        dueDate: "",
        responseDate: "",
        status: "",
        remarks: "",
        area: "",
        tradeSystem: "",
        stakeholder: "Contractor"
      }
    ];
    // Compiling should pass without throwing TypeError
    const output = compileStatsForBaseType(dummyData, "NCR");
    if (output.totalRow.Total !== 1) {
      throw new Error("Failed to account for malformed elements in base stats compile.");
    }
  });

  // 3. Robust Unicode / Arabic RTL Content
  runTest("Unit Tests", "Arabic RTL & Unicode Support", () => {
    const dummyData: SubmittalRow[] = [
      {
        id: "NCR-99",
        logType: "raw",
        documentType: "NCR-STR",
        trade: "Structural",
        workflowStage: "Approved",
        isLatestRev: true,
        isRev0: true,
        delayDays: 0,
        overdue: false,
        docNo: "NCR-Arabic-العربية",
        rev: "0",
        sheetNo: "1",
        discipline: "STR-إنشائي",
        contractor: "شركة الإنشاءات الحديثة",
        consultant: "الاستشاري الرئيسي",
        submissionDate: "2026-01-01",
        dueDate: "2026-01-05",
        responseDate: "2026-01-05",
        status: "APPROVED_WITH_COMMENTS",
        remarks: "",
        area: "Zone A",
        tradeSystem: "",
        stakeholder: "الاستشاري الرئيسي"
      }
    ];
    const output = compileStatsForBaseType(dummyData, "NCR");
    const matchedStr = output.stats.find(s => s.discipline === "STR");
    if (!matchedStr || matchedStr.Total !== 1) {
      throw new Error("Arabic RTL document mapping is broken or not correctly bound to standard disciplines.");
    }
  });

  // 4. Invalid Chart Numeric Integrity
  runTest("Unit Tests", "Invalid Chart Metrics Guard", () => {
    const dummyData: SubmittalRow[] = [
      {
        id: "RFI-101",
        logType: "raw",
        documentType: "RFI-Arch",
        trade: "Architectural",
        workflowStage: "Pending",
        isLatestRev: true,
        isRev0: true,
        delayDays: NaN,
        overdue: false,
        docNo: "RFI-101",
        rev: "0",
        sheetNo: "1",
        discipline: "Arch",
        contractor: "",
        consultant: "Consultant",
        submissionDate: "corrupt_date",
        dueDate: "corrupt_date",
        responseDate: "corrupt_date",
        status: "PENDING",
        remarks: "",
        area: "",
        tradeSystem: "",
        stakeholder: "Consultant"
      }
    ];
    const output = compileStatsForBaseType(dummyData, "RFI");
    if (isNaN(output.totalRow.Total) || isNaN(output.totalRow.Pending)) {
      throw new Error("Math stats compiled isNaN values inside report aggregates.");
    }
  });

  // --- STRESS TESTING & SCALABILITY METRICS ---

  // Helper mock factory
  const generateMockRows = (count: number): SubmittalRow[] => {
    const list: SubmittalRow[] = [];
    const disciplines = ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape'];
    const statuses = ['APPROVED', 'REJECTED_OPEN', 'REJECTED_CLOSED', 'PENDING'];
    
    for (let i = 0; i < count; i++) {
      const disc = disciplines[i % disciplines.length];
      const status = statuses[i % statuses.length];
      list.push({
        id: `STRESS-${i}`,
        logType: "raw",
        documentType: `NCR-${disc}`,
        trade: "Structural",
        workflowStage: "Pending",
        isLatestRev: true,
        isRev0: true,
        delayDays: 0,
        overdue: false,
        docNo: `STRESS-SUB-${i}`,
        rev: "0",
        sheetNo: "1",
        discipline: disc,
        contractor: `Contractor-${i % 5}`,
        consultant: `Stakeholder-${i % 2}`,
        submissionDate: "2026-01-10",
        dueDate: "2026-01-12",
        responseDate: "2026-01-12",
        status: status,
        remarks: "",
        area: "",
        tradeSystem: "",
        stakeholder: `Stakeholder-${i % 2}`
      });
    }
    return list;
  };

  // 5. Stress Load - 1,000 submittals scale test
  runTest("Scalability Stress Tests", "1,000 Records Scale", () => {
    const dataset = generateMockRows(1000);
    const output = compileStatsForBaseType(dataset, "NCR");
    if (output.totalRow.Total !== 1000) {
      throw new Error("Validation mismatch: expected 1,000 compiled records.");
    }
  });

  // 6. Stress Load - 10,000 submittals scale test
  runTest("Scalability Stress Tests", "10,000 Records Scale", () => {
    const dataset = generateMockRows(10000);
    const output = compileStatsForBaseType(dataset, "NCR");
    if (output.totalRow.Total !== 10000) {
      throw new Error("Validation mismatch: expected 10,000 compiled records.");
    }
  });

  return results;
}
