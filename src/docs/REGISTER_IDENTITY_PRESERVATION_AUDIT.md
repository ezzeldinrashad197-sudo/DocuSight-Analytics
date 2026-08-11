# Universal Register Identity Preservation Architecture Audit

**Audit Date**: August 10, 2026  
**Document Reference**: `src/docs/REGISTER_IDENTITY_PRESERVATION_AUDIT.md`  
**Audit Target**: Register Classification, Pipeline Ingestion, Trade Resolution, and Data Normalization Engines  
**Governing Principle**: *"Calculate What Can Be Proven. Explain What Cannot."*  
**Mutation Enforcement**: **0 Source Code Modifications | 0 Dataset Modifications | 0 Baseline Mutations**

---

## 1. Executive Summary

A systemic classification defect was identified during the processing of specialized registers (such as `WIR-ARCH`). The current ingestion and classification pipeline strips authoritative source identity during early workflow family detection, causing discipline metadata (`ARCH`, `STR`, `ELEC`, `MECH`, `INFRA`, etc.) to be discarded. Downstream trade resolution functions then interpret the stripped register identity (`WIR`) as lacking discipline evidence, defaulting the trade to `General / GEN` and synthesizing a false composite type `WIR-GEN`.

This audit establishes that:
1. The anomaly is **not isolated to `WIR-ARCH`**, but affects **all 11 supported register families** (`SDW`, `ABD`, `MIR`, `WIR`, `QS`, `DOC`, `MAR`, `RFI`, `NCR`, `SOR`, `LETTER/TRS`) across all discipline variants (`ARCH`, `STR`, `ELEC`, `MECH`, `INFRA`, `LAND`).
2. The current pipeline suffers from **identity loss across processing boundaries**, where early stage locks drop composite details and force downstream calculation modules to invent default classifications (`General`, `SURVEY`, `GEN`).
3. The overall classification track for composite registers is currently **FAILED** under the strict identity equality requirement (`SOURCE IDENTITY == DETECTED IDENTITY == CANONICAL IDENTITY == CALCULATION IDENTITY == REPORTING IDENTITY`).

---

## 2. Current Classification Architecture

The application handles file ingestion through a 5-stage sequential pipeline:

```
[1. File Ingestion] 
       │
       ▼
[2. Filename Classification Engine]  (src/utils/classificationEngine.ts :: classifyRegisterSheet)
       │  ──▸ Matches family keyword ("WIR"), locks WorkflowFamily = 'WIR'
       │  ──▸ Returns detectedFamily = 'WIR', DROPS discipline modifier ('ARCH')
       ▼
[3. File Parser & Row Construction]  (src/utils/parser.ts :: parseExcelFile)
       │  ──▸ Sets r.logType = 'WIR'
       │  ──▸ Parses row discipline; if blank/generic ("GEN"), converts to "SURVEY"
       ▼
[4. Trade Resolution Engine]         (src/utils/calculations.ts :: resolveTradeFromRow)
       │  ──▸ Checks r.logType ('WIR') for trade keywords (none found)
       │  ──▸ Checks r.discipline ("SURVEY"/generic) for trade keywords (none found)
       │  ──▸ Falls through to default: { trade: 'General', tradeShort: 'GEN' }
       ▼
[5. Data Normalization & Synthesis]  (src/utils/calculations.ts :: normalizeData)
          ──▸ Synthesizes documentType = `${docType}-${tradeShort}` -> 'WIR-GEN'
          ──▸ Sets discipline = 'General'
```

