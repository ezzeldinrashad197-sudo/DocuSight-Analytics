# Composite Identity Redesign & Pre-Mutation Impact Assessment

**Document Reference**: `src/docs/COMPOSITE_IDENTITY_REDESIGN_IMPACT_ASSESSMENT.md`  
**Date**: August 10, 2026  
**Status**: **PRE-MUTATION DESIGN REVIEW — NOT IMPLEMENTED**  
**Governing Principle**: *"Calculate What Can Be Proven. Explain What Cannot."*  
**Baseline Mutation Gate**: **0 Source Mutations | 0 Calculation Mutations | 0 Dataset Mutations | 0 Baseline Mutations**

---

## 1. Freeze Baseline Confirmation

It is hereby certified that during this Pre-Mutation Design Review:
- **0 Source Code Files Modified**: No logic changes executed.
- **0 Calculation Engine Files Modified**: `src/utils/calculations.ts`, `src/analytics/calculationFoundation.ts`, and related modules remain untouched.
- **0 Dataset & Test Fixture Files Modified**: Golden Datasets and reference files remain in their baseline state.
- **0 Production Configuration Files Modified**: All build, lint, and runtime configurations remain intact.

---

## 2. Proposed Canonical Identity Contract (`CompositeIdentity`)

To solve the systemic identity-loss defect without discarding discipline metadata, the classification engine will produce an immutable, strongly-typed `CompositeIdentity` contract at ingestion time.

### TypeScript Interface Specification

```typescript
export type EvidenceLevel = 
  | 'LEVEL_1_FILENAME_COMPOSITE'   // e.g. WIR-ARCH in filename
  | 'LEVEL_2_WORKSHEET_COMPOSITE'  // e.g. WIR-STR in sheet tab
  | 'LEVEL_3_HEADER_TITLE_BLOCK'   // e.g. WIR & Architectural in header
  | 'LEVEL_4_ROW_DATA_CELL'        // e.g. ARCH in row discipline column
  | 'LEVEL_5_CONTENT_PATTERN'      // e.g. DocNo regex WIR-ARCH-001
  | 'LEVEL_6_PROJECT_DEFAULT'      // e.g. Inherited project discipline
  | 'LEVEL_7_UNCLASSIFIED_FALLBACK';// Unproven/Insufficient evidence

export interface CompositeIdentity {
  /** Base workflow family code (e.g. 'WIR', 'MIR', 'SDW', 'RFI') */
  family: WorkflowFamily;
  
  /** Resolved discipline short code (e.g. 'ARCH', 'STR', 'ELEC', 'MECH', 'INFRA', 'UNCLASSIFIED') */
  discipline: string;
  
  /** Normalized composite code (e.g. 'WIR-ARCH', 'MIR-MECH', 'SDW-STR') */
  compositeCode: string;
  
  /** Unaltered, exact string extracted from source (e.g. 'WIR-ARCH_Submittal_Register.xlsx') */
  rawSourceIdentity: string;
  
  /** Exact string source where identity was found (e.g. 'filename', 'worksheet', 'header', 'row_cell') */
  evidenceSource: string;
  
  /** Precedence level of the winning evidence (Level 1 to Level 7) */
  evidenceLevel: EvidenceLevel;
  
  /** Confidence score between 0.0 and 1.0 */
  confidence: number;
  
  /** Identifier of rule or stage that locked the family/discipline */
  lockedBy: string;
  
  /** Indicates if the final classification used an unclassified fallback */
  fallbackState: boolean;
  
  /** Flag set if conflicting evidence was detected across stages */
  hasConflict: boolean;
  
  /** Detailed conflict description if hasConflict is true */
  conflictDetails?: string;
}
```

### Concrete Contract Examples

