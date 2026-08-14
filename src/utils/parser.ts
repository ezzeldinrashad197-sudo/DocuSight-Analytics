import * as XLSX from "xlsx";
import { SubmittalRow } from "../types";
import { normalizeData } from "./calculations";
import { classifyRegisterSheet, normalizeDiscipline } from "./classificationEngine";
import { mapDocumentToWorkflow } from "./workflowMapping";

const MONTH_NAME_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12'
};

export const formatDate = (raw: unknown): string => {
  if (!raw) return "";
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return "";
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof raw === "number") {
    const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  if (typeof raw === "string") {
    const str = raw.trim();
    if (!str) return "";

    // 1. Explicit DD-MMM-YYYY or DD/MMM/YYYY or DD MMM YYYY (e.g. 1-Aug-2026, 01-August-2026, 2-Aug-26)
    const dMmmYMatch = str.match(/^(\d{1,2})[\/\.\-\s]+([A-Za-z]+)[\/\.\-\s]+(\d{2,4})$/);
    if (dMmmYMatch) {
      const day = parseInt(dMmmYMatch[1], 10);
      const monStr = dMmmYMatch[2].toLowerCase();
      let year = parseInt(dMmmYMatch[3], 10);
      if (dMmmYMatch[3].length === 2) {
        year = year > 50 ? 1900 + year : 2000 + year;
      }
      const month = MONTH_NAME_MAP[monStr];
      if (month && day >= 1 && day <= 31) {
        const dStr = String(day).padStart(2, '0');
        return `${year}-${month}-${dStr}`;
      }
    }

    // 2. Explicit MMM-DD-YYYY or MMM DD, YYYY (e.g. Aug 1, 2026)
    const mmmDYMatch = str.match(/^([A-Za-z]+)[\/\.\-\s]+(\d{1,2})[\/\.\-\s,]+(\d{2,4})$/);
    if (mmmDYMatch) {
      const monStr = mmmDYMatch[1].toLowerCase();
      const day = parseInt(mmmDYMatch[2], 10);
      let year = parseInt(mmmDYMatch[3], 10);
      if (mmmDYMatch[3].length === 2) {
        year = year > 50 ? 1900 + year : 2000 + year;
      }
      const month = MONTH_NAME_MAP[monStr];
      if (month && day >= 1 && day <= 31) {
        const dStr = String(day).padStart(2, '0');
        return `${year}-${month}-${dStr}`;
      }
    }

    // 3. Explicit DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmYMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (dmYMatch) {
      const p1 = parseInt(dmYMatch[1], 10);
      const p2 = parseInt(dmYMatch[2], 10);
      const year = parseInt(dmYMatch[3], 10);

      // If p1 <= 31 and p2 <= 12, assume DD/MM/YYYY (standard in UK/EU/Gulf construction registers)
      if (p2 >= 1 && p2 <= 12 && p1 >= 1 && p1 <= 31) {
        const dStr = String(p1).padStart(2, '0');
        const mStr = String(p2).padStart(2, '0');
        return `${year}-${mStr}-${dStr}`;
      }
    }

    // 4. Explicit YYYY-MM-DD
    const yMdMatch = str.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
    if (yMdMatch) {
      const year = parseInt(yMdMatch[1], 10);
      const month = parseInt(yMdMatch[2], 10);
      const day = parseInt(yMdMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const dStr = String(day).padStart(2, '0');
        const mStr = String(month).padStart(2, '0');
        return `${year}-${mStr}-${dStr}`;
      }
    }

    // 5. Fallback to JS Date parser without timezone shift
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return "";
};

