import * as crypto from 'crypto';
import { MASTER_28_FINDINGS } from './reconcile-l99-audit';

console.log('===================================================================================');
console.log('DOCUSIGHT — EXECUTING L99 28-FINDING IMMUTABLE IDENTITY EQUALITY TEST');
console.log('===================================================================================');

// Expected 28 Master IDs in exact order
const EXPECTED_28_IDS = [
  'L99-SEC-001', 'L99-SEC-002', 'L99-SEC-003', 'L99-SEC-004', 'L99-SEC-005',
  'L99-SEC-006', 'L99-SEC-007', 'L99-SEC-008', 'L99-SEC-009', 'L99-SEC-010',
  'L99-SEC-011', 'L99-SEC-012', 'L99-SEC-013', 'L99-SEC-014',
  'L99-REG-001', 'L99-REG-002', 'L99-REG-003',
  'L99-CALC-001', 'L99-CALC-002', 'L99-CALC-003', 'L99-CALC-004',
  'L99-DATA-001', 'L99-DATA-002',
  'L99-ML-001',
  'L99-ARCH-001', 'L99-ARCH-002',
  'L99-BLD-001', 'L99-BLD-002'
];

let failures = 0;

// 1. Cardinality Test
if (MASTER_28_FINDINGS.length !== 28) {
  console.error(`FAIL: Expected 28 Master Findings, found ${MASTER_28_FINDINGS.length}`);
  failures++;
} else {
  console.log('PASS: Exact 28 Master Findings count verified.');
}

// 2. Uniqueness Test
const idSet = new Set<string>();
const duplicates: string[] = [];
MASTER_28_FINDINGS.forEach(f => {
  if (idSet.has(f.masterId)) duplicates.push(f.masterId);
  idSet.add(f.masterId);
});

if (duplicates.length > 0) {
  console.error(`FAIL: Duplicate Master IDs detected: ${duplicates.join(', ')}`);
  failures++;
} else {
  console.log('PASS: 0 duplicate Master IDs found.');
}

// 3. ID Order and Existence
for (let i = 0; i < EXPECTED_28_IDS.length; i++) {
  const expectedId = EXPECTED_28_IDS[i];
  const actualId = MASTER_28_FINDINGS[i]?.masterId;
  if (expectedId !== actualId) {
    console.error(`FAIL: Index ${i} Master ID mismatch. Expected ${expectedId}, got ${actualId}`);
    failures++;
  }
}
if (failures === 0) {
  console.log('PASS: 28/28 Master IDs match expected sequence strictly.');
}

// 4. Character-for-Character Identity Equality (4-field tuple: masterId, originalDomain, originalTitle, originalRootCause)
MASTER_28_FINDINGS.forEach((f, idx) => {
  if (!f.masterId || f.masterId.trim() === '') {
    console.error(`FAIL: Finding at index ${idx} missing Master ID.`);
    failures++;
  }
  if (!f.originalDomain || !['Security', 'Regression', 'Calculation', 'Data', 'ML', 'Architecture', 'Build'].includes(f.originalDomain)) {
    console.error(`FAIL: Finding ${f.masterId} has invalid or reassigned domain: ${f.originalDomain}`);
    failures++;
  }
  if (!f.originalTitle || f.originalTitle.trim() === '') {
    console.error(`FAIL: Finding ${f.masterId} has empty or missing original title.`);
    failures++;
  }
  if (!f.originalRootCause || f.originalRootCause.trim() === '') {
    console.error(`FAIL: Finding ${f.masterId} has empty or missing original root cause.`);
    failures++;
  }
});

// 5. Verify 4-Field Identity Hash Digest
const canonical4FieldHashes = MASTER_28_FINDINGS.map(f => {
  const raw4FieldTuple = `${f.masterId}+${f.originalDomain}+${f.originalTitle}+${f.originalRootCause}`;
  return crypto.createHash('sha256').update(raw4FieldTuple).digest('hex');
});
const canonical4FieldDigest = crypto.createHash('sha256').update(canonical4FieldHashes.join('')).digest('hex');

const EXPECTED_4FIELD_DIGEST = '72ef55f54d4e39b70caa3bfa119f33051dda820d3d6f65739aa86649a7462250';
if (canonical4FieldDigest !== EXPECTED_4FIELD_DIGEST) {
  console.error(`FAIL: Canonical 4-Field Digest Mismatch! Expected ${EXPECTED_4FIELD_DIGEST}, got ${canonical4FieldDigest}`);
  failures++;
} else {
  console.log(`PASS: Canonical 4-Field Identity Digest verified: ${canonical4FieldDigest}`);
}

// Summary
if (failures > 0) {
  console.error(`\nL99 IDENTITY EQUALITY TEST FAILED WITH ${failures} ERRORS.`);
  process.exit(1);
} else {
  console.log('\nSUCCESS: 28/28 Master Findings Passed Immutable Identity Equality Test (0 Drift, 0 Renumbering).');
  process.exit(0);
}
