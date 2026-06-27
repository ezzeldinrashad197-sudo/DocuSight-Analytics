import pptxgen from "pptxgenjs";
import { ProjectSettings, SubmittalRow } from "../types";
import { calculateStats, calculateNCRStats, calculateSORStats, calculateLTRStats } from "../utils/calculations";
import { processNCRData } from "./ncr/ncrEngine";

// Compile statistics logic extracted from exportEngine
export const compileStatsForBaseType = (dataset: SubmittalRow[], bt: string, monthlyStart?: string, fullDataset?: SubmittalRow[]) => {
    if (bt === 'NCR') {
        const sourceData = fullDataset && fullDataset.length > 0 ? fullDataset : dataset;
        const ncrResult = processNCRData(sourceData, monthlyStart);
        const disciplines = ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'NCR-HSE'];
        const isMon = !!monthlyStart;

        const normDisc = (d: string) => {
            const up = d.toUpperCase().trim();
            if (up === 'ARCH' || up === 'ARC' || up === 'ARCHITECTURAL') return 'ARCH';
            if (up === 'MECH' || up === 'MEC' || up === 'MECHANICAL') return 'MECH';
            if (up === 'ELEC' || up === 'ELE' || up === 'ELECTRICAL') return 'ELEC';
            if (up === 'INFRA' || up === 'INF' || up === 'INFR' || up === 'INFRASTRUCTURE') return 'INFRA';
            if (up === 'LAND' || up === 'LND' || up === 'LANDSCAPE') return 'LANDSCAPE';
            return up;
        };

        const stats = disciplines.map((disc) => {
           const targetNorm = normDisc(disc);
           if (isMon) {
               const sub = ncrResult.monthly.find(m => {
                   const mClass = m.classification.toUpperCase().trim();
                   if (disc === 'NCR-HSE') {
                       return mClass === 'NCR-HSE' || mClass === 'NCR-NCR-HSE' || mClass.includes('HSE');
                   }
                   return normDisc(mClass.replace(/^NCR-/, '')) === targetNorm;
               }) || {
                   rev0: 0,
                   revHigh: 0,
                   totalSubs: 0,
                   approved: 0,
                   rejectedOpen: 0,
                   rejectedClosed: 0,
                   pending: 0,
                   overdue: 0
               };
               return {
                   discipline: disc,
                   Rev00: sub.rev0,
                   FurtherRev: sub.revHigh,
                   Approved: sub.approved,
                   RejectedOpen: sub.rejectedOpen,
                   RejectedClosed: sub.rejectedClosed,
                   Pending: sub.pending,
                   Total: sub.totalSubs,
                   Closed: sub.approved,
                   Open: sub.rejectedOpen
               };
           } else {
               const sub = ncrResult.cumulative.find(c => {
                   return normDisc(c.discipline) === targetNorm;
               }) || {
                   totalUnique: 0,
                   open: 0,
                   closed: 0,
                   underReview: 0,
                   approved: 0,
                   rejected: 0,
                   rev0: 0,
                   revHigh: 0
               };
               return {
                   discipline: disc,
                   Rev00: sub.rev0 || 0,
                   FurtherRev: sub.revHigh || 0,
                   Approved: sub.approved,
                   RejectedOpen: sub.rejected,
                   RejectedClosed: 0,
                   Pending: sub.underReview,
                   Total: (sub.rev0 || 0) + (sub.revHigh || 0),
                   Closed: sub.closed,
                   Open: sub.open
               };
           }
        });

        const totalRow = {
           discipline: "TOTAL",
           Rev00: stats.reduce((acc, curr) => acc + Number(curr.Rev00), 0),
           FurtherRev: stats.reduce((acc, curr) => acc + Number(curr.FurtherRev), 0),
           Approved: stats.reduce((acc, curr) => acc + Number(curr.Approved), 0),
           RejectedOpen: stats.reduce((acc, curr) => acc + Number(curr.RejectedOpen), 0),
           RejectedClosed: stats.reduce((acc, curr) => acc + Number(curr.RejectedClosed), 0),
           Pending: stats.reduce((acc, curr) => acc + Number(curr.Pending), 0),
           Total: stats.reduce((acc, curr) => acc + Number(curr.Total), 0),
           Closed: stats.reduce((acc, curr) => acc + Number(curr.Closed), 0),
           Open: stats.reduce((acc, curr) => acc + Number(curr.Open), 0),
        };

        return { stats, totalRow, hasData: stats.reduce((acc, curr) => acc + Number(curr.Total), 0) > 0 };
    }

    const typeData = dataset.filter(d => {
        const docT = (d.documentType || 'GENERAL').toUpperCase();
        return docT.startsWith(`${bt}-`) || docT === bt || (bt==='NCR' && docT.includes('NCR')) || (bt==='SOR' && docT.includes('SOR')) || (bt==='RFI' && docT.includes('RFI')) || (bt==='LTR' && (docT.includes('LTR') || docT.includes('CORRES')));
    });

    let disciplinesInThisType: string[] = [];
    if (bt === 'LTR') {
       disciplinesInThisType = Array.from(new Set(typeData.map(d => d.stakeholder || 'GENERAL')));
    } else {
      const predefinedDisciplines = bt === 'NCR' ? ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'NCR-HSE'] : ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'SURVEY'];
      disciplinesInThisType = [...predefinedDisciplines];
    }

    const stats = disciplinesInThisType.map((disc) => {
      const dData = typeData.filter((d) => {
          if (bt === 'LTR') return (d.stakeholder || 'GENERAL') === disc;
          
          const docT = d.documentType || 'GENERAL';
          let rDisc = docT.includes('-') ? docT.substring(docT.indexOf('-') + 1).trim() : (d.discipline || d.trade || 'GENERAL').toUpperCase().trim();
          if (rDisc === 'ARC' || rDisc === 'ARCH' || rDisc.includes('ARCHITECT')) rDisc = 'Arch';
          else if (rDisc === 'MEC' || rDisc === 'MECH' || rDisc.includes('MECHANIC')) rDisc = 'Mech';
          else if (rDisc === 'ELE' || rDisc === 'ELEC' || rDisc.includes('ELECTRIC')) rDisc = 'Elec';
          else if (rDisc === 'INF' || rDisc === 'INFR' || rDisc === 'INFRA' || rDisc.includes('INFRASTRUCT')) rDisc = 'Infra';
          else if (rDisc === 'LND' || rDisc === 'LAND' || rDisc.includes('LANDSCAP')) rDisc = 'Landscape';
          else if (rDisc === 'STR' || rDisc === 'STRUCT') rDisc = 'STR';
          else if (rDisc === 'HSE' || rDisc === 'NCR-HSE' || rDisc.includes('HSE') || rDisc.includes('SAFETY')) rDisc = 'NCR-HSE';
          else rDisc = bt === 'NCR' ? 'NCR-HSE' : 'SURVEY';
          
          return rDisc === disc;
      });
      const s = bt === 'NCR' ? calculateNCRStats(dData, false) : (bt === 'SOR' ? calculateSORStats(dData, false) : (bt === 'LTR' ? calculateLTRStats(dData, false) : calculateStats(dData)));
      
      return {
        discipline: disc,
        Rev00: s.totalSheetsRev0 || 0,
        FurtherRev: s.totalSheetsFurtherRev || 0,
        Approved: s.approved,
        RejectedOpen: s.rejectedOpen,
        RejectedClosed: s.rejectedClosed,
        Pending: s.pending,
        Total: s.totalSubmittedSheets,
        Closed: bt === 'NCR' || bt === 'SOR' ? s.approved : s.approved + s.rejectedClosed,
        Open: bt === 'NCR' || bt === 'SOR' ? s.rejectedOpen : s.rejectedOpen + s.pending,
      };
    });

    const totalRow = {
      discipline: "TOTAL",
      Rev00: stats.reduce((acc, curr) => acc + Number(curr.Rev00), 0),
      FurtherRev: stats.reduce((acc, curr) => acc + Number(curr.FurtherRev), 0),
      Approved: stats.reduce((acc, curr) => acc + Number(curr.Approved), 0),
      RejectedOpen: stats.reduce((acc, curr) => acc + Number(curr.RejectedOpen), 0),
      RejectedClosed: stats.reduce((acc, curr) => acc + Number(curr.RejectedClosed), 0),
      Pending: stats.reduce((acc, curr) => acc + Number(curr.Pending), 0),
      Total: stats.reduce((acc, curr) => acc + Number(curr.Total), 0),
      Closed: stats.reduce((acc, curr) => acc + Number(curr.Closed), 0),
      Open: stats.reduce((acc, curr) => acc + Number(curr.Open), 0),
    };

    return { stats, totalRow, hasData: stats.reduce((acc, curr) => acc + Number(curr.Total), 0) > 0 };
};

