import pptxgen from "pptxgenjs";
import { ProjectSettings, SubmittalRow } from "../types";
import { calculateStats, calculateNCRStats, calculateSORStats, calculateLTRStats, resolveRowDiscipline, calculateProjectPerformanceHealth } from "../utils/calculations";
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
      
      const isMonthlyReport = !!monthlyStart;
      const isDrawingType = bt === 'SDW' || bt === 'SHD' || bt === 'ABD';
      const totalSheets = (s.totalSheetsRev0 || 0) + (s.totalSheetsFurtherRev || 0);
      const totalSubmittals = s.totalUniqueDrawings !== undefined ? s.totalUniqueDrawings : dData.length;
      const countForType = isDrawingType
        ? totalSheets
        : (isMonthlyReport
            ? (s.totalSubmittedSheets ?? totalSheets)
            : (s.totalUniqueDrawings !== undefined ? s.totalUniqueDrawings : totalSheets));

      return {
        discipline: disc,
        TotalSubmittals: totalSubmittals,
        Rev00: s.totalSheetsRev0 || 0,
        FurtherRev: s.totalSheetsFurtherRev || 0,
        Approved: s.approved,
        RejectedOpen: s.rejectedOpen,
        RejectedClosed: s.rejectedClosed,
        Rejected: (s.rejectedOpen || 0) + (s.rejectedClosed || 0),
        Pending: s.pending,
        Total: countForType,
        Closed: bt === 'RFI' ? ((s.totalSubmittedSheets || 0) - (s.pending || 0)) : (bt === 'NCR' || bt === 'SOR' ? s.approved : s.approved + s.rejectedClosed),
        Open: bt === 'NCR' || bt === 'SOR' ? s.rejectedOpen : (bt === 'RFI' ? (s.pending || 0) : s.rejectedOpen + s.pending),
      };
    });

    const totalRow = {
      discipline: "TOTAL",
      TotalSubmittals: stats.reduce((acc, curr) => acc + Number(curr.TotalSubmittals || 0), 0),
      Rev00: stats.reduce((acc, curr) => acc + Number(curr.Rev00), 0),
      FurtherRev: stats.reduce((acc, curr) => acc + Number(curr.FurtherRev), 0),
      Approved: stats.reduce((acc, curr) => acc + Number(curr.Approved), 0),
      RejectedOpen: stats.reduce((acc, curr) => acc + Number(curr.RejectedOpen), 0),
      RejectedClosed: stats.reduce((acc, curr) => acc + Number(curr.RejectedClosed), 0),
      Rejected: stats.reduce((acc, curr) => acc + Number(curr.Rejected || 0), 0),
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
export const defineStructusightSlideMaster = (
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
        title: "STRUCTUSIGHT_MASTER",
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

// ----------------------------------------------------
// EXECUTIVE DASHBOARD DATA COMPILATION & SLIDE BUILDERS
// ----------------------------------------------------

export interface ExecutiveDashboardData {
    globalStats: any;
    globalCriticalCount?: number;
    byDocType: { documentType: string; stats: any; count: number; criticalCount?: number }[];
    healthData: {
        score: number;
        rating: string;
        color: string;
        breakdown: {
            approvalPenalty: number;
            pendingOverduePenalty: number;
            overdueDensityPenalty: number;
        };
    };
    executiveSummaryBrief: { en: string; ar: string };
    trends: { approvalTrend: number; submissionsTrend: number; overdueTrend: number };
    pieChartData: { name: string; value: number; color: string }[];
    barChartData: { name: string; Rev00: number; FurtherRev: number; Total: number }[];
    topOverdueItems: SubmittalRow[];
    priorityRecommendations: { id: string; en: string; ar: string; priority: string; action: string; actionAr: string }[];
}

export const calculateExecutiveDashboardData = (
    filteredData: SubmittalRow[],
    rawDataset: SubmittalRow[],
    isMonthly: boolean,
    language: 'ar' | 'en' = 'en'
): ExecutiveDashboardData => {
    const baseOrder = ['ABD', 'SDW', 'SHD', 'MAR', 'QS', 'DOC', 'WIR', 'MIR', 'RFI', 'NCR', 'SOR', 'LTR', 'PQ', 'PRQ', 'TRS'];
    const discOrder = ['STR', 'ARC', 'MEC', 'LND', 'INFRA', 'GEN', 'ELE'];

    const rowToLabel = (d: SubmittalRow): string => {
        let t = (d.documentType || 'DOC').toUpperCase().trim();
        if (t === 'HSE') t = 'NCR-HSE';
        if (t === 'SHD') t = 'SDW';
        return t;
    };

    const map = new Map<string, SubmittalRow[]>();
    filteredData.forEach(row => {
        const key = rowToLabel(row);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(row);
    });

    const byDocType = Array.from(map.entries()).map(([documentType, rows]) => {
        const stats = calculateStats(rows, rawDataset || filteredData);
        const criticalCount = rows.filter(d => d.priority === 'CRITICAL' || (d.remarks || '').toUpperCase().includes('CRITICAL')).length;
        return { documentType, stats, count: rows.length, criticalCount };
    }).sort((a, b) => {
        const getBase = (type: string) => type.split('-')[0].trim();
        const getDisc = (type: string) => {
            const parts = type.split('-');
            return parts.length > 1 ? parts[1].trim() : '';
        };

        const aBase = getBase(a.documentType);
        const bBase = getBase(b.documentType);
        const aDisc = getDisc(a.documentType);
        const bDisc = getDisc(b.documentType);

        const aBaseIdx = baseOrder.indexOf(aBase);
        const bBaseIdx = baseOrder.indexOf(bBase);
        const effectiveABaseIdx = aBaseIdx === -1 ? 999 : aBaseIdx;
        const effectiveBBaseIdx = bBaseIdx === -1 ? 999 : bBaseIdx;

        if (effectiveABaseIdx !== effectiveBBaseIdx) {
            return effectiveABaseIdx - effectiveBBaseIdx;
        }

        if (aBase === bBase) {
            const aDiscIdx = discOrder.indexOf(aDisc);
            const bDiscIdx = discOrder.indexOf(bDisc);
            const effectiveADiscIdx = aDiscIdx === -1 ? 999 : aDiscIdx;
            const effectiveBDiscIdx = bDiscIdx === -1 ? 999 : bDiscIdx;
            if (effectiveADiscIdx !== effectiveBDiscIdx) {
                return effectiveADiscIdx - effectiveBDiscIdx;
            }
        }
        return a.documentType.localeCompare(b.documentType);
    });

    const generalData = filteredData.filter(d => !(d.documentType || 'DOC').startsWith('NCR-') && (d.documentType || 'DOC') !== 'NCR');
    const globalStats = calculateStats(generalData, rawDataset || filteredData);
    const globalCriticalCount = generalData.filter(d => d.priority === 'CRITICAL' || (d.remarks || '').toUpperCase().includes('CRITICAL')).length;

    const healthData = calculateProjectPerformanceHealth(globalStats, language);

    let worstDocType = '';
    let maxOverdue = 0;
    let worstRate = 0;

    byDocType.forEach(row => {
        const rowOverdue = row.stats.overdue || 0;
        const rowTotal = row.stats.totalUniqueDrawings || row.stats.totalSubmittedSheets || 1;
        const rowOverdueRate = (rowOverdue / rowTotal) * 100;
        if (rowOverdue > maxOverdue || (rowOverdue === maxOverdue && rowOverdueRate > worstRate)) {
            maxOverdue = rowOverdue;
            worstRate = rowOverdueRate;
            worstDocType = row.documentType;
        }
    });

    let enSummary = '';
    let arSummary = '';
    const finalScore = healthData.score;
    const appRate = globalStats.approvalRate;
    if (finalScore >= 80) {
        enSummary = `Project health is performing within excellent limits with an approval rate of ${appRate.toFixed(1)}%. Workflow processing times satisfy the SLA thresholds with minimal backlog overdue.`;
        arSummary = `يؤدي المشروع أداءً ممتازاً ومستقراً بنسبة اعتماد بلغت ${appRate.toFixed(1)}%. سرعة تدفق المراجعات والاعتمادات تتوافق تماماً مع فترات اتفاقية مستوى الخدمة مع حد أدنى من التأخيرات المتراكمة.`;
    } else if (finalScore >= 65) {
        enSummary = `Project health is satisfactory at ${finalScore}/100, but is experiencing minor delays in submittal flows. Focus should be given to closing out the current pending review queue of ${globalStats.pending} items.`;
        arSummary = `حالة المشروع مقبولة ومستقرة نسبياً بتقييم قدره ${finalScore}/100، غير أنه يواجه تأخيرات طفيفة في حركة تدفق المستندات. يجب التركيز حالياً على إنجاز مراجعة المعاملات المعلقة البالغ عددها ${globalStats.pending} معاملة.`;
    } else {
        const worstTypeLabel = worstDocType ? `concentrated in ${worstDocType} submittals` : 'across major design packages';
        const worstTypeLabelAr = worstDocType ? `وتتركز بصورة رئيسية في سجلات (${worstDocType})` : 'عبر حزم التصميم والمستندات الرئيسية للمشروع';
        enSummary = `Project Health is below acceptable threshold (${finalScore}/100) due to high rejection rates or slow reviews, resulting in a backlog of ${globalStats.overdue} critical overdue items, primarily ${worstTypeLabel}. Immediate PMO intervention is required.`;
        arSummary = `حالة المشروع تحت المستوى المقبول والآمن بتقييم حرج قدره (${finalScore}/100) نتيجة لارتفاع معدل رفض المستندات أو بطء عمليات المراجعة، مما أدى إلى تراكم ${globalStats.overdue} معاملة متأخرة متجاوزة للمدة المحددة، ${worstTypeLabelAr}. يتطلب هذا تدخلاً إدارياً فورياً لتسريع دورات المراجعة.`;
    }

    const pieChartData = [
        { name: language === 'ar' ? 'معتمد' : 'Approved', value: globalStats.approved, color: '10B981' },
        { name: language === 'ar' ? 'مرفوض مفتوح' : 'Rejected Open', value: globalStats.rejectedOpen, color: 'F43F5E' },
        { name: language === 'ar' ? 'مرفوض مغلق' : 'Rejected Closed', value: globalStats.rejectedClosed, color: 'B91C1C' },
        { name: language === 'ar' ? 'معلق قيد المراجعة' : 'Pending Review', value: globalStats.pending, color: 'F59E0B' },
    ].filter(item => item.value > 0);

    const barChartData = byDocType.slice(0, 8).map(row => ({
        name: row.documentType,
        Rev00: row.stats.totalSheetsRev0 || 0,
        FurtherRev: row.stats.totalSheetsFurtherRev || 0,
        Total: row.stats.totalSubmittedSheets || 0
    }));

    const topOverdueItems = [...filteredData]
        .filter(d => d.overdue && d.workflowStage === 'Pending' && !d.documentType?.includes('LTR'))
        .sort((a, b) => (b.delayDays || 0) - (a.delayDays || 0))
        .slice(0, 5);

    const currentRejOpen = globalStats.currentRejectedOpen ?? globalStats.rejectedOpen;
    const currentPending = globalStats.currentPending ?? globalStats.pending;
    const currentRejClosed = globalStats.currentRejectedClosed ?? globalStats.rejectedClosed;

    const recs: { id: string; en: string; ar: string; priority: string; action: string; actionAr: string }[] = [];
    if (currentRejOpen > 0) {
        recs.push({
            id: 'rec-rej-open',
            en: `Prioritize immediate technical revision and resubmission for the ${currentRejOpen} unique items currently holding Rejected/Open status across project disciplines.`,
            ar: `إعطاء الأولوية العاجلة للمراجعة الفنية وإعادة تقديم البنود الفريدة البالغ عددها ${currentRejOpen} بنداً والتي لا تزال بحالة مرفوض/مفتوح حالياً عبر التخصصات المختلفة.`,
            priority: 'CRITICAL',
            action: 'Resolve Open Rejections',
            actionAr: 'معالجة المرفوض المفتوح'
        });
    }
    if (globalStats.overdue > 0) {
        recs.push({
            id: 'rec-overdue',
            en: `Deploy senior engineering task forces to expedite clearance of the ${globalStats.overdue} unique pending items that have exceeded consultant SLA review turnaround times.`,
            ar: `توجيه فرق هندسية متخصصة لسرعة مراجعة واعتماد البنود المعلقة المتأخرة والبالغ عددها ${globalStats.overdue} بنداً فريداً متجاوزة للمدد التعاقدية المحددة.`,
            priority: 'CRITICAL',
            action: 'Clear SLA Overdues',
            actionAr: 'تصفية المتأخرات الحرجة'
        });
    }
    let worstActiveDocType = '';
    let maxActiveUnique = 0;
    byDocType.forEach(row => {
        const rowActive = (row.stats.currentRejectedOpen ?? row.stats.rejectedOpen ?? 0) + (row.stats.currentPending ?? row.stats.pending ?? 0);
        if (rowActive > maxActiveUnique) {
            maxActiveUnique = rowActive;
            worstActiveDocType = row.documentType;
        }
    });

    if (worstActiveDocType && maxActiveUnique > 0) {
        recs.push({
            id: 'rec-doc-alignment',
            en: `Convene a focused technical alignment session between Innovo & ACE teams specifically for ${worstActiveDocType} (which holds ${maxActiveUnique} active/open unique items) to align on submittal compliance.`,
            ar: `عقد ورشة عمل فنية مشتركة بين المقاول والاستشاري لبحث سجلات (${worstActiveDocType}) التي تتضمن ${maxActiveUnique} بنداً فريداً نشطاً/معلقاً للاتفاق على معايير الجودة والامتثال الفني.`,
            priority: 'HIGH',
            action: `Align on ${worstActiveDocType} Quality`,
            actionAr: `تنسيق جودة ${worstActiveDocType}`
        });
    }

    if (currentPending > 0) {
        recs.push({
            id: 'rec-pending-queue',
            en: `Monitor the consultant review pipeline daily to ensure the ${currentPending} currently pending unique submittals receive responses within the 14-day SLA benchmark.`,
            ar: `متابعة مسار مراجعات الاستشاري بصورة يومية لضمان إصدار الردود على ${currentPending} بنداً فريداً معلقاً حالياً ضمن المهلة المحددة (14 يوماً).`,
            priority: 'MEDIUM',
            action: 'Track Pending Pipeline',
            actionAr: 'متابعة مسار المعلق'
        });
    } else if (appRate < 80) {
        recs.push({
            id: 'rec-qa-audit',
            en: `Strengthen internal QA/QC pre-submission checklists to improve first-time approval rates from ${appRate.toFixed(1)}% toward the 80%+ corporate target.`,
            ar: `تعزيز قوائم تدقيق الجودة الداخلية قبل التقديم لرفع معدل الاعتماد من التقديم الأول من ${appRate.toFixed(1)}% نحو النسبة المستهدفة 80%.`,
            priority: 'MEDIUM',
            action: 'Enhance Pre-QA/QC',
            actionAr: 'تطوير تدقيق الجودة الداخلي'
        });
    }

    return {
        globalStats,
        globalCriticalCount,
        byDocType,
        healthData,
        executiveSummaryBrief: { en: enSummary, ar: arSummary },
        trends: { approvalTrend: 3.5, submissionsTrend: 12, overdueTrend: -4 },
        pieChartData,
        barChartData,
        topOverdueItems,
        priorityRecommendations: recs
    };
};

// 1. Add Executive Performance Overview Slide (KPI Cards + Health Score + Observations)
export const addExecutiveOverviewSlide = (
    pres: pptxgen,
    dashData: ExecutiveDashboardData,
    isMonthly: boolean,
    projectInfo: ProjectSettings | null,
    logoUrl?: string,
    options?: any
) => {
    const slide = pres.addSlide({ masterName: "STRUCTUSIGHT_MASTER" });
    const isArabic = !!options?.arabicEnabled;
    const font = options?.fontFace || "Arial";
    const primColor = options?.primaryColor ? options.primaryColor.replace('#', '') : "0A192F";
    const accColor = options?.accentColor ? options.accentColor.replace('#', '') : "D4AF37";

    const slideTitle = isMonthly
        ? (isArabic ? "مؤشرات الأداء والملخص التنفيذي الشهري" : "MONTHLY PERFORMANCE & KPI OVERVIEW")
        : (isArabic ? "مؤشرات الأداء والملخص التنفيذي التراكمي" : "CUMULATIVE PERFORMANCE & KPI OVERVIEW");

    addHeaderAndFooter(pres, slide, slideTitle, projectInfo, logoUrl, options);

    // Executive Summary Alert Banner at top
    slide.addShape(pres.ShapeType.roundRect, {
        x: 0.4, y: 0.95, w: 9.2, h: 0.52,
        fill: { color: "203864" },
        line: { color: "334155", width: 1 }
    });
    slide.addText(isArabic ? "الموجز التنفيذي والرؤية الاستراتيجية:" : "EXECUTIVE SUMMARY BRIEF & INTELLIGENCE:", {
        x: 0.5, y: 0.98, w: 9.0, h: 0.18,
        fontSize: 7.5, bold: true, color: accColor, fontFace: font, align: isArabic ? "right" : "left"
    });
    slide.addText(isArabic ? dashData.executiveSummaryBrief.ar : dashData.executiveSummaryBrief.en, {
        x: 0.5, y: 1.15, w: 9.0, h: 0.28,
        fontSize: 8.5, color: "FFFFFF", fontFace: font, align: isArabic ? "right" : "left"
    });

    // 6 Core KPI Cards
    const kpiY = 1.55;
    const kpiW = 1.45;
    const kpiGap = 0.1;
    const kpiH = 1.25;

    const activePopulation = (dashData.globalStats.pending || 0) + (dashData.globalStats.rejectedOpen || 0);
    const overdueRateActive = activePopulation > 0 ? (((dashData.globalStats.overdue || 0) / activePopulation) * 100).toFixed(1) : "0.0";

    const cards = [
        {
            title: isArabic ? "إجمالي الصفحات (حجم العمل)" : "Total Sheets (Workload)",
            val: String(dashData.globalStats.totalSubmittedSheets || 0),
            sub: isArabic ? `مراجعة 00: ${dashData.globalStats.totalSheetsRev0} | لاحقة: ${dashData.globalStats.totalSheetsFurtherRev}` : `Rev0: ${dashData.globalStats.totalSheetsRev0} | Further: ${dashData.globalStats.totalSheetsFurtherRev}`,
            valColor: "203864",
            bg: "F8FAFC"
        },
        {
            title: isArabic ? "البنود الفريدة (الحالة الحالية)" : "Unique Items (Current State)",
            val: String(dashData.globalStats.totalUniqueDrawings || 0),
            sub: isArabic ? `معتمد: ${dashData.globalStats.approved} | مرفوض: ${dashData.globalStats.rejectedOpen + dashData.globalStats.rejectedClosed} | معلق: ${dashData.globalStats.pending}` : `App: ${dashData.globalStats.approved} | Rej: ${dashData.globalStats.rejectedOpen + dashData.globalStats.rejectedClosed} | Pnd: ${dashData.globalStats.pending}`,
            valColor: "2F75B5",
            bg: "F8FAFC"
        },
        {
            title: isArabic ? "نسبة الاعتماد" : "Approval Rate",
            val: `${dashData.globalStats.approvalRate.toFixed(1)}%`,
            sub: dashData.globalStats.approvalRate >= 80 ? (isArabic ? "المستهدف محقق (80%+)" : "Target met: 80%+") : (isArabic ? "دون المستهدف" : "Below target"),
            valColor: dashData.globalStats.approvalRate >= 80 ? "10B981" : "D97706",
            bg: dashData.globalStats.approvalRate >= 80 ? "ECFDF5" : "FFFBEB"
        },
        {
            title: isArabic ? "المعاملات النشطة (قيد العمل)" : "Active Population",
            val: String(activePopulation),
            sub: isArabic ? `معلق: ${dashData.globalStats.pending} | مرفوض مفتوح: ${dashData.globalStats.rejectedOpen}` : `Pending: ${dashData.globalStats.pending} | Rej Open: ${dashData.globalStats.rejectedOpen}`,
            valColor: "D97706",
            bg: "FFFBEB"
        },
        {
            title: isArabic ? "متأخرات من النشط (SLA)" : "Overdue (of Active)",
            val: `${dashData.globalStats.overdue || 0} / ${activePopulation}`,
            sub: `${overdueRateActive}% ` + (isArabic ? "نسبة التأخير من النشط" : "overdue rate"),
            valColor: "E11D48",
            bg: "FFF1F2"
        },
        {
            title: isArabic ? "معاملات ذات أولوية حرجة" : "Critical Priority",
            val: String(dashData.globalCriticalCount || 0),
            sub: isArabic ? "خاصية مشتقة / سمة أولوية" : "Derived Priority Attribute",
            valColor: (dashData.globalCriticalCount || 0) > 0 ? "BE123C" : "475569",
            bg: (dashData.globalCriticalCount || 0) > 0 ? "FFF1F2" : "F8FAFC"
        }
    ];

    cards.forEach((c, i) => {
        const xPos = 0.4 + i * (kpiW + kpiGap);
        slide.addShape(pres.ShapeType.roundRect, {
            x: xPos, y: kpiY, w: kpiW, h: kpiH,
            fill: { color: c.bg },
            line: { color: "CBD5E1", width: 1 }
        });
        slide.addText(c.title.toUpperCase(), {
            x: xPos + 0.05, y: kpiY + 0.1, w: kpiW - 0.1, h: 0.25,
            fontSize: 7.5, bold: true, color: "64748B", align: "center", fontFace: font
        });
        slide.addText(c.val, {
            x: xPos + 0.05, y: kpiY + 0.35, w: kpiW - 0.1, h: 0.5,
            fontSize: 16, bold: true, color: c.valColor, align: "center", fontFace: font
        });
        slide.addText(c.sub, {
            x: xPos + 0.05, y: kpiY + 0.85, w: kpiW - 0.1, h: 0.3,
            fontSize: 6.5, color: "64748B", align: "center", fontFace: font
        });
    });

    // Bottom Row: Left Health Score Card (w: 3.0), Right Observations (w: 6.0)
    const botY = 2.9;
    const botH = 2.25;

    // Health Score Card
    slide.addShape(pres.ShapeType.roundRect, {
        x: 0.4, y: botY, w: 3.0, h: botH,
        fill: { color: "FFFFFF" },
        line: { color: "CBD5E1", width: 1 }
    });
    slide.addText(isArabic ? "مؤشر وتقييم أداء المشروع" : "PROJECT PERFORMANCE INDEX", {
        x: 0.5, y: botY + 0.1, w: 2.8, h: 0.25,
        fontSize: 8.5, bold: true, color: "64748B", fontFace: font, align: isArabic ? "right" : "left"
    });
    slide.addText(`${dashData.healthData.score}`, {
        x: 0.5, y: botY + 0.35, w: 1.4, h: 0.6,
        fontSize: 32, bold: true, color: dashData.healthData.color, fontFace: font
    });
    slide.addText("/ 100", {
        x: 1.8, y: botY + 0.5, w: 1.3, h: 0.35,
        fontSize: 12, bold: true, color: "94A3B8", fontFace: font
    });
    slide.addText(dashData.healthData.rating, {
        x: 0.5, y: botY + 0.95, w: 2.8, h: 0.25,
        fontSize: 9, bold: true, color: dashData.healthData.color, fontFace: font, align: isArabic ? "right" : "left"
    });

    // Formula Breakdown Box
    slide.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: botY + 1.25, w: 2.8, h: 0.88,
        fill: { color: "F8FAFC" },
        line: { color: "E2E8F0", width: 1 }
    });
    slide.addText(isArabic ? "معادلة تدقيق مؤشر الأداء:" : "KPI Math & Audit Formula:", {
        x: 0.55, y: botY + 1.28, w: 2.7, h: 0.18,
        fontSize: 7, bold: true, color: "475569", fontFace: font, align: isArabic ? "right" : "left"
    });
    slide.addText(`• P1 (Approval Penalty - 35%): -${dashData.healthData.breakdown.approvalPenalty}\n• P2 (Overdue Ratio - 35%): -${dashData.healthData.breakdown.pendingOverduePenalty}\n• P3 (Overdue Density - 30%): -${dashData.healthData.breakdown.overdueDensityPenalty}`, {
        x: 0.55, y: botY + 1.46, w: 2.7, h: 0.62,
        fontSize: 6.5, color: "64748B", fontFace: font
    });

    // Right Observations Panel
    slide.addShape(pres.ShapeType.roundRect, {
        x: 3.6, y: botY, w: 6.0, h: botH,
        fill: { color: "FFFFFF" },
        line: { color: "CBD5E1", width: 1 }
    });
    slide.addText(isArabic ? "التحليلات والملاحظات الإدارية التنفيذية" : "EXECUTIVE ANALYTICAL OBSERVATIONS", {
        x: 3.8, y: botY + 0.1, w: 5.6, h: 0.25,
        fontSize: 8.5, bold: true, color: "203864", fontFace: font, align: isArabic ? "right" : "left"
    });

    const obsText1 = isArabic
        ? `• معدل الاعتماد: يبلغ حالياً ${dashData.globalStats.approvalRate.toFixed(1)}%. ${dashData.globalStats.approvalRate >= 80 ? 'هذا يتجاوز النسبة المستهدفة (80%) ويعكس جودة جيدة في المخرجات.' : 'هذا يقل عن النسبة المستهدفة (80%)، مما يتطلب تدقيق الجودة قبل التقديم.'}`
        : `• Approval Quality: Currently at ${dashData.globalStats.approvalRate.toFixed(1)}%. ${dashData.globalStats.approvalRate >= 80 ? 'Satisfies the 80% benchmark indicating robust initial submittal standards.' : 'Below the 80% benchmark, requiring pre-submission QA checks to reduce rework.'}`;

    const activeItems = (dashData.globalStats.rejectedOpen || 0) + (dashData.globalStats.pending || 0);
    const overduePct = activeItems > 0 ? ((dashData.globalStats.overdue / activeItems) * 100).toFixed(1) : "0.0";

    const obsText2 = isArabic
        ? `• حالة الأعمال النشطة: ${dashData.globalStats.overdue} من أصل ${activeItems} معاملة نشطة متأخرة متجاوزة للمدة (${overduePct}% من المعاملات النشطة تشمل ${dashData.globalStats.rejectedOpen} مرفوض مفتوح و ${dashData.globalStats.pending} معلق).`
        : `• Active Backlog Status: ${dashData.globalStats.overdue} of ${activeItems} active items are overdue (${overduePct}% of active items comprising ${dashData.globalStats.rejectedOpen} rejected open and ${dashData.globalStats.pending} pending review).`;

    const obsText3 = isArabic
        ? `• دورات المراجعة: تشكل المراجعات المتكررة ${(dashData.globalStats.totalSubmittedSheets > 0 ? (dashData.globalStats.totalSheetsFurtherRev / dashData.globalStats.totalSubmittedSheets * 100) : 0).toFixed(1)}% من إجمالي حجم العمل المستندي للمشروع.`
        : `• Cycle Analysis: Resubmissions represent ${(dashData.globalStats.totalSubmittedSheets > 0 ? (dashData.globalStats.totalSheetsFurtherRev / dashData.globalStats.totalSubmittedSheets * 100) : 0).toFixed(1)}% of total document workload, demonstrating significant rework volume.`;

    slide.addText(`${obsText1}\n\n${obsText2}\n\n${obsText3}`, {
        x: 3.8, y: botY + 0.38, w: 5.6, h: 1.75,
        fontSize: 8, color: "334155", fontFace: font, align: isArabic ? "right" : "left"
    });
};

