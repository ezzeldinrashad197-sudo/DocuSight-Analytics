# Engineering Verification Record — StructuSight Analytics
**Document Reference:** VERIFY-2026-08-27-02
**Verified Commit:** 57bfa527406d8537babaee4812f11ea411e4fb8b
**Verification Date:** August 27, 2026
**Supersedes:** VERIFY-2026-08-27-01 (commit `a2ccf9bf`) — that document is now stale, not wrong; commit `a2ccf9bf` was accurately verified at the time but the codebase has since moved forward through several more commits.

---

## 1. Status: Verified for the Specific Items Below Only

This is not a blanket "production ready" certification. It documents exactly what was verified, how, and when — nothing more. Any claim not listed below should be treated as unverified. The original `PRODUCTION_CERTIFICATION.md` (dated July 24, 2026) remains withdrawn for the reasons stated in VERIFY-2026-08-27-01.

## 2. What Was Verified, and How

Every item below was confirmed by running the referenced command against commit `57bfa527406d8537babaee4812f11ea411e4fb8b` and reading its actual output.

| Item | Command | Result |
|---|---|---|
| TypeScript compiles cleanly | `npx tsc --noEmit` | 0 errors |
| Golden dataset mathematical regression | `npx tsx scripts/run-tests.ts` | CERTIFICATION APPROVED — 0.000% delta variance |
| Repository-wide architecture / SSOT audit | `npx tsx scripts/architecture-audit.ts` | 0 violations, 102 files scanned |
| Authentication regression (incl. immutable-artifact hash check) | `npm run test:auth` | 33/33 passed, real HTTP server on loopback |
| E2E integration pipeline | `npx tsx scripts/run-integration-tests.ts` | 8/8 steps passed |
| Production build (client + server) | `npm run build` | Succeeded; `dist/server.cjs` produced |
| SDW Register classification (`classifyRow` / `classifySubmission`) against real project data | Direct execution against `01-Shop_Drawings.xlsx` (2,423–1,552–1,208–1,206–737–499 rows across 6 disciplines) at three levels: isolated function calls, direct pipeline calls, and the production `calculateCanonicalKPIs()` entry point | All 44 reference values (row-grain and unique-item-grain, 6 disciplines) matched exactly at every level |
| `analyticsCore.ts` / `enterpriseAnalyticsEngine.ts` duplicate-classification fixes (from 2026-08-25) | Manual source review | Confirmed still intact, not reverted by later commits |
| `exportHelpers.ts` recommendation-generation logic (large diff in this commit) | Manual source review | Confirmed it consumes canonical `globalStats` fields (`currentRejectedOpen`, `currentPending`, etc.) rather than reimplementing classification |
| CI workflow (`.github/workflows/ci.yml`) | Manual review | `npm ci` only, no unsafe fallback; 6 sequential gates unchanged |

## 3. Explicitly NOT Verified by This Document

Unchanged from VERIFY-2026-08-27-01 — still not reconfirmed:

- QS Workflow Isolation, Revision Parity (ABD/SDW), Cross-format numerical parity, Functional Acceptance Test claims, Filter engine audit, ABD monthly report trace audit (see `evidence/audits/` for the specific files).

## 4. Known Open Items (Not Fixed)

### Dependency vulnerabilities (`npm audit`)
Re-checked against this commit: still **12 vulnerabilities (9 moderate, 3 high)** — unchanged from the prior check, no new regressions introduced. Same four packages, same reasoning against blind-fixing:

| Package | Current | npm audit's suggested fix | Why not applied |
|---|---|---|---|
| `firebase-admin` | 14.3.0 | 10.3.0 | 4 major versions back; would likely break server-side auth/Firestore calls |
| `pptxgenjs` | 4.0.1 | 1.1.5 | 3 major versions back; would likely break PowerPoint export entirely |
| `drizzle-kit` | 0.31.10 | 0.18.1 | Major downgrade; risks breaking DB tooling compatibility |
| `xlsx` | 0.18.5 | none available | Latest version published to the public npm registry; the actual fix is only distributed via SheetJS's own site, not npm |

**Do not run `npm audit fix --force`.**

## 5. Reissuing This Document

Do not add PASS claims without re-running the corresponding command yourself and pasting its real output into this file. Bump the Document Reference number and note what changed, same as this revision did against VERIFY-2026-08-27-01.
