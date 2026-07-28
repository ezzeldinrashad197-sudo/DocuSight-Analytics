export interface AuditLogEntry {
  processName: string;
  recordIdentifier: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  ruleApplied: string;
  engineVersion: string;
  executedBy: string;
  executionDate: string;
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
  remarks?: string;
  engineUsed?: 'Legacy' | 'Canonical' | 'Dual Comparison';
}

const auditLogStore: AuditLogEntry[] = [];

export function recordAuditLog(entry: Omit<AuditLogEntry, 'executionDate'>): void {
  const fullEntry: AuditLogEntry = {
    ...entry,
    executionDate: new Date().toISOString()
  };
  auditLogStore.push(fullEntry);
}

export function getAuditLogs(processName?: string): AuditLogEntry[] {
  if (processName) {
    return auditLogStore.filter(log => log.processName === processName);
  }
  return [...auditLogStore];
}

export function clearAuditLogs(): void {
  auditLogStore.length = 0;
}
