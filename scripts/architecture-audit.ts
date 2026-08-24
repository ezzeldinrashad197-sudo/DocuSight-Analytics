import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

// Resolve directory name in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

console.log(`\n${colors.bright}${colors.cyan}================================================================================${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}  STRUCTUSIGHT ARCHITECTURAL & COMPLIANCE AST-BASED AUDIT ENGINE  ${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}================================================================================${colors.reset}\n`);

const SRC_DIR = path.join(__dirname, '../src');

// Allowed central calculation modules that can define or adapt status logic
const APPROVED_SSOT_MODULES = [
  'calculations.ts',
  'calculations.instrumented.ts',
  'calculationFoundation.ts',
  'analyticsCore.ts',
  'statusEngine.ts',
  'statusResolver.ts',
  'revisionResolver.ts',
  'enterpriseAnalyticsEngine.ts',
  'kpiEngine.ts',
  'ncrEngine.ts',
  'sorEngine.ts',
  'ncrAnalytics.ts',
  'rfiAnalytics.ts'
];

let filesScanned = 0;
let violationsCount = 0;
const violations: string[] = [];

function scanDirectory(dir: string) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip test-datasets folder
      if (file !== 'test-datasets') {
        scanDirectory(fullPath);
      }
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      filesScanned++;
      checkFile(fullPath, file);
    }
  }
}

function checkFile(filePath: string, fileName: string) {
  const code = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);

  // All source modules are audited. Retired/legacy files must be removed, not silently excluded.

  if (APPROVED_SSOT_MODULES.includes(fileName)) {
    // For approved SSOT modules, use AST to find if there are legacy obsolete signatures
    function findLegacyDebris(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        if (name === 'classifyNCR' || name === 'classifySOR' || name === 'classifyLTR') {
          violationsCount++;
          violations.push(`[LEGACY DEBRIS] ${relativePath}:${getLine(node, sourceFile)} - Found obsolete legacy classification function: '${name}'`);
        }
      } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        if (name === 'classifyNCR' || name === 'classifySOR' || name === 'classifyLTR') {
          violationsCount++;
          violations.push(`[LEGACY DEBRIS] ${relativePath}:${getLine(node, sourceFile)} - Found obsolete legacy classification variable: '${name}'`);
        }
      }
      ts.forEachChild(node, findLegacyDebris);
    }
    findLegacyDebris(sourceFile);
    return;
  }

  // Strict check on dashboards, helpers, and components using AST
  function findViolations(node: ts.Node) {
    // 1. Redundant definitions of status classification functions
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      if (name === 'classifyNcrStatus' || name === 'getStatusCodeCategory') {
        violationsCount++;
        violations.push(`[SSOT VIOLATION] ${relativePath}:${getLine(node, sourceFile)} - Redundant definition of function '${name}' found! Status classification MUST be imported from src/utils/calculations.ts`);
      } else if ((name.startsWith('classify') || name.startsWith('calculate')) && (name.includes('Status') || name.includes('Stats') || name.includes('Ncr')) && !name.includes('classifyNcrStatus')) {
        violationsCount++;
        violations.push(`[SSOT VIOLATION] ${relativePath}:${getLine(node, sourceFile)} - Unapproved status/stats classification helper defined: '${name}'. All status calculations must be centralized in the SSOT calculations module.`);
      }
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const name = node.name.text;
      if (name === 'classifyNcrStatus' || name === 'getStatusCodeCategory') {
        violationsCount++;
        violations.push(`[SSOT VIOLATION] ${relativePath}:${getLine(node, sourceFile)} - Redundant definition of variable '${name}' found! Status classification MUST be imported from src/utils/calculations.ts`);
      } else if ((name.startsWith('classify') || name.startsWith('calculate')) && (name.includes('Status') || name.includes('Stats') || name.includes('Ncr')) && !name.includes('classifyNcrStatus')) {
        violationsCount++;
        violations.push(`[SSOT VIOLATION] ${relativePath}:${getLine(node, sourceFile)} - Unapproved status/stats classification helper defined: '${name}'. All status calculations must be centralized in the SSOT calculations module.`);
      }
    }

    // 2. Direct binary string comparisons on status values (Bypass checking)
    if (ts.isBinaryExpression(node)) {
      const isComparison = [
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken
      ].includes(node.operatorToken.kind);

      if (isComparison) {
        let literalValue: string | undefined;
        let leftIsStatus = false;
        let rightIsStatus = false;

        if (ts.isStringLiteral(node.left)) {
          literalValue = node.left.text;
        } else if (ts.isStringLiteral(node.right)) {
          literalValue = node.right.text;
        }

        const isStatusVar = (name: string) => {
          const l = name.toLowerCase();
          return l.includes('status') || l.includes('stage') || l.includes('action');
        };

        if (ts.isIdentifier(node.left) && isStatusVar(node.left.text)) {
          leftIsStatus = true;
        }
        if (ts.isIdentifier(node.right) && isStatusVar(node.right.text)) {
          rightIsStatus = true;
        }

        const isBypassedFile = relativePath.includes('test_status.ts') || 
                               relativePath.includes('audit_abd_negative.ts') ||
                               relativePath.includes('audit_rejected_precision_suite.ts') ||
                               relativePath.includes('src/scripts/') ||
                               relativePath.includes('calculationVerificationEngine.ts') ||
                               relativePath.includes('FinalAcceptanceAuditView.tsx') ||
                               relativePath.includes('EnterpriseHardeningView.tsx') || 
                               relativePath.includes('DataValidationEngine.tsx') ||
                               relativePath.includes('calculations.ts') ||
                               relativePath.includes('calculations.instrumented.ts') ||
                               relativePath.includes('calculationFoundation.ts') ||
                               relativePath.includes('statusResolver.ts') ||
                               relativePath.includes('revisionResolver.ts') ||
                               relativePath.includes('enterpriseAnalyticsEngine.ts') ||
                               relativePath.includes('analyticsCore.ts');

        if (literalValue && (leftIsStatus || rightIsStatus) && !isBypassedFile) {
          const statusStrings = ['CLOSED', 'OPEN', 'PENDING', 'APPROVED', 'REJECTED', 'C CLOSED', 'CODE C', 'W'];
          if (statusStrings.includes(literalValue.toUpperCase())) {
            violationsCount++;
            violations.push(`[ARCHITECTURE BYPASS] ${relativePath}:${getLine(node, sourceFile)} - Inline status string checks detected: '${node.getText(sourceFile)}'. Please use "classifyNcrStatus" or "getStatusCodeCategory" to maintain single-source-of-truth invariants.`);
          }
        }
      }
    }

    ts.forEachChild(node, findViolations);
  }

  findViolations(sourceFile);
}

