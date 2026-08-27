# Engineering Verification Record — StructuSight Analytics
**Document Reference:** VERIFY-2026-08-27-01
**Verified Commit:** a2ccf9bfdc8471d8e9b3f69676c8e0ceb989c345
**Verification Date:** August 27, 2026

---

## 1. Status: Verified for the Specific Items Below Only

This document replaces `PRODUCTION_CERTIFICATION.md` (dated July 24, 2026), which is withdrawn. That document made claims (0 presentation-layer formulas, 500 QS test submittals, FAT results, etc.) that were found to contradict the actual source code during an independent audit dated August 24, 2026.

This is not a blanket "production ready" certification. It documents exactly what was verified, how, and when — nothing more. Any claim not listed below should be treated as unverified.

## 2. What Was Verified, and How

Every item below was confirmed by running the referenced command against commit `a2ccf9bfdc8471d8e9b3f69676c8e0ceb989c345` and reading its actual output — not by reading a report about it.

| Item | Command | Result |
|---|---|---|
| TypeScript compiles cleanly | `npx tsc --noEmit` | 0 errors |
| Golden dataset mathematical regression | `npx tsx scripts/run-tests.ts` | CERTIFICATION APPROVED — 8/8 invariants, ER-001–ER-016 canonical tests, 0.000% delta variance |
| Repository-wide architecture / SSOT audit | `npx tsx scripts/architecture-audit.ts` | 0 violations, 102 files scanned |
| API authentication on `/api/metrics/calculate` and `/api/insights` | Manual source review of `server.ts` | Both routes require `verifyAuthAndRole()` |
| No duplicate status-classification arrays in `analyticsCore.ts` / `enterpriseAnalyticsEngine.ts` | Manual source review | Confirmed removed; both now use `getStatusCodeCategory`/exact matching |
| UI components (`App.tsx`, `ReportTable.tsx`, `Presentation.tsx`) consume SSOT instead of recomputing KPIs | Manual source review | Confirmed |

## 3. Explicitly NOT Verified by This Document

The following claims from the withdrawn July 24, 2026 certificate are **not reconfirmed** here and should not be relied upon until someone re-runs the specific evidence they reference and checks it against current source:

- QS Workflow Isolation (`01_WORKFLOW_PARITY_QS_AUDIT.md`)
- Revision Parity for ABD/SDW (`02_REVISION_PARITY_ABD_SDW_AUDIT.md`)
- Cross-format numerical parity across PDF/PPT/Excel exports (`03_CROSS_FORMAT_NUMERICAL_PARITY_AUDIT.md`)
- Functional Acceptance Test claims (2,893 records, >2M records/sec) (`05_FUNCTIONAL_ACCEPTANCE_TEST_FAT_REPORT.md`)
- Filter engine audit (`07_FILTER_ENGINE_AUDIT.md`)
- ABD monthly report trace audit (`08_ABD_MONTHLY_REPORT_TRACE_AUDIT.md`)

## 4. Known Open Items (Not Fixed)

### Dependency vulnerabilities (`npm audit`)
As of commit `ea786cc020cd7d948b7b38658e4fd8063030ad45`: 12 vulnerabilities (9 moderate, 3 high). Investigated but not patched — every suggested fix is a major-version downgrade with real regression risk:

| Package | Current | npm audit's suggested fix | Why not applied |
|---|---|---|---|
| `firebase-admin` | 14.3.0 | 10.3.0 | 4 major versions back; would likely break server-side auth/Firestore calls |
| `pptxgenjs` | 4.0.1 | 1.1.5 | 3 major versions back; would likely break PowerPoint export entirely |
| `drizzle-kit` | 0.31.10 | 0.18.1 | Major downgrade; risks breaking DB tooling compatibility |
| `xlsx` | 0.18.5 | none available | 0.18.5 is the latest version published to the public npm registry; the actual fix is only distributed via SheetJS's own site, not npm |

**Do not run `npm audit fix --force`** — it will apply the downgrades above. These need a deliberate forward-upgrade path with full regression testing (auth flows, PPT export, DB migrations), which is a separate, dedicated task, not a one-line fix.

### CI gate configuration
`.github/workflows/ci.yml` not re-verified in this pass.

## 5. Reissuing This Document

Do not edit the "Status" or "What Was Verified" sections above to add PASS claims without re-running the corresponding command yourself and pasting its real output into this file. A claim without a command and its output is exactly the pattern that made the previous certificate unreliable.
