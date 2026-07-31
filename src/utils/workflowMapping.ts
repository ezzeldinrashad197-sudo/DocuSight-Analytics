// DocuSight Analytics - Workflow Mapping Specification (SSOT)

export type WorkflowFamily =
  | 'SDW'
  | 'ABD'
  | 'MIR'
  | 'WIR'
  | 'MAR'
  | 'QS'
  | 'RFI'
  | 'NCR'
  | 'SOR'
  | 'LETTER'
  | 'DOC'
  | 'UNKNOWN';

export type CalculationEngineType =
  | 'Shop Drawing Engine'
  | 'As-Built Drawing Engine'
  | 'MIR Engine'
  | 'WIR Engine'
  | 'MAR Engine'
  | 'QS Engine'
  | 'RFI Engine'
  | 'NCR Engine'
  | 'SOR Engine'
  | 'Letter Engine'
  | 'Document Engine'
  | 'None';

export interface AliasMapping {
  alias: string;         // The raw name / sheet name / search string
  display: string;       // What to display to the user in reports (e.g. 'AS BUILT')
  workflowFamily: WorkflowFamily;
  isCustom?: boolean;    // If added by the user
}

// Official Workflow Families & Descriptions (الفصل الثالث)
export const WORKFLOW_FAMILIES_META: Record<WorkflowFamily, { name: string; description: string; engine: CalculationEngineType }> = {
  SDW: {
    name: 'Shop Drawing Workflow',
    description: 'Shop Drawing approval and engineering review workflow',
    engine: 'Shop Drawing Engine',
  },
  ABD: {
    name: 'As-Built Drawing Workflow',
    description: 'As-built drawing approval and record drawings workflow',
    engine: 'As-Built Drawing Engine',
  },
  MIR: {
    name: 'Material Inspection Workflow',
    description: 'Material Inspection Request and site reception workflow',
    engine: 'MIR Engine',
  },
  WIR: {
    name: 'Work Inspection Workflow',
    description: 'Work Inspection Request and site work approval workflow',
    engine: 'WIR Engine',
  },
  MAR: {
    name: 'Material Approval Workflow',
    description: 'Material submittal and vendor approval workflow',
    engine: 'MAR Engine',
  },
  QS: {
    name: 'Quantity Survey Submittals',
    description: 'Quantity survey submittals and BOQ review workflow',
    engine: 'QS Engine',
  },
  RFI: {
    name: 'Request For Information Workflow',
    description: 'Technical request for information and clarifications',
    engine: 'RFI Engine',
  },
  NCR: {
    name: 'Non-Conformance Workflow',
    description: 'Non-conformance reporting, corrective actions and closures',
    engine: 'NCR Engine',
  },
  SOR: {
    name: 'Site Observation Workflow',
    description: 'Site safety and quality observation tracking',
    engine: 'SOR Engine',
  },
  LETTER: {
    name: 'Correspondence Workflow',
    description: 'Project communications, letters, and notices',
    engine: 'Letter Engine',
  },
  DOC: {
    name: 'Document Workflow',
    description: 'Standard document transmittal and generic workflow',
    engine: 'Document Engine',
  },
  UNKNOWN: {
    name: 'Unknown Workflow',
    description: 'Unrecognized register format. Requires manual mapping approval.',
    engine: 'None',
  },
};

