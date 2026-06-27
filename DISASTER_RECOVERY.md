# DocuSight Analytics Platform — Enterprise Disaster Recovery (DR) Plan

This document establishes the official enterprise Disaster Recovery and Business Continuity guidelines for the DocuSight Analytics Platform under production conditions.

## 1. Executive Summary & Recovery Standards

Excellent operational resilience rests on strict recovery targets. The following thresholds are enforced for all Sev-1 outage events:

*   **Recovery Time Objective (RTO)**: **< 15 Minutes**. Complete restore of user-facing web layers, database syncs, and AI insights analysis.
*   **Recovery Point Objective (RPO)**: **< 5 Minutes**. Maximum allowable period of structural transaction logs or audit logs loss under catastrophic disaster events.

---

## 2. Recovery Team & Call Tree Escalation

In the event of an outage, the following team roles must be summoned immediately:

| Escalation Rank | Role | Responsibility | Contact SLA |
| :--- | :--- | :--- | :--- |
| **Primary Responder** | Site Reliability Engineer (SRE) | Direct Incident Commander, traffic routing, container restarts. | Immediate (7 min response) |
| **Secondary Escalation**| Database Administrator (DBA) | Firestore transaction logs integrity verification and point-in-time recoveries. | 10 mins post-incident |
| **Tertiary Escalation** | Security Officer (CISO) | Compliance reporting, security rules auditing, legal and user disclosures. | 15 mins post-incident |

---

## 3. Database Resilience & Backup Verification

### 3.1 Firestore Automated Backups
Firestore backups must run automatically onto locked Cloud Storage buckets utilizing Object Lifecycle Management:
*   **Schedule**: Automated Cron executes every 4 hours (`0 */4 * * *`).
*   **Storage Directory**: `gs://docusight-production-backups-europe-west2`
*   **Retention Period**: 30 days active history.

### 3.2 Manual Backup Trigger Procedure
SRE logs can manually run backup actions using the Google Cloud CLI:
```bash
gcloud firestore export gs://docusight-production-backups-europe-west2 --async
```

### 3.3 Database Point-in-Time Recovery (PITR) Execution
To rollback the database state to a specific second within the 7-day retention window:
1.  Ensure active user sessions are safely locked using Viewer Mode under Firestore security rules.
2.  Restore the collections hierarchy to target destination:
    ```bash
    gcloud firestore import gs://docusight-production-backups-europe-west2/2026-06-18T12:00:00_ad31/
    ```
3.  Execute custom schema verification checks (`npx ts-node check-db.ts`) to validate relational constraint indexes before opening public traffic.

---

## 4. Application Failover Strategy & Environment Recovery

To rebuild the platform's computing layer from scratch, use the following execution sequences:

### 4.1 Deployment Recovery Sequence
If the Cloud Run host suffers physical hardware/region loss:
1.  **Configure Target Cloud Provider Region**: Shift ingress traffic dynamically from `europe-west2` to `europe-west1` (Secondary DR cluster).
2.  **App deployment from compiled registry**:
    ```bash
    gcloud run deploy docusight-analytics-dr \
       --image=gcr.io/docusight-prod/applet:latest \
       --platform=managed \
       --region=europe-west1 \
       --allow-unauthenticated
    ```
3.  **Confirm Secrets Bindings**: Ensure current environment variables are securely injected from the Cloud Secret Manager (e.g., `GEMINI_API_KEY`).

### 4.2 Security Rules Version Check
Ensure rules match the official production security policy:
```bash
firebase deploy --only firestore:rules --project docusight-production-security
```

---

## 5. Instant Rollback & Post-Incident Release Auditing

Each containerized release must carry an immutable identity stamp enabling safe rollbacks. 

### 5.1 Release ID Standard Format
Every production bundle registers a unique metadata stamp inside the platform metadata log:
```json
{
  "release-version": "v3.12.4-stable",
  "commit-id": "8a3dcf124bf051c9d64ba24db39ee285e135cf21",
  "deployment-time": "2026-06-18T17:55:00Z",
  "rollback-target": "v3.12.3-release"
}
```

### 5.2 Deployment Rollback Execution
If an anomaly is detected post-deployment (e.g., high rate of circuit-breaker triggers or memory leaks):
1.  Immediately revert the Cloud Run container instance back to the latest verified stable revision:
    ```bash
    gcloud run services update-traffic docusight-analytics-platform \
       --to-revisions=docusight-analytics-platform-v3-12-3=100
    ```
2.  Restore firestore security rules to the previous stable state tag inside Git history.
3.  Trigger the **Automated Security Regression Suite** (`/api/security-regression-tests`) and the **Production Load & Stress Testing Suite** (`/api/load-stress-tests`) on the active server instance to audit post-rollback stability.
4.  Log the rollback outcome to the immutable `audit_logs` collection.
