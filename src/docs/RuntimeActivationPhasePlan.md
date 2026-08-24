# StructuSight Analytics – Next Sprint: Runtime Activation Phase Plan

This plan documents the roadmap for the **Runtime Activation Phase** (the formal continuation beyond Sprint 3). In strict accordance with your architectural guidelines, this phase transitions the application from isolated infrastructure validation to active, controlled production execution through a 5-stage progressive rollout.

No legacy logic will be deleted prematurely. Decommissioning of `calculations.ts` will only occur after all modules prove 100% mathematical parity in dual-execution mode.

---

## The 5-Stage Activation Roadmap

```
[Legacy Calculations] ────► [Dual Execution & Parity] ────► [Canonical Engine Active]
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
      [Stage 1 & 2]               [Stage 3]                 [Stage 4]
    NCR Analytics Only         100% Parity Signoff      MIR, WIR, RFI, SOR
```

### 1. Stage 1: Initial Adapter Insertion (NCR Only)
- **Action**: Replace direct imports and invocations of `calculations.ts` within the Non-Conformance Report Analytics module (`NCRAnalytics.tsx`) with the unified `canonicalEngineAdapter.ts`.
- **Scope**: Isolated exclusively to the NCR register to minimize Blast Radius.

### 2. Stage 2: Dual Execution Enforced (NCR Only)
- **Action**: Implement a temporary dual-execution wrapper inside the NCR calculation pathway.
- **Mechanism**:
  - Run both legacy calculations and the new `executeAdaptedCalculationPipeline` in memory.
  - Automatically compare KPIs, status distributions, and record counts.
  - Log any mathematical or structural divergence to the `Audit Framework` (`auditFramework.ts`).

### 3. Stage 3: Parity Certification, 1-Week Stabilization & Approval
- **Action**: Monitor and verify the execution metrics under active operations.
- **Stabilization Window (Strict Constraint)**: Upon completing Stage 2 for any module (starting with NCR), the module **MUST** undergo a minimum of **one full week** of active operational testing over real-world production data.
- **Requirement**: No progression to the next module (e.g. from NCR to MIR) is permitted during this stabilization window. If any discrepancy, edge-case, or error is discovered during this active testing period, the issue must be patched, and the one-week stabilization timer resets.
- **Criteria**: If, and only if, the system demonstrates **100% parity** (zero mathematical divergence over real-world data logs) for the duration of the stabilization window, the NCR module is formally certified and permanently switched to the canonical calculation stream.

### 4. Stage 4: Sequential Module Expansion
- **Action**: Repeat the exact progressive procedure (Stage 1 through 3) sequentially for the remaining modules:
  1. **MIR** (Material Inspection Requests)
  2. **WIR** (Work Inspection Requests)
  3. **RFI** (Requests for Information)
  4. **SOR** (Site Observation Reports)
- **Requirement**: Each module must undergo its own isolated dual-execution verification phase before full activation.

### 5. Stage 5: Unified Entry Point & Legacy Safe Decommissioning
- **Action**: Establish `canonicalEngineAdapter.ts` as the absolute **Single Source of Truth** and sole calculation entry point for all UI components, dashboard widgets, and exporter engines (PDF/PPTX).
- **Decommissioning Protocol**:
  - Legacy calculation script `calculations.ts` will only be deleted or converted to a slim, backward-compatible **Compatibility Layer** after all module-specific steps are successfully completed and certified.

---

## 6. Strict Non-Negotiable Exit Criteria

Before any module can transition from the **Dual Execution** state to **Full Canonical Activation**, the developer must produce a formal sign-off report containing the following evidence:

1. **Runtime Wiring Evidence**
   - Precise list of all modified files.
   - Total count of active invocations shifted to `canonicalEngineAdapter.ts`.
   - Remaining calls targeting the legacy codebase.
2. **Regression Results**
   - Total number of records evaluated.
   - Exact mathematical matching rate (Must be strictly **100%**).
   - Analysis and trace reports of any discrepancies (if any).
3. **Performance Comparison**
   - Execution duration differences (Before vs. After).
   - Heap memory profile comparison.
   - Evaluation of user-facing UI responsiveness.
4. **Audit Verification**
   - Verification that audit entries are successfully committed to `auditFramework.ts`.
   - Logging of the `engineUsed` state (`Legacy`, `Canonical`, or `Dual Comparison`) for every execution.
   - Traceability proofs from database/file intake to final display layers.
5. **Rollback Verification**
   - Active validation of a zero-downtime regression switch back to `calculations.ts` if a live issue is detected.
