# StructuSight Analytics – Legacy Dependency Reduction Report

This report tracks the reduction of legacy code paths as we execute the progressive **Runtime Activation Phase**. In accordance with your strict instructions, migration must happen module-by-module without bulk transitions. Only after a module completes its dual-execution parity validation is it certified, and its legacy calls are safely replaced.

---

## 1. Quantitative Step-Down Dashboard

```
  [Initial Legacy Calls] : 97 Invocations
            │
            ▼
  [NCR Module Active]    : 79 Invocations (-18)
            │
            ▼
  [MIR Module Active]    : 67 Invocations (-12)
            │
            ▼
  [WIR Module Active]    : 53 Invocations (-14)
            │
            ▼
  [RFI Module Active]    : 31 Invocations (-22)
            │
            ▼
  [SOR Module Active]    : 21 Invocations (-10)
            │
            ▼
  [Full Unification]     :  0 Invocations (Decommissioning of dashboards & exporters)
```

---

## 2. Module-by-Module Legacy Dependency Tracking

The following table monitors the absolute number of legacy imports/invocations from `src/utils/calculations.ts` in each module before and after its respective activation step.

| Module / Component | Legacy Calls (Before) | Legacy Calls (After) | Current Status | Last Verification Timestamp |
|---|---|---|---|---|
| **NCR (Non-Conformance Reports)** | 18 | 18 | **Pending Stage 1 Activation** | *Baseline established* |
| **MIR (Material Inspection)** | 12 | 12 | **Pending** | *Baseline established* |
| **WIR (Work Inspection)** | 14 | 14 | **Pending** | *Baseline established* |
| **RFI (Request for Information)** | 22 | 22 | **Pending** | *Baseline established* |
| **SOR (Site Observation Reports)** | 10 | 10 | **Pending** | *Baseline established* |
| **Executive Dashboards / Metrics** | 25 | 25 | **Pending** | *Baseline established* |
| **Exporters (PDF / PPTX)** | 16 | 16 | **Pending** | *Baseline established* |

---

## 3. Quantitative Completion Progress Metric

- **Baseline Legacy Invocations (Total)**: 97
- **Current Active Legacy Invocations**: 97
- **Total Invocations Replaced**: 0
- **Overall Migration Progress**: **0%**

*This dashboard and tracking ledger will be updated sequentially at each gate review during the Runtime Activation Phase.*
