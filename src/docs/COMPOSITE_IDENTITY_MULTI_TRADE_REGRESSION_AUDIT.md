# COMPOSITE IDENTITY MULTI-TRADE REGRESSION AUDIT

**Audit Date:** August 10, 2026  
**Status:** 🔴 **BLOCKED — MULTI-TRADE REGRESSION CONFIRMED**  
**Document Reference:** `src/docs/COMPOSITE_IDENTITY_MULTI_TRADE_REGRESSION_AUDIT.md`  
**Governance Scope:** Pre-Closure Multi-Trade Separation & Business Entity Isolation Review  
**Mutation Control Enforcement:** **0 Code Mutations | 0 Baseline Mutations | 0 Dataset Mutations**

---

## 1. Executive Summary

During the pre-closure review of the CompositeIdentity pipeline update, a critical architectural regression was identified in row-level multi-trade separation.

While the CompositeIdentity implementation successfully resolved register-level identity loss for homogeneous single-discipline registers (e.g., preserving `WIR-ARCH` as `WIR-ARCH` instead of mutating to `WIR-GEN`), the implementation in `src/utils/calculations.ts` (`resolveTradeFromRow`) introduced an unintended side effect: **it prioritizes file-level / worksheet-level Composite Identity (`compDisc`) over explicit row-level trade/discipline evidence (`explicitDisc`).**

As a result, when a single master register or worksheet contains submittal records spanning multiple trades (e.g., `Architectural`, `Structural`, `Mechanical`, `Electrical`), the file/worksheet-level `CompositeIdentity` locks ALL rows into a single uniform trade, destroying the row-level trade separation previously established.

---

## 2. Root Cause Analysis

### Mechanics of the Regression

In `src/utils/calculations.ts`, `resolveTradeFromRow()` was updated as follows:

```typescript
const resolveTradeFromRow = (r: SubmittalRow, docTypeFamily: string) => {
    const compDisc = (r.compositeIdentity?.discipline || r.contextDiscipline || '').toUpperCase().trim();
    const logType = (r.logType || r.rawSourceIdentity || r.documentType || '').toUpperCase().trim();
    const explicitDisc = (r.discipline || '').toUpperCase().trim();
    const tradeField = (r.trade || r.tradeSystem || '').toUpperCase().trim();

    // 1. High-confidence Composite Identity discipline (from filename or worksheet level lock)
    if (compDisc && compDisc !== 'UNCLASSIFIED') {
        const mapped = mapDiscToTrade(compDisc);
        if (mapped) return mapped; // <--- REGRESSION TRIGGER: Executes for ALL rows in the file!
    }

    // 2. LogType / Raw Source Identity string
    ...
    // 3. Explicit Row Discipline
    if (explicitDisc && explicitDisc !== 'UNCLASSIFIED') {
        const mappedExplicit = mapDiscToTrade(explicitDisc);
        if (mappedExplicit) return mappedExplicit;
    }
    ...
};
```

### Why This Collapses Multi-Trade Registers

1. **For Master / Multi-Trade Registers with File/Sheet Level Discipline Identifiers:**
   * Consider a master submittal register file named `WIR-GEN_Master_Register.xlsx` or `Submittals_WIR.xlsx`.
   * Level 1 / Level 2 `CompositeIdentity` evaluates the filename/sheet and determines `compDisc = "GEN"` or `compDisc = "ARCH"`.
   * When `resolveTradeFromRow()` runs for Row 1 (Discipline: `ARCH`), Row 2 (Discipline: `STR`), Row 3 (Discipline: `MECH`), and Row 4 (Discipline: `ELEC`), Step 1 checks `compDisc`.
   * Because `compDisc` is populated at the file level (`"GEN"` or `"ARCH"`), Step 1 immediately returns `{ trade: 'General', tradeShort: 'GEN' }` (or `{ trade: 'Architectural', tradeShort: 'ARC' }`) for **EVERY ROW** in the file.
   * Step 3 (`explicitDisc`), which inspects the explicit row-level discipline column (`r.discipline`), is **NEVER REACHED**.

2. **Outcome:**
   * Row 1 (`ARCH`), Row 2 (`STR`), Row 3 (`MECH`), and Row 4 (`ELEC`) are all forcibly collapsed into a single trade (`General` or `Architectural`).
   * The multi-trade breakdown in reports, KPI cards, and trade filter views is destroyed.

---

## 3. Before vs. After Comparison Matrix

| Aspect | Expected / Previous Behavior | Current Behavior (Post CompositeIdentity) | Status |
| :--- | :--- | :--- | :--- |
| **Row 1 (`rawDiscipline: "ARCH"`)** | `Trade: Architectural` (`WIR-ARC`) | `Trade: General` or `Architectural` (`WIR-GEN` or `WIR-ARC`) | 🔴 REGRESSED if sheet/file is `GEN` |
| **Row 2 (`rawDiscipline: "STR"`)** | `Trade: Structural` (`WIR-STR`) | `Trade: General` or `Architectural` (Forced to match file `compDisc`) | 🔴 **REGRESSED** (Collapsed into Row 1 trade) |
| **Row 3 (`rawDiscipline: "MECH"`)** | `Trade: Mechanical` (`WIR-MEC`) | `Trade: General` or `Architectural` (Forced to match file `compDisc`) | 🔴 **REGRESSED** (Collapsed into Row 1 trade) |
| **Row 4 (`rawDiscipline: "ELEC"`)** | `Trade: Electrical` (`WIR-ELE`) | `Trade: General` or `Architectural` (Forced to match file `compDisc`) | 🔴 **REGRESSED** (Collapsed into Row 1 trade) |
| **Trade Count in Master Register** | 4 Distinct Trades (`ARC`, `STR`, `MEC`, `ELE`) | 1 Collapsed Trade (`GEN` or `ARC`) | 🔴 **REGRESSED** |
| **`documentType` Synthesis** | `WIR-ARC`, `WIR-STR`, `WIR-MEC`, `WIR-ELE` | All rows forced to single `documentType` (e.g. `WIR-GEN`) | 🔴 **REGRESSED** |
| **`BusinessEntityKey`** | Preserves individual document references (`WIR:WIR-001`, `WIR:WIR-002`) | Key structure preserved, but trade classification merged | 🟡 PARTIAL REGRESSION |
| **Reporting Trade Breakdowns** | 4 separate trade series in charts/tables | Single merged series in charts/tables | 🔴 **REGRESSED** |