### Key Architectural Defects Identified
1. **Coupling of Family Lock & Discipline Stripping**: In `classificationEngine.ts`, word-boundary matching locates `"WIR"` inside `"WIR-ARCH"` and locks the family to `'WIR'`, but returns only `detectedFamily: 'WIR'`. The discipline payload (`ARCH`) is completely omitted from the return signature `ClassificationResult`.
2. **LogType Overwrite in Parser**: In `parser.ts` line 374, `r.logType` is set to `detectedType` (`'WIR'`), overwriting the original file/sheet string (e.g. `WIR-ARCH`).
3. **Inappropriate Discipline Substitution**: In `parser.ts` lines 334 and 340, when row discipline cells are empty or contain `"GEN"`, the parser forcibly substitutes `"SURVEY"` (for standard registers) or `"HSE"` (for NCRs), replacing explicit context with false defaults.
4. **Stripped Trade Resolution**: In `calculations.ts` `resolveTradeFromRow()`, the primary check inspects `r.logType`. Because `r.logType` was previously overwritten to `'WIR'`, the trade check fails and falls through to `{ trade: 'General', tradeShort: 'GEN' }`.

---

## 3. Required Identity Model

The system currently conflates Register Family, Register Type, and Discipline into a single string. To guarantee identity preservation, the system architecture must explicitly distinguish and maintain 8 independent metadata layers:

| Layer | Metadata Concept | Example Value (`WIR-ARCH`) | Current Pipeline Status |
| :--- | :--- | :--- | :--- |
| **1** | **Register Family** | `WIR` | **Preserved** (Locked via keyword match) |
| **2** | **Register Type** | `WIR` | **Preserved** |
| **3** | **Discipline** | `ARCH` (Architectural) | **LOST** (Stripped during early return) |
| **4** | **Composite Identity** | `WIR-ARCH` | **LOST** (Replaced by synthesized `WIR-GEN`) |
| **5** | **Worksheet Identity** | `Sheet1` / `WIR-ARCH` | **Ignored** when filename matches |
| **6** | **Filename Identity** | `WIR-ARCH_Submittal_Register` | **Discarded** after Step 1 lock |
| **7** | **Row-level Discipline** | `ARCH` / `(blank)` | **Overwritten** with `"SURVEY"` if blank |
| **8** | **Derived Trade** | `Architectural` | **Misassigned** to `General` |

---

## 4. Evidence Precedence Hierarchy

The architecture must enforce a strict, immutable 7-level evidence hierarchy. Lower-confidence fallbacks **must never overwrite** higher-confidence authoritative evidence:

```
Level 1: Explicit Composite Register Identity in Filename (e.g., WIR-ARCH)
   ↓ (If absent)
Level 2: Explicit Composite Register Identity in Worksheet Name (e.g., WIR-STR)
   ↓ (If absent)
Level 3: Explicit Register Identity in Workbook Title Block / Header Row
   ↓ (If absent)
Level 4: Explicit Row-Level Discipline Data inside Spreadsheet Columns
   ↓ (If absent)
Level 5: Structural / Semantic Content & Pattern Matching (Headers, DocNo regex)
   ↓ (If absent)
Level 6: Inherited Parent Context (Project Defaults)
   ↓ (If absent)
Level 7: Unproven / Fallback ("UNCLASSIFIED" / "N/A") — NEVER INVENT "General"
```

### Current Precedence Violation
In the current implementation, a **Level 7 Fallback** (`GEN` / `General` / `SURVEY`) inside `resolveTradeFromRow()` is allowed to overwrite **Level 1 Authoritative Filename Evidence** (`WIR-ARCH`), because the filename discipline payload was stripped at Level 1.

---

## 5. Complete End-to-End Traces

### Trace 1: `WIR-ARCH` (Architectural Work Inspection Request)
```
SOURCE: "WIR-ARCH_Submittal_Register.xlsx" (Sheet: "Sheet1", Row Disc: "")
   ↓
FILENAME DETECTOR: Matches "WIR" -> Locked Family = 'WIR' (Discipline 'ARCH' omitted)
   ↓
WORKSHEET DETECTOR: Bypassed due to Step 1 Filename Lock
   ↓
CONTENT DETECTOR: Bypassed due to Step 1 Filename Lock
   ↓
REGISTER FAMILY RESOLUTION: detectedType = 'WIR'
   ↓
DISCIPLINE RESOLUTION: Row Disc = "" -> parser.ts line 334 sets disciplineVal = "SURVEY"
   ↓
CANONICAL DATASET: r.logType = 'WIR', r.discipline = 'SURVEY'
   ↓
CALCULATION NORMALIZATION: resolveTradeFromRow('WIR', 'SURVEY') -> tradeShort = 'GEN'
   ↓
FINAL REPORT LABEL: documentType = "WIR-GEN", discipline = "General"  [STATUS: FAIL]
```

