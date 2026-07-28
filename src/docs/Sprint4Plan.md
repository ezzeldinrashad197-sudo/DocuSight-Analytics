# DocuSight Analytics – Sprint 4 Plan: Usability, SharePoint Integration, & Automated Ingest

Following the formal approval of Sprint 3 and the explicit mandates of the Engineering Reviewer, **Sprint 4** focuses on transitioning the platform from an isolated calculation framework toward an everyday production-ready enterprise utility. 

This phase is dedicated to user experience enhancement, robust mock/live integration pipelines, reduced manual workflow overhead, and high-fidelity ingestion processing.

---

## 1. Core Focus Areas (Sprint 4)

### A. User Experience (UX) Optimization
* **Aesthetic Data Quality Indicators**: Integrate intuitive status pills, tooltips, and interactive warnings within the submittal registers so users can instantly identify exactly why a record triggered a validation issue (e.g. missing discipline, custom revision warning).
* **Enhanced Drag-and-Drop Interactivity**: Provide detailed, real-time visual progress indicators during ingestion and cohort processing.

### B. SharePoint & Document Management Integration
* **Simulated Webhook Handshakes**: Harden the backend/mock pipeline to mimic SharePoint folder listening. The system will mock an automatic pull request when a file is modified inside a registered SharePoint folder.
* **Metadata Auto-Resolution**: Parse filenames based on standardized patterns to auto-resolve Document Number, Revision, and Discipline, reducing manually configured inputs.

### C. Reduction of Manual Intervention
* **Automated Data Normalization**: Whitespace stripping, date auto-formatting, and casing normalization will occur silently and automatically at the ingestion boundary.
* **Auto-Deduplication Pipelines**: When overlapping revisions are detected, the system will automatically prompt the user with a pre-configured conflict-resolution recommendation based on the `compareRevisions` algorithm.
* **Smart Import Profile**: Introduce per-project profile state auto-detection. Once configured for a project (e.g., identifying standard indicators for Shop Drawings, Material Submittals, MIR, RFI, NCR, WIR, and Letters), the system remembers these configurations to automatically process subsequent uploads without repetitive human mapping.
* **Enterprise Import Learning Engine**: Build an adaptive learning loop that captures manual user corrective actions (e.g., normalizing "SHOPDRAWING" to "SHOP DRAWING", "STR" to "STRUCTURAL", or "MEP" to "MECH"). The system saves these dynamic mappings per project, enabling future uploads to automatically align with company-specific metadata standards without throwing validation exceptions.

### D. Incoming Data Management Optimization
* **Interactive Cohort Resolution Dashboard**: Render a side-by-side comparative viewport of incoming data cohorts before committing them to the canonical database.
* **Exception Remediation Wizard**: Guide users through fixing validation errors interactively on-screen instead of rejecting files entirely.

---

## 2. Mandatory Dual-Execution Retention Safeguard

As formally commanded by the Engineering Reviewer, **the Legacy Calculation Engine shall NOT be removed or deprecated during Sprint 4**. 

### Safety Criteria for Future Decommissioning:
1. **Multi-Project Parallel Benchmarking**: The dual-execution pipeline must run simultaneously on at least **three distinct production-aligned datasets**.
2. **Multi-Cycle Stability Proof**: Parallel runs must demonstrate perfect parity (0.00 discrepancy) across at least **two consecutive reporting month closures**.
3. **Formal Approval Gate**: A dedicated *Runtime Equivalence Report* detailing parity across all metrics must be submitted, reviewed, and officially signed off by the Engineering Reviewer before the Legacy Engine can be retired.

---

## 3. Sprint 4 Implementation Backlog Mapping

| Task ID | Component / Source | Focus | Deliverable | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **TSK-401** | `/src/components/` | UX Optimization | Visual inline validation badges, tooltips, and file drop feedback. | **High** |
| **TSK-402** | `/src/utils/sharepoint.ts` | SharePoint Integration | Mock SharePoint folder listener, webhook simulated triggers, and file-pull actions. | **Medium** |
| **TSK-403** | `/src/analytics/` | Reducing Manual Intervention | Filename parser for auto-resolving Document No, Revision, and engineering disciplines. | **High** |
| **TSK-404** | `/src/components/` | Incoming Data Management | Live exception correction UI panel to fix errors before committing records. | **High** |
| **TSK-405** | `/src/analytics/` | Reducing Manual Intervention | **Smart Import Profile**: Auto-detect submittal register types (Shop Drawings, Materials, MIR, RFI, NCR, WIR, Letters) per project, and persist settings to eliminate repetitive configuration. | **High** |
| **TSK-406** | `/src/analytics/` | Reducing Manual Intervention | **Enterprise Import Learning Engine**: Adaptive mapping loop that records user corrections (e.g. "SHOPDRAWING" -> "SHOP DRAWING", "STR" -> "STRUCTURAL") to eliminate subsequent parsing exceptions automatically. | **High** |
