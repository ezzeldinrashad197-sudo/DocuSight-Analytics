import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

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
console.log(`${colors.bright}${colors.cyan}  STRUCTUSIGHT REPOSITORY-WIDE ARCHITECTURAL AST AUDIT ENGINE  ${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}================================================================================${colors.reset}\n`);

// Canonical Single-Source-of-Truth core calculation and status engine files
const SSOT_CORE_FILES = new Set([
  'src/utils/calculations.ts',
  'src/utils/calculations.instrumented.ts',
  'src/analytics/calculationFoundation.ts',
  'src/analytics/statusResolver.ts',
  'src/analytics/revisionResolver.ts',
  'src/utils/statusMatrixEngine.ts'
]);

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.vscode',
  'src/test-datasets'
]);

let filesScanned = 0;
let violationsCount = 0;
const violations: { type: string; file: string; line: number; message: string; codeSnippet: string }[] = [];

function scanDirectory(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name) && !IGNORED_DIRS.has(relPath)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || (entry.name.endsWith('.js') && !entry.name.endsWith('.min.js')))) {
      filesScanned++;
      checkFile(fullPath, entry.name, relPath);
    }
  }
}

function checkFile(filePath: string, fileName: string, relativePath: string) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);

  const isSSOTCore = SSOT_CORE_FILES.has(relativePath);
  const isTestFile = relativePath.includes('test') || relativePath.includes('scripts/') || relativePath.includes('spec');

  function visit(node: ts.Node) {
    const line = getLine(node, sourceFile);

    // 1. Legacy debris check in all files
    if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name && ts.isIdentifier(node.name)) {
      const name = node.name.text;
      if (name === 'classifyNCR' || name === 'classifySOR' || name === 'classifyLTR') {
        violationsCount++;
        violations.push({
          type: 'LEGACY_DEBRIS',
          file: relativePath,
          line,
          message: `Obsolete legacy classification function/variable: '${name}'`,
          codeSnippet: node.getText(sourceFile).substring(0, 80)
        });
      }
    }

    // 2. SSOT duplicate definition check (outside SSOT core files)
    if (!isSSOTCore && !isTestFile) {
      if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        if (name === 'classifyNcrStatus' || name === 'getStatusCodeCategory') {
          violationsCount++;
          violations.push({
            type: 'SSOT_VIOLATION',
            file: relativePath,
            line,
            message: `Redundant definition of '${name}'. Status classification MUST be imported from src/utils/calculations.ts or src/analytics/statusResolver.ts`,
            codeSnippet: node.getText(sourceFile).substring(0, 80)
          });
        }
      }
    }

    // 3. Partial status matching with .includes() on status/action/code fields (anti-pattern check)
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const propName = node.expression.name.text;
      if (propName === 'includes') {
        const callerText = node.expression.expression.getText(sourceFile);
        const callerLower = callerText.toLowerCase();
        const isStatusCaller = callerLower.includes('status') || 
                               callerLower.includes('action') || 
                               callerLower.includes('stage') ||
                               callerLower.includes('code') ||
                               callerLower.includes('recordstatus');

        if (isStatusCaller && node.arguments.length > 0 && !isTestFile && !isSSOTCore) {
          const arg = node.arguments[0];
          if (ts.isStringLiteral(arg)) {
            const argText = arg.text.toUpperCase();
            const riskyStatusKeywords = ['OPEN', 'CLOSED', 'REJECTED', 'APPROVED', 'UNDER REVIEW', 'PENDING', 'C CLOSED', 'CODE C', 'CODE A', 'CODE B', 'CODE W', 'W'];
            if (riskyStatusKeywords.includes(argText)) {
              violationsCount++;
              violations.push({
                type: 'PARTIAL_STATUS_MATCHING',
                file: relativePath,
                line,
                message: `Unsafe partial status match via .includes('${arg.text}') on '${callerText}'. Must use exact match or centralized SSOT helper.`,
                codeSnippet: node.getText(sourceFile)
              });
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function getLine(node: ts.Node, sf: ts.SourceFile) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

console.log(`Scanning workspace repository root: ${colors.bright}${ROOT_DIR}${colors.reset}...`);
scanDirectory(ROOT_DIR);

console.log(`\n${colors.bright}AUDIT SCAN RESULTS:${colors.reset}`);
console.log(`- Total Repository Files Scanned : ${colors.bright}${colors.green}${filesScanned}${colors.reset}`);
console.log(`- Architectural Violations Found  : ${violationsCount > 0 ? colors.bright + colors.red + violationsCount : colors.bright + colors.green + '0'}${colors.reset}\n`);

if (violationsCount > 0) {
  console.log(`${colors.bright}${colors.red}❌ DETECTED ARCHITECTURAL VIOLATIONS (${violationsCount}):${colors.reset}`);
  violations.forEach((v, idx) => {
    console.log(`  ${idx + 1}. [${v.type}] ${colors.yellow}${v.file}:${v.line}${colors.reset}`);
    console.log(`     ${v.message}`);
    console.log(`     Code: ${colors.cyan}${v.codeSnippet}${colors.reset}`);
  });
  process.exit(1);
} else {
  console.log(`${colors.bright}${colors.green}✔ REPOSITORY ARCHITECTURE AUDIT PASSED: 0 Violations across entire codebase.${colors.reset}\n`);
  process.exit(0);
}
