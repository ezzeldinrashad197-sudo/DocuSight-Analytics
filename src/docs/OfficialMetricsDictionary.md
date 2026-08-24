# StructuSight Analytics – Official Metrics Dictionary

## 1. Architectural Principles & Notation
In accordance with the enterprise calculation engine specification, all metrics are defined using **pure logical descriptions** rather than SQL implementation syntax. 

Key architectural rules:
- **Terminal States**: A record or revision reaches a terminal state when it is `Closed`, `Approved`, or `Superseded`.
- **Open Status Principle**: `Open` is an operational state defined by exclusion of terminal states, not by matching arbitrary status strings.
- **Hierarchy & Subsets**: Metrics such as `Under Review` and `Pending` are strict subsets of `Open` (`⊂ Open`).
- **Carry Forward**: Monthly reports account for cumulative carry-forwards from prior periods where applicable.

---

## 2. Comprehensive Official Metrics Dictionary

| Metric ID | Metric Name | Category | Logical Definition | Mathematical / Logical Formula | Scope & Relationships |
|---|---|---|---|---|---|
| **MET-001** | **Open** | Operational | Any unique document whose latest revision is not in a terminal state (Closed, Approved, or Superseded). | Number of unique records whose latest revision status is neither Closed, Approved, nor Superseded. | Primary active backlog metric. Supersedes all sub-states (`Under Review`, `Pending`, `Rejected Open`). |
| **MET-002** | **Closed** | Terminal | Items that have been officially accepted, resolved, approved, or closed out in accordance with project governance. | Number of unique records whose latest revision status is Closed or successfully resolved. | Terminal state. Excludes `resolution_status='Approved'` if already normalized to Closed. |
| **MET-003** | **Under Review** | Operational (Subset) | Items currently undergoing technical evaluation or stakeholder assessment by the assigned reviewer. | Number of unique open records whose operational workflow state is 'Under Review'. | **Under Review ⊂ Open**. Subset of the active Open backlog. |
| **MET-004** | **Pending** | Operational (Subset) | Items awaiting initial assignment, supplementary documentation, or prerequisite actions. | Number of unique open records awaiting initial review or documentation. Includes carry-forward items from prior periods unless restricted to the current calendar month. | **Pending ⊂ Open**. Subset of the active Open backlog. |
| **MET-005** | **Overdue** | Performance | Items that have exceeded their designated contractual response or review due date without completion. | Number of open unique records where the current system date is greater than the designated due date. | Cross-cuts Open subset items (`Overdue ∩ Open`). |
| **MET-006** | **Approved** | Terminal / Status | Submissions that have received formal technical approval without necessarily completing administrative closeout. | Number of unique documents whose latest revision status is officially Approved. | Terminal or pre-closeout approval state. |
| **MET-007** | **Rejected** | Operational | Submissions that have been formally rejected during technical review. | Total count of revisions or documents marked with a rejection status. | General category encompassing both active and resolved rejections. |
| **MET-008** | **Rejected Open** | Operational (Subset) | A rejected revision that remains active and unresolved, requiring contractor resubmission. | Number of rejected revisions whose latest sequence has not yet been superseded or closed. | **Rejected Open ⊂ Open**. Contributes to the active Open backlog. |
| **MET-009** | **Rejected Closed** | Terminal | A rejected revision that has been superseded by a new revision or formally closed out. | Number of rejected revisions that reached a terminal resolution state. | Terminal state. Excluded from active Open backlog. |
| **MET-010** | **Latest Revision** | Engine Core | The most recent revision per unique document identifier based on sequencing rules. | The revision within a document group having the highest revision index (e.g. Rev.2 over Rev.1). | Foundation for all canonical deduplication and status evaluation. |
| **MET-011** | **Current Revision** | Operational | The active operational revision currently under consideration or execution. | Equivalent to Latest Revision in standard workflows, unless overridden by specific change order rules. | Operational pointer for active document handling. |
| **MET-012** | **Duplicate** | Quality | Identical revision or duplicate log entry identified by document reference and metadata matching. | Number of submission records sharing identical document reference and revision numbers within the log. | Filtered out during canonical deduplication. |
| **MET-013** | **Rev.0** | Baseline | The initial baseline submission for a document (Revision 0, Rev 0, or Rev A). | The foundational revision initiating a document lifecycle sequence. | Baseline reference for tracking subsequent revision deltas. |
| **MET-014** | **Subsequent Revision** | Engineering | Revisions following Rev.0 (e.g., Rev.1, Rev.2, Rev.B, etc.) issued for review or construction. | Any revision in a document lineage where revision index > 0. | Tracks engineering iteration and revision cycles. |
| **MET-015** | **Total Unique Documents** | Volume | Total count of distinct document identifiers across the entire project dataset. | Count of distinct document reference keys (`docNo`, `ncrRef`, `sorRef`, `rfiRef`). | Master volume baseline for project reporting. |
| **MET-016** | **Monthly Submissions** | Volume | Count of submissions registered within a specific calendar month. | Count of all submission records where submission date falls within the target calendar month. | Temporal reporting metric. |
| **MET-017** | **Cumulative Documents** | Volume | Running total of unique documents up to the reporting cutoff date, including carry-forwards. | Total unique documents registered from project inception up to the specified cutoff date. | Used in cumulative trend charts and S-curves. |
| **MET-018** | **Duplicate Detection Rate** | Quality | Percentage of duplicate submissions flagged and neutralized by the engine. | (Total Duplicate Records / Total Raw Submissions) × 100%. | Data hygiene and quality KPI. |
| **MET-019** | **Approval Rate** | Performance | Percentage of unique documents or revisions successfully approved relative to total processed. | (Total Approved / Total Processed Submissions) × 100%. | Contractor performance and quality indicator. |
| **MET-020** | **Rejection Rate** | Performance | Percentage of submissions encountering rejection during review relative to total processed. | (Total Rejected / Total Processed Submissions) × 100%. | Quality risk indicator. |

---

## 3. Structural Mathematical Formula Relationships & Alignment
To guarantee mathematical consistency and enforce subset relations across dashboards, the following formal equations are certified:

### A. Open Backlog Deconstruction / تفكيك المتراكم النشط مفتوح
The total `Open` backlog consists strictly of documents that have not entered a terminal state (`Closed` or `Approved`). They are mathematically partitioned into the following operational subsets:

$$\text{Open} = \text{Under Review} + \text{Pending} + \text{Workflow Waiting} + \text{Other Active States}$$

$$\text{المفتوح} = \text{تحت المراجعة} + \text{معلق} + \text{بانتظار سير العمل} + \text{الحالات النشطة الأخرى}$$

This ensures:
1. **Subset Compliance**: $\text{Under Review} \subseteq \text{Open}$ and $\text{Pending} \subseteq \text{Open}$.
2. **Zero-Leaking Audits**: Any active record must fall into exactly one of these operational sub-categories.

### B. Pending Backlog Temporal Partitioning / تقسيم المعلق الزمني
To provide senior management with transparent differentiation between ancestral backlogs (Carry Forward) and fresh action items of the current cycle, the total `Pending` metric is partitioned as:

$$\text{Pending} = \text{Carry Forward Pending} + \text{Current Month Pending}$$

$$\text{المعلق الكلي} = \text{مرحل معلق} + \text{معلق الشهر الحالي}$$

Where:
- **Carry Forward Pending (مرحل معلق)** represents pending items whose initial submission date lies prior to the active month's start.
- **Current Month Pending (معلق الشهر الحالي)** represents pending items whose initial submission occurred within the active month.