// Extracted Luxe branding badge renderer
export const renderLuxeLogoBox = (
    pres: pptxgen,
    slide: pptxgen.Slide,
    x: number,
    y: number,
    w: number,
    h: number,
    projectInfo: ProjectSettings | null,
    logoBase64?: string
) => {
    slide.addShape(pres.ShapeType.roundRect, {
        x,
        y,
        w,
        h,
        fill: { color: "FFFFFF" },
        line: { color: "E2E8F0", width: 1.5 }
    });

    if (logoBase64) {
        const padX = w * 0.1;
        const padY = h * 0.1;
        const imgW = w - (padX * 2);
        const imgH = h - (padY * 2);

        const isBase64 = logoBase64.startsWith("data:") || logoBase64.includes(";base64,");
        const imgConfig: any = {
            x: x + padX,
            y: y + padY,
            w: imgW,
            h: imgH,
            sizing: { type: "contain", w: imgW, h: imgH }
        };

        if (isBase64) {
            imgConfig.data = logoBase64;
        } else {
            imgConfig.path = logoBase64;
        }

        slide.addImage(imgConfig);
    } else {
        const cName = projectInfo?.contractorName !== "N/A"
            ? projectInfo?.contractorName
            : (projectInfo?.projectName !== "NO PROJECT CONFIGURED" ? projectInfo?.projectName : "COMPANY");

        let fontSize = 9;
        if (w >= 2.0) fontSize = 13;
        else if (w >= 1.3) fontSize = 11;
        else if (w < 1.1) fontSize = 7.5;

        slide.addText(cName || "COMPANY", {
            x: x + 0.05,
            y: y + 0.05,
            w: w - 0.1,
            h: h - 0.1,
            fontSize,
            bold: true,
            color: "203864",
            align: "center",
            valign: "middle",
            fontFace: "Arial"
        });
    }
};

