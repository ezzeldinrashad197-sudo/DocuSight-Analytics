import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runtimeRoots = ['src', 'app/applet'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const legacyBrand = new RegExp('docu' + 'sight', 'ig');
const legacyEngine = /enterpriseUpgradeEngine/g;
const hardcodedBusinessDates = /2026-06-21|2026-05-01|2026-04-01|new Date\(['\"]20\d{2}-\d{2}-\d{2}/g;
const revisionParser = /parseInt\([^\n]*rev[^\n]*\)|Number\([^\n]*rev[^\n]*replace\(|localeCompare\([^\n]*rev/gi;
const broadFirestoreRead = /match \/(?:project_stats|projects|analytics|settings|reports)\/[^\n]*\{[\s\S]*?allow read: if isSignedIn\(\);/g;

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'build'].includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else if (sourceExtensions.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

const files = runtimeRoots.flatMap(d => walk(path.join(root, d)));
const findings = [];
for (const file of files) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, 'utf8');
  if (legacyBrand.test(text)) findings.push({ rule: 'LEGACY_BRAND', file: rel });
  legacyBrand.lastIndex = 0;
  if (legacyEngine.test(text)) findings.push({ rule: 'LEGACY_ENGINE_REFERENCE', file: rel });
  legacyEngine.lastIndex = 0;
  const dateFixtureOnly = rel.includes('test-datasets') || rel.includes('audit_') || rel.includes('calculationVerificationEngine.ts') || rel.includes('governance/validationFramework.ts') || rel.includes('governance/goldenRegressionSuite.ts') || rel.includes('exportTelemetryTestSuite.ts') || rel.includes('EnterpriseHardeningView.tsx');
  if (hardcodedBusinessDates.test(text) && !dateFixtureOnly) findings.push({ rule: 'HARDCODED_REPORT_DATE', file: rel });
  hardcodedBusinessDates.lastIndex = 0;
  if (revisionParser.test(text)) findings.push({ rule: 'LOCAL_REVISION_PARSER', file: rel });
  revisionParser.lastIndex = 0;
}

const firestoreRulesPath = path.join(root, 'firestore.rules');
const firestoreRules = fs.existsSync(firestoreRulesPath) ? fs.readFileSync(firestoreRulesPath, 'utf8') : '';
const broadReadFindings = [];
for (const collectionName of ['project_stats', 'projects', 'analytics', 'settings', 'reports']) {
  const startToken = `match /${collectionName}/{`;
  const startIndex = firestoreRules.indexOf(startToken);
  if (startIndex < 0) continue;
  const nextMatch = firestoreRules.indexOf('\n    match /', startIndex + startToken.length);
  const block = firestoreRules.slice(startIndex, nextMatch >= 0 ? nextMatch : firestoreRules.length);
  if (/allow read: if isSignedIn\(\);/.test(block)) broadReadFindings.push(collectionName);
}


const statusDefinitions = files.filter(f => {
  const t = fs.readFileSync(f, 'utf8');
  return /export\s+(?:const|function)\s+(?:getStatusCategory|normalizeStatus|getStatusCodeCategory)\s*=/.test(t) && !/export\s+const\s+getStatusCategory\s*=\s*getCanonicalStatusCategory/.test(t);
});

console.log('STRUCTUSIGHT ENGINEERING REMEDIATION AUDIT');
console.log('===========================================');
console.log(`Runtime source files scanned: ${files.length}`);
console.log(`Legacy brand occurrences: ${findings.filter(x => x.rule === 'LEGACY_BRAND').length}`);
console.log(`Legacy engine references: ${findings.filter(x => x.rule === 'LEGACY_ENGINE_REFERENCE').length}`);
console.log(`Hardcoded business report dates: ${findings.filter(x => x.rule === 'HARDCODED_REPORT_DATE').length}`);
console.log(`Local revision parsers: ${findings.filter(x => x.rule === 'LOCAL_REVISION_PARSER').length}`);
console.log(`Status resolver definition files: ${statusDefinitions.length}`);
console.log(`Broad authenticated Firestore reads: ${broadReadFindings.length}`);
if (broadReadFindings.length) console.log(`[SECURITY_GATE] ${broadReadFindings.join(', ')}`);

for (const f of findings) console.log(`[${f.rule}] ${f.file}`);
for (const f of statusDefinitions) console.log(`[STATUS_RESOLVER] ${path.relative(root, f)}`);

const pass = findings.length === 0 && statusDefinitions.length <= 1 && broadReadFindings.length === 0;
console.log(`FINAL REMEDIATION GATE: ${pass ? 'PASS' : 'FAIL'}`);
process.exitCode = pass ? 0 : 1;
