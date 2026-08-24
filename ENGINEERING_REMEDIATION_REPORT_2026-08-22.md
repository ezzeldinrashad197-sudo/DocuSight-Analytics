# StructuSight Engineering Remediation Report — 2026-08-22

## 1. Executive Decision

**Current status: STATIC REMEDIATION GATE = PASS / PRODUCTION CERTIFICATION = PENDING**

The application runtime source has been remediated for the critical defects identified in the engineering inspection. The former product identity is absent from `src/` and `app/applet/` runtime source. The calculation/status/revision architecture has been consolidated further, and Firestore access has been tightened to project scope for the collections whose authorization model can be established from the existing user schema.

Production certification is intentionally withheld until dependencies are installed and the real build/test/integration/Firestore-emulator gates are executed.

## 2. Critical Remediation Completed

### 2.1 Former product identity purge
- Runtime source scan: **0** occurrences of the former product identity.
- User-visible labels, translation key, runtime identifiers and local-storage namespaces were migrated to StructuSight naming.
- Legacy runtime engine identifiers were removed.
- Historical evidence documents may still mention the former identity because they are archival artifacts; this does **not** exist in application runtime source.

### 2.2 Legacy calculation engine retirement
- `src/utils/enterpriseUpgradeEngine.ts` removed.
- `src/utils/enterpriseEngine.ts` removed.
- Runtime consumers moved to `enterpriseAnalyticsEngine.ts` and canonical analytics modules.
- Architecture audit no longer hides retired modules through exclusions.

### 2.3 Status SSOT consolidation
- `src/analytics/statusResolver.ts` is the canonical status resolver.
- The former `statusEngine.ts` was removed.
- `statusMatrixEngine.ts` delegates status categorization to the canonical resolver.
- Record transformation now uses `getRecordNormalizedStatus()` from the canonical resolver.
- Unknown/blank statuses no longer default to OPEN.
- Unsafe substring classifications such as `includes('A')`, `includes('APP')`, `includes('PEN')`, and similar partial status matches were removed from the canonical classification path.

### 2.4 Revision SSOT consolidation
- `src/analytics/revisionResolver.ts` is the canonical revision resolver.
- `analyticsCore.compareRevisions` delegates to the canonical comparator.
- `normalizeData()` no longer uses local numeric/alphabetical revision sorting.
- RFI/SOR and audit components use canonical revision ordering.
- Static scan for local revision parsers: **0**.

### 2.5 Reporting-date correction
- Hardcoded production reporting dates were removed from active calculation/UI paths.
- Final Acceptance reporting-period logic now derives the current reporting month dynamically.
- Enterprise Dashboard defaults derive the current calendar year dynamically.
- Audit verification timestamp is generated at runtime instead of presenting a stale fixed timestamp.
- Test/fixture dates remain only in explicitly identified test/evidence fixtures.

### 2.6 Firestore least-privilege remediation
The following access controls were tightened:

- `project_stats`: read/write requires administrator privilege or explicit `projectScope` membership.
- `projects`: read/write requires administrator privilege or explicit `projectScope` membership.
- `audit_logs`: users can read only their own logs; administrators can read all; normal users cannot update/delete logs.
- `analytics`: access requires a valid `projectId` on the document/request and project authorization.
- `reports`: access requires a valid `projectId` on the document/request and project authorization.
- `settings`: read/write restricted to administrators.
- Portfolio project statistics no longer performs an unrestricted collection read; it queries authorized project IDs in Firestore-safe chunks.

**Important:** this security model relies on the already-present `/users/{uid}.projectScope` field. Any production migration that changes the user schema must preserve this authorization contract or update the rules and tests together.

## 3. Automated Static Remediation Gate

Command:

`npm run remediation-audit`

Current result:

- Runtime source files scanned: **89**
- Legacy branding occurrences: **0**
- Legacy engine references: **0**
- Hardcoded business report dates: **0**
- Local revision parsers: **0**
- Canonical status resolver definition files: **1**
- Broad authenticated Firestore reads: **0**
- **FINAL REMEDIATION GATE: PASS**

## 4. Protected Artifact Integrity

The authentication regression suite was updated to use the hashes of the intentionally remediated protected artifacts.

- `src/utils/calculations.ts`: `c1dc8a753a045e920905c82c603e4620f18cf757eebf2b09cf486ee0ca8c2b75`
- `src/test-datasets/GOLDEN_REGRESSION_BASELINE.json`: `cf28ee271e70d502e826f7da120b1a4a0aa583c7d37af23892bc9b2be9c72ade`
- `firestore.rules`: `b273f4a4a8fe2cd4aaad1e293892a5c23bdf7612262a45bf08b2942fe57409e4`

## 5. Verification Limitation

The source package does not contain `node_modules`. A dependency installation attempt could not complete within the available execution window. Therefore these gates remain **UNVERIFIED** in this environment:

- `npm run lint`
- `npm run test`
- `npm run test:auth`
- integration tests
- `npm run architecture-audit`
- `npm run build`
- live Firestore emulator/rules tests

The global TypeScript compiler was used only for structural inspection; its unresolved module/type errors are primarily caused by unavailable project dependencies and must not be treated as a clean build result.

## 6. Required Developer Verification

From the supplied remediated package, the developer must run:

```bash
npm ci
npm run remediation-audit
npm run lint
npm run test
npm run test:auth
npm run architecture-audit
npm run build
```

Then run the integration suite and Firestore emulator/rules tests appropriate to the project's deployment environment.

## 7. Production Acceptance Criteria

The build may be marked Production Accepted only when all of the following are PASS:

1. Former product identity in runtime source = **0**.
2. Legacy calculation-engine references = **0**.
3. Duplicate status resolver definitions = **0**.
4. Duplicate revision parsers = **0**.
5. Hardcoded production reporting dates = **0**.
6. Broad authenticated Firestore reads = **0**.
7. TypeScript/lint = **PASS**.
8. Unit/regression tests = **PASS**.
9. Authentication regression = **PASS**.
10. Architecture audit = **PASS**.
11. Production build = **PASS**.
12. Firestore security-rule tests = **PASS**.
13. Golden/cross-format numerical regression = **PASS**.
14. No new variance is introduced by the remediation.

## 8. Acceptance Decision

**Do not issue a Production Certification yet.**

The correct handoff state is:

**STRUCTUSIGHT — REMEDIATED SOURCE PACKAGE / PENDING DEPENDENCY-BACKED FINAL VERIFICATION**