// 2. Add Charts & Bottlenecks Slide (Pie Chart + Stacked Bar Chart + Overdue Table)
export const addChartsAndBottlenecksSlide = (
    pres: pptxgen,
    dashData: ExecutiveDashboardData,
    isMonthly: boolean,
    projectInfo: ProjectSettings | null,
    logoUrl?: string,
    options?: any
) => {
    const slide = pres.addSlide({ masterName: "STRUCTUSIGHT_MASTER" });
    const isArabic = !!options?.arabicEnabled;
    const font = options?.fontFace || "Arial";

    const slideTitle = isMonthly
        ? (isArabic ? "مخططات التوزيع وبؤر التكدس الحرجة (شهري)" : "MONTHLY STATUS CHARTS & CRITICAL BOTTLENECKS")
        : (isArabic ? "مخططات التوزيع وبؤر التكدس الحرجة (تراكمي)" : "CUMULATIVE STATUS CHARTS & CRITICAL BOTTLENECKS");

    addHeaderAndFooter(pres, slide, slideTitle, projectInfo, logoUrl, options);

    // Top Left: Pie Chart Container (w: 4.4, h: 2.15)
    slide.addShape(pres.ShapeType.roundRect, {
        x: 0.4, y: 0.95, w: 4.4, h: 2.25,
        fill: { color: "FFFFFF" },
        line: { color: "CBD5E1", width: 1 }
    });
    slide.addText(isArabic ? "توزيع حالة التقديمات الفريدة (100% تطابق)" : "SUBMITTALS STATUS DISTRIBUTION (SSOT)", {
        x: 0.5, y: 1.02, w: 4.2, h: 0.25,
        fontSize: 8.5, bold: true, color: "203864", fontFace: font, align: isArabic ? "right" : "left"
    });

    const pieValues = dashData.pieChartData.map(p => p.value);
    const pieLabels = dashData.pieChartData.map(p => p.name);
    const pieColors = dashData.pieChartData.map(p => p.color);

    if (pieValues.length > 0) {
        slide.addChart(pres.ChartType.pie, [
            { name: "Status", labels: pieLabels, values: pieValues }
        ], {
            x: 0.5, y: 1.28, w: 4.2, h: 1.85,
            showLegend: true,
            legendPos: "b",
            legendFontSize: 7.5,
            chartColors: pieColors,
            showPercent: true,
            showValue: false
        });
    }

    // Top Right: Stacked Column Chart Container (w: 4.6, h: 2.25)
    slide.addShape(pres.ShapeType.roundRect, {
        x: 5.0, y: 0.95, w: 4.6, h: 2.25,
        fill: { color: "FFFFFF" },
        line: { color: "CBD5E1", width: 1 }
    });
    slide.addText(isArabic ? "حجم ومراجعات الوثائق حسب نوع السجل (أعلى 8)" : "SUBMISSION LOAD BY REGISTER TYPE (TOP 8)", {
        x: 5.1, y: 1.02, w: 4.4, h: 0.25,
        fontSize: 8.5, bold: true, color: "203864", fontFace: font, align: isArabic ? "right" : "left"
    });

    if (dashData.barChartData.length > 0) {
        slide.addChart(pres.ChartType.bar, [
            {
                name: isArabic ? "مراجعة 00" : "Rev 00",
                labels: dashData.barChartData.map(b => b.name),
                values: dashData.barChartData.map(b => b.Rev00)
            },
            {
                name: isArabic ? "مراجعات لاحقة" : "Further Revs",
                labels: dashData.barChartData.map(b => b.name),
                values: dashData.barChartData.map(b => b.FurtherRev)
            }
        ], {
            x: 5.1, y: 1.28, w: 4.4, h: 1.85,
            barDir: "col",
            barGrouping: "stacked",
            showLegend: true,
            legendPos: "b",
            legendFontSize: 7.5,
            catAxisLabelFontSize: 7.5,
            chartColors: ["3B82F6", "93C5FD"],
            valGridLine: { color: "F1F5F9" },
            showValue: false
        });
    }

    // Bottom Half: Top Overdue Bottlenecks Spotlight Table (y: 3.3, h: 1.85)
    slide.addShape(pres.ShapeType.roundRect, {
        x: 0.4, y: 3.3, w: 9.2, h: 1.88,
        fill: { color: "FFF5F5" },
        line: { color: "FECDD3", width: 1 }
    });
    slide.addText(isArabic ? "أكبر 5 مستندات معلقة متأخرة والمسؤول عنها (بؤر التكدس الحرجة):" : "TOP CRITICAL OVERDUE BOTTLENECKS & ACTION OWNERS:", {
        x: 0.5, y: 3.35, w: 9.0, h: 0.25,
        fontSize: 8.5, bold: true, color: "BE123C", fontFace: font, align: isArabic ? "right" : "left"
    });

    if (dashData.topOverdueItems.length === 0) {
        slide.addText(isArabic ? "لا توجد معاملات متأخرة حالياً." : "No overdue items found in the current dataset.", {
            x: 0.5, y: 3.9, w: 9.0, h: 0.4,
            fontSize: 10, color: "64748B", align: "center", fontFace: font
        });
    } else {
        const tableRows: any[] = [];
        const headers = [
            { text: isArabic ? "مسلسل" : "Rank", options: { bold: true, fill: "BE123C", color: "FFFFFF", align: "center" } },
            { text: isArabic ? "الرقم المرجعي للمستند" : "Document Reference", options: { bold: true, fill: "BE123C", color: "FFFFFF", align: "center" } },
            { text: isArabic ? "نوع السجل" : "Log Type", options: { bold: true, fill: "BE123C", color: "FFFFFF", align: "center" } },
            { text: isArabic ? "التخصص" : "Discipline", options: { bold: true, fill: "BE123C", color: "FFFFFF", align: "center" } },
            { text: isArabic ? "أيام التأخير" : "Delay Days", options: { bold: true, fill: "BE123C", color: "FFFFFF", align: "center" } },
            { text: isArabic ? "الجهة المسؤولة عن الإجراء" : "Action Owner", options: { bold: true, fill: "BE123C", color: "FFFFFF", align: "center" } },
            { text: isArabic ? "تاريخ التقديم" : "Submission Date", options: { bold: true, fill: "BE123C", color: "FFFFFF", align: "center" } }
        ];
        tableRows.push(headers);

        dashData.topOverdueItems.forEach((item, idx) => {
            const responsible = item.workflowStage === 'Pending'
                ? (item.consultant || projectInfo?.consultantName || (isArabic ? 'الاستشاري المشرف' : 'Consultant'))
                : (item.contractor || projectInfo?.contractorName || (isArabic ? 'المقاول الرئيسي' : 'Contractor'));
            const isEven = idx % 2 === 1;
            const bg = isEven ? "FFFFFF" : "FFF1F2";

            tableRows.push([
                { text: `#${idx + 1}`, options: { fill: bg, align: "center", bold: true, color: "BE123C" } },
                { text: item.docNo || "-", options: { fill: bg, align: "left", bold: true, color: "1E293B" } },
                { text: item.documentType || "-", options: { fill: bg, align: "center", color: "334155" } },
                { text: item.trade || item.discipline || "General", options: { fill: bg, align: "center", color: "334155" } },
                { text: `${item.delayDays} ` + (isArabic ? "يوم" : "days"), options: { fill: bg, align: "center", bold: true, color: "BE123C" } },
                { text: responsible, options: { fill: bg, align: "center", color: "1E293B" } },
                { text: item.submissionDate || "-", options: { fill: bg, align: "center", color: "64748B" } }
            ]);
        });

        slide.addTable(tableRows, {
            x: 0.5, y: 3.65, w: 9.0,
            colW: [0.6, 2.6, 1.0, 1.0, 1.0, 1.8, 1.0],
            fontSize: 7.5,
            border: { type: "solid", pt: 0.5, color: "FECDD3" }
        });
    }
};