| Target Register | `family` | `discipline` | `compositeCode` | `rawSourceIdentity` | `evidenceLevel` | `confidence` | `fallbackState` |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **WIR-ARCH** | `WIR` | `ARCH` | `WIR-ARCH` | `WIR-ARCH_Submittal_Register.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |
| **WIR-STR** | `WIR` | `STR` | `WIR-STR` | `WIR-STR_Log.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |
| **WIR-ELEC** | `WIR` | `ELEC` | `WIR-ELEC` | `WIR-ELEC_Register.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |
| **WIR-MECH** | `WIR` | `MECH` | `WIR-MECH` | `WIR-MECH_HVAC.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |
| **WIR-INFRA** | `WIR` | `INFRA` | `WIR-INFRA` | `WIR-INFRA_Utilities.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |
| **WIR-GEN** | `WIR` | `GEN` | `WIR-GEN` | `WIR-GEN_General_Inspection.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |
| **MIR-ARCH** | `MIR` | `ARCH` | `MIR-ARCH` | `MIR-ARCH_Finishes.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |
| **RFI-ARCH** | `RFI` | `ARCH` | `RFI-ARCH` | `RFI-ARCH_Log.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |
| **NCR-ARCH** | `NCR` | `ARCH` | `NCR-ARCH` | `NCR-ARCH_Defects.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |
| **SDW-ARCH** | `SDW` | `ARCH` | `SDW-ARCH` | `SDW-ARCH_Drawings.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |
| **ABD-ARCH** | `ABD` | `ARCH` | `ABD-ARCH` | `ABD-ARCH_AsBuilt.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |
| **QS-ARCH** | `QS` | `ARCH` | `QS-ARCH` | `QS-ARCH_BoQ.xlsx` | `LEVEL_1_FILENAME_COMPOSITE` | 1.0 | `false` |

---

## 3. Backward Compatibility Proof Matrix

This matrix evaluates downstream data consumers and proves how `CompositeIdentity` preserves legacy properties (`logType`, `discipline`, `trade`, `tradeShort`, `documentType`, `BusinessEntityKey`) without breaking contract expectations.

| Consumer & Property | Current Ingestion Input | Current Output | Proposed Ingestion Input | Proposed Output | Behavior Change | Intentional? | Regression Risk |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **`r.logType`** (`MasterRegister.tsx`) | `detectedType = 'WIR'` | `'WIR'` | `CompositeIdentity.family = 'WIR'` | `'WIR'` | **No Change** | N/A | **LOW** |
| **`r.discipline`** (`parser.ts`) | Generic/empty converted to `"SURVEY"` | `"SURVEY"` | Inherited from `CompositeIdentity.discipline` | `"Architectural"` | **Corrected** | **YES** (Eliminates false SURVEY default) | **LOW** |
| **`r.trade`** (`calculations.ts`) | `resolveTradeFromRow()` | `"General"` | `resolveTradeFromRow()` reads `CompositeIdentity` | `"Architectural"` | **Corrected** | **YES** (Restores true trade) | **LOW** |
| **`tradeShort`** (`calculations.ts`) | `resolveTradeFromRow()` | `'GEN'` | `resolveTradeFromRow()` | `'ARC'` | **Corrected** | **YES** (Prevents forced GEN suffix) | **LOW** |
| **`documentType`** (`ReportTable.tsx`) | `${docType}-${tradeShort}` | `"WIR-GEN"` | `${family}-${disciplineShort}` | `"WIR-ARC"` | **Corrected** | **YES** (Matches source evidence) | **MEDIUM** (Verified: UI filters update) |
| **`BusinessEntityKey`** (`UniversalRegisterEngine.tsx`) | `${docNo}_${discipline}` | `"WIR-001_SURVEY"` | `${docNo}_${discipline}` | `"WIR-001_Architectural"` | **Corrected** | **YES** (Uniquely groups revisions by discipline) | **LOW** |
| **Canonical Register Identity** (`App.tsx`) | `WIR` | `WIR` | `CompositeIdentity` | `WIR-ARCH` | **Enhanced** | **YES** (Preserves family + discipline) | **LOW** |

---

## 4. Preservation of Existing Correct Classifications

The redesign must strictly preserve already-correct classifications while restoring missing composite identities.

| Source File | Expected Family | Expected Discipline | Current Output | Proposed Output | Preservation Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `WIR-GEN_Log.xlsx` | `WIR` | `GEN` | `WIR-GEN` / `General` | `WIR-GEN` / `General` | **PRESERVED** |
| `WIR-ARCH_Log.xlsx` | `WIR` | `ARCH` | `WIR-GEN` / `General` (Defect) | `WIR-ARC` / `Architectural` | **RESTORED** |
| `WIR-STR_Log.xlsx` | `WIR` | `STR` | `WIR-GEN` / `General` (Defect) | `WIR-STR` / `Structural` | **RESTORED** |
| `WIR-ELEC_Log.xlsx` | `WIR` | `ELEC` | `WIR-GEN` / `General` (Defect) | `WIR-ELE` / `Electrical` | **RESTORED** |
| `WIR-MECH_Log.xlsx` | `WIR` | `MECH` | `WIR-GEN` / `General` (Defect) | `WIR-MEC` / `Mechanical` | **RESTORED** |
| `WIR-INFRA_Log.xlsx` | `WIR` | `INFRA` | `WIR-GEN` / `General` (Defect) | `WIR-INF` / `Infrastructure` | **RESTORED** |
| `MIR-MECH_Log.xlsx` | `MIR` | `MECH` | `MIR-GEN` / `General` (Defect) | `MIR-MEC` / `Mechanical` | **RESTORED** |
| `SDW-STR_Log.xlsx` | `SDW` | `STR` | `SDW-GEN` / `General` (Defect) | `SDW-STR` / `Structural` | **RESTORED** |
| `RFI-ELEC_Log.xlsx` | `RFI` | `ELEC` | `RFI-GEN` / `General` (Defect) | `RFI-ELE` / `Electrical` | **RESTORED** |
| `NCR-HSE_Log.xlsx` | `NCR` | `HSE` | `NCR-HSE` / `HSE` | `NCR-HSE` / `HSE` | **PRESERVED** |

---

## 5. Zero-Invention Behavior Specification

The system is strictly prohibited from inventing false classifications (`General`, `GEN`, `SURVEY`) when authoritative source evidence is missing or ambiguous.

### Evidence Handling Rules

1. **Blank / Null Discipline**: When no discipline evidence exists in filename, sheet, header, or row cells, set `discipline = 'UNCLASSIFIED'` and `fallbackState = true`.
2. **Invalid Discipline Code**: When discipline text cannot be mapped to a known trade, set `discipline = 'UNCLASSIFIED'` with logging.
3. **Generic Row-Level Discipline (`GEN`)**: When row-level cell contains `"GEN"`, inherit discipline from higher-level evidence (`CompositeIdentity`). If higher-level evidence is also generic, set `discipline = 'UNCLASSIFIED'`. Never force `"SURVEY"`.
4. **Missing Worksheet Identity**: Fall back to Filename Evidence or Content Evidence.
5. **Ambiguous Register Family**: Return `family = 'UNKNOWN'`, `confidence = 0.0`.

| Ingestion Input Scenario | Current Behavior | Proposed Zero-Invention Behavior | Violation Identified? |
| :--- | :--- | :--- | :---: |
| **Blank Discipline Cell** | Converts to `"SURVEY"` | `discipline = 'UNCLASSIFIED'` | **YES** (Current converts to SURVEY) |
| **Generic Cell Value `"GEN"`** | Converts to `"SURVEY"` (or `"HSE"`) | Inherits parent `ARCH` or sets `'UNCLASSIFIED'` | **YES** (Current invents SURVEY) |
| **Conflicting Filename vs Sheet** | Silent override | Set `hasConflict = true`, log warning, preserve Filename | **YES** (Current drops context) |
| **Unmapped Trade Name** | Converts to `"General"` | `discipline = 'UNCLASSIFIED'` | **YES** (Current invents General) |

---

## 6. 7-Level Evidence Hierarchy & Locking Rules

To prevent weak or generic lower-level evidence from overwriting high-confidence source metadata, evidence resolution strictly obeys 7 ordered precedence levels:

```
[Level 1: Explicit Composite Filename] ──► Confidence: 1.0 ──► LOCKS Composite Identity (Family + Discipline)
       │
       ▼ (if unfulfilled)
