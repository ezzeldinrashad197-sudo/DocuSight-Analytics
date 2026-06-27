import * as XLSX from "xlsx";
import { SubmittalRow } from "../types";
import { normalizeData } from "./calculations";

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

          const getColIdx = (aliases: string[]) => {
            return headers.findIndex((h) => {
              if (!h || typeof h !== "string") return false;
              const lower = h.toLowerCase().trim();
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
          const colSheet = getColIdx(["sheet no", "sheet", "drawing no", "dwg no", "drawing number", "dwg no."]);
          const colDiscipline = getColIdx([
            "discipline",
            "trade",
            "department",
            "related discipline",
          ]);
          const colContractor = getColIdx(["contractor"]);
          const colConsultant = getColIdx(["consultant"]);
          const colSubmissionDate = getColIdx([
            "submission date",
            "date sent",
            "sent date",
          ]);
          const colDueDate = getColIdx(["due date"]);
          const colResponseDate = getColIdx([
            "response date",
            "received date",
            "received date corrective action",
          ]);
          const colCode = getColIdx(["code", "approval code"]);
          const colStatus = getColIdx(["status"]);
          const colRemarks = getColIdx(["remarks", "comment"]);
          const colArea = getColIdx(["area", "zone"]);
          const colSystem = getColIdx(["system", "trade"]);

          // NCR & SOR Specific Columns
          const colNcrRef = getColIdx(["ncr ref"]);
          const colNcrLastRev = getColIdx(["last rev"]);
          const colNcrSentDateCorrectiveAction = getColIdx([
            "sent date corrective action",
          ]);
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

          const formatDate = (raw: unknown): string => {
            if (!raw) return "";
            if (raw instanceof Date) {
              return raw.toISOString().split("T")[0];
            }
            if (typeof raw === "number") {
              const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
              if (!isNaN(date.getTime()))
                return date.toISOString().split("T")[0];
            }
            if (typeof raw === "string") {
              const parsed = new Date(raw);
              if (!isNaN(parsed.getTime()))
                return parsed.toISOString().split("T")[0];
            }
            return "";
          };

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
              const t = str.toUpperCase();
              const words = t.split(/[-_ \/(),]/);
              if (
                words.includes("ARC") ||
                words.includes("ARCH") ||
                t.includes("ARCHITECT") ||
                t.includes("معماري") ||
                t.includes("معمارى")
              )
                return "ARCH";
              if (
                words.includes("STR") ||
                words.includes("STRUCT") ||
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
                t.includes("MECHANIC") ||
                t.includes("ميكانيك") ||
                t.includes("ميكانيكا")
              )
                return "MECH";
              if (
                words.includes("ELE") ||
                words.includes("ELEC") ||
                t.includes("ELECTRIC") ||
                t.includes("كهربا") ||
                t.includes("كهرباء")
              )
                return "ELEC";
              if (words.includes("INF") || words.includes("INFRA") || t.includes("طرق") || t.includes("بنية تحتية"))
                return "INFRA";
              if (
                words.includes("LND") ||
                words.includes("LAN") ||
                t.includes("LANDSCAPE") ||
                t.includes("كاندسكيب") ||
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
                return "NCR-HSE";
              if (
                words.includes("SUR") ||
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

            const contextDiscipline = extractDiscipline(sheetName) || extractDiscipline(file.name);

            if (contextDiscipline) {
              disciplineVal = contextDiscipline;
            } else if (
              rawDiscipline &&
              rawDiscipline.length > 0 &&
              !["YES", "NO", "N/A", "-"].includes(rawDiscipline)
            ) {
              disciplineVal = extractDiscipline(rawDiscipline) || rawDiscipline;
            } else {
              const refString = (
                colNcrRef >= 0
                  ? String(r[colNcrRef])
                  : colDocNo >= 0
                    ? String(r[colDocNo])
                    : ""
              ).toUpperCase();
              disciplineVal =
                extractDiscipline(sheetName) ||
                extractDiscipline(file.name) ||
                extractDiscipline(refString) ||
                (isLetter ? "GENERAL" : (isNcr ? "NCR-HSE" : "SURVEY"));
            }

            // Normalize common general/survey names (except for letters)
            if (!isLetter) {
              if (disciplineVal === "GEN" || disciplineVal === "GE" || disciplineVal === "GENERAL") {
                disciplineVal = isNcr ? "NCR-HSE" : "SURVEY";
              }
              if (isNcr && (disciplineVal === "SURVEY" || disciplineVal === "SURV" || disciplineVal === "SUR")) {
                disciplineVal = "NCR-HSE";
              }
            } else {
              if (disciplineVal === "GEN" || disciplineVal === "GE" || disciplineVal === "SURVEY")
                disciplineVal = "GENERAL";
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

            parsed.push({
              id: `${sheetName}-${idx}`,
              logType: sheetName.trim().toUpperCase(),
              sourceFile: file.name.replace(/\.[^/.]+$/, ""),
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
              discipline: disciplineVal,
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
        });

        resolve(normalizeData(parsed));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};