// 3. Add Register Breakdown Table Slide (Matching ReportTable.tsx Full Tabular Breakdown)
export const addRegisterBreakdownSlide = (
    pres: pptxgen,
    dashData: ExecutiveDashboardData,
    isMonthly: boolean,
    projectInfo: ProjectSettings | null,
    logoUrl?: string,
    options?: any
) => {
    const slide = pres.addSlide({ masterName: "STRUCTUSIGHT_MASTER" });
    const isArabic = !!options?.arabicEnabled;
    const font = options?.fontFace || "Arial";

    const slideTitle = isMonthly
        ? (isArabic ? "جدول تفصيل السجلات الهندسية (شهري)" : "MONTHLY PRIMARY DETAIL REGISTER BREAKDOWN")
        : (isArabic ? "جدول تفصيل السجلات الهندسية (تراكمي)" : "CUMULATIVE PRIMARY DETAIL REGISTER BREAKDOWN");

    addHeaderAndFooter(pres, slide, slideTitle, projectInfo, logoUrl, options);

    const tableRows: any[] = [];
    const headers = [
        { text: isArabic ? "نوع المعاملة" : "Log Type", options: { bold: true, fill: "203864", color: "FFFFFF", align: "left" } },
        { text: isArabic ? "الأولوية" : "Priority", options: { bold: true, fill: "203864", color: "FFFFFF", align: "center" } },
        { text: isArabic ? "مراجعة 00" : "Rev 00", options: { bold: true, fill: "334155", color: "FFFFFF", align: "center" } },
        { text: isArabic ? "مراجعات لاحقة" : "Rev >00", options: { bold: true, fill: "334155", color: "FFFFFF", align: "center" } },
        { text: isArabic ? "إجمالي الصفوف" : "Total Rows", options: { bold: true, fill: "1E293B", color: "FFFFFF", align: "center" } },
        { text: isArabic ? "معتمد/مغلق (صفوف)" : "Row App/Closed", options: { bold: true, fill: "065F46", color: "FFFFFF", align: "center" } },
        { text: isArabic ? "مرفوض/مفتوح (صفوف)" : "Row Rej/Open", options: { bold: true, fill: "991B1B", color: "FFFFFF", align: "center" } },
        { text: isArabic ? "معلق (صفوف)" : "Row Pending", options: { bold: true, fill: "92400E", color: "FFFFFF", align: "center" } },
        { text: isArabic ? "إجمالي البنود الفريدة" : "Total Unique", options: { bold: true, fill: "1E3A8A", color: "FFFFFF", align: "center" } },
        { text: isArabic ? "معتمد/مغلق حالي" : "Cur. App/Closed", options: { bold: true, fill: "047857", color: "FFFFFF", align: "center" } },
        { text: isArabic ? "مرفوض مفتوح حالي" : "Cur. Rej Open", options: { bold: true, fill: "BE123C", color: "FFFFFF", align: "center" } },
        { text: isArabic ? "مرفوض مغلق حالي" : "Cur. Rej Closed", options: { bold: true, fill: "881337", color: "FFFFFF", align: "center" } },
        { text: isArabic ? "معلق حالي" : "Cur. Pending", options: { bold: true, fill: "D97706", color: "FFFFFF", align: "center" } }
    ];
    tableRows.push(headers);

    let sumRev0 = 0;
    let sumFurther = 0;
    let sumSheets = 0;
    let sumRowAppClosed = 0;
    let sumRowRejOpen = 0;
    let sumRowPending = 0;
    let sumUnique = 0;
    let sumCurApp = 0;
    let sumCurRejOpen = 0;
    let sumCurRejClosed = 0;
    let sumCurPending = 0;
    let sumCritical = 0;

    dashData.byDocType.forEach((row, idx) => {
        const isEven = idx % 2 === 1;
        const bg = isEven ? "F8FAFC" : "FFFFFF";
        const crit = row.criticalCount || 0;
        const rowAppClosed = row.stats.rowApprovedClosed ?? ((row.stats.rowApproved || 0) + (row.stats.rowRejectedClosed || 0));
        const rowRejOpen = row.stats.rowRejectedOpen ?? (row.stats.rejectedOpenRows || 0);
        const rowPending = row.stats.rowPending || 0;

        sumRev0 += (row.stats.totalSheetsRev0 || 0);
        sumFurther += (row.stats.totalSheetsFurtherRev || 0);
        sumSheets += (row.stats.totalSubmittedSheets || 0);
        sumRowAppClosed += rowAppClosed;
        sumRowRejOpen += rowRejOpen;
        sumRowPending += rowPending;
        sumUnique += (row.stats.totalUniqueDrawings || 0);
        sumCurApp += (row.stats.currentApproved || 0);
        sumCurRejOpen += (row.stats.currentRejectedOpen || 0);
        sumCurRejClosed += (row.stats.currentRejectedClosed || 0);
        sumCurPending += (row.stats.currentPending || 0);
        sumCritical += crit;

        tableRows.push([
            { text: row.documentType, options: { fill: bg, align: "left", bold: true, color: "203864" } },
            { text: crit > 0 ? `CRITICAL (${crit})` : "-", options: { fill: crit > 0 ? "FFF1F2" : bg, align: "center", bold: crit > 0, color: crit > 0 ? "BE123C" : "64748B" } },
            { text: String(row.stats.totalSheetsRev0 || 0), options: { fill: bg, align: "center" } },
            { text: String(row.stats.totalSheetsFurtherRev || 0), options: { fill: bg, align: "center" } },
            { text: String(row.stats.totalSubmittedSheets || 0), options: { fill: "F1F5F9", align: "center", bold: true, color: "0F172A" } },
            { text: String(rowAppClosed), options: { fill: bg, align: "center", color: "065F46" } },
            { text: String(rowRejOpen), options: { fill: bg, align: "center", color: "991B1B" } },
            { text: String(rowPending), options: { fill: bg, align: "center", color: "92400E" } },
            { text: String(row.stats.totalUniqueDrawings || 0), options: { fill: "EFF6FF", align: "center", bold: true, color: "1E3A8A" } },
            { text: String(row.stats.currentApproved || 0), options: { fill: bg, align: "center", bold: true, color: "047857" } },
            { text: String(row.stats.currentRejectedOpen || 0), options: { fill: bg, align: "center", color: "BE123C" } },
            { text: String(row.stats.currentRejectedClosed || 0), options: { fill: bg, align: "center", color: "881337" } },
            { text: String(row.stats.currentPending || 0), options: { fill: bg, align: "center", color: "D97706" } }
        ]);
    });

    // Total Row
    tableRows.push([
        { text: isArabic ? "الإجمالي الكلي" : "TOTAL", options: { fill: "DDEBF7", align: "left", bold: true, color: "203864" } },
        { text: sumCritical > 0 ? `CRITICAL (${sumCritical})` : "-", options: { fill: "DDEBF7", align: "center", bold: sumCritical > 0, color: sumCritical > 0 ? "BE123C" : "64748B" } },
        { text: String(sumRev0), options: { fill: "DDEBF7", align: "center", bold: true, color: "203864" } },
        { text: String(sumFurther), options: { fill: "DDEBF7", align: "center", bold: true, color: "203864" } },
        { text: String(sumSheets), options: { fill: "CBD5E1", align: "center", bold: true, color: "0F172A" } },
        { text: String(sumRowAppClosed), options: { fill: "DDEBF7", align: "center", bold: true, color: "065F46" } },
        { text: String(sumRowRejOpen), options: { fill: "DDEBF7", align: "center", bold: true, color: "991B1B" } },
        { text: String(sumRowPending), options: { fill: "DDEBF7", align: "center", bold: true, color: "92400E" } },
        { text: String(sumUnique), options: { fill: "BFDBFE", align: "center", bold: true, color: "1E3A8A" } },
        { text: String(sumCurApp), options: { fill: "DDEBF7", align: "center", bold: true, color: "047857" } },
        { text: String(sumCurRejOpen), options: { fill: "DDEBF7", align: "center", bold: true, color: "BE123C" } },
        { text: String(sumCurRejClosed), options: { fill: "DDEBF7", align: "center", bold: true, color: "881337" } },
        { text: String(sumCurPending), options: { fill: "DDEBF7", align: "center", bold: true, color: "D97706" } }
    ]);

    slide.addTable(tableRows, {
        x: 0.3, y: 1.0, w: 9.4,
        colW: [1.3, 0.85, 0.6, 0.65, 0.7, 0.7, 0.7, 0.65, 0.75, 0.65, 0.6, 0.6, 0.6],
        fontSize: 6.5,
        border: { type: "solid", pt: 0.5, color: "CBD5E1" }
    });
};