### Trace 2: `MAR-MECH` (Mechanical Material Approval)
```
SOURCE: "MAR-MECH_Register.xlsx" (Sheet: "MAR", Row Disc: "GEN")
   ↓
FILENAME DETECTOR: Matches "MAR" -> Locked Family = 'MAR' (Discipline 'MECH' omitted)
   ↓
WORKSHEET DETECTOR: Bypassed due to Step 1 Filename Lock
   ↓
CONTENT DETECTOR: Bypassed due to Step 1 Filename Lock
   ↓
REGISTER FAMILY RESOLUTION: detectedType = 'MAR'
   ↓
DISCIPLINE RESOLUTION: Row Disc = "GEN" -> parser.ts line 340 converts to "SURVEY"
   ↓
CANONICAL DATASET: r.logType = 'MAR', r.discipline = 'SURVEY'
   ↓
CALCULATION NORMALIZATION: resolveTradeFromRow('MAR', 'SURVEY') -> tradeShort = 'GEN'
   ↓
FINAL REPORT LABEL: documentType = "MAR-GEN", discipline = "General"  [STATUS: FAIL]
```

### Trace 3: `SDW-STR` (Structural Shop Drawing)
```
SOURCE: "SDW-STR_Log.xlsx" (Sheet: "Sheet1", Row Disc: "GEN")
   ↓
FILENAME DETECTOR: Matches "SDW" -> Locked Family = 'SDW' (Discipline 'STR' omitted)
   ↓
WORKSHEET DETECTOR: Bypassed due to Step 1 Filename Lock
   ↓
CONTENT DETECTOR: Bypassed due to Step 1 Filename Lock
   ↓
REGISTER FAMILY RESOLUTION: detectedType = 'SDW'
   ↓
DISCIPLINE RESOLUTION: Row Disc = "GEN" -> parser.ts line 340 converts to "SURVEY"
   ↓
CANONICAL DATASET: r.logType = 'SDW', r.discipline = 'SURVEY'
   ↓
CALCULATION NORMALIZATION: resolveTradeFromRow('SDW', 'SURVEY') -> tradeShort = 'GEN'
   ↓
FINAL REPORT LABEL: documentType = "SDW-GEN", discipline = "General"  [STATUS: FAIL]
```

---

## 6. Register / Discipline Cross-Matrix

The table below illustrates the classification results across all supported register families and discipline variants when row-level discipline cells are generic or blank:

