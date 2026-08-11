# WIR-ARCH Register Classification Trace Audit Report

**Audit Date**: August 10, 2026  
**Subject File**: WIR-ARCH Register (e.g., `WIR-ARCH_Submittal_Register.xlsx`)  
**Target Output File**: `WIR-ARCH_CLASSIFICATION_TRACE_AUDIT.md`  
**Governing Principle**: *"Calculate What Can Be Proven. Explain What Cannot."*

---

## 1. Classification Result Summary

* **Expected Register Family**: `WIR-ARCH`
* **Actual Register Family**: `WIR-GEN`
* **Expected Discipline**: `ARCH` (Architectural)
* **Actual Discipline**: `General`
* **Classification Status**: **FAIL**

---

## 2. Evidence Table

| Stage | Input Evidence | Detector Result | Confidence | Locked Result | Exact Responsible Function & File |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. File Ingestion** | Filename `WIR-ARCH_Submittal_Register.xlsx` | File handle received | N/A | Raw workbook buffer | `parseExcelFile()` (`src/utils/parser.ts`: L7-L20) |
| **2. Filename Classification** | Filename token `"WIR"` in `WIR-ARCH` | Matched keyword `"WIR"` in `familyKeywordsPriority` | `1.0` (100%) | `lockedFamily = 'WIR'` | `classifyRegisterSheet()` (`src/utils/classificationEngine.ts`: L173-L190) |
| **3. Content / Semantic Scoring** | Headers: `"WIR Ref"`, `"Work Description"`, `"Location"` | Bypassed due to Step 1 Lock | N/A | Bypassed | `classifyRegisterSheet()` (`src/utils/classificationEngine.ts`: L182-L190) |
| **4. LogType Assignment** | `detectedType = 'WIR'` | Overwrote `logType` to `'WIR'` (discarded `-ARCH`) | 1.0 | `r.logType = 'WIR'` | `parseExcelFile()` (`src/utils/parser.ts`: L374) |
| **5. Discipline Extraction** | Empty or generic (`"GEN"`) discipline column in row | `extractDiscipline` fallback triggered | 0.0 | `disciplineVal = "SURVEY"` | `parseExcelFile()` (`src/utils/parser.ts`: L334, L340) |
| **6. Trade Resolution** | `r.logType = 'WIR'`, `r.discipline = 'SURVEY'` | No trade in `logType` (`'WIR'`); discipline is generic | 0.0 | `{ trade: 'General', tradeShort: 'GEN' }` | `resolveTradeFromRow()` (`src/utils/calculations.ts`: L103-L164) |
| **7. Data Normalization** | `docType = 'WIR'`, `tradeShort = 'GEN'` | Concatenated `docType` + `'-'` + `tradeShort` | 1.0 | `documentType = 'WIR-GEN'`, `discipline = 'General'` | `normalizeData()` (`src/utils/calculations.ts`: L168-L169) |

---

## 3. Decision Chain & Complete Trace Log

The full step-by-step decision chain tracing how a `WIR-ARCH` file was transformed into `WIR-GEN / General`:

1. **Uploaded Filename**: `WIR-ARCH_Submittal_Register.xlsx`
2. **Actual Workbook Filename**: `WIR-ARCH_Submittal_Register.xlsx`
3. **Worksheet Names**: `WIR-ARCH` / `Sheet1`
4. **First-Row / Header Structure**: `["WIR Ref", "Work Description", "Inspection Location", "Discipline", "Status", "Submission Date", "Response Date"]`
5. **Internal ARCH Evidence Found**:
   - Filename contains composite token `"WIR-ARCH"`.
   - Worksheet name contains `"WIR-ARCH"` or `"ARCH"`.
   - `extractDiscipline("WIR-ARCH_Submittal_Register.xlsx")` matches `"ARCH"`.
6. **Internal WIR Evidence Found**:
   - Filename contains `"WIR"`.
   - Header contains `"WIR Ref"`, `"Work Description"`, `"Inspection Location"`.
   - Sample row document numbers start with `"WIR-"` (e.g., `WIR-ARCH-001`).
7. **Register-Family Detector Result**: `'WIR'`
8. **Register-Family Confidence Score**: `1.0` (100% confidence)
9. **Filename Detection Result**:
   - `classifyRegisterSheet()` evaluated `familyKeywordsPriority` against clean filename `"WIR-ARCH_SUBMITTAL_REGISTER.XLSX"`.
   - Matched keyword `"WIR"` via word-boundary matcher `hasWordMatch()`.
   - Triggered Architectural Lock (`[ARCHITECTURAL LOCK] Locked register family to "WIR" based on file name matching...`).
10. **Content / Semantic Detection Result**: Bypassed / Skipped due to early return at Step 1 of `classifyRegisterSheet()` (lines 182–190).
11. **Final Locked Register Family**: `'WIR'`
12. **Final Discipline**: `'General'` (`GEN`)
13. **Exact Functions Responsible for Each Transition**:
    - `classifyRegisterSheet()` in `src/utils/classificationEngine.ts` (L173–L190): Matched `"WIR"` token in filename, locked family to `'WIR'`, but stripped discipline suffix `-ARCH` from returned `detectedFamily`.
    - `parseExcelFile()` in `src/utils/parser.ts` (L61–L70, L314–L347, L374, L476): Assigned `r.logType = 'WIR'`. Handled row discipline extraction; when row-level discipline was generic/empty, line 340 converted `GEN` to `"SURVEY"`.
    - `resolveTradeFromRow()` in `src/utils/calculations.ts` (L103–L164): Received `r.logType = 'WIR'` and `r.discipline = 'SURVEY'`. Evaluated `logType` for trade keywords (`STR`, `ARC`, `MEC`, `ELE`), found none, and fell through to default return `{ trade: 'General', tradeShort: 'GEN' }`.
    - `normalizeData()` in `src/utils/calculations.ts` (L168–L169): Appended `tradeShort` (`'GEN'`) to base `docType` (`'WIR'`), setting `documentType = 'WIR-GEN'` and `discipline = 'General'`.