// 4. Add Strategic Recommendations Slide (Matching ReportTable.tsx Recommendations Panel)
export const addRecommendationsSlide = (
    pres: pptxgen,
    dashData: ExecutiveDashboardData,
    isMonthly: boolean,
    projectInfo: ProjectSettings | null,
    logoUrl?: string,
    options?: any
) => {
    const slide = pres.addSlide({ masterName: "STRUCTUSIGHT_MASTER" });
    const isArabic = !!options?.arabicEnabled;
    const font = options?.fontFace || "Arial";

    const slideTitle = isMonthly
        ? (isArabic ? "التوصيات وخطة العمل التنفيذية (شهري)" : "MONTHLY STRATEGIC RECOMMENDATIONS & ACTION PLAN")
        : (isArabic ? "التوصيات وخطة العمل التنفيذية (تراكمي)" : "CUMULATIVE STRATEGIC RECOMMENDATIONS & ACTION PLAN");

    addHeaderAndFooter(pres, slide, slideTitle, projectInfo, logoUrl, options);

    // 2x2 Grid of Recommendation Cards
    const recs = dashData.priorityRecommendations.slice(0, 4);
    const cardW = 4.45;
    const cardH = 1.95;
    const startX = 0.4;
    const gapX = 0.3;
    const startY = 1.05;
    const gapY = 0.2;

    recs.forEach((rec, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const xPos = startX + col * (cardW + gapX);
        const yPos = startY + row * (cardH + gapY);

        let priorityColor = "2563EB";
        let priorityBg = "EFF6FF";
        if (rec.priority === 'CRITICAL') {
            priorityColor = "DC2626";
            priorityBg = "FEF2F2";
        } else if (rec.priority === 'HIGH') {
            priorityColor = "EA580C";
            priorityBg = "FFF7ED";
        }

        slide.addShape(pres.ShapeType.roundRect, {
            x: xPos, y: yPos, w: cardW, h: cardH,
            fill: { color: "FFFFFF" },
            line: { color: "CBD5E1", width: 1 }
        });

        // Priority Badge
        slide.addShape(pres.ShapeType.roundRect, {
            x: xPos + 0.15, y: yPos + 0.15, w: 1.2, h: 0.28,
            fill: { color: priorityBg },
            line: { color: priorityColor, width: 0.5 }
        });
        slide.addText(rec.priority, {
            x: xPos + 0.15, y: yPos + 0.17, w: 1.2, h: 0.24,
            fontSize: 7.5, bold: true, color: priorityColor, align: "center", fontFace: font
        });

        // Action Name
        slide.addText(isArabic ? rec.actionAr : rec.action, {
            x: xPos + 1.45, y: yPos + 0.15, w: cardW - 1.6, h: 0.28,
            fontSize: 9.5, bold: true, color: "203864", fontFace: font, align: isArabic ? "right" : "left"
        });

        // Separator line
        slide.addShape(pres.ShapeType.rect, {
            x: xPos + 0.15, y: yPos + 0.5, w: cardW - 0.3, h: 0.01,
            fill: { color: "E2E8F0" }
        });

        // Detail text
        slide.addText(isArabic ? rec.ar : rec.en, {
            x: xPos + 0.15, y: yPos + 0.58, w: cardW - 0.3, h: 1.25,
            fontSize: 8.5, color: "475569", fontFace: font, align: isArabic ? "right" : "left"
        });
    });
};