// Official Default Mappings (الفصل الرابع)
const DEFAULT_ALIASES: AliasMapping[] = [
  // Shop Drawing Family (4.1)
  { alias: 'SDW', display: 'SDW', workflowFamily: 'SDW' },
  { alias: 'SHOP DRAWING', display: 'SDW', workflowFamily: 'SDW' },
  { alias: 'SHOPDRAWING', display: 'SDW', workflowFamily: 'SDW' },
  { alias: 'SHOP-DRAWING', display: 'SDW', workflowFamily: 'SDW' },
  { alias: 'SHD', display: 'SDW', workflowFamily: 'SDW' },
  { alias: 'SDW-STR', display: 'SDW-STR', workflowFamily: 'SDW' },
  { alias: 'SDW-ARC', display: 'SDW-ARC', workflowFamily: 'SDW' },
  { alias: 'SDW-ELE', display: 'SDW-ELE', workflowFamily: 'SDW' },
  { alias: 'SDW-MEC', display: 'SDW-MEC', workflowFamily: 'SDW' },
  { alias: 'SDW-LND', display: 'SDW-LND', workflowFamily: 'SDW' },
  { alias: 'SDW-INFRA', display: 'SDW-INFRA', workflowFamily: 'SDW' },

  // ABD As-Built Drawing Family
  { alias: 'ABD', display: 'ABD', workflowFamily: 'ABD' },
  { alias: 'AS-BUILT', display: 'ABD', workflowFamily: 'ABD' },
  { alias: 'AS BUILT', display: 'ABD', workflowFamily: 'ABD' },
  { alias: 'ASBUILT', display: 'ABD', workflowFamily: 'ABD' },
  { alias: 'AS-BUILT DRAWINGS', display: 'ABD', workflowFamily: 'ABD' },
  { alias: 'AS BUILT DRAWINGS', display: 'ABD', workflowFamily: 'ABD' },

  // MIR Family (4.3)
  { alias: 'MIR', display: 'MIR', workflowFamily: 'MIR' },
  { alias: 'MATERIAL INSPECTION REQUEST', display: 'MIR', workflowFamily: 'MIR' },
  { alias: 'MATERIAL INSPECTION', display: 'MIR', workflowFamily: 'MIR' },

  // WIR Family (4.4)
  { alias: 'WIR', display: 'WIR', workflowFamily: 'WIR' },
  { alias: 'WORK INSPECTION REQUEST', display: 'WIR', workflowFamily: 'WIR' },
  { alias: 'WORK INSPECTION', display: 'WIR', workflowFamily: 'WIR' },

  // MAR Family (4.5)
  { alias: 'MAR', display: 'MAR', workflowFamily: 'MAR' },
  { alias: 'MATERIAL APPROVAL', display: 'MAR', workflowFamily: 'MAR' },
  { alias: 'MATERIAL SUBMITTAL', display: 'MAR', workflowFamily: 'MAR' },

  // QS Family
  { alias: 'QS', display: 'QS', workflowFamily: 'QS' },
  { alias: 'QUANTITY SURVEY', display: 'QS', workflowFamily: 'QS' },
  { alias: 'QUANTITY SURVEYING', display: 'QS', workflowFamily: 'QS' },
  { alias: 'QS SUBMITTAL', display: 'QS', workflowFamily: 'QS' },
  { alias: 'QS SUBMITTALS', display: 'QS', workflowFamily: 'QS' },

  // RFI Family (4.6)
  { alias: 'RFI', display: 'RFI', workflowFamily: 'RFI' },
  { alias: 'REQUEST FOR INFORMATION', display: 'RFI', workflowFamily: 'RFI' },

  // NCR Family (4.7)
  { alias: 'NCR', display: 'NCR', workflowFamily: 'NCR' },
  { alias: 'NON CONFORMANCE REPORT', display: 'NCR', workflowFamily: 'NCR' },

  // Letters Family (4.8)
  { alias: 'LETTER', display: 'LETTER', workflowFamily: 'LETTER' },
  { alias: 'CORRESPONDENCE', display: 'LETTER', workflowFamily: 'LETTER' },
  { alias: 'LETTERS', display: 'LETTER', workflowFamily: 'LETTER' },
  { alias: 'LTR', display: 'LETTER', workflowFamily: 'LETTER' },

  // SOR Family
  { alias: 'SOR', display: 'SOR', workflowFamily: 'SOR' },
  { alias: 'SITE OBSERVATION', display: 'SOR', workflowFamily: 'SOR' },
  { alias: 'SITE OBSERVATION REPORT', display: 'SOR', workflowFamily: 'SOR' },

  // DOC Family
  { alias: 'DOC', display: 'DOC', workflowFamily: 'DOC' },
  { alias: 'DOCUMENT', display: 'DOC', workflowFamily: 'DOC' },
  { alias: 'DOCUMENT WORKFLOW', display: 'DOC', workflowFamily: 'DOC' },
];

const LOCAL_STORAGE_KEY = 'docusight_custom_aliases';

// Load all mappings (combining defaults and user-defined mappings from localStorage)
export function getActiveMappings(): AliasMapping[] {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // filter duplicate custom aliases overriding defaults
          const customAliases = parsed.map((item: any) => ({
            alias: String(item.alias).trim().toUpperCase(),
            display: String(item.display || item.alias).trim().toUpperCase(),
            workflowFamily: item.workflowFamily as WorkflowFamily,
            isCustom: true,
          }));
          
          const merged: AliasMapping[] = [...customAliases];
          DEFAULT_ALIASES.forEach(def => {
            const upperAlias = def.alias.toUpperCase();
            if (!merged.some(m => m.alias === upperAlias)) {
              merged.push(def);
            }
          });
          return merged;
        }
      }
    }
  } catch (e) {
    // Ignore storage errors in node/headless environment
  }
  return [...DEFAULT_ALIASES];
}