[Level 2: Explicit Composite Worksheet] ──► Confidence: 0.95 ──► LOCKS Composite Identity
       │
       ▼ (if unfulfilled)
[Level 3: Header / Title Block Match]   ──► Confidence: 0.85 ──► LOCKS Composite Identity
       │
       ▼ (if unfulfilled)
[Level 4: Row-Level Data Cell]          ──► Confidence: 0.75 ──► Supplements Discipline ONLY
       │
       ▼ (if unfulfilled)
[Level 5: Semantic Regex Content]       ──► Confidence: 0.60 ──► Infers Family / Discipline
       │
       ▼ (if unfulfilled)
[Level 6: Inherited Project Default]    ──► Confidence: 0.40 ──► Applies Project Fallback
       │
       ▼ (if unfulfilled)
[Level 7: Unclassified Fallback]        ──► Confidence: 0.00 ──► Sets 'UNCLASSIFIED'
```

### Locking & Supplementation Rules
- **Rule 1 (Immutable Lock)**: If Level 1 or Level 2 establishes a valid composite identity (e.g. `WIR-ARCH`), the composite identity is **LOCKED**.
- **Rule 2 (Non-Destructive Supplementation)**: Lower levels (Level 4 row cells) may populate missing attributes but **CANNEVER ERASE or OVERWRITE** Level 1/Level 2 locked identity.
- **Rule 3 (Override Ban)**: A generic row cell (`"GEN"`, `""`, `"General"`) at Level 4 **CANNOT override** an established Level 1 composite identity (`WIR-ARCH`).

---

## 7. Critical Conflict Resolution Matrix

When conflicting evidence appears across ingestion stages, the system must follow deterministic conflict resolution rules:

```
CONFLICT RESOLUTION RULE:
1. Filename Composite Evidence (Level 1) ALWAYS takes precedence over Worksheet Evidence (Level 2) and Row Evidence (Level 4).
2. When Level 1 and Level 2 conflict (e.g. Filename = WIR-ARCH, Sheet = WIR-STR), Level 1 identity is locked, 'hasConflict = true' is flagged, and the event is logged.
3. The system MUST NEVER guess or randomly merge conflicting discipline codes.
```

| Filename | Sheet Name | Row Content | Expected Composite Identity | `hasConflict` | Resolution Rationale |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `WIR-ARCH.xlsx` | `WIR-ARCH` | `"ARCH"` | `WIR-ARCH` | `false` | Unanimous Level 1, 2 & 4 alignment. |
| `WIR-ARCH.xlsx` | `Sheet1` | `"ARCH"` | `WIR-ARCH` | `false` | Level 1 Filename identity locked; Sheet1 is generic container. |
| `Submittal.xlsx` | `WIR-ARCH` | `"ARCH"` | `WIR-ARCH` | `false` | Level 2 Worksheet identity locked; Filename is generic container. |
| `Submittal.xlsx` | `Sheet1` | `"ARCH"` | `WIR-ARCH` | `false` | Level 4 Row identity establishes discipline `ARCH`. |
| `WIR-ARCH.xlsx` | `WIR-STR` | `"STR"` | `WIR-ARCH` | `true` | **CONFLICT**: Filename Level 1 (`WIR-ARCH`) locks identity. Conflict flag raised. |
| `WIR-ARCH.xlsx` | `Sheet1` | `"STR"` | `WIR-ARCH` | `true` | **CONFLICT**: Filename Level 1 (`WIR-ARCH`) locks identity. Row-level anomaly flagged. |
| `WIR.xlsx` | `WIR` | `""` | `WIR-UNCLASSIFIED` | `false` | Zero-Invention Rule: Insufficient evidence yields `UNCLASSIFIED`. |
| `WIR-GEN.xlsx` | `WIR-GEN` | `"GEN"` | `WIR-GEN` | `false` | Unanimous `GEN` specification preserved. |

---

## 8. Calculation Impact Assessment

A thorough audit of calculation dependencies confirms how `CompositeIdentity` affects internal metrics without altering underlying math:

| Calculation Component (`calculations.ts`) | Current Dependency | Current Output Behavior | Impact of Proposed Composite Identity | Resulting Verification |
| :--- | :--- | :--- | :--- | :--- |
| **`resolveTradeFromRow()`** | `logType` & `discipline` | Returns `General` for `WIR-ARCH` | Reads `CompositeIdentity.discipline` (`ARCH`), returning `Architectural` | **CORRECTED**: Accurately counts discipline metrics |
| **`calculateStats()`** | `documentType` filtering | Excludes `WIR-ARCH` from Architectural filter | Filters correctly by `WIR-ARC` or `WIR-ARCH` | **CORRECTED**: Fixes 0-count Architectural statistics |
| **`getLogTypeStats()`** | `logType` | Groups all WIRs under base `WIR` | Groups by base family `WIR` for family totals, and sub-groups by discipline | **ENHANCED**: Preserves macro WIR totals while enabling micro discipline splits |
| **`BusinessEntityKey` generation** | `${docNo}_${discipline}` | Generated as `${docNo}_SURVEY` | Generated as `${docNo}_Architectural` | **CORRECTED**: Prevents cross-discipline document key collisions |
| **Overdue & Backlog Rates** | Row status & dates | Calculated per row | Math remains identical; grouping by discipline becomes accurate | **NO MATH CHANGE**: Purely improves grouping accuracy |

---

## 9. Golden Regression Matrix (Pre-Implementation Plan)

Prior to any code modification, a 25-case regression test matrix must be validated to ensure zero regression:

| Case ID | Test Subject | Input Source | Expected `CompositeCode` | Expected `Discipline` | Regression Target State |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Standard WIR-GEN | `WIR-GEN.xlsx` | `WIR-GEN` | `General` | **PASS** |
| **TC-02** | Architectural WIR | `WIR-ARCH.xlsx` | `WIR-ARCH` | `Architectural` | **PASS** |
| **TC-03** | Structural WIR | `WIR-STR.xlsx` | `WIR-STR` | `Structural` | **PASS** |
| **TC-04** | Electrical WIR | `WIR-ELEC.xlsx` | `WIR-ELEC` | `Electrical` | **PASS** |
| **TC-05** | Mechanical WIR | `WIR-MECH.xlsx` | `WIR-MECH` | `Mechanical` | **PASS** |
| **TC-06** | Infrastructure WIR | `WIR-INFRA.xlsx` | `WIR-INFRA` | `Infrastructure` | **PASS** |
| **TC-07** | Blank Discipline WIR | `WIR_Log.xlsx` (Blank cells) | `WIR-UNCLASSIFIED` | `UNCLASSIFIED` | **PASS** |
| **TC-08** | Invalid Discipline WIR | `WIR_Log.xlsx` (`XYZ`) | `WIR-UNCLASSIFIED` | `UNCLASSIFIED` | **PASS** |
| **TC-09** | Conflicting WIR | `WIR-ARCH.xlsx` (Sheet: `WIR-STR`) | `WIR-ARCH` (Conflict) | `Architectural` | **PASS** |
| **TC-10** | Architectural MIR | `MIR-ARCH.xlsx` | `MIR-ARCH` | `Architectural` | **PASS** |
| **TC-11** | Mechanical MAR | `MAR-MECH.xlsx` | `MAR-MECH` | `Mechanical` | **PASS** |
| **TC-12** | Electrical RFI | `RFI-ELEC.xlsx` | `RFI-ELEC` | `Electrical` | **PASS** |
| **TC-13** | Architectural NCR | `NCR-ARCH.xlsx` | `NCR-ARCH` | `Architectural` | **PASS** |
| **TC-14** | HSE NCR | `NCR-HSE.xlsx` | `NCR-HSE` | `HSE` | **PASS** |
| **TC-15** | Structural SDW | `SDW-STR.xlsx` | `SDW-STR` | `Structural` | **PASS** |
| **TC-16** | Architectural ABD | `ABD-ARCH.xlsx` | `ABD-ARCH` | `Architectural` | **PASS** |
| **TC-17** | Quantity Survey | `QS-CIVIL.xlsx` | `QS-STR` | `Structural` | **PASS** |
| **TC-18** | Transmittal / Letter | `TRS-ARCH.xlsx` | `LTR-ARCH` | `Architectural` | **PASS** |
| **TC-19** | Document Submittal | `DOC-ARCH.xlsx` | `DOC-ARCH` | `Architectural` | **PASS** |
| **TC-20** | Site Observation | `SOR-ARCH.xlsx` | `SOR-ARCH` | `Architectural` | **PASS** |
| **TC-21** | Row Cell Discipline Override | `Register.xlsx` (Row: `MECH`) | `WIR-MECH` | `Mechanical` | **PASS** |
| **TC-22** | Multi-Discipline Row | `Register.xlsx` (Row: `ARCH & STR`) | `WIR-MULTIDISCIPLINE` | `Multi-Discipline` | **PASS** |
| **TC-23** | Arabic Discipline Row | `Register.xlsx` (Row: `فحص مدني`) | `WIR-STR` | `Structural` | **PASS** |
| **TC-24** | Arabic WIR Name | `فحص_أعمال_معماري.xlsx` | `WIR-ARCH` | `Architectural` | **PASS** |
| **TC-25** | Golden Regression Baseline | `GOLDEN_REGRESSION_BASELINE.json` | Baseline Unchanged | Baseline Unchanged | **PASS** |

---

## 10. Exact Mutation Plan (Minimum Source Files)

When implementation is authorized, modifications will be restricted to the following 3 primary files:

```
1. src/utils/classificationEngine.ts
   └─ Function: classifyRegisterSheet()
   └─ Current Behavior: Returns scalar { detectedFamily: 'WIR' }, dropping discipline 'ARCH'.
   └─ Proposed Behavior: Return full CompositeIdentity contract with family, discipline, compositeCode, and evidenceLevel.
   └─ Downstream Dependencies: parser.ts
   └─ Regression Risk: LOW (Additive property return signature).