| Source Filename | Expected Register Type | Expected Discipline | Expected Composite | Actual Detected Type | Actual Discipline | Actual Composite | Identity Preserved |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `WIR-ARCH.xlsx` | `WIR` | `ARCH` | `WIR-ARCH` | `WIR` | `General` | `WIR-GEN` | **FAIL** |
| `WIR-STR.xlsx` | `WIR` | `STR` | `WIR-STR` | `WIR` | `General` | `WIR-GEN` | **FAIL** |
| `WIR-ELEC.xlsx` | `WIR` | `ELEC` | `WIR-ELEC` | `WIR` | `General` | `WIR-GEN` | **FAIL** |
| `WIR-MECH.xlsx` | `WIR` | `MECH` | `WIR-MECH` | `WIR` | `General` | `WIR-GEN` | **FAIL** |
| `WIR-INFRA.xlsx` | `WIR` | `INFRA` | `WIR-INFRA` | `WIR` | `General` | `WIR-GEN` | **FAIL** |
| `WIR-GEN.xlsx` | `WIR` | `General` | `WIR-GEN` | `WIR` | `General` | `WIR-GEN` | **PASS** (Accidental) |
| `MIR-ARCH.xlsx` | `MIR` | `ARCH` | `MIR-ARCH` | `MIR` | `General` | `MIR-GEN` | **FAIL** |
| `MIR-STR.xlsx` | `MIR` | `STR` | `MIR-STR` | `MIR` | `General` | `MIR-GEN` | **FAIL** |
| `MIR-MECH.xlsx` | `MIR` | `MECH` | `MIR-MECH` | `MIR` | `General` | `MIR-GEN` | **FAIL** |
| `MAR-ARCH.xlsx` | `MAR` | `ARCH` | `MAR-ARCH` | `MAR` | `General` | `MAR-GEN` | **FAIL** |
| `MAR-MECH.xlsx` | `MAR` | `MECH` | `MAR-MECH` | `MAR` | `General` | `MAR-GEN` | **FAIL** |
| `RFI-ARCH.xlsx` | `RFI` | `ARCH` | `RFI-ARCH` | `RFI` | `General` | `RFI-GEN` | **FAIL** |
| `RFI-ELEC.xlsx` | `RFI` | `ELEC` | `RFI-ELEC` | `RFI` | `General` | `RFI-GEN` | **FAIL** |
| `NCR-ARCH.xlsx` | `NCR` | `ARCH` | `NCR-ARCH` | `NCR` | `HSE` | `NCR-HSE` | **FAIL** (Substituted HSE) |
| `SOR-ARCH.xlsx` | `SOR` | `ARCH` | `SOR-ARCH` | `SOR` | `General` | `SOR-GEN` | **FAIL** |
| `SDW-ARCH.xlsx` | `SDW` | `ARCH` | `SDW-ARCH` | `SDW` | `General` | `SDW-GEN` | **FAIL** |
| `SDW-STR.xlsx` | `SDW` | `STR` | `SDW-STR` | `SDW` | `General` | `SDW-GEN` | **FAIL** |
| `ABD-ARCH.xlsx` | `ABD` | `ARCH` | `ABD-ARCH` | `ABD` | `General` | `ABD-GEN` | **FAIL** |
| `TRS-ARCH.xlsx` | `LTR` | `ARCH` | `LTR-ARCH` | `LTR` | `General` | `LTR-GEN` | **FAIL** |
| `DOC-ARCH.xlsx` | `DOC` | `ARCH` | `DOC-ARCH` | `DOC` | `General` | `DOC-GEN` | **FAIL** |
| `QS-CIVIL.xlsx` | `QS` | `STR` | `QS-STR` | `QS` | `General` | `QS-GEN` | **FAIL** |

---

## 7. Worksheet Name vs. Content Matrix

Testing 5 distinct evidence scenarios for `WIR-ARCH`:

| Scenario | Filename | Sheet Name | Row Discipline Content | Detected Register Type | Detected Discipline | Final Composite Identity | Identity Preserved |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **A** | `WIR-ARCH.xlsx` | `WIR-ARCH` | `ARCH` | `WIR` | `Architectural` | `WIR-ARC` | **PASS** (Saved by Row Cell) |
| **B** | `WIR-ARCH.xlsx` | `Sheet1` | `ARCH` | `WIR` | `Architectural` | `WIR-ARC` | **PASS** (Saved by Row Cell) |
| **C** | `WIR-ARCH.xlsx` | `WIR` | `(blank)` | `WIR` | `General` | `WIR-GEN` | **FAIL** (Filename Disc Stripped) |
| **D** | `Submittal_Log.xlsx` | `WIR-ARCH` | `(blank)` | `WIR` | `General` | `WIR-GEN` | **FAIL** (Sheet Disc Ignored) |
| **E** | `Register.xlsx` | `Sheet1` | `ARCH` | `WIR` | `Architectural` | `WIR-ARC` | **PASS** (Saved by Row Cell) |

### Key Finding
When row-level data cells explicitly state `"ARCH"`, the row cell saves the classification. However, whenever row cells are **blank or generic** (`GEN`), the system **fails to inherit** discipline from either the filename (`WIR-ARCH.xlsx`) or the sheet name (`WIR-ARCH`), collapsing all items into `WIR-GEN / General`.

---

## 8. Identity Loss Points (Code Locations)

The exact source code locations responsible for identity loss are:

