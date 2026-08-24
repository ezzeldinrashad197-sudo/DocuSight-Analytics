# StructuSight — Developer Handoff / Remediation Execution Contract

## Objective

Apply the supplied remediated StructuSight package as a controlled engineering remediation. Do not reintroduce the retired product identity or bypass any remediation gate.

## Mandatory sequence

```bash
npm ci
npm run remediation-audit
npm run lint
npm run test
npm run test:auth
npm run architecture-audit
npm run build
```

Then execute the repository integration suite and the Firebase/Firestore emulator rules tests used by the deployment pipeline.

## Non-negotiable rules

- Do not restore `enterpriseUpgradeEngine.ts`.
- Do not restore `enterpriseEngine.ts`.
- Do not create a second status resolver.
- Do not create a second revision parser.
- Do not classify unknown/blank statuses as OPEN.
- Do not use partial status matching such as `includes('A')`, `includes('APP')`, or `includes('PEN')`.
- Do not introduce hardcoded reporting/as-of dates into production calculation logic.
- Do not replace Firestore project authorization with client-side filtering only.
- Preserve `/users/{uid}.projectScope` as the project authorization contract unless a formally approved schema migration is performed.
- Do not treat historical certification reports as proof of the remediated build.

## Required final evidence

The developer must return:

1. `npm run remediation-audit` output showing PASS.
2. `npm run lint` output showing PASS.
3. `npm run test` output showing PASS.
4. `npm run test:auth` output showing PASS.
5. `npm run architecture-audit` output showing PASS.
6. `npm run build` output showing PASS.
7. Integration test output showing PASS.
8. Firestore rules/emulator authorization test output showing PASS.
9. Final runtime legacy-brand scan showing zero occurrences.
10. Final production artifact checksum/version.

## Release decision

No Production Release / Production Certification is authorized until every mandatory gate above is PASS.
