export interface SystemConfiguration {
  configurationVersion: string;
  effectiveDate: string;
  dateFormat: string;
  roundingDecimals: number;
  defaultUnavailableValue: string;
  strictValidationMode: boolean;
  projectAwareDictionariesEnabled: boolean;
}

export const DEFAULT_SYSTEM_CONFIGURATION: SystemConfiguration = {
  configurationVersion: '1.0.0',
  effectiveDate: '2026-01-01',
  dateFormat: 'YYYY-MM-DD',
  roundingDecimals: 2,
  defaultUnavailableValue: 'N/A',
  strictValidationMode: true,
  projectAwareDictionariesEnabled: true
};

let currentConfig: SystemConfiguration = { ...DEFAULT_SYSTEM_CONFIGURATION };

export function getSystemConfiguration(): SystemConfiguration {
  return currentConfig;
}

export function updateSystemConfiguration(newConfig: Partial<SystemConfiguration>): SystemConfiguration {
  currentConfig = { ...currentConfig, ...newConfig };
  return currentConfig;
}