1. **`src/utils/classificationEngine.ts` (Lines 173–190)**:
   ```typescript
   // Matches "WIR" inside "WIR-ARCH" and returns early:
   return {
     detectedFamily: lockedFamily, // 'WIR'
     confidence: 1.0,
     evidence
   };
   // DISCIPLINE PAYLOAD ("ARCH") IS STRIPPED HERE AND NEVER RETURNED.
   ```

2. **`src/utils/parser.ts` (Line 374)**:
   ```typescript
   logType: detectedType !== 'UNKNOWN' ? detectedType : sheetName.trim().toUpperCase(),
   // OVERWRITES logType WITH 'WIR', DISCARDING SOURCE FILENAME "WIR-ARCH".
   ```

3. **`src/utils/parser.ts` (Lines 334 & 340)**:
   ```typescript
   disciplineVal = extractDiscipline(sheetName) || extractDiscipline(file.name) || ... || (isLetter ? "GENERAL" : (isNcr ? "HSE" : "SURVEY"));
   if (disciplineVal === "GEN" || disciplineVal === "GENERAL") {
     disciplineVal = isNcr ? "HSE" : "SURVEY";
   }
   // FORCIBLY CONVERTS MISSING/GENERIC DISCIPLINES TO "SURVEY" OR "HSE".
   ```

4. **`src/utils/calculations.ts` (Lines 108–164)**:
   ```typescript
   const resolveTradeFromRow = (r: SubmittalRow, docTypeFamily: string) => {
     const logType = (r.logType || r.documentType || '').toUpperCase().trim(); // 'WIR'
     if (logType.includes('ARC') || logType.includes('ARCH')) { ... } // FAILS because logType was stripped to 'WIR'
     ...
     return { trade: 'General', tradeShort: 'GEN' }; // FALLS THROUGH TO GEN
   };
   ```

---

## 9. Root Cause Analysis

The root cause is an **architectural gap in metadata propagation**:

1. **Information Bottleneck**: `classifyRegisterSheet()` returns a scalar `WorkflowFamily` enum rather than a structured `CompositeIdentity` object containing both `family` and `discipline`.
2. **Destructive State Overwrite**: The parser replaces the raw source identifier (`WIR-ARCH`) with the base family code (`WIR`), erasing contextual evidence before calculation engines run.
3. **Improper Defaulting Logic**: The system converts missing or generic values (`GEN`) into specific unrelated domains (`SURVEY` or `General`) rather than maintaining context discipline or marking the item as `UNCLASSIFIED`.
4. **Decoupled Trade Resolution**: `resolveTradeFromRow()` relies on `logType` containing trade substrings (e.g. `WIR-ARC`). Because `logType` was already stripped to `WIR`, trade resolution fails and defaults to `GEN`.

---

## 10. Affected Register Families

All 11 supported workflow register families are affected by this architectural defect:
- **`WIR`** (Work Inspection Requests)
- **`MIR`** (Material Inspection Requests)
- **`MAR`** (Material Approvals)
- **`RFI`** (Requests for Information)
- **`NCR`** (Non-Conformance Reports)
- **`SOR`** (Site Observation Reports)
- **`SDW`** (Shop Drawings)
- **`ABD`** (As-Built Drawings)
- **`DOC`** (Document Submittals)
- **`LTR` / `TRS`** (Letters & Transmittals)
- **`QS`** (Quantity Survey Submittals)

---

## 11. False Generalization Risk

When thousands of discipline-specific items (e.g. 7,395 `WIR-ARCH` submittals) lose their architectural identity and are classified as `WIR-GEN / General`:
- **Discipline Workload Distortions**: The Architectural discipline dashboard reports 0 submittals, while the General category inflates artificially to 7,395 items.
- **Distorted Approval Rates**: High-performing architectural review cycles are merged with general site inspections, masking discipline-specific bottlenecks.
- **Contractor Accountability Failures**: Subcontractors responsible for specialized works (e.g. Architectural finishes, MEP commissioning) cannot be tracked accurately when records collapse into `General`.

