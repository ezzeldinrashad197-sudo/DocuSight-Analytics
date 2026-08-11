import pptxgen from "pptxgenjs";
import { ProjectSettings, SubmittalRow } from "../types";
import { calculateStats, calculateNCRStats, calculateSORStats, calculateLTRStats, resolveRowDiscipline } from "../utils/calculations";
import { processNCRData } from "./ncr/ncrEngine";

// Compile statistics logic extracted from exportEngine
export const compileStatsForBaseType = (dataset: SubmittalRow[], bt: string, monthlyStart?: string, fullDataset?: SubmittalRow[]) => {
    if (bt === 'NCR') {
        const sourceData = fullDataset && fullDataset.length > 0 ? fullDataset : dataset;
        const ncrResult = processNCRData(sourceData, monthlyStart);
        const disciplines = ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'HSE'];
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
                   if (disc === 'HSE') {
                       return mClass === 'HSE' || mClass === 'NCR-HSE' || mClass.includes('HSE');
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
      const predefinedDisciplines = bt === 'NCR' ? ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'HSE'] : ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape', 'SURVEY'];
      const parsedDisciplines = typeData.map(d => resolveRowDiscipline(d, bt));
      const activeDisciplinesSet = new Set(parsedDisciplines);

      let list: string[] = [];
      predefinedDisciplines.forEach(b => {
        list.push(b);
        if (b === 'STR' && activeDisciplinesSet.has('STR/SUR')) {
          list.push('STR/SUR');
        }
      });
      parsedDisciplines.forEach(p => {
        if (p && p !== 'GENERAL' && !list.includes(p)) {
          list.push(p);
        }
      });
      disciplinesInThisType = list;
    }

    const stats = disciplinesInThisType.map((disc) => {
      const dData = typeData.filter((d) => {
          const rDisc = resolveRowDiscipline(d, bt);
          return rDisc === disc;
      });
      const s = bt === 'NCR' ? calculateNCRStats(dData, false) : (bt === 'SOR' ? calculateSORStats(dData, false) : (bt === 'LTR' ? calculateLTRStats(dData, false) : calculateStats(dData, fullDataset || dataset)));
      
      const uniqueItems = s.totalUniqueDrawings !== undefined ? s.totalUniqueDrawings : ((s.totalSheetsRev0 || 0) + (s.totalSheetsFurtherRev || 0));
      return {
        discipline: disc,
        Rev00: s.totalSheetsRev0 || 0,
        FurtherRev: s.totalSheetsFurtherRev || 0,
        Approved: s.approved,
        RejectedOpen: s.rejectedOpen,
        RejectedClosed: s.rejectedClosed,
        Pending: s.pending,
        Total: uniqueItems,
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

// Extracted Header and Footer helper with complete professional metadata and brand alignment
export const defineDocusightSlideMaster = (
    pres: pptxgen,
    projectInfo: ProjectSettings | null,
    options?: any
) => {
    const primary = options?.primaryColor ? options.primaryColor.replace('#', '') : "0A192F";
    const accent = options?.accentColor ? options.accentColor.replace('#', '') : "D4AF37";
    const font = options?.fontFace || "Arial";
    const customHeader = options?.customHeader || "STRUCTUSIGHT ENTERPRISE INTELLIGENCE";
    const customFooter = options?.customFooter || `[${projectInfo?.projectName || 'Project'}]  |  Document Control Enterprise Report  |  Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    const showProjectInfo = options?.showProjectInfo !== false;

    const objects: any[] = [
        // 1. Header main brand blue block
        { rect: { x: 0, y: 0, w: 10, h: 0.8, fill: { color: primary } } },
        // 2. Gold bottom accent line
        { rect: { x: 0, y: 0.8, w: 10, h: 0.05, fill: { color: accent } } },
        // 3. Footer block at the bottom
        { rect: { x: 0, y: 5.32, w: 10, h: 0.305, fill: { color: primary } } },
        // 4. Footer text
        { text: { 
            text: customFooter, 
            options: { x: 0.3, y: 5.34, w: 7.5, h: 0.25, fontSize: 7.5, color: "FFFFFF", valign: "middle", fontFace: font } 
        } }
    ];

    // Add Logo Box if visible
    const showLogo = options?.showLogo !== false;
    const logoUrl = options?.logoUrl || projectInfo?.logoUrl;
    if (showLogo) {
        // Since we can draw shapes/images in Master, we add a round rectangle and the image
        objects.push({ 
            rect: { 
                x: 8.8, y: 0.1, w: 0.9, h: 0.6, 
                fill: { color: "FFFFFF" }, 
                line: { color: "E2E8F0", width: 1.5 } 
            } 
        });
        if (logoUrl) {
            const isBase64 = logoUrl.startsWith("data:") || logoUrl.includes(";base64,");
            const imgConfig: any = {
                x: 8.8 + 0.09,
                y: 0.1 + 0.06,
                w: 0.9 - 0.18,
                h: 0.6 - 0.12,
                sizing: { type: "contain", w: 0.9 - 0.18, h: 0.6 - 0.12 }
            };
            if (isBase64) {
                imgConfig.data = logoUrl;
            } else {
                imgConfig.path = logoUrl;
            }
            objects.push({ image: imgConfig });
        } else {
            const cName = projectInfo?.contractorName !== "N/A"
                ? projectInfo?.contractorName
                : (projectInfo?.projectName !== "NO PROJECT CONFIGURED" ? projectInfo?.projectName : "COMPANY");
            objects.push({
                text: {
                    text: (cName || "COMPANY").substring(0, 15).toUpperCase(),
                    options: {
                        x: 8.8, y: 0.1, w: 0.9, h: 0.6,
                        fontSize: 7.5, bold: true, color: "203864",
                        align: "center", valign: "middle", fontFace: font
                    }
                }
            });
        }
    }

    // Add Metadata columns in the middle (x: 5.2 to 8.7)
    if (projectInfo && showProjectInfo) {
        const keyOpts = { fontSize: 5.5, color: "94A3B8", fontFace: font, bold: true };
        const valOpts = { fontSize: 6.5, color: "FFFFFF", fontFace: font, bold: true };
        
        const projName = (projectInfo.projectName || "N/A").substring(0, 20);
        const projCode = (projectInfo.projectCode || "N/A").substring(0, 15);
        const contractor = (projectInfo.contractorName || "N/A").substring(0, 15);
        const consultant = (projectInfo.consultantName || "N/A").substring(0, 15);
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        // Column 1: Project & Parcel/Code
        objects.push({ text: { text: "PROJECT", options: { x: 5.2, y: 0.12, w: 1.1, h: 0.15, ...keyOpts } } });
        objects.push({ text: { text: projName, options: { x: 5.2, y: 0.25, w: 1.1, h: 0.22, ...valOpts } } });
        objects.push({ text: { text: "PARCEL/CODE", options: { x: 5.2, y: 0.45, w: 1.1, h: 0.15, ...keyOpts } } });
        objects.push({ text: { text: projCode, options: { x: 5.2, y: 0.58, w: 1.1, h: 0.22, ...valOpts } } });

        // Column 2: Contractor & Consultant
        objects.push({ text: { text: "CONTRACTOR", options: { x: 6.4, y: 0.12, w: 1.1, h: 0.15, ...keyOpts } } });
        objects.push({ text: { text: contractor, options: { x: 6.4, y: 0.25, w: 1.1, h: 0.22, ...valOpts } } });
        objects.push({ text: { text: "CONSULTANT", options: { x: 6.4, y: 0.45, w: 1.1, h: 0.15, ...keyOpts } } });
        objects.push({ text: { text: consultant, options: { x: 6.4, y: 0.58, w: 1.1, h: 0.22, ...valOpts } } });

        // Column 3: Period & Confidentiality
        objects.push({ text: { text: "PERIOD", options: { x: 7.6, y: 0.12, w: 1.1, h: 0.15, ...keyOpts } } });
        objects.push({ text: { text: dateStr, options: { x: 7.6, y: 0.25, w: 1.1, h: 0.22, ...valOpts } } });
        objects.push({ text: { text: "CONFIDENTIALITY", options: { x: 7.6, y: 0.45, w: 1.1, h: 0.15, ...keyOpts } } });
        objects.push({ text: { text: "CONFIDENTIAL", options: { x: 7.6, y: 0.58, w: 1.1, h: 0.22, ...valOpts } } });
    } else {
        objects.push({ text: { 
            text: customHeader.toUpperCase(), 
            options: { 
                x: 5.2, y: 0.1, w: 3.4, h: 0.6, 
                fontSize: 9.5, bold: true, color: "FFFFFF", 
                valign: "middle", align: "right", fontFace: font 
            } 
        } });
    }

    pres.defineSlideMaster({
        title: "DOCUSIGHT_MASTER",
        background: { color: "FFFFFF" },
        objects: objects,
        slideNumber: { 
            x: 9.1, y: 5.34, w: 0.6, h: 0.25, 
            fontFace: font, fontSize: 7.5, 
            color: "FFFFFF", align: "right" 
        }
    });
};

export const addHeaderAndFooter = (
    pres: pptxgen,
    slide: pptxgen.Slide,
    title: string,
    projectInfo: ProjectSettings | null,
    logoBase64?: string,
    options?: any
) => {
    const font = options?.fontFace || "Arial";
    
    // Slide-specific header title (placed dynamically on top of the slide master background)
    slide.addText(title.toUpperCase(), { 
        x: 0.3, y: 0.1, w: 4.8, h: 0.6, 
        fontSize: 13, bold: true, color: "FFFFFF", 
        valign: "middle", fontFace: font 
    });
};

// Extracted Section Divider Slide builder with consistent brand colors
export const addDividerSlide = (
    pres: pptxgen,
    title: string,
    subtitle: string,
    projectInfo: ProjectSettings | null,
    logoBase64?: string,
    options?: any
) => {
    const slide = pres.addSlide();
    const primary = options?.primaryColor ? options.primaryColor.replace('#', '') : "0A192F";
    const accent = options?.accentColor ? options.accentColor.replace('#', '') : "D4AF37";
    const font = options?.fontFace || "Arial";

    slide.background = { color: primary };
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: accent } });
    slide.addText(subtitle, { x: 1.5, y: 1.8, w: 6.5, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF", fontFace: font });
    slide.addText(title, { x: 1.5, y: 2.6, w: 6.5, h: 0.5, fontSize: 16, color: "94A3B8", fontFace: font });
    
    const showLogo = options?.showLogo !== false;
    if (showLogo) {
        renderLuxeLogoBox(pres, slide, 8.3, 0.4, 1.3, 0.8, projectInfo, options?.logoUrl || logoBase64);
    }
    
    slide.addShape(pres.ShapeType.rect, { x: 1.5, y: 4.2, w: 7.0, h: 0.03, fill: { color: accent } });
    slide.addText(`[${projectInfo?.projectName || 'Project'}]  |  Document Control Analytics Platform`, { x: 1.5, y: 4.3, w: 7, h: 0.3, fontSize: 10, color: "FFFFFF", fontFace: font });
};

// Extracted Table Data cell map builder
export const buildTableData = (stats: any[], totalRow: any, cols: {label: string, key: string}[], fontFace: string = "Arial") => {
    const rows: any[] = [];
    
    const row1: any[] = [
        { text: "STATUS", options: { bold: true, fill: "203864", color: "FFFFFF", align: "center", fontFace: fontFace, colspan: cols.length } }
    ];
    rows.push(row1);
    
    const row2: any[] = [];
    cols.forEach(c => {
        row2.push({ text: c.label, options: { bold: true, fill: "2F75B5", color: "FFFFFF", align: "center", fontFace: fontFace } });
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
                    fontFace: fontFace
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
                fontFace: fontFace
            }
        });
    });
    rows.push(totalR);
    
    return rows;
};