// Save custom mapping to localStorage
export function saveCustomAlias(alias: string, workflowFamily: WorkflowFamily, display?: string): boolean {
  try {
    const active = getActiveMappings();
    const cleanAlias = alias.trim().toUpperCase();
    if (!cleanAlias) return false;

    // Filter out if duplicate
    const filteredCustom = active.filter(m => m.isCustom && m.alias !== cleanAlias);
    
    // Add new one
    filteredCustom.push({
      alias: cleanAlias,
      display: (display || cleanAlias).trim().toUpperCase(),
      workflowFamily,
      isCustom: true,
    });

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredCustom));

    // Save to Smart Import Profile & Learning Rules per project to complete the feedback loop
    const projectId = localStorage.getItem('docuCtrl_activeProjectId') || 'default_project';
    try {
      const smartSaved = localStorage.getItem('docusight_smart_import_profiles');
      const smartProfiles = smartSaved ? JSON.parse(smartSaved) : {};
      if (!smartProfiles[projectId]) {
        smartProfiles[projectId] = {};
      }
      smartProfiles[projectId][cleanAlias] = workflowFamily;
      localStorage.setItem('docusight_smart_import_profiles', JSON.stringify(smartProfiles));
    } catch (e) {
      console.error('Error saving smart profile inside custom alias:', e);
    }

    try {
      const rulesSaved = localStorage.getItem('docusight_learning_engine_rules');
      const allRules = rulesSaved ? JSON.parse(rulesSaved) : {};
      if (!allRules[projectId]) {
        allRules[projectId] = [];
      }
      allRules[projectId] = allRules[projectId].filter(
        (r: any) => !(String(r.input).toUpperCase() === cleanAlias && r.type === 'registerType')
      );
      allRules[projectId].push({
        input: cleanAlias,
        target: workflowFamily,
        type: 'registerType'
      });
      localStorage.setItem('docusight_learning_engine_rules', JSON.stringify(allRules));
    } catch (e) {
      console.error('Error saving learning rule inside custom alias:', e);
    }

    return true;
  } catch (e) {
    console.error('Error saving custom alias:', e);
    return false;
  }
}

// Delete custom mapping from localStorage
export function deleteCustomAlias(alias: string): boolean {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const cleanAlias = alias.trim().toUpperCase();
        const filtered = parsed.filter((item: any) => String(item.alias).trim().toUpperCase() !== cleanAlias);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
        return true;
      }
    }
  } catch (e) {
    console.error('Error deleting custom alias:', e);
  }
  return false;
}

// Normalization (Alias Mapping) Engine - الفصل الرابع والخامس والسادس
export function mapDocumentToWorkflow(rawName: string): {
  workflowFamily: WorkflowFamily;
  display: string;
  isUnknown: boolean;
  engine: CalculationEngineType;
} {
  if (!rawName) {
    return {
      workflowFamily: 'UNKNOWN',
      display: 'UNKNOWN',
      isUnknown: true,
      engine: 'None',
    };
  }

  const cleanName = rawName.trim().toUpperCase();

  // Safeguard: Trade/discipline names alone do not specify a workflow family and must not be partial-matched (e.g. to LETTER)
  const disciplines = ['STR', 'ARCH', 'ELEC', 'MECH', 'MEC', 'ELE', 'CIVIL', 'CVL', 'LAND', 'LND', 'INFRA', 'INF', 'SURVEY', 'SUR'];
  if (disciplines.includes(cleanName)) {
    return {
      workflowFamily: 'UNKNOWN',
      display: rawName.trim().toUpperCase(),
      isUnknown: true,
      engine: 'None',
    };
  }

  const mappings = getActiveMappings();

  // Try exact match first
  let match = mappings.find(m => m.alias.toUpperCase() === cleanName);

  // If no exact match, check if cleanName contains the alias or vice versa
  if (!match) {
    match = mappings.find(m => {
      const mappingUpper = m.alias.toUpperCase();
      // Check word boundaries or inclusion
      return cleanName.includes(mappingUpper) || mappingUpper.includes(cleanName);
    });
  }

  if (match) {
    const family = match.workflowFamily;
    const display = match.display;
    return {
      workflowFamily: family,
      display: display,
      isUnknown: false,
      engine: WORKFLOW_FAMILIES_META[family]?.engine || 'Shop Drawing Engine',
    };
  }

  // Fallback to "Unknown Workflow" state - no auto-guessing (الفصل العاشر)
  return {
    workflowFamily: 'UNKNOWN',
    display: rawName.trim().toUpperCase(),
    isUnknown: true,
    engine: 'None',
  };
}