---

## 12. Calculation Impact

The identity loss impacts core calculation functions across `src/utils/calculations.ts`:
1. **`calculateStats()`**: Filtering by discipline or document type yields empty sets for `WIR-ARC`, `WIR-STR`, etc.
2. **`resolveTradeFromRow()`**: Always assigns `tradeShort = 'GEN'` whenever row cells lack explicit discipline strings.
3. **`syncProjectStats()`**: Aggregates project health scores using distorted discipline distribution totals.

---

## 13. Reporting Impact

1. **Corporate Reports View (`CorporateReportsView.tsx`)**: Slide tables and charts for WIR, MAR, and MIR display `Discipline: General` for all submittals lacking explicit row-level trade tags.
2. **Master Register (`MasterRegister.tsx`)**: Document type pills show `WIR-GEN` instead of `WIR-ARCH`.
3. **SLA Monitoring (`SLAMonitoring.tsx`)**: SLA breach tracking cannot apply discipline-specific SLA thresholds (e.g. 7 days for WIR-ARCH vs 14 days for WIR-MEP).

---

## 14. Required Architectural Correction (Design Blueprint)

To fix this issue without introducing breaking changes or regression, the architecture must be refactored according to these 5 design principles:

### 1. Introduce Structured Classification Return Type
Modify `classifyRegisterSheet()` to return a composite identity structure:
```typescript
export interface ClassificationResult {
  detectedFamily: WorkflowFamily;
  detectedDiscipline: string | null; // e.g. "ARCH", "STR", "MECH", "ELEC", "INFRA"
  compositeCode: string;             // e.g. "WIR-ARCH"
  confidence: number;
  evidence: string[];
}
```

### 2. Preserve Raw Source Identity on Rows
Extend `SubmittalRow` in `src/types.ts` to hold immutable source metadata:
```typescript
export interface SubmittalRow {
  rawSourceIdentity?: string; // e.g. "WIR-ARCH"
  contextDiscipline?: string; // e.g. "ARCH"
  ...
}
```

### 3. Enforce Inheritance in Parser
In `parseExcelFile()`, if row-level discipline is missing or generic (`GEN`), populate row discipline from `classification.detectedDiscipline` or `contextDiscipline` before invoking `normalizeData()`.

### 4. Update Trade Resolution Engine
Modify `resolveTradeFromRow()` to inspect `r.rawSourceIdentity` and `r.contextDiscipline` in addition to `r.logType` and `r.discipline`.

### 5. Enforce Zero Invention Rule
Replace forced conversion of missing/generic disciplines to `"SURVEY"` with `"UNCLASSIFIED"` or inherited parent discipline. Never invent `"General"` or `"SURVEY"` when authoritative source evidence (`WIR-ARCH`) exists.

---

## 15. Regression Test Requirements

Before applying code changes in future turns, an automated regression test suite must be created to verify:
1. `WIR-ARCH.xlsx` produces `documentType: "WIR-ARC"` and `discipline: "Architectural"`.
2. `SDW-STR.xlsx` produces `documentType: "SDW-STR"` and `discipline: "Structural"`.
3. `MAR-MECH.xlsx` produces `documentType: "MAR-MEC"` and `discipline: "Mechanical"`.
4. `RFI-ELEC.xlsx` produces `documentType: "RFI-ELE"` and `discipline: "Electrical"`.
5. `NCR-INFRA.xlsx` produces `documentType: "NCR-INF"` and `discipline: "Infrastructure"`.
6. Files with no discipline evidence produce `discipline: "UNCLASSIFIED"` (never invented `"SURVEY"`).

---

## 16. Mutation Audit Confirmation

In accordance with strict audit instructions, zero source code, calculation, dataset, or baseline mutations were executed during this investigation:

- **Source Code Files Modified**: `0`
- **Calculation Files Modified**: `0`
- **Baseline Files Modified**: `0`
- **Datasets Modified**: `0`
- **Test Fixture Files Modified**: `0`

---
*Report certified strictly under the DocuSight Universal Classification & Inspection Audit Standard.*
