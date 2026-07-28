// DocuSight Analytics - Universal Register Discovery & Classification Engine
// Implements the official multi-evidence scoring system for Sprint 4.

import { WorkflowFamily, WORKFLOW_FAMILIES_META, AliasMapping } from './workflowMapping';

export interface ClassificationResult {
  detectedFamily: WorkflowFamily;
  confidence: number;
  evidence: string[];
}

export interface LearnRule {
  input: string;
  target: string;
  type: 'registerType' | 'discipline';
}

const SMART_PROFILES_KEY = 'docusight_smart_import_profiles';
const LEARNING_RULES_KEY = 'docusight_learning_engine_rules';

// 1. Get/Set Smart Import Profiles per project
export function getSmartImportProfiles(): Record<string, Record<string, WorkflowFamily>> {
  try {
    const saved = localStorage.getItem(SMART_PROFILES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('Error loading smart import profiles:', e);
    return {};
  }
}

export function saveSmartImportProfile(projectId: string, sheetName: string, family: WorkflowFamily) {
  try {
    const profiles = getSmartImportProfiles();
    if (!profiles[projectId]) {
      profiles[projectId] = {};
    }
    profiles[projectId][sheetName.toUpperCase().trim()] = family;
    localStorage.setItem(SMART_PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Error saving smart import profile:', e);
  }
}

export function deleteSmartImportProfile(projectId: string, sheetName: string) {
  try {
    const profiles = getSmartImportProfiles();
    if (profiles[projectId]) {
      delete profiles[projectId][sheetName.toUpperCase().trim()];
      localStorage.setItem(SMART_PROFILES_KEY, JSON.stringify(profiles));
    }
  } catch (e) {
    console.error('Error deleting smart import profile:', e);
  }
}

// 2. Get/Set Learning Engine Rules per project
export function getLearningRules(projectId: string): LearnRule[] {
  try {
    const saved = localStorage.getItem(LEARNING_RULES_KEY);
    const allRules: Record<string, LearnRule[]> = saved ? JSON.parse(saved) : {};
    return allRules[projectId] || [];
  } catch (e) {
    console.error('Error loading learning rules:', e);
    return [];
  }
}

export function saveLearningRule(projectId: string, input: string, target: string, type: 'registerType' | 'discipline') {
  try {
    const saved = localStorage.getItem(LEARNING_RULES_KEY);
    const allRules: Record<string, LearnRule[]> = saved ? JSON.parse(saved) : {};
    if (!allRules[projectId]) {
      allRules[projectId] = [];
    }
    
    // Remove if there's an existing rule for the same input and type
    allRules[projectId] = allRules[projectId].filter(
      r => !(r.input.toUpperCase() === input.toUpperCase() && r.type === type)
    );

    allRules[projectId].push({
      input: input.trim(),
      target: target.trim(),
      type
    });

    localStorage.setItem(LEARNING_RULES_KEY, JSON.stringify(allRules));
  } catch (e) {
    console.error('Error saving learning rule:', e);
  }
}

export function deleteLearningRule(projectId: string, input: string, type: 'registerType' | 'discipline') {
  try {
    const saved = localStorage.getItem(LEARNING_RULES_KEY);
    const allRules: Record<string, LearnRule[]> = saved ? JSON.parse(saved) : {};
    if (allRules[projectId]) {
      allRules[projectId] = allRules[projectId].filter(
        r => !(r.input.toUpperCase() === input.toUpperCase() && r.type === type)
      );
      localStorage.setItem(LEARNING_RULES_KEY, JSON.stringify(allRules));
    }
  } catch (e) {
    console.error('Error deleting learning rule:', e);
  }
}

/**
 * Universal Register Classification Engine
 * Computes scores for all possible register types based on multiple weights.
 */
export function classifyRegisterSheet(params: {
  fileName: string;
  sheetName: string;
  headers: string[];
  sampleRows: any[][];
  projectId?: string;
}): ClassificationResult {
  const { fileName, sheetName, headers, sampleRows, projectId = 'default_project' } = params;

  const evidence: string[] = [];
  const cleanFileName = fileName.toUpperCase().trim();
  const cleanSheetName = sheetName.toUpperCase().trim();
  const cleanHeaders = headers.map(h => String(h || '').toUpperCase().trim());

  // Helper to check for word boundary matching
  const hasWordMatch = (text: string, keyword: string): boolean => {
    const index = text.indexOf(keyword);
    if (index === -1) return false;
    
    let pos = 0;
    while ((pos = text.indexOf(keyword, pos)) !== -1) {
      const charBefore = pos > 0 ? text[pos - 1] : '';
      const charAfter = pos + keyword.length < text.length ? text[pos + keyword.length] : '';
      
      const isBeforeLetter = /[A-Z]/.test(charBefore);
      const isAfterLetter = /[A-Z]/.test(charAfter);
      
      if (!isBeforeLetter && !isAfterLetter) {
        return true;
      }
      pos += keyword.length;
    }
    return false;
  };

  const isKeywordMatched = (text: string, keyword: string): boolean => {
    if (keyword.includes(' ') || keyword.includes('-') || keyword.includes('_') || keyword.length >= 5) {
      return text.includes(keyword);
    }
    return hasWordMatch(text, keyword);
  };

  // --- STEP 1 & 2: Detect & Lock Register Family from File Name ---
  let lockedFamily: WorkflowFamily | null = null;
  let lockReason = "";

  const familyKeywordsPriority: { family: WorkflowFamily; keywords: string[] }[] = [
    { family: 'SDW', keywords: ['SHOP DRAWING', 'SHOP DRAWINGS', 'SHOPDRAWING', 'SHOPDRAWINGS', 'SHOP-DRAWING', 'SHOP-DRAWINGS', 'SDW', 'SDWS', 'SHD', 'SHDS'] },
    { family: 'ABD', keywords: ['AS-BUILT', 'AS BUILT', 'ASBUILT', 'ABD', 'ABDS', 'AS-BUILT DRAWING', 'AS BUILT DRAWING', 'لوحات ما تم تنفيذه'] },
    { family: 'MIR', keywords: ['MATERIAL INSPECTION', 'MATERIAL INSPECTIONS', 'MAT INSPECTION', 'MAT INSPECTIONS', 'MIR', 'MIRS', 'SITE RECEP', 'فحص مواد', 'طلب فحص'] },
    { family: 'WIR', keywords: ['WORK INSPECTION', 'WORK INSPECTIONS', 'SITE INSPECTION', 'SITE INSPECTIONS', 'CONCRETE POUR', 'WIR', 'WIRS', 'فحص أعمال', 'طلب استلام'] },
    { family: 'QS', keywords: ['QUANTITY SURVEY', 'QUANTITY SURVEYS', 'QUANTITY SURVEYING', 'QUANTITY SURVEY SUBMITTAL', 'QUANTITY SURVEY SUBMITTALS', 'QS', 'QSS', 'QSR', 'حصر كميات', 'كميات'] },
    { family: 'DOC', keywords: ['DOCUMENT SUBMITTAL', 'DOCUMENT SUBMITTALS', 'DOCUMENT', 'DOCUMENTS', 'DOC', 'DOCS', 'SPECIFICATION', 'SPECIFICATIONS', 'MANUAL', 'MANUALS', 'مستند', 'وثيقة', 'مستندات', 'وثائق'] },
    { family: 'MAR', keywords: ['MATERIAL APPROVAL', 'MATERIAL APPROVALS', 'MATERIAL SUBMITTAL', 'MATERIAL SUBMITTALS', 'SUBMITTAL', 'SUBMITTALS', 'VENDOR APPROVAL', 'MAR', 'MARS', 'اعتماد مواد', 'اعتمادات'] },
    { family: 'RFI', keywords: ['RFI', 'RFIS', 'INFORMATION REQUEST', 'INFORMATION REQUESTS', 'TECHNICAL QUERY', 'TECHNICAL QUERIES', 'QUERY', 'QUERIES', 'استفسار', 'طلب معلومات'] },
    { family: 'NCR', keywords: ['NCR', 'NCRS', 'NON CONFORMANCE', 'NON CONFORMANCES', 'NON-CONFORMANCE', 'NON-CON-FORMANCES', 'DEVIATION', 'DEVIATIONS', 'عدم مطابقة', 'تقرير مخالفة'] },
    { family: 'SOR', keywords: ['SOR', 'SORS', 'SITE OBSERVATION', 'SITE OBSERVATIONS', 'SAFETY OBSERVATION', 'SAFETY OBSERVATIONS', 'ملاحظة موقعية', 'ملاحظات'] },
    { family: 'LETTER', keywords: ['LETTER', 'LETTERS', 'CORRESPONDENCE', 'LTR', 'LTRS', 'TRANS', 'TRANSMITTAL', 'TRANSMITTALS', 'TRS', 'TRSS', 'خطاب', 'خطابات', 'صادر', 'وارد'] }
  ];

  for (const item of familyKeywordsPriority) {
    const matchedKeyword = item.keywords.find(k => isKeywordMatched(cleanFileName, k.toUpperCase()));
    if (matchedKeyword) {
      lockedFamily = item.family;
      lockReason = `File name "${fileName}" contains keyword "${matchedKeyword}" matching family "${item.family}"`;
      break;
    }
  }

  if (lockedFamily) {
    evidence.push(`[ARCHITECTURAL LOCK] Locked register family to "${lockedFamily}" based on file name matching: ${lockReason}`);
    evidence.push(`Worksheet "${sheetName}" inherits family "${lockedFamily}" automatically. Ignoring worksheet-level register family evidence.`);
    return {
      detectedFamily: lockedFamily,
      confidence: 1.0,
      evidence
    };
  }

  const scores: Record<WorkflowFamily, number> = {
    SDW: 0,
    ABD: 0,
    MIR: 0,
    WIR: 0,
    MAR: 0,
    QS: 0,
    RFI: 0,
    NCR: 0,
    SOR: 0,
    LETTER: 0,
    DOC: 0,
    UNKNOWN: 0
  };

  // --- EVIDENCE STEP 1: Smart Import Profile ---
  const smartProfiles = getSmartImportProfiles();
  const projectProfile = smartProfiles[projectId] || {};
  if (projectProfile[cleanSheetName]) {
    const matchedFamily = projectProfile[cleanSheetName];
    evidence.push(`Smart Import Profile match for worksheet "${sheetName}" -> ${matchedFamily}`);
    return {
      detectedFamily: matchedFamily,
      confidence: 1.0,
      evidence
    };
  }

  // --- EVIDENCE STEP 2: Learning Engine ---
  const rules = getLearningRules(projectId);
  const learnedRegRule = rules.find(r => r.type === 'registerType' && r.input.toUpperCase() === cleanSheetName);
  if (learnedRegRule) {
    const matchedFamily = learnedRegRule.target as WorkflowFamily;
    evidence.push(`Enterprise Learning Engine match for worksheet "${sheetName}" -> ${matchedFamily}`);
    return {
      detectedFamily: matchedFamily,
      confidence: 1.0,
      evidence
    };
  }

  // Also check if file name contains any learned input
  const learnedFileRule = rules.find(r => r.type === 'registerType' && cleanFileName.includes(r.input.toUpperCase()));
  if (learnedFileRule) {
    const matchedFamily = learnedFileRule.target as WorkflowFamily;
    evidence.push(`Enterprise Learning Engine file name match ("${learnedFileRule.input}") -> ${matchedFamily}`);
    scores[matchedFamily] += 40;
  }

  // --- EVIDENCE STEP 3 & 4: File Name & Workbook Name ---
  const checkStringInNames = (str: string, scoreToAdd: number, label: string) => {
    const targets: { family: WorkflowFamily; keywords: string[] }[] = [
      { family: 'SDW', keywords: ['SDW', 'SHD', 'SHOP DRAWING', 'SHOPDRAWING'] },
      { family: 'ABD', keywords: ['ABD', 'AS-BUILT', 'AS BUILT', 'ASBUILT'] },
      { family: 'MIR', keywords: ['MIR', 'MATERIAL INSPECTION', 'MAT INSPECTION', 'SITE RECEP', 'فحص مواد', 'طلب فحص'] },
      { family: 'WIR', keywords: ['WIR', 'WORK INSPECTION', 'SITE INSPECTION', 'CONCRETE POUR', 'فحص أعمال', 'طلب استلام'] },
      { family: 'QS', keywords: ['QS', 'QUANTITY SURVEY', 'QUANTITY SURVEYING', 'QS SUBMITTAL', 'حصر كميات', 'كميات'] },
      { family: 'MAR', keywords: ['MAR', 'MATERIAL APPROVAL', 'MATERIAL SUBMITTAL', 'VENDOR APPROVAL', 'اعتماد مواد', 'اعتمادات'] },
      { family: 'RFI', keywords: ['RFI', 'INFORMATION REQUEST', 'TECHNICAL QUERY', 'QUERY', 'استفسار', 'طلب معلومات'] },
      { family: 'NCR', keywords: ['NCR', 'NON CONFORMANCE', 'NON-CONFORMANCE', 'DEVIATION', 'عدم مطابقة', 'تقرير مخالفة'] },
      { family: 'SOR', keywords: ['SOR', 'SITE OBSERVATION', 'SAFETY OBSERVATION', 'ملاحظة موقعية', 'ملاحظات'] },
      { family: 'LETTER', keywords: ['LETTER', 'LETTERS', 'CORRESPONDENCE', 'LTR', 'TRANS', 'TRANSMITTAL', 'خطاب', 'خطابات', 'صادر', 'وارد'] },
      { family: 'DOC', keywords: ['DOC', 'DOCUMENT', 'SPECIFICATION', 'MANUAL', 'مستند', 'وثيقة'] }
    ];

    targets.forEach(t => {
      const matchedKeyword = t.keywords.find(k => str.includes(k));
      if (matchedKeyword) {
        scores[t.family] += scoreToAdd;
        evidence.push(`${label} contains "${matchedKeyword}" (+${scoreToAdd} score for ${t.family})`);
      }
    });
  };

  checkStringInNames(cleanFileName, 35, 'File Name');
  checkStringInNames(cleanSheetName, 30, 'Worksheet Name');

  // --- ADDITIONAL EVIDENCE: Explicit shop drawing keyword matching in worksheet headers & name ---
  const isTradeSheet = ['STR', 'ARCH', 'ELEC', 'MECH', 'MEC', 'ELE', 'CIVIL', 'CVL', 'LAND', 'LND', 'INFRA', 'INF'].includes(cleanSheetName) ||
                        /^(STR|ARC|ELE|MEC|CIV|INF|LND)/.test(cleanSheetName);
  
  const isAsBuiltFile = cleanFileName.includes('AS-BUILT') || cleanFileName.includes('AS BUILT') || cleanFileName.includes('ABD');
  const isShopDrawingFile = !isAsBuiltFile && (cleanFileName.includes('SHOP') || cleanFileName.includes('SDW') || cleanFileName.includes('SHD') || cleanFileName.includes('DRAWING'));
  if (isTradeSheet && isAsBuiltFile) {
    scores['ABD'] += 40;
    evidence.push(`Worksheet name "${sheetName}" is a trade sheet and file name "${fileName}" is an as-built drawing file (+40 score for ABD)`);
  } else if (isTradeSheet && isShopDrawingFile) {
    scores['SDW'] += 40;
    evidence.push(`Worksheet name "${sheetName}" is a trade sheet and file name "${fileName}" is a shop drawing file (+40 score for SDW)`);
  }

  // --- EVIDENCE STEP 6: Column Headers Analysis ---
  const headerWeights: { family: WorkflowFamily; cols: string[]; weight: number }[] = [
    { family: 'NCR', cols: ['NCR REF', 'NCR LAST REV', 'SENT CORRECTIVE', 'ACTION REQUIRED', 'CORRECTIVE ACTION', 'ROOT CAUSE', 'NON CONFORMANCE'], weight: 20 },
    { family: 'SOR', cols: ['SOR REF', 'OBSERVATION', 'SAFETY HAZARD', 'HAZARD', 'CORRECTIVE ACTION'], weight: 20 },
    { family: 'MIR', cols: ['MIR REF', 'INSPECTION REQUEST', 'MATERIAL DESCRIPTION', 'RECEPTION DATE'], weight: 20 },
    { family: 'WIR', cols: ['WIR REF', 'WORK DESCRIPTION', 'INSPECTION LOCATION', 'POUR DATE'], weight: 20 },
    { family: 'QS', cols: ['QS REF', 'QUANTITY SURVEY', 'BOQ', 'BILL OF QUANTITIES', 'PAYMENT APPLICATION', 'MEASUREMENT'], weight: 20 },
    { family: 'RFI', cols: ['RFI REF', 'QUESTION', 'QUERY', 'REPLY', 'ANSWER', 'INFORMATION REQUEST'], weight: 20 },
    { family: 'MAR', cols: ['MAR REF', 'SUBMITTAL REF', 'MATERIAL SUBMITTAL', 'VENDOR', 'MANUFACTURER', 'MATERIAL DESCRIPTION'], weight: 15 },
    { family: 'SDW', cols: ['DRAWING NO', 'DRAWING TITLE', 'SHEET NO', 'SCALE', 'SHEET', 'SUB REF', 'TRADE', 'DISCIPLINE'], weight: 15 },
    { family: 'ABD', cols: ['AS BUILT NO', 'AS-BUILT', 'RECORD DRAWING', 'DRAWING NO', 'DRAWING TITLE', 'SHEET NO', 'SCALE', 'SHEET', 'SUB REF', 'TRADE', 'DISCIPLINE'], weight: 15 },
    { family: 'LETTER', cols: ['SUBJECT', 'SENDER', 'RECIPIENT', 'DISTRIBUTIONS', 'HYPERLINK', 'LETTER REF'], weight: 20 },
  ];

  headerWeights.forEach(hw => {
    const matches = cleanHeaders.filter(h => hw.cols.some(c => h.includes(c)));
    if (matches.length > 0) {
      const added = matches.length * hw.weight;
      scores[hw.family] += added;
      evidence.push(`Column Headers contain ${JSON.stringify(matches)} (+${added} score for ${hw.family})`);
    }
  });

  // --- EVIDENCE STEP 7: Document Number Pattern Sampling ---
  // Sample document number pattern from first column or docNo candidate
  const sampleValues: string[] = [];
  sampleRows.forEach(row => {
    if (Array.isArray(row) && row.length > 0) {
      // Look at the first 8 columns to find reference-like strings
      for (let i = 0; i < Math.min(8, row.length); i++) {
        const val = String(row[i] || '').toUpperCase().trim();
        // A valid reference typically has a hyphen or slash or numbers, and is longer than 4 chars
        if (val && val.length > 4 && (val.includes('-') || val.includes('/') || /\d+/.test(val))) {
          // Exclude simple dates or standard words
          if (!/^\d{4}-\d{2}-\d{2}$/.test(val) && !val.includes(' ') && val.length < 50) {
            sampleValues.push(val);
          }
        }
      }
    }
  });

  if (sampleValues.length > 0) {
    const patterns: { family: WorkflowFamily; regex: RegExp; label: string }[] = [
      { family: 'SDW', regex: /(SDW|SHD|SHOP|DWG|DRG)/i, label: 'Shop Drawing Pattern' },
      { family: 'ABD', regex: /(ABD|AS-?BUILT)/i, label: 'As-Built Drawing Pattern' },
      { family: 'MIR', regex: /MIR/i, label: 'Material Inspection Pattern' },
      { family: 'WIR', regex: /WIR/i, label: 'Work Inspection Pattern' },
      { family: 'QS', regex: /\b(QS|QSS)\b/i, label: 'QS Pattern' },
      { family: 'MAR', regex: /MAR/i, label: 'Material Approval Pattern' },
      { family: 'RFI', regex: /RFI/i, label: 'RFI Pattern' },
      { family: 'NCR', regex: /NCR/i, label: 'Non-Conformance Pattern' },
      { family: 'SOR', regex: /SOR/i, label: 'Site Observation Pattern' },
      { family: 'LETTER', regex: /(LTR|LET|CORR|TRANS|L-\d+|DN-\d+)/i, label: 'Letter / Correspondence Pattern' },
    ];

    const patternHits: Record<WorkflowFamily, number> = {
      SDW: 0, ABD: 0, MIR: 0, WIR: 0, MAR: 0, QS: 0, RFI: 0, NCR: 0, SOR: 0, LETTER: 0, DOC: 0, UNKNOWN: 0
    };

    sampleValues.forEach(val => {
      patterns.forEach(p => {
        if (p.regex.test(val)) {
          patternHits[p.family]++;
        }
      });
    });

    Object.keys(patternHits).forEach(fam => {
      const family = fam as WorkflowFamily;
      if (patternHits[family] > 0) {
        const scoreToAdd = Math.min(35, patternHits[family] * 8);
        scores[family] += scoreToAdd;
        evidence.push(`Document Number samples matched ${patterns.find(p => p.family === family)?.label} ${patternHits[family]} times (+${scoreToAdd} score for ${family})`);
      }
    });
  }

  // --- EVIDENCE STEP 8: Status Dictionary Inspection ---
  const hasLetterDistributions = cleanHeaders.some(h => h.includes('DISTRIB') || h.includes('RECIPIENT') || h.includes('SENDER'));
  if (hasLetterDistributions) {
    scores['LETTER'] += 15;
    evidence.push('Status/Structure matching Letter indicators (+15 score for LETTER)');
  }

  const hasNcrActions = cleanHeaders.some(h => h.includes('CORRECTIVE') || h.includes('ROOT CAUSE'));
  if (hasNcrActions) {
    scores['NCR'] += 15;
    evidence.push('Status/Structure matching NCR indicators (+15 score for NCR)');
  }

  // --- EVIDENCE STEP 9: Semantic Content Analysis ---
  // Count frequency of words in headers and samples
  let drawingKeywordsCount = 0;
  let materialKeywordsCount = 0;
  let inspectionKeywordsCount = 0;
  let deviationKeywordsCount = 0;

  const textPayload = (cleanHeaders.join(' ') + ' ' + sampleValues.join(' ')).toUpperCase();
  
  if (textPayload.includes('DRAWING')) drawingKeywordsCount++;
  if (textPayload.includes('SHEET')) drawingKeywordsCount++;
  if (textPayload.includes('SCALE')) drawingKeywordsCount++;
  if (textPayload.includes('TITLE')) drawingKeywordsCount++;

  if (textPayload.includes('MATERIAL')) materialKeywordsCount++;
  if (textPayload.includes('VENDOR')) materialKeywordsCount++;
  if (textPayload.includes('MANUFACTURER')) materialKeywordsCount++;
  if (textPayload.includes('APPROVED MATERIAL')) materialKeywordsCount++;

  if (textPayload.includes('INSPECT')) inspectionKeywordsCount++;
  if (textPayload.includes('TEST')) inspectionKeywordsCount++;
  if (textPayload.includes('CHECK')) inspectionKeywordsCount++;
  if (textPayload.includes('SITE WORK')) inspectionKeywordsCount++;

  if (textPayload.includes('NON-CONFORMANCE') || textPayload.includes('NON CONFORMANCE')) deviationKeywordsCount++;
  if (textPayload.includes('VIOLATION')) deviationKeywordsCount++;
  if (textPayload.includes('DEVIATION')) deviationKeywordsCount++;
  if (textPayload.includes('AUDIT')) deviationKeywordsCount++;
  if (textPayload.includes('CONFORMANCE')) deviationKeywordsCount++;

  if (drawingKeywordsCount > 1) { scores['SDW'] += 10; scores['ABD'] += 10; evidence.push('Semantic analysis matched drawing/sheet vocabulary density (+10 score for SDW/ABD)'); }
  if (materialKeywordsCount > 1) { scores['MAR'] += 10; scores['MIR'] += 5; evidence.push('Semantic analysis matched material/vendor vocabulary density (+10 score for MAR)'); }
  if (inspectionKeywordsCount > 1) { scores['WIR'] += 10; scores['MIR'] += 10; evidence.push('Semantic analysis matched site check/inspection vocabulary density (+10 score for WIR/MIR)'); }
  if (deviationKeywordsCount > 1) { scores['NCR'] += 10; evidence.push('Semantic analysis matched conformance/deviation vocabulary density (+10 score for NCR)'); }

  // --- Prevent LETTER from overriding any other identified family if the file is not locked to LETTER ---
  const hasOtherIdentifiedFamily = Object.keys(scores).some(fam => 
    fam !== 'LETTER' && fam !== 'UNKNOWN' && scores[fam as WorkflowFamily] > 0
  );
  if (hasOtherIdentifiedFamily && scores['LETTER'] > 0) {
    scores['LETTER'] = 0;
    evidence.push(`Prevented LETTER from overriding other identified register families per architectural constraint.`);
  }

  // --- CALCULATION OF CONFIDENCE & SELECTION ---
  let bestFamily: WorkflowFamily = 'UNKNOWN';
  let maxScore = 0;
  let totalScoreSum = 0;

  Object.keys(scores).forEach(fam => {
    const family = fam as WorkflowFamily;
    if (scores[family] > maxScore) {
      maxScore = scores[family];
      bestFamily = family;
    }
    totalScoreSum += scores[family];
  });

  // Calculate confidence. Max possible single score in typical case is around 100.
  // We normalize maxScore to a confidence index between 0.0 and 1.0.
  const confidence = Math.min(1.0, maxScore / 80);

  evidence.push(`Classification confidence calculated: ${(confidence * 100).toFixed(1)}% (score: ${maxScore})`);

  // Minimum threshold is 70% (confidence >= 0.70)
  if (confidence >= 0.70 && bestFamily !== 'UNKNOWN') {
    evidence.push(`Automatic Classification APPROVED: ${bestFamily} exceeds 70% threshold`);
    return {
      detectedFamily: bestFamily,
      confidence,
      evidence
    };
  }

  // Under the 70% threshold, it is classified as UNKNOWN but we list the candidates in evidence
  evidence.push(`Automatic Classification SUSPENDED: Best candidate is ${bestFamily} (${(confidence * 100).toFixed(1)}%) but falls below 70% threshold.`);
  return {
    detectedFamily: 'UNKNOWN',
    confidence,
    evidence
  };
}

/**
 * Normalizes disciplines automatically with learning engine rules
 */
export function normalizeDiscipline(rawDiscipline: string, projectId: string = 'default_project'): string {
  const clean = rawDiscipline.trim().toUpperCase();
  if (!clean) return 'General';

  // Check learned discipline mappings
  const rules = getLearningRules(projectId);
  const matchedRule = rules.find(r => r.type === 'discipline' && r.input.toUpperCase() === clean);
  if (matchedRule) {
    return matchedRule.target; // Return the learned target discipline (e.g. "STRUCTURAL")
  }

  return rawDiscipline;
}
