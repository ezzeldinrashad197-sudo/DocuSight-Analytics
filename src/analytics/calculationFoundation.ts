import { SubmittalRow } from '../types';
import { compareRevisions, getNormalizedStatusCore } from './analyticsCore';
import { getRevisionWeight } from '../utils/enterpriseUpgradeEngine';
import { resolveStatusInfo } from '../utils/calculations';

export interface CanonicalRecord {
  id: string;
  originalRow: SubmittalRow;
  registerType: string;
  businessEntityKey: string;
  revision: string;
  submissionDate: string;
  responseDate: string;
  status: string;
  resolvedStatus: string;
  isLatestRevision: boolean;
  isRev0: boolean;
  isHistoricalRev0: boolean;
  firstSubmissionDate: string;
  includeInSubmission: boolean;
  includeInPerformance: boolean;
}

export interface SubmissionLayerResult {
  totalSubmitted: number;
  rev00: number;
  furtherRevisions: number;
}

export interface PerformanceLayerResult {
  totalUniqueItems: number;
  approved: number;
  rejectedOpen: number;
  rejectedClosed: number;
  pending: number;
}

/**
 * Helper to safely parse any date string or number into timestamp for comparison.
 */
export function parseDateTimestamp(dateStr?: string | number): number {
  if (!dateStr) return 0;
  if (typeof dateStr === 'number') {
    if (dateStr > 25000 && dateStr < 60000) {
      return Math.round((dateStr - 25569) * 86400 * 1000);
    }
    return dateStr;
  }
  const str = String(dateStr).trim();
  if (!str) return 0;

  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    return Math.round((num - 25569) * 86400 * 1000);
  }

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return new Date(Date.UTC(y, m, d)).getTime();
  }

  // 2. DMY format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    if (d <= 31 && m >= 0 && m < 12) {
      return new Date(Date.UTC(y, m, d)).getTime();
    }
  }

  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * 1. Business Entity Resolver
 * Explicitly resolved by register type without generic fallback chains.
 */