// Extracted Header and Footer helper
export const addHeaderAndFooter = (
    pres: pptxgen,
    slide: pptxgen.Slide,
    title: string,
    projectInfo: ProjectSettings | null,
    logoBase64?: string
) => {
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.8, fill: { color: "203864" } });
    slide.addText(title, { x: 0.4, y: 0.1, w: 7, h: 0.6, fontSize: 20, bold: true, color: "FFFFFF", valign: "middle", fontFace: "Arial" });
    renderLuxeLogoBox(pres, slide, 8.4, 0.1, 1.2, 0.6, projectInfo, logoBase64);
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0.8, w: 10, h: 0.08, fill: { color: "eab308" } });
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 5.32, w: 10, h: 0.305, fill: { color: "203864" } });
    
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    slide.addText(`[${projectInfo?.projectName || 'Project'}]  |  Document Control Monthly Report  |  [${dateStr}]`, { x: 0.4, y: 5.34, w: 7, h: 0.25, fontSize: 8, color: "FFFFFF", valign: "middle", fontFace: "Arial" });
    slide.addText("CONFIDENTIAL", { x: 8.5, y: 5.34, w: 1.1, h: 0.25, fontSize: 8, color: "FFFFFF", align: "right", valign: "middle", fontFace: "Arial" });
};

// Extracted Section Divider Slide builder
export const addDividerSlide = (
    pres: pptxgen,
    title: string,
    subtitle: string,
    projectInfo: ProjectSettings | null,
    logoBase64?: string
) => {
    const slide = pres.addSlide();
    slide.background = { color: "203864" };
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: "eab308" } });
    slide.addText(subtitle, { x: 1.5, y: 2.0, w: 7, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", fontFace: "Arial" });
    slide.addText(title, { x: 1.5, y: 2.8, w: 7, h: 0.5, fontSize: 16, color: "94A3B8", fontFace: "Arial" });
    renderLuxeLogoBox(pres, slide, 8.3, 0.4, 1.3, 0.8, projectInfo, logoBase64);
    slide.addShape(pres.ShapeType.rect, { x: 1.5, y: 4.4, w: 7.0, h: 0.03, fill: { color: "eab308" } });
    slide.addText(`[${projectInfo?.projectName || 'Project'}]  |  Document Control`, { x: 1.5, y: 4.5, w: 7, h: 0.3, fontSize: 10, color: "FFFFFF", fontFace: "Arial" });
};

// Extracted Table Data cell map builder
export const buildTableData = (stats: any[], totalRow: any, cols: {label: string, key: string}[]) => {
    const rows: any[] = [];
    
    const row1: any[] = [
        { text: "STATUS", options: { bold: true, fill: "203864", color: "FFFFFF", align: "center", fontFace: "Arial", colspan: cols.length } }
    ];
    rows.push(row1);
    
    const row2: any[] = [];
    cols.forEach(c => {
        row2.push({ text: c.label, options: { bold: true, fill: "2F75B5", color: "FFFFFF", align: "center", fontFace: "Arial" } });
    });
    rows.push(row2);
    
    stats.forEach((s, idx) => {
        const r: any[] = [];
        const isEven = idx % 2 === 1;
        const rowBg = isEven ? "F2F2F2" : "FFFFFF";
        
        cols.forEach((col, cIdx) => {
            const isFirst = cIdx === 0;
            const textVal = String(s[col.key] !== undefined ? s[col.key] : "");
            r.push({ 
                text: textVal, 
                options: { 
                    fill: rowBg, 
                    align: "center", 
                    valign: "middle",
                    color: "333333",
                    bold: isFirst || col.key === "Total",
                    fontFace: "Arial"
                } 
            });
        });
        rows.push(r);
    });
    
    const totalR: any[] = [];
    cols.forEach((col) => {
        const textVal = String(totalRow[col.key] !== undefined ? totalRow[col.key] : "");
        totalR.push({
            text: textVal,
            options: {
                fill: "DDEBF7",
                color: "203864",
                bold: true,
                align: "center",
                valign: "middle",
                fontFace: "Arial"
            }
        });
    });
    rows.push(totalR);
    
    return rows;
};
