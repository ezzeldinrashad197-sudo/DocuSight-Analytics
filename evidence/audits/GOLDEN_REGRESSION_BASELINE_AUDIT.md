# Golden Regression Dataset Baseline Specification & Audit Log
*Preserved on 2026-07-29T05:34:00-07:00 under Governance Control CR-0001*

---

## 📌 Executive Summary

This document establishes the official **Golden Regression Dataset** for the application, archiving reference outputs across all validated register types: **SDW, ABD, MAR, DOC, MIR, WIR, RFI, NCR, SOR, TRS, and LTR**.

To ensure 100% mathematical regression protection, every code modification, build pipeline execution, and static compliance scan must reproduce these reference outputs **with 0.000% variance**.

---

## 🎯 Verification Scope & Reporting Domains

For each of the reference datasets, expected outputs are archived across seven (7) core reporting domains:

1. **Monthly Reports**: Submissions, Carry Forward Pending, Current Month Pending, Monthly Approvals, Monthly Rejections, Approval Rate %.
2. **Cumulative Reports**: Total Submissions, Unique Document Balance, Open Pending Balance, Closed Total, Approved Total, Rejected Total, Cumulative Approval Rate %.
3. **KPI Dashboard**: Total Submittals, Approval Rate, SLA Compliance Ratio %, Overdue Ratio %, Under Review Ratio %, Average Turnaround Days.
4. **Revision Analysis**: Total Submissions, Unique Document Count, Rev 0 Count, Subsequent Revisions Count, Rev 0 Approval Rate %, Resubmission Index.
5. **ABD Calculations** (As-Built Drawings): Unique ABD Count, Approved ABD, Pending ABD, Rejected ABD, Revision Distribution, ABD Approval Rate %, ABD SLA Compliance %.
6. **Audit Center**: Total Audited Records, Verified Parity Count, Delta Variance Count, Classification Integrity Score %, Layer Compliance Rating %, Status Ambiguity Count.
7. **Executive Reports**: Portfolio Health Score, High-Risk Items Count, Overdue Items Count, Overall Approval Rate %, QA/QC SLA Turnaround Days, Status Breakdown.

---

## 📊 Preserved Reference Output Matrix

| Register Code | Register Description | Monthly Total | Unique Balance | Open Pending | Approved Total | Rejected Total | Cumulative Approval Rate % | SLA Compliance % | Audit Integrity Score % |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SDW** | Shop Drawings | 1,500 | 1,500 | 180 | 1,250 | 70 | 83.33% | 94.2% | 100.0% |
| **ABD** | As-Built Drawings | 450 | 450 | 35 | 400 | 15 | 88.89% | 97.1% | 100.0% |
| **MAR** | Material Approval Requests | 620 | 620 | 55 | 540 | 25 | 87.10% | 92.5% | 100.0% |
| **DOC** | Document Submittals | 340 | 340 | 28 | 300 | 12 | 88.24% | 95.8% | 100.0% |
| **MIR** | Material Inspection Reports | 312 | 312 | 42 | 255 | 15 | 81.73% | 96.4% | 100.0% |
| **WIR** | Work Inspection Reports | 850 | 850 | 120 | 690 | 40 | 81.18% | 98.0% | 100.0% |
| **RFI** | Request for Information | 1,050 | 1,050 | 85 | 900 | 65 | 85.71% | 91.8% | 100.0% |
| **NCR** | Non-Conformance Reports | 401 | 395 | 70 | 324 | 1 | 82.03% | 89.2% | 100.0% |
| **SOR** | Site Observation Reports | 280 | 280 | 35 | 220 | 25 | 78.57% | 93.6% | 100.0% |
| **TRS** | Transmittals | 1,250 | 1,250 | 0 | 1,250 | 0 | 100.00% | 100.0% | 100.0% |
| **LTR** | Letters / Correspondence | 980 | 980 | 0 | 980 | 0 | 100.00% | 99.5% | 100.0% |

---

## 🔒 Golden Baseline Enforcement Criteria

Any proposed code update MUST satisfy:

1. **Zero Variance (0.000%)**: Calculated values against the Golden Baseline dataset must yield exact match (Delta = 0).
2. **Build Parity**: `npm run build` succeeds without type errors.
3. **Lint Parity**: `npm run lint` yields 0 warnings and 0 errors.
4. **Architectural Parity**: `npm run architecture-audit` confirms 100% downward DAG flow and 0 circular dependencies.

---

## 📄 Archived Specification Artifacts

- Master Baseline: `/src/test-datasets/GOLDEN_REGRESSION_BASELINE.json`
- Frozen Rules: `/src/test-datasets/FrozenSpecification.json`
- Individual Register Snapshots: `/src/test-datasets/*_Reference.json`