export function getBusinessEntityKey(row: SubmittalRow): string {
  // Use Workflow Family primarily (الفصل الثاني) with legacy documentType/logType fallbacks for 100% backward compatibility
  const family = (row.workflowFamily || '').toUpperCase().trim();
  const type = (row.documentType || row.logType || 'DOC').toUpperCase().trim();
  const r = row as Record<string, any>;

  const extractRef = (...keys: string[]) => {
    for (const k of keys) {
      if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') {
        return String(r[k]).trim();
      }
    }
    return '';
  };

  let commonRef = extractRef('submittalRef', 'subRef', 'subNo', 'docNo', 'docNumber', 'documentNo', 'documentNumber', 'drawingNo', 'drawingNumber', 'sheetNo', 'ref', 'id');
  if (!commonRef) {
    commonRef = row.id || 'ITEM';
  }
  const upperDocNo = extractRef('docNo', 'docNumber', 'documentNo').toUpperCase();
  const upperLog = (row.logType || '').toUpperCase();

  // Explicit ABD detection to ensure 100% key symmetry across raw and normalized datasets
  const isABD = family === 'ABD' ||
                type.startsWith('ABD') || type.includes('AS-BUILT') || type.includes('AS BUILT') || type.includes('ASBUILT') ||
                upperDocNo.startsWith('ABD-') || upperDocNo.includes('AS-BUILT') || upperDocNo.includes('AS BUILT') || upperDocNo.includes('ASBUILT') ||
                upperLog.includes('ABD') || upperLog === 'AS-BUILT' || upperLog === 'AS BUILT' || upperLog === 'ASBUILT';

  if (isABD) {
    return `ABD:${commonRef.toUpperCase()}`;
  }

  if (family === 'NCR' || type.includes('NCR') || type === 'NCR') {
    const ref = extractRef('ncrRef', 'docNo', 'docNumber', 'documentNo', 'id');
    return `NCR:${ref.toUpperCase()}`;
  }
  if (family === 'SOR' || type.includes('SOR') || type === 'SOR') {
    const ref = extractRef('sorRef', 'docNo', 'docNumber', 'documentNo', 'id');
    return `SOR:${ref.toUpperCase()}`;
  }
  if (family === 'RFI' || type.includes('RFI') || type === 'RFI') {
    const ref = extractRef('rfiRef', 'docNo', 'docNumber', 'documentNo', 'id');
    return `RFI:${ref.toUpperCase()}`;
  }
  if (family === 'WIR' || type.includes('WIR') || type === 'WIR') {
    const ref = extractRef('wirRef', 'docNo', 'docNumber', 'documentNo', 'id');
    return `WIR:${ref.toUpperCase()}`;
  }
  if (family === 'MIR' || type.includes('MIR') || type === 'MIR') {
    const ref = extractRef('mirRef', 'docNo', 'docNumber', 'documentNo', 'id');
    return `MIR:${ref.toUpperCase()}`;
  }
  if (family === 'LETTER' || type.includes('LT') || type.includes('LETTER') || type === 'LTR') {
    const ref = extractRef('letterRef', 'docNo', 'subject', 'id');
    return `LTR:${ref.toUpperCase()}`;
  }
  if (family === 'SDW' || type.includes('SDW') || type.includes('SHD') || type.includes('SHOP') || upperDocNo.startsWith('SDW-') || upperDocNo.startsWith('SHD-')) {
    return `SDW:${commonRef.toUpperCase()}`;
  }
  if (family === 'MAR' || type.includes('MAR') || type.includes('MATERIAL') || type === 'MAR') {
    const ref = extractRef('materialRef', 'marRef', 'docNo', 'docNumber', 'id');
    return `MAR:${ref.toUpperCase()}`;
  }
  if (family === 'QS' || type.includes('QS') || type === 'QS') {
    const ref = extractRef('qsRef', 'docNo', 'docNumber', 'id');
    return `QS:${ref.toUpperCase()}`;
  }

  const disc = (r.discipline || '').trim().toUpperCase();
  const prefix = type.includes('-') ? type : (disc ? `${type}-${disc}` : type);
  return `${prefix}:${commonRef.toUpperCase()}`;
}

/**
 * 3. Revision Engine
 * Groups by BusinessEntityKey, sorts chronologically by Submission Date 
 * (with compareRevisions as tie-breaker), detects latest revision, 
 * and marks IsLatestRevision and IsRev0 based on historical submission order.
 */