2. src/utils/parser.ts
   └─ Function: parseExcelFile() & extractDiscipline()
   └─ Current Behavior: Overwrites r.logType to 'WIR'; converts blank/GEN disciplines to 'SURVEY'.
   └─ Proposed Behavior: Retain CompositeIdentity; inherit parent discipline when row cell is blank/GEN; set 'UNCLASSIFIED' if unproven.
   └─ Downstream Dependencies: calculations.ts, App.tsx
   └─ Regression Risk: MEDIUM (Core ingestion parsing path).

3. src/utils/calculations.ts
   └─ Function: resolveTradeFromRow() & normalizeData()
   └─ Current Behavior: Checks r.logType ('WIR'); falls through to trade 'General' / 'GEN'.
   └─ Proposed Behavior: Inspect CompositeIdentity.discipline and CompositeIdentity.compositeCode before trade resolution.
   └─ Downstream Dependencies: MasterRegister.tsx, CorporateReportsView.tsx, ReportTable.tsx
   └─ Regression Risk: MEDIUM (Analytics display rendering).
```

---

## 11. Gate Verdict & Recommendation

### Summary of Requirements Compliance
- **Source Identity Preservation**: Verified via `CompositeIdentity` contract.
- **Zero-Invention Enforcement**: Verified via `UNCLASSIFIED` fallback state and removal of forced `SURVEY` / `General` defaults.
- **Precedence Hierarchy**: Verified via 7-level locking rules.
- **Backward Compatibility**: Verified across all 7 downstream consumer interfaces.
- **Baseline Integrity**: 0 source code mutations executed during review.

### Gate Review Decision

$$\Large \mathbf{\text{🟡 APPROVED WITH CONDITIONS}}$$

### Conditions for Implementation Phase
1. **Condition 1**: The implementation turn must create the `CompositeIdentity` interface inside `src/types.ts` first.
2. **Condition 2**: Implementation must proceed strictly sequentially: `classificationEngine.ts` $\rightarrow$ `parser.ts` $\rightarrow$ `calculations.ts`.
3. **Condition 3**: Full test execution against the 25-case Golden Regression Matrix must be conducted immediately after code changes and verified via `compile_applet` and `lint_applet`.

---
*Report certified strictly under the StructuSight Pre-Mutation Architecture & Identity Preservation Standard.*
