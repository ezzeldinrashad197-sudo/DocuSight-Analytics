# StructuSight Analytics – Canonical Runtime Wiring Report

This report documents the exact runtime wiring state of the **Canonical Engine Adapter** (`canonicalEngineAdapter.ts`) at the end of the Sprint 3 **Canonical Runtime Migration** phase. In strict alignment with the "Zero Deletion" and parallel verification constraints, this document outlines which components are active, which remain legacy, and how the pipeline executes.

---

## 1. File Reference Analysis: Who Calls `canonicalEngineAdapter.ts`?

Based on a static analysis of the active codebase:
* **Production Imports**: `0` active production files currently import `/src/analytics/governance/canonicalEngineAdapter.ts`.
* **Documentation References**: The adapter is referenced in the following architectural files:
  * `/src/docs/Sprint2Plan.md`
  * `/src/docs/Sprint2CompletionReport.md`
  * `/src/docs/RegressionVerificationReport.md`
  * `/src/docs/EnterpriseAcceptanceReport.md`

### **Architectural Reasoning**:
In accordance with the **Phase Two constraints**, the adapter acts as an isolated validation layer during Sprints 2 and 3. Wiring it directly into production UI imports prior to confirming 100% parity across edge-cases was forbidden to prevent premature service disruptions.

---

## 2. Pipeline Integration Point

The adapter is engineered to sit directly between the raw data intake layer and the core deduplication/revision engine:

```
[Raw File Upload / SharePoint Log]
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  canonicalEngineAdapter.ts                                  │
│  └─ executeAdaptedCalculationPipeline(rows)                  │
│       ├── 1. Run validationFramework.ts (validateRecord)     │
│       ├── 2. Run auditFramework.ts (recordAuditLog)          │
│       └── 3. Run calculationFoundation.ts                    │
│                └─ processRevisionEngine(rows)               │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
[Canonical Output Array / State Maps]
```

---

## 3. Active Dashboards & Legacy Dependencies

Since the runtime migration is governed by a gradual, side-by-side transition strategy, we map the dependency states of all visual dashboards and exporters.

### **A. Exporters & Slide Generators (100% Legacy)**
These components continue to consume the legacy calculation pipeline in `src/utils/calculations.ts` (specifically `calculateStats`, `calculateNCRStats`, `calculateSORStats`, and `calculateLTRStats`) to guarantee absolute operational continuity during exporting:
* **PDF Exporter Engine**: `/src/analytics/exportEngine.ts` and `/src/analytics/exportHelpers.ts`
* **PPTX Exporter Engine**: `/src/Presentation.tsx`

### **B. Interactive UI Dashboards (100% Legacy)**
The primary analytical views and tabs on the frontend are fully operational but depend on legacy calculation wrappers:
* **Enterprise KPI Dashboard**: `/src/EnterpriseDashboard.tsx`
* **Report View Table**: `/src/ReportTable.tsx`
* **NCR Analytics Dashboard**: `/src/NCRAnalytics.tsx`
* **RFI Analytics Dashboard**: `/src/RFIAnalytics.tsx`
* **SOR Analytics Dashboard**: `/src/SORAnalytics.tsx`
* **SLA Monitoring Portal**: `/src/components/SLAMonitoring.tsx`
* **Historical Data Warehouse**: `/src/components/HistoricalDataWarehouse.tsx`
* **Advanced Aging Analysis**: `/src/components/AdvancedAgingAnalysis.tsx`
* **AI Copilot Insights Module**: `/src/AIInsights.tsx`

---

## 4. Migration Plan: Transitioning to the Canonical Engine

To fully bridge the legacy imports to the newly verified adapter in Phase Three, the following transition checklist will be executed:

1. **Step 1: Reference Updates**: Replace imports of `calculateStats` and related functions in `src/utils/calculations.ts` with wrapper calls routing through `executeAdaptedCalculationPipeline`.
2. **Step 2: Dual Telemetry Assessment**: Maintain the legacy mathematical engine running under-the-hood in parallel, logging any variance using `auditFramework.ts`.
3. **Step 3: Legacy Cleanup**: Decommission and purge legacy code paths only after 30 days of consistent zero-variance execution.