export function processRevisionEngine(rows: SubmittalRow[], cutoffDate?: string): Map<string, { latest: SubmittalRow, all: SubmittalRow[] }> {
  const groups = new Map<string, SubmittalRow[]>();
  const cutoffTime = parseDateTimestamp(cutoffDate);

  rows.forEach(row => {
    // Cut-off date comparison using timestamp
    if (cutoffTime > 0 && row.submissionDate) {
      const subTime = parseDateTimestamp(row.submissionDate);
      if (subTime > cutoffTime) {
        return;
      }
    }
    const key = getBusinessEntityKey(row);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  const result = new Map<string, { latest: SubmittalRow, all: SubmittalRow[] }>();

  groups.forEach((groupRows, key) => {
    // Sort chronologically by Submission Date first, then compareRevisions if dates equal
    const sorted = [...groupRows].sort((a, b) => {
      const timeA = parseDateTimestamp(a.submissionDate);
      const timeB = parseDateTimestamp(b.submissionDate);
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return compareRevisions(a.rev, b.rev);
    });
    const latest = sorted[sorted.length - 1];
    result.set(key, { latest, all: sorted });
  });

  return result;
}

/**
 * 2. Canonical Dataset Builder
 * Single Source of Truth builder.
 */
export function buildCanonicalDataset(rows: SubmittalRow[], fullCumulativeRows?: SubmittalRow[], cutoffDate?: string): CanonicalRecord[] {
  const baseRows = fullCumulativeRows && fullCumulativeRows.length > 0 ? fullCumulativeRows : rows;
  const revisionMap = processRevisionEngine(baseRows, cutoffDate);
  
  const isRev0Map = new Map<string, boolean>();
  const firstSubDateMap = new Map<string, string>();
  const isLatestMap = new Map<string, boolean>();

  revisionMap.forEach((groupInfo) => {
    groupInfo.all.forEach((row, index) => {
      const revStr = (row.rev || '').trim().toUpperCase();
      const isRowRev0 = revStr === '0' || revStr === '00' || revStr === '' || compareRevisions(revStr, '0') <= 0;
      isRev0Map.set(row.id, isRowRev0);
      if (index === 0) {
        firstSubDateMap.set(row.id, row.submissionDate || '');
      }
      isLatestMap.set(row.id, groupInfo.latest.id === row.id);
    });
  });

  const cutoffTime = parseDateTimestamp(cutoffDate);
  const canonicalRecords: CanonicalRecord[] = [];

  rows.forEach(row => {
    if (cutoffTime > 0 && row.submissionDate) {
      const subTime = parseDateTimestamp(row.submissionDate);
      if (subTime > cutoffTime) {
        return;
      }
    }

    const businessEntityKey = getBusinessEntityKey(row);
    const isHistoricalRev0 = isRev0Map.get(row.id) ?? (compareRevisions(row.rev, '0') === 0 || row.rev === '0' || row.rev === '00');
    const firstSubDate = firstSubDateMap.get(row.id) || row.submissionDate || '';
    const isLatest = isLatestMap.get(row.id) ?? true;

    const registerType = (row.documentType || row.logType || 'DOC').toUpperCase().trim();
    const rawStatus = row.status || (row as any).recordStatus || (row as any).ncrStatus || '';
    let resolvedStatus = getResolvedStatusCategory(row);
    const revStr = (row.rev || '').trim();

    // Document Control workflow rule:
    // Latest submission with no explicit status or explicitly pending status must be PENDING.
    if (isLatest) {
      const statusInfo = resolveStatusInfo(rawStatus);
      if (statusInfo.category === 'PENDING') {
        resolvedStatus = 'PENDING';
      }
    }

    canonicalRecords.push({
      id: row.id,
      originalRow: row,
      registerType,
      businessEntityKey,
      revision: revStr,
      submissionDate: row.submissionDate || '',
      responseDate: row.responseDate || '',
      status: row.status || '',
      resolvedStatus,
      isLatestRevision: isLatest,
      isRev0: isHistoricalRev0,
      isHistoricalRev0,
      firstSubmissionDate: firstSubDate,
      includeInSubmission: true,
      includeInPerformance: isLatest,
    });
  });

  return canonicalRecords;
}

function getResolvedStatusCategory(row: SubmittalRow): 'APPROVED' | 'REJECTED_OPEN' | 'REJECTED_CLOSED' | 'PENDING' {
  const rawStatus = row.status || (row as any).recordStatus || (row as any).ncrStatus || '';
  return resolveStatusInfo(rawStatus).category;
}

/**
 * 4. Submission & Engineering Item Layer Calculations
 */
export interface EngineeringItemClassification {
  businessEntityKey: string;
  trade: string;
  drawingNo: string;
  sheetNo: string;
  submissionRef: string;
  firstSubmissionDate: string;
  firstRevision: string;
  classification: 'Rev00' | 'Further Revision';
  ruleApplied: string;
  explanation: string;
  latestRevision: string;
  latestStatus: string;
  includeInPerformance: boolean;
}

export function evaluateEngineeringItemClassification(rows: SubmittalRow[]): EngineeringItemClassification[] {
  const revisionMap = processRevisionEngine(rows);
  const results: EngineeringItemClassification[] = [];

  revisionMap.forEach((groupInfo, key) => {
    const sorted = [...groupInfo.all].sort((a, b) => {
      const timeA = parseDateTimestamp(a.submissionDate);
      const timeB = parseDateTimestamp(b.submissionDate);
      if (timeA !== timeB) return timeA - timeB;
      return compareRevisions(a.rev, b.rev);
    });

    if (sorted.length === 0) return;

    const first = sorted[0];
    const latest = groupInfo.latest || sorted[sorted.length - 1];
    
    let maxWeight = 0;
    let highestRevStr = '';
    sorted.forEach(r => {
      const revStr = (r.rev || '').trim();
      const w = getRevisionWeight(revStr);
      if (w >= maxWeight) {
        maxWeight = w;
        if (revStr) highestRevStr = revStr;
      }
    });

    const isRev0 = maxWeight === 0;
    const drawingNo = (latest as any).drawingNo || latest.docNo || '';
    const trade = latest.trade || 'General';

    const classification: 'Rev00' | 'Further Revision' = isRev0 ? 'Rev00' : 'Further Revision';
    const ruleApplied = isRev0 
      ? 'Rev00 Baseline Rule: Resolved latest revision produced by Revision Resolution Engine is 0, 00, or empty.' 
      : 'Further Revision Rule: Resolved latest revision produced by Revision Resolution Engine is greater than 0 (e.g., 01, 02), indicating a further revision.';
    const explanation = `BusinessEntityKey '${key}' has ${sorted.length} total submission(s). Latest resolved revision: '${latest.rev || '0'}' via Revision Resolution Engine.`;

    results.push({
      businessEntityKey: key,
      trade,
      drawingNo,
      sheetNo: latest.sheetNo || '',
      submissionRef: latest.docNo || latest.sheetNo || latest.id,
      firstSubmissionDate: first.submissionDate || 'N/A',
      firstRevision: first.rev || '0',
      classification,
      ruleApplied,
      explanation,
      latestRevision: latest.rev || '0',
      latestStatus: latest.status || 'Pending',
      includeInPerformance: true,
    });
  });

  return results;
}

export function evaluateSubmissionLayer(canonicalRecords: CanonicalRecord[], fullCumulativeRows?: SubmittalRow[]): SubmissionLayerResult {
  const baseRows = fullCumulativeRows && fullCumulativeRows.length > 0 ? fullCumulativeRows : canonicalRecords.map(r => r.originalRow);
  const items = evaluateEngineeringItemClassification(baseRows);

  const canonicalKeys = new Set(canonicalRecords.map(r => r.businessEntityKey));
  const filteredItems = items.filter(i => canonicalKeys.has(i.businessEntityKey));

  let rev00 = 0;
  let furtherRevisions = 0;

  filteredItems.forEach(item => {
    if (item.classification === 'Rev00') {
      rev00++;
    } else {
      furtherRevisions++;
    }
  });

  const totalUniqueItems = filteredItems.length;
  if (rev00 + furtherRevisions !== totalUniqueItems) {
    throw new Error(`Engineering Item Validation Error: Invariant violated (Rev00: ${rev00} + Further: ${furtherRevisions} !== TotalUnique: ${totalUniqueItems})`);
  }

  return {
    totalSubmitted: canonicalRecords.filter(r => r.includeInSubmission).length,
    rev00,
    furtherRevisions,
  };
}

/**
 * 5. Performance Layer Calculations
 */
export function evaluatePerformanceLayer(canonicalRecords: CanonicalRecord[]): PerformanceLayerResult {
  const entityMap = new Map<string, CanonicalRecord[]>();
  canonicalRecords.forEach(r => {
    if (!entityMap.has(r.businessEntityKey)) {
      entityMap.set(r.businessEntityKey, []);
    }
    entityMap.get(r.businessEntityKey)!.push(r);
  });

  const performanceRows: CanonicalRecord[] = [];
  entityMap.forEach((records) => {
    const sorted = [...records].sort((a, b) => {
      const timeA = parseDateTimestamp(a.submissionDate);
      const timeB = parseDateTimestamp(b.submissionDate);
      if (timeA !== timeB) return timeA - timeB;
      return compareRevisions(a.revision, b.revision);
    });
    const latest = sorted[sorted.length - 1];
    const latestRevision = latest.revision;
    // Iterate through every physical drawing row belonging to the latest submission workflow
    const latestWorkflowRows = sorted.filter(r => r.revision === latestRevision);

    latestWorkflowRows.forEach(row => {
      let resolved = row.resolvedStatus;
      const statusStr = (row.status || '').toUpperCase().trim();
      const isPendingStatus = !statusStr || statusStr === 'W' || statusStr.includes('PEND') || statusStr.includes('WAIT') || statusStr.includes('AWAI');
      const hasResponseDate = Boolean(row.responseDate && row.responseDate.trim() !== '');
      if (isPendingStatus || !hasResponseDate) {
        resolved = 'PENDING';
      }

      performanceRows.push({
        ...row,
        resolvedStatus: resolved
      });
    });
  });

  const totalUniqueItems = performanceRows.length;

  let approved = 0;
  let rejectedOpen = 0;
  let rejectedClosed = 0;
  let pending = 0;

  performanceRows.forEach(r => {
    switch (r.resolvedStatus) {
      case 'APPROVED':
        approved++;
        break;
      case 'REJECTED_OPEN':
        rejectedOpen++;
        break;
      case 'REJECTED_CLOSED':
        rejectedClosed++;
        break;
      case 'PENDING':
      default:
        pending++;
        break;
    }
  });

  // 6. Mathematical Invariants: Performance
  const sumPerformance = approved + rejectedOpen + rejectedClosed + pending;
  if (sumPerformance !== totalUniqueItems) {
    throw new Error(`Calculation Exception: Performance invariant violated (Approved: ${approved} + RejOpen: ${rejectedOpen} + RejClosed: ${rejectedClosed} + Pending: ${pending} !== TotalUnique: ${totalUniqueItems})`);
  }

  return {
    totalUniqueItems,
    approved,
    rejectedOpen,
    rejectedClosed,
    pending,
  };
}

export interface PerformanceValidationRow {
  businessEntityKey: string;
  latestRevision: string;
  latestSubmissionDate: string;
  latestStatus: string;
  resolvedStatus: string;
  includedInPerformance: boolean;
}

/**
 * Get Performance Validation Rows for UI preview and CSV export
 */
export function getPerformanceValidationRows(rows: SubmittalRow[]): PerformanceValidationRow[] {
  const canonical = buildCanonicalDataset(rows, rows);
  const entityMap = new Map<string, CanonicalRecord[]>();
  canonical.forEach(r => {
    if (!entityMap.has(r.businessEntityKey)) {
      entityMap.set(r.businessEntityKey, []);
    }
    entityMap.get(r.businessEntityKey)!.push(r);
  });

  const result: PerformanceValidationRow[] = [];
  entityMap.forEach((records, key) => {
    const sorted = [...records].sort((a, b) => {
      const timeA = parseDateTimestamp(a.submissionDate);
      const timeB = parseDateTimestamp(b.submissionDate);
      if (timeA !== timeB) return timeA - timeB;
      return compareRevisions(a.revision, b.revision);
    });
    const latest = sorted[sorted.length - 1];

    result.push({
      businessEntityKey: key,
      latestRevision: latest.revision,
      latestSubmissionDate: latest.submissionDate,
      latestStatus: latest.status,
      resolvedStatus: latest.resolvedStatus,
      includedInPerformance: true,
    });
  });

  return result;
}

/**
 * Export Performance Validation CSV
 */
export function exportPerformanceValidationCsv(rows: SubmittalRow[]): string {
  const perfRows = getPerformanceValidationRows(rows);
  let csv = 'BusinessEntityKey,Latest Revision,Latest Submission Date,Latest Status,Resolved Status,Included In Performance\n';
  perfRows.forEach(r => {
    csv += `"${r.businessEntityKey}","${r.latestRevision}","${r.latestSubmissionDate}","${r.latestStatus}","${r.resolvedStatus}","${r.includedInPerformance}"\n`;
  });
  return csv;
}
