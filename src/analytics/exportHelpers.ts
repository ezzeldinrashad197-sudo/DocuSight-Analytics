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
      disciplinesInThisType = [...predefinedDisciplines];
    }

    const stats = disciplinesInThisType.map((disc) => {
      const dData = typeData.filter((d) => {
          const rDisc = resolveRowDiscipline(d, bt);
          return rDisc === disc;
      });
      const s = bt === 'NCR' ? calculateNCRStats(dData, false) : (bt === 'SOR' ? calculateSORStats(dData, false) : (bt === 'LTR' ? calculateLTRStats(dData, false) : calculateStats(dData, fullDataset || dataset)));
      
      const rev0Count = s.totalDrawingsRev0 ?? s.totalSheetsRev0 ?? 0;
      const furtherRevCount = s.totalDrawingsFurtherRev ?? s.totalSheetsFurtherRev ?? 0;
      const uniqueItems = s.totalUniqueDrawings !== undefined ? s.totalUniqueDrawings : (rev0Count + furtherRevCount);
      return {
        discipline: disc,
        Rev00: rev0Count,
        FurtherRev: furtherRevCount,
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
    const customHeader = options?.customHeader || "DOCUSIGHT ENTERPRISE ANALYTICS";
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

// ==========================================
// INNOVO TEMPLATE NATIVE PPTX HELPERS
// ==========================================

export const addInnovoCoverSlide = (pres: pptxgen, projectInfo: ProjectSettings | null) => {
    const slide = pres.addSlide();
    slide.background = { color: "182226" };

    // Concentric ring graphic elements on left
    const ringColors = ["243238", "2B3C43", "33464F", "3B515C", "445B67"];
    ringColors.forEach((color, idx) => {
        const size = 8.5 - idx * 1.3;
        const offset = -2.5 + idx * 0.65;
        const topOffset = -1.2 + idx * 0.65;
        slide.addShape(pres.ShapeType.ellipse, {
            x: offset,
            y: topOffset,
            w: size,
            h: size,
            fill: { color: "182226" },
            line: { color: color, width: 2 }
        });
    });

    // Top Right Logo "innovo"
    slide.addText("innovo", {
        x: 7.5, y: 0.5, w: 2.0, h: 0.6,
        fontSize: 32, bold: true, color: "FFFFFF",
        fontFace: "Arial", align: "right"
    });

    // Title Box
    const projName = projectInfo?.projectName || "Alburouj Project";
    const projPackage = projectInfo?.projectCode ? `Parcel ${projectInfo.projectCode} Construction Package` : "Parcel 1.17 Construction Package";
    const reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

    slide.addText("Document Control Monthly Report", {
        x: 0.5, y: 2.2, w: 8.5, h: 0.7,
        fontSize: 30, bold: true, color: "50E3C2",
        fontFace: "Arial"
    });

    slide.addText(`${projName}- ${projPackage}`, {
        x: 0.5, y: 2.9, w: 8.5, h: 0.5,
        fontSize: 18, bold: true, color: "FFFFFF",
        fontFace: "Arial"
    });

    slide.addText(`Date: ${reportDate}`, {
        x: 0.5, y: 4.2, w: 5.0, h: 0.4,
        fontSize: 13, color: "E2E8F0",
        fontFace: "Arial"
    });
};

export const addInnovoIndexSlide = (pres: pptxgen, projectInfo: ProjectSettings | null) => {
    const slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };

    // Left background curved band
    slide.addShape(pres.ShapeType.rect, {
        x: 0, y: 0, w: 3.5, h: 5.625,
        fill: { color: "E8ECEF" },
        line: { color: "E8ECEF", width: 0 }
    });

    // Concentric arc graphics on left
    for (let i = 0; i < 5; i++) {
        const size = 7.0 - i * 1.2;
        slide.addShape(pres.ShapeType.ellipse, {
            x: -3.0 + i * 0.6,
            y: -0.7 + i * 0.6,
            w: size,
            h: size,
            fill: { color: "E8ECEF" },
            line: { color: "CBD5E1", width: 1.5 }
        });
    }

    // "Index" Title on Left
    slide.addText("Index", {
        x: 0.4, y: 2.4, w: 2.5, h: 0.8,
        fontSize: 28, bold: true, color: "182226",
        fontFace: "Arial"
    });

    // Top Right Logo "innovo"
    slide.addText("innovo", {
        x: 7.5, y: 0.5, w: 2.0, h: 0.6,
        fontSize: 28, bold: true, color: "182226",
        fontFace: "Arial", align: "right"
    });

    // 14 List Items on Right
    const indexItems = [
        "1. PROJECT INFORMATION & TEAM Members",
        "2. SHOP DRAWINGS (SHD)",
        "3. MATERIAL SUBMITTALS (MAR)",
        "4. DOCUMENT SUBMITTALS (DOC)",
        "5. REQUEST FOR INFORMATION (RFI)",
        "6. LETTERS IN & OUT",
        "7. SITE WORK INSTRUCTION (SI/EI/SWI)",
        "8. INSPECTION REQUEST (WIR)",
        "9. MATERIAL INSPECTION REQUEST (MIR)",
        "10. NON-CONFORMANCE REPORT (NCR)",
        "11. HOLD ITEMS",
        "12. REJECTED & PENDING ITEMS",
        "13. FILLING ROOM PHOTOS",
        "14. DOCUMENT CONTROL ISSUE"
    ];

    let currentY = 0.45;
    indexItems.forEach((item) => {
        slide.addText(item, {
            x: 3.8, y: currentY, w: 5.8, h: 0.32,
            fontSize: 10, bold: true, color: "182226",
            fontFace: "Arial"
        });
        currentY += 0.35;
    });
};

export const addInnovoSectionDivider = (pres: pptxgen, sectionTitle: string) => {
    const slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };

    // Left background band
    slide.addShape(pres.ShapeType.rect, {
        x: 0, y: 0, w: 4.8, h: 5.625,
        fill: { color: "E8ECEF" },
        line: { color: "E8ECEF", width: 0 }
    });

    // Concentric arc graphics on left band
    for (let i = 0; i < 5; i++) {
        const size = 8.0 - i * 1.3;
        slide.addShape(pres.ShapeType.ellipse, {
            x: -3.5 + i * 0.65,
            y: -1.2 + i * 0.65,
            w: size,
            h: size,
            fill: { color: "E8ECEF" },
            line: { color: "CBD5E1", width: 1.5 }
        });
    }

    // Section Title
    slide.addText(sectionTitle, {
        x: 0.4, y: 2.0, w: 4.2, h: 1.6,
        fontSize: 24, bold: true, color: "182226",
        fontFace: "Arial", valign: "middle"
    });

    // Top Right Logo "innovo"
    slide.addText("innovo", {
        x: 7.5, y: 0.5, w: 2.0, h: 0.6,
        fontSize: 28, bold: true, color: "182226",
        fontFace: "Arial", align: "right"
    });
};

export const addInnovoSlideHeaderFooter = (pres: pptxgen, slide: any, subtitleText: string, projectInfo: ProjectSettings | null) => {
    slide.background = { color: "FFFFFF" };

    // Concentric arc graphic in top right background
    for (let i = 0; i < 4; i++) {
        const size = 8.0 - i * 1.2;
        slide.addShape(pres.ShapeType.ellipse, {
            x: 5.2 + i * 0.6,
            y: -2.5 + i * 0.6,
            w: size,
            h: size,
            fill: { color: "FFFFFF" },
            line: { color: "F0F4F8", width: 1.5 }
        });
    }

    // Top Left Header
    const projName = projectInfo?.projectName || "Alburouj Project";
    const projCode = projectInfo?.projectCode ? `Parcel ${projectInfo.projectCode}` : "Parcel 1.17";

    slide.addText(`${projName}, ${projCode}`, {
        x: 0.4, y: 0.35, w: 6.5, h: 0.4,
        fontSize: 18, bold: true, color: "182226",
        fontFace: "Arial"
    });

    slide.addText(subtitleText, {
        x: 0.4, y: 0.75, w: 6.5, h: 0.35,
        fontSize: 12.5, bold: true, color: "182226",
        fontFace: "Arial"
    });

    // Bottom Right Logo "innovo"
    slide.addText("innovo", {
        x: 8.0, y: 4.9, w: 1.6, h: 0.5,
        fontSize: 20, bold: true, color: "182226",
        fontFace: "Arial", align: "right"
    });
};

export const buildInnovoTableRows = (stats: any[], totalRow: any, cols: { label: string, key: string }[], fontFace: string = "Arial") => {
    const rows: any[] = [];

    // Category Header Banner
    rows.push([
        { text: "Status", options: { bold: true, fill: "000000", color: "FFFFFF", align: "center", fontFace: fontFace, colspan: cols.length } }
    ]);

    // Column Headers
    const colHeaderCells: any[] = [];
    cols.forEach(c => {
        colHeaderCells.push({
            text: c.label,
            options: { bold: true, fill: "000000", color: "FFFFFF", align: "center", fontFace: fontFace, fontSize: 8 }
        });
    });
    rows.push(colHeaderCells);

    // Body Rows
    stats.forEach((s, idx) => {
        const rowCells: any[] = [];
        const isEven = idx % 2 === 1;
        const rowBg = isEven ? "F2F4F7" : "FFFFFF";

        cols.forEach((col, cIdx) => {
            const isFirst = cIdx === 0;
            const textVal = String(s[col.key] !== undefined ? s[col.key] : "0");
            rowCells.push({
                text: textVal,
                options: {
                    fill: rowBg,
                    align: isFirst ? "left" : "center",
                    valign: "middle",
                    color: "111111",
                    bold: isFirst || col.key === "Total",
                    fontFace: fontFace,
                    fontSize: 8.5
                }
            });
        });
        rows.push(rowCells);
    });

    // Total Row
    const totalCells: any[] = [];
    cols.forEach((col, cIdx) => {
        const isFirst = cIdx === 0;
        const textVal = String(totalRow[col.key] !== undefined ? totalRow[col.key] : "0");
        totalCells.push({
            text: isFirst ? "Total" : textVal,
            options: {
                fill: "D9D9D9",
                color: "000000",
                bold: true,
                align: isFirst ? "left" : "center",
                valign: "middle",
                fontFace: fontFace,
                fontSize: 8.5
            }
        });
    });
    rows.push(totalCells);

    return rows;
};

export const addInnovoStackedColumnChart = (
    pres: pptxgen,
    slide: any,
    chartTitle: string,
    categories: string[],
    rev0Values: number[],
    furtherRevValues: number[],
    x: number, y: number, w: number, h: number
) => {
    slide.addText(chartTitle, {
        x: x, y: y, w: w, h: 0.3,
        fontSize: 11, bold: true, color: "182226",
        fontFace: "Arial", align: "center"
    });

    const chartData = [
        {
            name: "Rev.00",
            labels: categories,
            values: rev0Values
        },
        {
            name: "Further Rev.",
            labels: categories,
            values: furtherRevValues
        }
    ];

    slide.addChart(pres.ChartType.bar, chartData, {
        x: x, y: y + 0.3, w: w, h: h - 0.3,
        barDir: "col",
        barGrouping: "stacked",
        chartColors: ["00B050", "FF0000"], // Green for Rev.00, Red for Further Rev.
        showLegend: true,
        legendPos: "tr",
        legendFontSize: 8,
        catAxisLabelFontSize: 8,
        valGridLine: { color: "E2E8F0" },
        showValue: true,
        valueFontSize: 8,
        valueColor: "FFFFFF",
        valueFontBold: true
    });
};

export const addInnovoPieChartGrid = (
    pres: pptxgen,
    slide: any,
    stats: any[],
    pieType: 'approval' | 'rfi' | 'ncr' | 'ltr'
) => {
    stats.slice(0, 6).forEach((s: any, idx: number) => {
        const colIdx = idx % 3;
        const rowIdx = Math.floor(idx / 3);
        const posX = 0.4 + colIdx * 3.0;
        const posY = 1.15 + rowIdx * 1.85;

        const titleLabel = `o ${s.discipline} Quality Approval`;
        slide.addText(titleLabel, {
            x: posX, y: posY, w: 2.8, h: 0.25,
            fontSize: 9.5, bold: true, color: "182226", fontFace: "Arial"
        });

        let labels: string[] = [];
        let values: number[] = [];
        let colors: string[] = [];

        if (pieType === 'rfi') {
            labels = ["Closed", "Pending"];
            values = [Number(s.Closed) || 0, Number(s.Pending) || 0];
            colors = ["00B050", "FFC000"];
        } else if (pieType === 'ncr') {
            labels = ["Closed", "Open", "Pending"];
            values = [Number(s.Closed) || 0, Number(s.Open) || 0, Number(s.Pending) || 0];
            colors = ["00B050", "FF0000", "FFC000"];
        } else if (pieType === 'ltr') {
            labels = ["Sent", "Received"];
            values = [Number(s.Rev00) || 0, Number(s.FurtherRev) || 0];
            colors = ["0070C0", "FFC000"];
        } else {
            labels = ["Approved", "Rejected", "Pending"];
            values = [Number(s.Approved) || 0, Number(s.RejectedOpen || s.Rejected) || 0, Number(s.Pending) || 0];
            colors = ["00B050", "FF0000", "FFC000"];
        }

        const totalVal = values.reduce((a, b) => a + b, 0);
        const isZero = totalVal === 0;
        let finalValues = isZero ? values.map(() => 1) : values;

        slide.addChart(pres.ChartType.pie, [
            { name: s.discipline, labels: labels, values: finalValues }
        ], {
            x: posX, y: posY + 0.25, w: 2.8, h: 1.5,
            showLegend: true,
            legendPos: "b",
            legendFontSize: 7,
            chartColors: colors,
            showValue: false,
            showPercent: !isZero
        });
    });
};

export const addInnovoHorizontalBarChart = (
    pres: pptxgen,
    slide: any,
    chartTitle: string,
    categories: string[],
    values: number[],
    x: number, y: number, w: number, h: number
) => {
    slide.addText(chartTitle, {
        x: x, y: y, w: w, h: 0.3,
        fontSize: 11, bold: true, color: "182226",
        fontFace: "Arial", align: "center"
    });

    const chartColors = ["FFC000", "0070C0", "92D050"];

    slide.addChart(pres.ChartType.bar, [
        { name: chartTitle, labels: categories, values: values }
    ], {
        x: x, y: y + 0.3, w: w, h: h - 0.3,
        barDir: "horiz",
        chartColors: chartColors,
        showLegend: true,
        legendPos: "b",
        legendFontSize: 8,
        catAxisLabelFontSize: 8.5,
        valGridLine: { color: "E2E8F0" },
        showValue: true,
        valueFontSize: 9,
        valueFontBold: true
    });
};

export const addInnovoTeamMembersSlide = (pres: pptxgen, projectInfo: ProjectSettings | null) => {
    const slide = pres.addSlide();
    addInnovoSlideHeaderFooter(pres, slide, "➢PROJECT INFORMATION", projectInfo);

    const employer = projectInfo?.clientName || "IMKAN MISR";
    const consultant = projectInfo?.consultantName || "ACE";
    const contractor = projectInfo?.contractorName || "INNOVO Build S.A.E";
    const startDate = (projectInfo as any)?.startDate || "01-11-2025";

    const leftDetails = [
        `• Employer: ${employer}`,
        `• CA/PM: `,
        `• Consultant: ${consultant}`,
        `• Contractor: ${contractor}`
    ];

    const rightDetails = [
        `• Project Start Date: ${startDate}`,
        `• Project Finish Date: `,
        `• Project Duration: `,
        `• Project Value: `
    ];

    slide.addText(leftDetails.join('\n'), {
        x: 0.5, y: 1.2, w: 4.2, h: 1.2,
        fontSize: 11, color: "182226", fontFace: "Arial", lineSpacing: 20
    });

    slide.addText(rightDetails.join('\n'), {
        x: 4.8, y: 1.2, w: 4.5, h: 1.2,
        fontSize: 11, color: "182226", fontFace: "Arial", lineSpacing: 20
    });

    slide.addText("➢Project Team Members", {
        x: 0.5, y: 2.6, w: 6.0, h: 0.35,
        fontSize: 12, bold: true, color: "182226", fontFace: "Arial"
    });

    const teamRows: any[] = [
        [
            { text: "No.", options: { bold: true, fill: "000000", color: "FFFFFF", align: "center", fontFace: "Arial" } },
            { text: "Name", options: { bold: true, fill: "000000", color: "FFFFFF", align: "center", fontFace: "Arial" } },
            { text: "Title", options: { bold: true, fill: "000000", color: "FFFFFF", align: "center", fontFace: "Arial" } },
            { text: "Contract/Casual", options: { bold: true, fill: "000000", color: "FFFFFF", align: "center", fontFace: "Arial" } }
        ],
        [
            { text: "1", options: { fill: "F2F4F7", align: "center", fontFace: "Arial" } },
            { text: projectInfo?.documentControlManager || "Ezzeldin Mohamed Rashad", options: { fill: "F2F4F7", bold: true, fontFace: "Arial" } },
            { text: "Project Document Control Lead", options: { fill: "F2F4F7", bold: true, fontFace: "Arial" } },
            { text: "Contract", options: { fill: "F2F4F7", align: "center", fontFace: "Arial" } }
        ],
        [
            { text: "2", options: { fill: "FFFFFF", align: "center", fontFace: "Arial" } },
            { text: "Ibrahem Shawkat", options: { fill: "FFFFFF", bold: true, fontFace: "Arial" } },
            { text: "Document Controller", options: { fill: "FFFFFF", bold: true, fontFace: "Arial" } },
            { text: "Contract", options: { fill: "FFFFFF", align: "center", fontFace: "Arial" } }
        ]
    ];

    slide.addTable(teamRows as any, {
        x: 0.5, y: 3.0, w: 8.5,
        colW: [0.6, 3.2, 3.2, 1.5],
        color: "111111", fontSize: 9,
        border: { type: "solid", pt: 1, color: "CBD5E1" }
    });
};

export const addInnovoTableSlide = (
    pres: pptxgen,
    projectInfo: ProjectSettings | null,
    subTitle: string,
    headers: string[],
    rowsData: any[][],
    colW?: number[]
) => {
    const slide = pres.addSlide();
    addInnovoSlideHeaderFooter(pres, slide, subTitle, projectInfo);

    const tableRows: any[] = [];
    tableRows.push(
        headers.map(h => ({
            text: h,
            options: { bold: true, fill: "000000", color: "FFFFFF", align: "center", fontFace: "Arial", fontSize: 8.5 }
        }))
    );

    if (rowsData.length === 0) {
        tableRows.push([
            { text: "1", options: { fill: "FFFFFF", align: "center", fontFace: "Arial" } },
            { text: "ALL Documents", options: { fill: "FFFFFF", align: "center", fontFace: "Arial" } },
            { text: "-", options: { fill: "FFFFFF", align: "center", fontFace: "Arial" } },
            { text: "-", options: { fill: "FFFFFF", align: "center", fontFace: "Arial" } },
            { text: "-", options: { fill: "FFFFFF", align: "center", fontFace: "Arial" } },
            { text: "Currently, there are no active items in this log", options: { fill: "FFFFFF", fontFace: "Arial" } }
        ]);
    } else {
        rowsData.forEach((row, i) => {
            const isEven = i % 2 === 1;
            const bg = isEven ? "F2F4F7" : "FFFFFF";
            tableRows.push(
                row.map((cellText, cellIdx) => ({
                    text: String(cellText || "-"),
                    options: {
                        fill: bg,
                        align: cellIdx === 0 ? "center" : "left",
                        fontFace: "Arial",
                        fontSize: 8.5,
                        color: "111111"
                    }
                }))
            );
        });
    }

    slide.addTable(tableRows, {
        x: 0.5, y: 1.3, w: 9.0,
        colW: colW || [0.6, 2.0, 2.0, 2.2, 2.2],
        color: "111111", fontSize: 8.5,
        border: { type: "solid", pt: 1, color: "CBD5E1" }
    });
};

export const addInnovoACCNoticeSlide = (
    pres: pptxgen,
    projectInfo: ProjectSettings | null,
    subtitleText: string,
    noticeMessage: string
) => {
    const slide = pres.addSlide();
    addInnovoSlideHeaderFooter(pres, slide, subtitleText, projectInfo);

    slide.addText(`"${noticeMessage}"`, {
        x: 1.0, y: 2.2, w: 8.0, h: 1.5,
        fontSize: 14, color: "182226", fontFace: "Arial",
        align: "left", valign: "middle", lineSpacing: 22
    });
};

export const addInnovoThanksSlide = (pres: pptxgen) => {
    const slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };

    slide.addShape(pres.ShapeType.rect, {
        x: 0, y: 0, w: 4.8, h: 5.625,
        fill: { color: "E8ECEF" },
        line: { color: "E8ECEF", width: 0 }
    });

    for (let i = 0; i < 5; i++) {
        const size = 8.0 - i * 1.3;
        slide.addShape(pres.ShapeType.ellipse, {
            x: -3.5 + i * 0.65,
            y: -1.2 + i * 0.65,
            w: size,
            h: size,
            fill: { color: "E8ECEF" },
            line: { color: "CBD5E1", width: 1.5 }
        });
    }

    slide.addText("Thanks", {
        x: 0.4, y: 2.2, w: 4.2, h: 1.0,
        fontSize: 28, bold: true, color: "182226",
        fontFace: "Arial", valign: "middle"
    });

    slide.addText("innovo", {
        x: 7.5, y: 0.5, w: 2.0, h: 0.6,
        fontSize: 28, bold: true, color: "182226",
        fontFace: "Arial", align: "right"
    });
};