---

## 4. Affected Register Families

This regression affects **all 11 supported register families** whenever a register workbook contains multi-trade records:

1. **WIR** (Work Inspection Requests)
2. **MIR** (Material Inspection Requests)
3. **MAR** (Material Approval Requests)
4. **SDW** (Shop Drawings)
5. **ABD** (As-Built Drawings)
6. **RFI** (Requests for Information)
7. **NCR** (Non-Conformance Reports)
8. **SOR** (Site Observation Reports)
9. **QS** (Quantity Survey / Payment Certificates)
10. **DOC** (Design / Transmittal Documents)
11. **LETTER / TRS** (Correspondence)

---

## 5. Detailed Regression Test Cases

### Case MT-01: Multi-Discipline WIR Register (`WIR_Master_Register.xlsx`)
* **File Name:** `WIR_Master_Register.xlsx`
* **Worksheet Name:** `WIR_Log`
* **Rows in File:**
  * Row 1: `Ref: WIR-001` | `Discipline: ARCH`
  * Row 2: `Ref: WIR-002` | `Discipline: STR`
  * Row 3: `Ref: WIR-003` | `Discipline: MECH`
  * Row 4: `Ref: WIR-004` | `Discipline: ELEC`
* **Expected Previous Output:**
  * Row 1: `docType: WIR-ARC`, `trade: Architectural`
  * Row 2: `docType: WIR-STR`, `trade: Structural`
  * Row 3: `docType: WIR-MEC`, `trade: Mechanical`
  * Row 4: `docType: WIR-ELE`, `trade: Electrical`
* **Current Post-CompositeIdentity Output:**
  * Row 1: `docType: WIR-GEN` (or `WIR-UNCLASS`), `trade: General`
  * Row 2: `docType: WIR-GEN` (or `WIR-UNCLASS`), `trade: General`
  * Row 3: `docType: WIR-GEN` (or `WIR-UNCLASS`), `trade: General`
  * Row 4: `docType: WIR-GEN` (or `WIR-UNCLASS`), `trade: General`
* **Verdict:** 🔴 **FAIL — Multi-trade separation collapsed into single General trade.**

### Case MT-02: Structural Submittal logged inside Architectural Register (`WIR-ARCH_Log.xlsx`)
* **File Name:** `WIR-ARCH_Log.xlsx`
* **Worksheet Name:** `WIR-ARCH`
* **Rows in File:**
  * Row 1: `Ref: WIR-A-01` | `Discipline: ARCH`
  * Row 2: `Ref: WIR-S-01` | `Discipline: STR` (Cross-disciplinary entry in ARCH register)
* **Expected Previous Output:**
  * Row 1: `docType: WIR-ARC`, `trade: Architectural`
  * Row 2: `docType: WIR-STR`, `trade: Structural`
* **Current Post-CompositeIdentity Output:**
  * Row 1: `docType: WIR-ARC`, `trade: Architectural`
  * Row 2: `docType: WIR-ARC`, `trade: Architectural` (Overridden by Level 1 `WIR-ARCH` lock)
* **Verdict:** 🔴 **FAIL — Row 2 explicit structural discipline overridden by file-level composite lock.**

---

## 6. Governed Coexistence Principles

To resolve this issue without reverting the single-discipline `WIR-ARCH` fix, two distinct concepts must coexist:

1. **Register-Level Identity (`CompositeIdentity`):**
   * Represents the source file/worksheet envelope metadata (e.g. `family: WIR`, `contextDiscipline: ARCH`).
   * Provides context for default inheritance when row-level discipline is missing, blank, or unclassified.

2. **Row-Level Trade Identity (`explicitDisc`):**
   * Represents explicit row-level evidence inside spreadsheet data rows (e.g., `ARCH`, `STR`, `MECH`, `ELEC`).
   * **Rule of Precedence:** Explicit row-level discipline evidence (`explicitDisc`) **MUST OVERRIDE** file/worksheet level context (`compDisc`) when the row explicitly specifies a valid discipline. File-level composite identity serves as the fallback for rows that lack explicit discipline evidence.

---

## 7. Audit Verdict & Status

* **Composite Identity Single-Discipline Preservation:** ✅ PASS (`WIR-ARCH` -> `WIR-ARCH`)
* **Multi-Trade Row-Level Separation:** 🔴 **FAIL / REGRESSED**
* **Overall Status:** 🔴 **BLOCKED — CODE MUTATIONS FROZEN**

---

## 8. Final Compliance Confirmation

* **Source Files Modified:** `0` (Zero code changes made during this diagnostic turn)
* **Golden Regression Baseline Mutations:** `0`
* **Test Dataset Mutations:** `0`
* **ABD Governance Mutations:** `0`

*Awaiting formal authorization and approved remediation design before any source code edits are made.*