export const parseExcelFile = (file: File): Promise<SubmittalRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, {
          type: "binary",
          cellDates: true,
          dateNF: "yyyy-mm-dd",
        });
        const parsed: SubmittalRow[] = [];
        const traces: any[] = [];

        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            raw: false,
          }) as (string | number | boolean | Date | null)[][];

          let headerRowIdx = -1;
          let logInfoStr = "";
          for (let i = 0; i < Math.min(30, rawData.length); i++) {
            const row = rawData[i];
            if (Array.isArray(row)) {
              const rowStr = row
                .map((c) => String(c).toLowerCase().trim())
                .join(" ");
              if (rowStr.includes("log:")) {
                logInfoStr = rowStr + " " + logInfoStr;
              }
              // Look for common headers
              if (
                rowStr.includes("discipline") ||
                rowStr.includes("document no") ||
                rowStr.includes("submission date") ||
                rowStr.includes("date sent") ||
                rowStr.includes("letter ref") ||
                rowStr.includes("sub ref")
              ) {
                headerRowIdx = i;
                break;
              }
            }
          }

          if (headerRowIdx === -1) return;

          const headers: (string | number | boolean | Date | null)[] =
            rawData[headerRowIdx] || [];
          const rows = rawData.slice(headerRowIdx + 1);

            const activeProjectId = typeof window !== 'undefined' ? (localStorage.getItem('docuCtrl_activeProjectId') || 'default_project') : 'default_project';
          const classification = classifyRegisterSheet({
            fileName: file.name,
            sheetName: sheetName,
            headers: headers.map(h => String(h || '')),
            sampleRows: rows.slice(0, 20) as any[][],
            projectId: activeProjectId
          });

          const detectedType = classification.detectedFamily;
          const compIdent = classification.compositeIdentity;

          const getColIdx = (aliases: string[], exclusions: string[] = []) => {
            return headers.findIndex((h) => {
              if (!h || typeof h !== "string") return false;
              const lower = h.toLowerCase().trim();
              if (exclusions.some((exc) => lower.includes(exc))) return false;
              return aliases.some(
                (alias) => lower === alias || lower.includes(alias),
              );
            });
          };

          const colDocNo = getColIdx([
            "document no",
            "doc no",
            "submittal ref",
            "sub ref",
            "ref",
            "letter ref",
            "letter ref.",
          ]);
          const colRev = getColIdx(["rev", "revision"]);
          const colSheet = getColIdx(["sheet no", "sheet"]);
          const colDiscipline = getColIdx([
            "discipline",
            "trade",
            "department",
            "related discipline",
            "category",
            "submittal category",
            "discipline / trade",
            "discipline/trade",
            "trade / system",
            "trade/system",
            "spec section",
            "spec. section",
            "discipline/category",
            "discipline / category",
          ]);
          const colContractor = getColIdx(["contractor"]);
          const colConsultant = getColIdx(["consultant"]);
          const colSubmissionDate = getColIdx(
            ["submission date", "date sent", "sent date", "received date", "issue date", "date issued", "date of receipt"],
            ["corrective", "response", "action", "received corrective", "sent corrective"]
          );
          const colDueDate = getColIdx(["due date"]);
          const colResponseDate = getColIdx(
            ["received corrective", "received date corrective", "response date", "received date corrective action", "consultant response", "response date corrective action"],
            ["submission", "sent corrective", "sent date corrective"]
          );
          const colCode = getColIdx(["code", "approval code"]);
          const colStatus = getColIdx(["status"]);
          const colRemarks = getColIdx(["remarks", "comment"]);
          const colArea = getColIdx(["area", "zone"]);
          const colSystem = getColIdx(["system", "trade"]);

          // NCR & SOR Specific Columns
          const colNcrRef = getColIdx(["ncr ref"]);
          const colNcrLastRev = getColIdx(["last rev"]);
          const colNcrSentDateCorrectiveAction = getColIdx(
            ["sent corrective", "sent date corrective", "sent corrective action", "sent date corrective action", "date sent corrective"],
            ["received", "response", "submission"]
          );
          const colNcrAction = getColIdx(["action"]);
          const colResponseTime = getColIdx(["response time"]);
          const colReviewTime = getColIdx(["review time"]);
          const colTotalDuration = getColIdx(["total duration"]);

          // Letters Specific Columns
          const colSubject = getColIdx(["subject"]);
          const colDistributions = getColIdx(["distributions"]);
          const colActionRequired = getColIdx(["action required"]);
          const colHyperlink = getColIdx(["hyperlink"]);

          const fallbackColDate = headers.findIndex(
            (h) =>
              h && typeof h === "string" && h.toLowerCase().trim() === "date",
          );
          const finalColDateSent =
            colSubmissionDate !== -1 ? colSubmissionDate : fallbackColDate;

          let determinedDirection: "IN" | "OUT" | undefined = undefined;
          let determinedStakeholder: string | undefined = undefined;

          const contextualStr = (
            logInfoStr +
            " " +
            sheetName +
            " " +
            file.name
          ).toLowerCase();
          if (contextualStr.includes("letter")) {
            if (
              contextualStr.includes(" in ") ||
              contextualStr.includes("from ")
            )
              determinedDirection = "IN";
            if (
              contextualStr.includes(" out ") ||
              contextualStr.includes("to ")
            )
              determinedDirection = "OUT";

            if (
              contextualStr.includes("archimid") ||
              contextualStr.includes("arch")
            )
              determinedStakeholder = "Archimid";
            else if (contextualStr.includes("ace"))
              determinedStakeholder = "ACE";
            else if (contextualStr.includes("imkan"))
              determinedStakeholder = "IMKAN";
          }

          rows.forEach((r, idx: number) => {
            if (!r || !Array.isArray(r) || r.length === 0) return;
            const submissionDate = formatDate(r[finalColDateSent]);
            const responseDate = formatDate(
              colResponseDate >= 0 ? r[colResponseDate] : "",
            );
            if (
              !submissionDate &&
              !responseDate &&
              colNcrRef === -1 &&
              !sheetName.toUpperCase().includes("NCR")
            )
              return;

            let disciplineVal = "";
            let rawDiscipline = "";
            if (colDiscipline >= 0 && r[colDiscipline]) {
              rawDiscipline = String(r[colDiscipline]).trim().toUpperCase();
            } else if (sheetName.toUpperCase().includes("RFI") && r[3]) {
              rawDiscipline = String(r[3]).trim().toUpperCase();
            }

            const extractDiscipline = (str: string): string | null => {
              const t = str.toUpperCase().trim();
              if (t.includes("STR/SUR") || t.includes("STR-SUR") || t.includes("STR_SUR")) return "STR/SUR";
              const words = t.split(/[-_ \/(),&.]/);
              if (words.includes("STR") && (words.includes("ARC") || words.includes("ARCH"))) {
                return null; // Multi-discipline name (e.g. ARCH & STR)
              }
              if (words.includes("MEP") || words.includes("M.E.P") || t.includes("كهروميكانيك") || t.includes("اليكتروميكانيك") || t.includes("الكتروميكانيك")) {
                return "MEP";
              }
              if (
                words.includes("ARC") ||
                words.includes("ARCH") ||
                words.includes("ARCHITECTURAL") ||
                t.includes("ARCHITECT") ||
                t.includes("معماري") ||
                t.includes("معمارى")
              )
                return "ARCH";
              if (
                words.includes("STR") ||
                words.includes("STRUCT") ||
                words.includes("STRUCTURAL") ||
                words.includes("CIVIL") ||
                words.includes("CVL") ||
                t.includes("انشائي") ||
                t.includes("إنشائي") ||
                t.includes("انشائى") ||
                t.includes("إنشائى")
              )
                return "STR";
              if (
                words.includes("MEC") ||
                words.includes("MECH") ||
                words.includes("MECHANICAL") ||
                t.includes("MECHANIC") ||
                t.includes("ميكانيك") ||
                t.includes("ميكانيكا")
              )
                return "MECH";
              if (
                words.includes("ELE") ||
                words.includes("ELEC") ||
                words.includes("ELECTRICAL") ||
                t.includes("ELECTRIC") ||
                t.includes("كهربا") ||
                t.includes("كهرباء")
              )
                return "ELEC";
              if (words.includes("INF") || words.includes("INFR") || words.includes("INFRA") || words.includes("INFRASTRUCTURE") || t.includes("طرق") || t.includes("بنية تحتية"))
                return "INFRA";
              if (
                words.includes("LND") ||
                words.includes("LAN") ||
                words.includes("LAND") ||
                t.includes("LANDSCAPE") ||
                t.includes("لاندسكيب") ||
                t.includes("لاند سكيب")
              )
                return "LAND";
              if (
                words.includes("HSE") ||
                words.includes("SAFETY") ||
                words.includes("HEALTH") ||
                words.includes("ENV") ||
                words.includes("ENVIRO") ||
                t.includes("SAFETY") ||
                t.includes("سلامة") ||
                t.includes("سلامه") ||
                t.includes("بيئة") ||
                t.includes("بيئه")
              )
                return "HSE";
              if (
                words.includes("SURV") ||
                words.includes("SURVEY") ||
                t.includes("SURVEY") ||
                t.includes("مساحة") ||
                t.includes("مساحه")
              )
                return "SURVEY";
              return null;
            };

            const isLetter = 
              contextualStr.includes("letter") ||
              contextualStr.includes("ltr") ||
              sheetName.toLowerCase().includes("letter") ||
              sheetName.toLowerCase().includes("ltr") ||
              sheetName.includes("خطابات") ||
              file.name.includes("خطابات");

            const isNcr = 
              contextualStr.includes("ncr") ||
              sheetName.toLowerCase().includes("ncr") ||
              file.name.toLowerCase().includes("ncr") ||
              sheetName.includes("عدم") ||
              file.name.includes("عدم") ||
              contextualStr.includes("hse") ||
              sheetName.toLowerCase().includes("hse") ||
              file.name.toLowerCase().includes("hse") ||
              contextualStr.includes("safety") ||
              sheetName.toLowerCase().includes("safety") ||
              file.name.toLowerCase().includes("safety");

            const compDisc = compIdent?.discipline;
            const isCompDiscValid = compDisc && compDisc !== 'UNCLASSIFIED';

            if (
              rawDiscipline &&
              rawDiscipline.length > 0 &&
              !["YES", "NO", "N/A", "-", "NONE", "NULL"].includes(rawDiscipline)
            ) {
              const extracted = extractDiscipline(rawDiscipline);
              if (extracted && extracted !== 'GEN') {
                disciplineVal = extracted;
              } else if (isCompDiscValid && (rawDiscipline === 'GEN' || rawDiscipline === 'GENERAL')) {
                // Evidence Protection Rule:
                // Level 1 / Level 2 composite identity (e.g. WIR-ARCH) MUST NOT be overwritten by generic row value
                disciplineVal = compDisc;
              } else {
                disciplineVal = rawDiscipline;
              }
            } else if (isCompDiscValid) {
              // Inherit from CompositeIdentity if no explicit row discipline
              disciplineVal = compDisc;
            } else {
              const refString = (
                colNcrRef >= 0
                  ? String(r[colNcrRef])
                  : colDocNo >= 0
                    ? String(r[colDocNo])
                    : ""
              ).toUpperCase();
              const extractedRefDisc = extractDiscipline(refString);
              if (extractedRefDisc) {
                disciplineVal = extractedRefDisc;
              } else if (isLetter) {
                disciplineVal = "GENERAL";
              } else if (isNcr && (contextualStr.includes("hse") || contextualStr.includes("safety"))) {
                disciplineVal = "HSE";
              } else {
                // Zero-Invention Rule: Output UNCLASSIFIED when evidence is insufficient.
                // NEVER silently convert to SURVEY or HSE or GENERAL!
                disciplineVal = "UNCLASSIFIED";
              }
            }

            const rawCode =
              colCode >= 0
                ? String(r[colCode] || "")
                    .trim()
                    .toUpperCase()
                : "";
            const rawStatus =
              colStatus >= 0
                ? String(r[colStatus] || "")
                    .trim()
                    .toUpperCase()
                : "";

            let combinedStatus = rawCode;
            if (rawStatus && rawStatus !== rawCode) {
              combinedStatus = combinedStatus
                ? `${combinedStatus} - ${rawStatus}`
                : rawStatus;
            }

            const finalDisciplineVal = normalizeDiscipline(disciplineVal, activeProjectId);

            parsed.push({
              id: `${sheetName}-${idx}`,
              logType: compIdent?.compositeCode || (detectedType !== 'UNKNOWN' ? detectedType : sheetName.trim().toUpperCase()),
              sourceFile: file.name.replace(/\.[^/.]+$/, ""),
              rawSourceIdentity: compIdent?.rawSourceIdentity || file.name,
              contextDiscipline: compIdent?.discipline,
              compositeIdentity: compIdent,
              documentType: "", // Normalized later
              trade: "", // Normalized later
              workflowStage: "", // Normalized later
              isLatestRev: false, // Normalized later
              isRev0: false, // Normalized later
              delayDays: 0, // Normalized later
              overdue: false, // Normalized later
              docNo: colDocNo >= 0 ? String(r[colDocNo] || "").trim() : "",
              rev: colRev >= 0 ? String(r[colRev] || "").trim() : "",
              sheetNo: colSheet >= 0 ? String(r[colSheet] || "").trim() : "",
              discipline: finalDisciplineVal,
              contractor:
                colContractor >= 0 ? String(r[colContractor] || "").trim() : "",
              consultant:
                colConsultant >= 0 ? String(r[colConsultant] || "").trim() : "",
              submissionDate,
              dueDate: formatDate(colDueDate >= 0 ? r[colDueDate] : ""),
              responseDate,
              status: combinedStatus,
              remarks:
                colRemarks >= 0 ? String(r[colRemarks] || "").trim() : "",
              area: colArea >= 0 ? String(r[colArea] || "").trim() : "",
              tradeSystem:
                colSystem >= 0 ? String(r[colSystem] || "").trim() : "",

              // NCR & SOR Specific properties
              ncrRef: colNcrRef >= 0 ? String(r[colNcrRef] || "").trim() : "",
              ncrLastRev:
                colNcrLastRev >= 0 ? String(r[colNcrLastRev] || "").trim() : "",
              ncrStatus: rawStatus,
              ncrAction:
                colNcrAction >= 0 ? String(r[colNcrAction] || "").trim() : "",
              ncrSentDateCorrectiveAction: formatDate(
                colNcrSentDateCorrectiveAction >= 0
                  ? r[colNcrSentDateCorrectiveAction]
                  : "",
              ),

              sorRef: colNcrRef >= 0 ? String(r[colNcrRef] || "").trim() : "",
              sorStatus: rawStatus,
              sorAction:
                colNcrAction >= 0 ? String(r[colNcrAction] || "").trim() : "",
              sorSentDateCorrectiveAction: formatDate(
                colNcrSentDateCorrectiveAction >= 0
                  ? r[colNcrSentDateCorrectiveAction]
                  : "",
              ),

              // New fields for SOR & Letters
              subject:
                colSubject >= 0 ? String(r[colSubject] || "").trim() : "",
              sentDateCorrectiveAction: formatDate(
                colNcrSentDateCorrectiveAction >= 0
                  ? r[colNcrSentDateCorrectiveAction]
                  : "",
              ),
              action:
                colNcrAction >= 0 ? String(r[colNcrAction] || "").trim() : "",
              recordStatus: rawStatus,
              responseTime:
                colResponseTime >= 0 && !isNaN(Number(r[colResponseTime]))
                  ? Number(r[colResponseTime])
                  : undefined,
              reviewTime:
                colReviewTime >= 0 && !isNaN(Number(r[colReviewTime]))
                  ? Number(r[colReviewTime])
                  : undefined,
              totalDuration:
                colTotalDuration >= 0 && !isNaN(Number(r[colTotalDuration]))
                  ? Number(r[colTotalDuration])
                  : undefined,

              // Letter Specific fields
              direction: determinedDirection,
              stakeholder: determinedStakeholder,
              normalizedRef: (() => {
                const rawRef =
                  colDocNo >= 0 ? String(r[colDocNo] || "").trim() : "";
                const match = rawRef.match(/(L-\d+|DN-\d+)/i);
                return match ? match[1].toUpperCase() : rawRef;
              })(),
              actionRequired:
                colActionRequired >= 0
                  ? String(r[colActionRequired] || "").toUpperCase() ===
                      "YES" ||
                    String(r[colActionRequired] || "").toUpperCase() === "TRUE"
                  : undefined,
              distributionStatus:
                colDistributions >= 0
                  ? String(r[colDistributions] || "").trim()
                  : "",
              hyperlink:
                colHyperlink >= 0 ? String(r[colHyperlink] || "").trim() : "",
            });
          });

          // Compute trace for this worksheet
          const assignedType = detectedType !== 'UNKNOWN' ? detectedType : sheetName.trim().toUpperCase();
          const mapped = mapDocumentToWorkflow(assignedType);
          let baseDocType = mapped.workflowFamily === 'LETTER' ? 'LTR' : mapped.workflowFamily;
          const normalizedType = `${baseDocType}-GEN`;
          const calculationType = mapped.engine;
          
          let reportType = "Monthly / Cumulative KPI Dashboards (General Stats)";
          if (baseDocType.includes('RFI')) {
            reportType = "RFI Analytics Tab";
          } else if (baseDocType.includes('NCR')) {
            reportType = "NCR Analytics (Excluded from General Stats)";
          } else if (baseDocType.includes('SOR')) {
            reportType = "SOR Analytics (Excluded from General Stats)";
          } else if (baseDocType.includes('LTR') || baseDocType.includes('LETTER')) {
            reportType = "Correspondence Analytics (Excluded from General Stats)";
          } else if (baseDocType === 'UNKNOWN') {
            reportType = "Workflow Mapping SSOT (Pending Action)";
          }

          traces.push({
            fileName: file.name,
            sheetName,
            detectedType,
            confidence: Math.round(classification.confidence * 100),
            evidence: classification.evidence,
            assignedType,
            normalizedType,
            calculationType,
            reportType
          });
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem('docuCtrl_last_upload_trace', JSON.stringify(traces));
          // Dispatch a custom event to notify components that a new trace is available
          window.dispatchEvent(new Event('docuCtrl_new_trace_loaded'));
        }

        // Print trace beautifully to console
        console.group(`%c📊 [StructuSight Ingestion Trace Logs]`, "color: #D4AF37; font-weight: bold; font-size: 14px;");
        traces.forEach(t => {
          console.log(`%cWorksheet: %c${t.sheetName} %cin File: %c${t.fileName}`, "color: #94a3b8;", "color: #e2e8f0; font-weight: bold;", "color: #94a3b8;", "color: #cbd5e1;");
          console.log(`%c  Detected Type : %c${t.detectedType} %c(Confidence: ${t.confidence}%)`, "color: #94a3b8;", "color: #38bdf8; font-weight: bold;", "color: #a7f3d0; font-style: italic;");
          console.log(`%c  Assigned Type : %c${t.assignedType}`, "color: #94a3b8;", "color: #fbbf24; font-weight: bold;");
          console.log(`%c  Normalized Type : %c${t.normalizedType}`, "color: #94a3b8;", "color: #a7f3d0; font-weight: bold;");
          console.log(`%c  Calculation Type: %c${t.calculationType}`, "color: #94a3b8;", "color: #818cf8; font-weight: bold;");
          console.log(`%c  Report Type     : %c${t.reportType}`, "color: #94a3b8;", "color: #34d399; font-weight: bold;");
          console.groupCollapsed(`%c  Evidence Summary (${t.evidence.length} items)`, "color: #94a3b8; font-style: italic; cursor: pointer;");
          t.evidence.forEach((ev: string) => console.log(`  - ${ev}`));
          console.groupEnd();
        });
        console.groupEnd();

        resolve(normalizeData(parsed));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};