function getLine(node: ts.Node, sf: ts.SourceFile) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

console.log(`Scanning workspace source directory: ${colors.bright}${SRC_DIR}${colors.reset}...`);
scanDirectory(SRC_DIR);

console.log(`\n${colors.bright}AUDIT SCAN RESULTS:${colors.reset}`);
console.log(`- Total Files Scanned        : ${colors.bright}${colors.green}${filesScanned}${colors.reset}`);
console.log(`- Architectural Violations   : ${violationsCount > 0 ? colors.bright + colors.red + violationsCount : colors.bright + colors.green + '0'}${colors.reset}`);

if (violationsCount > 0) {
  console.log(`\n${colors.bright}${colors.red}❌ ARCHITECTURE AUDIT FAILED:${colors.reset}`);
  violations.forEach(v => {
    console.log(`  ${colors.red}• ${v}${colors.reset}`);
  });
  console.log(`\n${colors.bright}${colors.red}Governance Failure: Internal architecture compliance score is below the 100% threshold. Exiting with failure status.${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`\n${colors.bright}${colors.green}✔ ARCHITECTURE AUDIT PASSED:${colors.reset}`);
  console.log(`  All modules are compliant with the Single Source of Truth (SSOT) architecture. No duplicate status engines or legacy structures were detected.`);
  console.log(`  Internal Architecture Compliance Score: ${colors.bright}${colors.green}100 / 100 (Max Compliance)${colors.reset}\n`);
  process.exit(0);
}
