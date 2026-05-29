import * as XLSX from "xlsx";
import { SubmittalRow } from "../types";
import { normalizeData } from "./calculations";

export const parseExcelFile = (file: File): Promise<SubmittalRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true, dateNF: "yyyy-mm-dd" });
        const parsed: SubmittalRow[] = [];
        
        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[];
          
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(30, rawData.length); i++) {
            const row = rawData[i];
            if (Array.isArray(row)) {
              const rowStr = row.map(c => String(c).toLowerCase().trim()).join(' ');
              // Look for common headers
              if (rowStr.includes('discipline') || rowStr.includes('document no') || rowStr.includes('submission date') || rowStr.includes('date sent')) {
                headerRowIdx = i;
                break;
              }
            }
          }

          if (headerRowIdx === -1) return;

          const headers: any = rawData[headerRowIdx] || [];
          const rows = rawData.slice(headerRowIdx + 1);

          const getColIdx = (aliases: string[]) => {
              return headers.findIndex((h: any) => {
                  if (!h || typeof h !== 'string') return false;
                  const lower = h.toLowerCase().trim();
                  return aliases.some(alias => lower === alias || lower.includes(alias));
              });
          };

          const colDocNo = getColIdx(['document no', 'doc no', 'submittal ref', 'sub ref', 'ref']);
          const colRev = getColIdx(['rev', 'revision']);
          const colSheet = getColIdx(['sheet no', 'sheet']);
          const colDiscipline = getColIdx(['discipline', 'trade', 'department', 'subject', 'related discipline']);
          const colContractor = getColIdx(['contractor']);
          const colConsultant = getColIdx(['consultant']);
          const colSubmissionDate = getColIdx(['submission date', 'date sent', 'sent date']);
          const colDueDate = getColIdx(['due date']);
          const colResponseDate = getColIdx(['response date', 'received date']);
          const colCode = getColIdx(['code', 'approval code']);
          const colStatus = getColIdx(['status']);
          const colRemarks = getColIdx(['remarks', 'comment']);
          const colArea = getColIdx(['area', 'zone']);
          const colSystem = getColIdx(['system', 'trade']);

          const fallbackColDate = headers.findIndex((h: any) => h && typeof h === 'string' && h.toLowerCase().trim() === 'date');
          const finalColDateSent = colSubmissionDate !== -1 ? colSubmissionDate : fallbackColDate;

          const formatDate = (raw: any): string => {
             if (!raw) return '';
             if (raw instanceof Date) {
               return raw.toISOString().split('T')[0];
             }
             if (typeof raw === 'number') {
                 const date = new Date(Math.round((raw - 25569) * 86400 * 1000)); 
                 if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
             }
             if (typeof raw === 'string') {
               const parsed = new Date(raw);
               if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
             }
             return '';
          };

          rows.forEach((r: any, idx: number) => {
             if (!r || r.length === 0) return;
             const submissionDate = formatDate(r[finalColDateSent]);
             if (!submissionDate) return;

             let disciplineVal = 'GENERAL';
             if (colDiscipline >= 0 && r[colDiscipline]) {
                 disciplineVal = String(r[colDiscipline]).trim().toUpperCase();
             } else if (sheetName.toUpperCase().includes('RFI') && r[3]) {
                 disciplineVal = String(r[3]).trim().toUpperCase();
             }

             if (['YES', 'NO', 'GENERAL', ''].includes(disciplineVal) || disciplineVal.length > 20) {
                 const rowContent = r.join(' ').toUpperCase();
                 if (rowContent.includes('ARCH') || rowContent.includes('ARC')) disciplineVal = 'Arch';
                 else if (rowContent.includes('STR') || rowContent.includes('CIVIL')) disciplineVal = 'STR';
                 else if (rowContent.includes('MECH') || rowContent.includes('MEC')) disciplineVal = 'Mech';
                 else if (rowContent.includes('ELEC') || rowContent.includes('ELE')) disciplineVal = 'Elec';
                 else if (rowContent.includes('INFRA') || rowContent.includes('INFR')) disciplineVal = 'Infra';
                 else if (rowContent.includes('LANDSCAPE') || rowContent.includes('LAND') || rowContent.includes('LND')) disciplineVal = 'Landscape';
                 else disciplineVal = 'GENERAL';
             } else {
                 if (disciplineVal.includes('ARCH') || disciplineVal === 'ARC') disciplineVal = 'Arch';
                 else if (disciplineVal.includes('STR') || disciplineVal.includes('CIVIL')) disciplineVal = 'STR';
                 else if (disciplineVal.includes('MECH') || disciplineVal === 'MEC') disciplineVal = 'Mech';
                 else if (disciplineVal.includes('ELEC') || disciplineVal === 'ELE') disciplineVal = 'Elec';
                 else if (disciplineVal.includes('INFRA') || disciplineVal === 'INFR') disciplineVal = 'Infra';
                 else if (disciplineVal.includes('LANDSCAPE') || disciplineVal.includes('LAND') || disciplineVal === 'LND') disciplineVal = 'Landscape';
                 // otherwise keep as is
             }

             const rawCode = colCode >= 0 ? String(r[colCode] || '').trim().toUpperCase() : '';
             const rawStatus = colStatus >= 0 ? String(r[colStatus] || '').trim().toUpperCase() : '';
             
             let combinedStatus = rawCode;
             if (rawStatus && rawStatus !== rawCode) {
                 combinedStatus = combinedStatus ? `${combinedStatus} - ${rawStatus}` : rawStatus;
             }

             parsed.push({
               id: `${sheetName}-${idx}`,
               logType: `${file.name.replace(/\.[^/.]+$/, "")} - ${sheetName}`.trim().toUpperCase(),
               documentType: '', // Normalized later
               trade: '',        // Normalized later
               workflowStage: '',// Normalized later
               isLatestRev: false,// Normalized later
               isRev0: false,    // Normalized later
               delayDays: 0,     // Normalized later
               overdue: false,   // Normalized later
               docNo: colDocNo >= 0 ? String(r[colDocNo] || '').trim() : '',
               rev: colRev >= 0 ? String(r[colRev] || '').trim() : '',
               sheetNo: colSheet >= 0 ? String(r[colSheet] || '').trim() : '',
               discipline: disciplineVal,
               contractor: colContractor >= 0 ? String(r[colContractor] || '').trim() : '',
               consultant: colConsultant >= 0 ? String(r[colConsultant] || '').trim() : '',
               submissionDate,
               dueDate: formatDate(colDueDate >= 0 ? r[colDueDate] : ''),
               responseDate: formatDate(colResponseDate >= 0 ? r[colResponseDate] : ''),
               status: combinedStatus,
               remarks: colRemarks >= 0 ? String(r[colRemarks] || '').trim() : '',
               area: colArea >= 0 ? String(r[colArea] || '').trim() : '',
               tradeSystem: colSystem >= 0 ? String(r[colSystem] || '').trim() : ''
             });
          });
        });

        resolve(normalizeData(parsed));
      } catch(err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};
