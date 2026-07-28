# DocuSight Analytics – Dataset Certification Report

This report certifies that the **Business Entity Key Extraction** logic is 100% consistent and verified across all project disciplines for the Non-Conformance Report (NCR) module.

---

## 1. Extraction Consistency Audit

| Discipline | Expected Unique NCRs | Extracted Unique NCRs | Match Status | Remarks |
|---|---|---|---|---|
| **STR** (Structural) | 57 | 57 | ✅ **Verified** | Extracted from `engineering_item_dataset_str` with full revision lineages. |
| **ARCH** (Architectural) | 180 | 180 | ✅ **Verified** | Full sequence verified. |
| **INFRA** (Infrastructure) | 57 | 57 | ✅ **Verified** | Cohesive timeline mapping. |
| **MECH** (Mechanical) | 38 | 38 | ✅ **Verified** | No fragmented lineages. |
| **ELEC** (Electrical) | 19 | 19 | ✅ **Verified** | Fully aligned. |
| **HSE** (Health, Safety, Env.) | 48 | 48 | ✅ **Verified** | Operational safety datasets matched. |
| **Landscape** | 2 | 2 | ✅ **Verified** | Landscape architecture matched. |
| **Total Unique Entities** | **401** | **401** | ✅ **Verified** | **100% Alignment across Project Database** |

---

## 2. Explainable Calculation Engine (ECE) Certification

Every unique NCR entity is identified using its robust, centralized `BusinessEntityKey` (e.g., `NCR:INN-ARC-NCR-STR-00001`), avoiding raw row scattering or index shifts. 
In accordance with the **Explainable Calculation Engine (ECE)** architecture, each record explicitly preserves its baseline selection rationale within the database (e.g. `Why this Classification was selected`), ensuring:
- **Rev00 Baseline Rule Integration**: Automatically tracks the earliest historical occurrence.
- **Explainable Audit Trails**: Enables corporate auditors to verify the physical origin of any metric.

---

## 3. Workflow Waiting (Operational Status Integrity)

Following the analysis of `Submission_Workflow_Audit_Report_2026-07-14.csv`, we isolated a distinct operational state:
- **Total Unique NCRs**: 401
- **Closed**: 324
- **Open**: 71
- **Waiting (Workflow Waiting)**: 6

This state is now formally integrated and exposed in the live KPI bar as **Workflow Waiting** (بانتظار سير العمل). This ensures absolute visibility for executive leadership, preventing these 6 records from being silently merged into a general pending state or omitted.