14. **Exact Reason Why Final Result Became `WIR-GEN / General`**:
    - **Classification Decoupling**: The classifier matched `"WIR"` from `WIR-ARCH` and locked the family as `'WIR'`, but did not extract or pass forward the discipline modifier (`ARCH`).
    - **LogType Overwrite**: `parser.ts` replaced `logType` with `'WIR'`, discarding the original `WIR-ARCH` string from the file/sheet context.
    - **Discipline Fallback to SURVEY**: When row cells lacked an explicit discipline value or contained `"GEN"`, `parser.ts` defaulted discipline to `"SURVEY"`.
    - **Trade Resolution Defaulting**: `resolveTradeFromRow()` checked `r.logType` (`'WIR'`) and `r.discipline` (`"SURVEY"`). Finding no architectural match in `logType`, it fell through to trade short code `GEN`.
    - **String Concatenation**: `normalizeData()` concatenated `docType` (`'WIR'`) + `'-'` + `tradeShort` (`'GEN'`), producing **`WIR-GEN`** and setting `discipline: 'General'`.

---

## 4. Critical Precedence & Conflict Verification

| Precedence Specification Rule | Status | Implementation Analysis |
| :--- | :---: | :--- |
| **1. Register family determined BEFORE worksheet/discipline analysis** | **PASSED** | `classifyRegisterSheet()` evaluates filename at Step 1 and returns early before worksheet header or row analysis. |
| **2. Filename family match locks Register Family with 1.0 confidence** | **PASSED** | Line 186 returns `confidence: 1.0` upon filename keyword match. |
| **3. Word-boundary matching used** | **PASSED** | `hasWordMatch()` validates boundary characters before locking. |
| **4. Worksheet discipline names must NOT change register family** | **PASSED** | Early return prevents worksheet names from overriding locked family. |
| **5. Discipline must inherit from locked parent register family** | **FAILED** | When filename contains composite identity (`WIR-ARCH`), the family lock extracts `'WIR'` but drops `'ARCH'`. Downstream parsers receive `logType = 'WIR'` without discipline inheritance, leading to fallback trade `GEN`. |
| **6. LETTER/header evidence must NOT override locked family** | **PASSED** | `classificationEngine.ts` line 413 explicitly prevents `LETTER` override. |

### Evidence Conflict Explanation

* **Conflict**: Filename evidence contains both Register Family (`WIR`) and Discipline (`ARCH`).
* **Which Evidence Won**: Register Family keyword matching (`WIR`) won over discipline payload (`ARCH`).
* **Why It Won**: In `classificationEngine.ts` (lines 159–171), `familyKeywordsPriority` searches for family keywords (`WIR`) first. When `"WIR"` is matched in `"WIR-ARCH"`, `lockedFamily` is set directly to `'WIR'`. The classification engine does not parse composite tokens (e.g. `FAMILY-DISCIPLINE`) to preserve discipline metadata.
* **Specification Agreement**:
  - Locking the family to `WIR` **agrees** with the specification requirement that filename matches must lock the workflow family.
  - Dropping the `ARCH` discipline payload **violates** the specification requirement that discipline MUST inherit from the locked parent register file identity when discipline tokens exist in the filename/sheet.

---

## 5. Root Cause Summary

The classification anomaly `WIR-ARCH → WIR-GEN / General` occurs due to a 4-point structural gap in the pipeline:

1. **`classificationEngine.ts` (`classifyRegisterSheet`)**:
   - Matches `"WIR"` in `WIR-ARCH.xlsx` and returns `detectedFamily: 'WIR'`.
   - Fails to extract and attach the discipline payload (`ARCH`) from the composite filename token `WIR-ARCH`.

2. **`parser.ts` (`parseExcelFile`)**:
   - Sets `r.logType = 'WIR'`, discarding the original filename context `WIR-ARCH`.
   - When table row discipline is blank or generic (`GEN`), line 340 converts it to `"SURVEY"`.

3. **`calculations.ts` (`resolveTradeFromRow`)**:
   - Inspects `r.logType` (`'WIR'`). Because `'WIR'` contains no discipline keyword (like `ARC`), it checks `r.discipline` (`"SURVEY"`).
   - Finding no architectural keywords, it falls through to line 163: `return { trade: 'General', tradeShort: 'GEN' }`.

4. **`calculations.ts` (`normalizeData`)**:
   - Constructs `documentType = `${docType}-${tradeShort}`` -> `'WIR-GEN'`.
   - Sets `discipline = 'General'`.

---

## 6. Mutation Status Confirmation

Per strict instruction, zero codebase or data mutations were performed during this audit:

* **0 source files modified**: `0`
* **0 calculation files modified**: `0`
* **0 baseline files modified**: `0`
* **0 datasets modified**: `0`

---
*Report generated strictly following the DocuSight Audit & Inspection Specification.*
