# Architecture Decision Record (ADR): Canonical Calculation Engine Evaluation & Selection

## Status
Proposed / Under Evaluation (Pending Formal Approval)

## Context & Problem Statement
DocuSight Analytics currently contains multiple calculation utilities, modules, and helper functions distributed across `/src/utils/calculations.ts`, `/src/analytics/calculationFoundation.ts`, `/src/analytics/kpiEngine.ts`, `/src/analytics/statusEngine.ts`, and specialized register engines (such as NCR, SOR, LTR). 

To comply with **DocuSight Analytics – Official Calculation Engine Specification Version 1.0** (specifically Chapters 12, 14, 22, and 30 - *Single Source of Truth*, *Read Once – Calculate Once*, and *No Duplicate Logic*), we must evaluate all existing calculation engines, establish a single Canonical Calculation Engine, and define a rigorous migration strategy.

---

## Evaluation of Existing Calculation Engines

### 1. Master Calculation Utilities (`/src/utils/calculations.ts`)
- **Pros**: Contains comprehensive functions (`calculateStats`, `classifyNcrStatus`, `calculateNCRStats`, etc.) currently utilized across most UI views, reports, and export engines.
- **Cons**: Historically grew organically as a monolithic utility file mixing formatting, date parsing, status classification, and statistical aggregation.

### 2. Calculation Foundation (`/src/analytics/calculationFoundation.ts`)
- **Pros**: Designed as an orchestrator aligning with the pipeline sequence in Specification Chapter 2.2.
- **Cons**: Partially delegates back to legacy utility functions in `calculations.ts`, creating split authority.

### 3. KPI Engine (`/src/analytics/kpiEngine.ts`)
- **Pros**: Aligns with Specification Chapter 10 for Volume, Workflow, Approval, Time, and Quality KPIs.
- **Cons**: Interacts with raw and normalized datasets independently in certain legacy views.

---

## Decision: Selection of Canonical Calculation Engine

In accordance with **Chapter 30 (Calculation Engine Constitution)** and **Chapter 12 (Governance & Audit Framework)**:
1. **`/src/utils/calculations.ts`** and **`/src/analytics/calculationFoundation.ts`** shall be unified under a centralized **Canonical Calculation Engine** interface located in `calculationFoundation.ts`.
2. All mathematical formulas (FORM-0001 through FORM-0504) and business rules (BR-0001 through BR-1038) shall be registered in centralized registries (`businessRuleRegistry.ts`, `formulaRegistry.ts`) rather than scattered inline conditionals.
3. **No existing calculation engine shall be removed or deleted** during Phase Two initialization to preserve backward compatibility and prevent regression. Instead, legacy utility functions will wrap around or delegate to the canonical engine.

---

## Migration Strategy
1. **Phase 1 (Infrastructure Setup)**: Establish formal registries for Business Rules, Formulas, Configuration, Audit, and Validation without altering runtime calculations.
2. **Phase 2 (Canonical Alignment)**: Route all UI views, exports, and dashboards through the Canonical Engine interface.
3. **Phase 3 (Deprecation & Verification)**: Run regression tests comparing legacy vs. canonical outputs across 10,000+ test records before deprecating legacy duplicate code paths.
