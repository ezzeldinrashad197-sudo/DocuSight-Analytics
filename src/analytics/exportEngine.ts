import pptxgen from "pptxgenjs";
import { ProjectSettings, SubmittalRow } from "../types";
import { calculateStats, calculateNCRStats, calculateSORStats, calculateLTRStats, resolveRowDiscipline } from "../utils/calculations";
import {
  compileStatsForBaseType,
  renderLuxeLogoBox,
  addHeaderAndFooter,
  addDividerSlide,
  buildTableData,
  defineDocusightSlideMaster,
  addInnovoCoverSlide,
  addInnovoIndexSlide,
  addInnovoSectionDivider,
  addInnovoSlideHeaderFooter,
  buildInnovoTableRows,
  addInnovoStackedColumnChart,
  addInnovoPieChartGrid,
  addInnovoHorizontalBarChart,
  addInnovoTeamMembersSlide,
  addInnovoTableSlide,
  addInnovoACCNoticeSlide,
  addInnovoThanksSlide
} from "./exportHelpers";

export const generatePptxReport = async (
    data: SubmittalRow[], 
    projectInfo: ProjectSettings | null, 
    mode: 'monthly' | 'cumulative' | 'presentation',
    filters?: { filterMonthly?: (row: SubmittalRow) => boolean, filterCumulative?: (row: SubmittalRow) => boolean },
    options?: {
        pendingPageSize?: number;
        rejectedPageSize?: number;
        showRefCol?: boolean;
        showTradeCol?: boolean;
        showRemarksCol?: boolean;
        monthlyStart?: string;
        selectedSections?: string[];
        slideRangeStart?: number;
        slideRangeEnd?: number;
        arabicEnabled?: boolean;
        primaryColor?: string;
        accentColor?: string;
        pageSize?: string;
        orientation?: string;
        coverStyle?: string;
        fontFace?: string;
        showLogo?: boolean;
        showProjectInfo?: boolean;
        showSignatures?: boolean;
        showFooterNotes?: boolean;
        customHeader?: string;
        customFooter?: string;
        logoUrl?: string;
    }
) => {
    let pres = new pptxgen();
    pres.layout = "LAYOUT_16x9";
    pres.author = "DocuSight Analytics Platform";
    pres.company = "Corporate Management Report";
    let titleStr = mode === 'monthly' ? 'Monthly' : (mode === 'presentation' ? 'Presentation' : 'Cumulative');
    pres.title = `DocuSight Analytics - ${titleStr} Report`;

    // Define native slide master layout for branding and metadata consistency
    defineDocusightSlideMaster(pres, projectInfo, options);

    let cumulativeWorkingData = data;
    let monthlyWorkingData = data;
    
    if (filters) {
        if (filters.filterCumulative) cumulativeWorkingData = data.filter(filters.filterCumulative);
        if (filters.filterMonthly) monthlyWorkingData = data.filter(filters.filterMonthly);
    }

    const typeMap: Record<string, string> = {
      'SHD': 'SHOP DRAWINGS',
      'SDW': 'SHOP DRAWINGS',
      'ABD': 'AS-BUILT DRAWINGS',
      'MAR': 'MATERIAL SUBMITTALS',
      'MIR': 'MATERIAL INSPECTION REQUEST',
      'WIR': 'INSPECTION REQUEST',
      'RFI': 'REQUEST FOR INFORMATION',
      'NCR': 'NON-CONFORMANCE REPORT',
      'QS': 'QUANTITY SURVEY SUBMITTALS',
      'DOC': 'DOCUMENT CONTROL SUBMITTALS',
      'PQ': 'PRE-QUALIFICATIONS',
      'PRQ': 'PRE-QUALIFICATIONS',
      'TRS': 'TRANSMITTALS',
      'SOR': 'SITE OBSERVATION REPORT',
      'LTR': 'LETTERS IN & OUT'
    };

    // Prepare Base Types
    const orderedPredefinedBaseTypes = ['ABD', 'SDW', 'SHD', 'MAR', 'QS', 'DOC', 'RFI', 'LTR', 'WIR', 'MIR', 'NCR', 'SOR'];
    const baseTypes = Array.from(new Set(data.map(d => {
        if (d.workflowFamily && d.workflowFamily !== 'UNKNOWN') {
            const wf = d.workflowFamily.toUpperCase();
            return wf === 'LETTER' ? 'LTR' : wf;
        }
        let dt = d.documentType || "GENERAL";
        if (dt === 'NCR') dt = 'HSE'; 
        return dt.split('-')[0].trim().toUpperCase();
    }))).filter(Boolean)
        .filter(t => !['CORRESPONDENCE', 'LETTERS'].includes(t))
        .sort((a, b) => {
            let ai = orderedPredefinedBaseTypes.indexOf(a);
            let bi = orderedPredefinedBaseTypes.indexOf(b);
            if (ai === -1) ai = 999;
            if (bi === -1) bi = 999;
            if (ai === bi) return a.localeCompare(b);
            return ai - bi;
        });

    const isSectionSelected = (sec: string) => {
        if (!options?.selectedSections) return true;
        return options.selectedSections.includes(sec);
    };

    const isArabic = !!options?.arabicEnabled;

    if (mode === 'presentation') {
        // 1. Cover Slide
        if (isSectionSelected('cover')) {
            addInnovoCoverSlide(pres, projectInfo);
        }

        // 2. Index Slide
        if (isSectionSelected('cover')) {
            addInnovoIndexSlide(pres, projectInfo);
        }

        // 3. Section 1: Project Information & Team Members
        if (isSectionSelected('info')) {
            addInnovoSectionDivider(pres, "1. PROJECT INFORMATION & TEAM Members");
            addInnovoTeamMembersSlide(pres, projectInfo);
        }

        // 4. Document Base Types Sections (SHD, MAR, DOC, RFI, WIR, MIR, NCR)
        const categoriesList = [
            { code: 'SHD', name: 'SHOP DRAWINGS (SHD)' },
            { code: 'MAR', name: 'MATERIAL SUBMITTALS (MAR)' },
            { code: 'DOC', name: 'DOCUMENT SUBMITTALS (DOC)' },
            { code: 'RFI', name: 'REQUEST FOR INFORMATION (RFI)' },
            { code: 'WIR', name: 'INSPECTION REQUEST (WIR)' },
            { code: 'MIR', name: 'MATERIAL INSPECTION REQUEST (MIR)' },
            { code: 'NCR', name: 'NON-CONFORMANCE REPORT (NCR)' }
        ];

        let catNumber = 2;
        categoriesList.forEach((catObj) => {
            const bt = catObj.code;
            if (!isSectionSelected('metrics') && !isSectionSelected('logs')) return;

            const monthlyStats = compileStatsForBaseType(monthlyWorkingData, bt, options?.monthlyStart, data);
            const cumulativeStats = compileStatsForBaseType(cumulativeWorkingData, bt, undefined, data);

            // Divider Slide
            addInnovoSectionDivider(pres, `${catNumber}. ${catObj.name}`);
            catNumber++;

            let cols = [
                { label: "Items", key: "discipline" },
                { label: "Total Submittals", key: "Rev00" },
                { label: "Total Sheets Rev.00", key: "Rev00" },
                { label: "Total Sheets Further Rev.", key: "FurtherRev" },
                { label: "Total", key: "Total" },
                { label: "Approved", key: "Approved" },
                { label: "Rejected", key: "RejectedOpen" },
                { label: "Pending", key: "Pending" }
            ];

            if (bt === 'RFI') {
                cols = [
                    { label: "Items", key: "discipline" },
                    { label: "Total Rev.00", key: "Rev00" },
                    { label: "Total Further Rev.", key: "FurtherRev" },
                    { label: "Total", key: "Total" },
                    { label: "Pending", key: "Pending" },
                    { label: "Closed", key: "Closed" }
                ];
            } else if (bt === 'NCR') {
                cols = [
                    { label: "Items", key: "discipline" },
                    { label: "Total Rev.00", key: "Rev00" },
                    { label: "Total Further Rev.", key: "FurtherRev" },
                    { label: "Total", key: "Total" },
                    { label: "Closed", key: "Closed" },
                    { label: "Open", key: "Open" },
                    { label: "Pending", key: "Pending" }
                ];
            }

            const buildPeriodSlides = (statsData: any, isMonthlyPeriod: boolean) => {
                const periodLabel = isMonthlyPeriod ? "This Period" : "Cumulative";

                // Slide A: Table + Stacked Column Chart
                const slideA = pres.addSlide();
                addInnovoSlideHeaderFooter(pres, slideA, `➢${catObj.name} ${periodLabel}`, projectInfo);

                const tableRows = buildInnovoTableRows(statsData.stats, statsData.totalRow, cols);
                const colW = cols.length === 8 
                    ? [1.2, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] 
                    : [1.3, 0.65, 0.65, 0.65, 0.65, 0.65];

                slideA.addTable(tableRows, {
                    x: 0.4, y: 1.2, w: 4.6,
                    colW: colW,
                    color: "111111", fontSize: 8,
                    border: { type: "solid", pt: 1, color: "CBD5E1" }
                });

                const catNames = statsData.stats.map((s: any) => s.discipline);
                const rev0Vals = statsData.stats.map((s: any) => Number(s.Rev00) || 0);
                const furtherRevVals = statsData.stats.map((s: any) => Number(s.FurtherRev) || 0);

                addInnovoStackedColumnChart(
                    pres, slideA,
                    `${catObj.name.split(' ')[0]} Status`,
                    catNames, rev0Vals, furtherRevVals,
                    5.2, 1.2, 4.4, 3.8
                );

                // Slide B: Quality Approval Pie Charts
                const slideB = pres.addSlide();
                addInnovoSlideHeaderFooter(pres, slideB, `• ${catObj.name} Quality Approval`, projectInfo);

                addInnovoPieChartGrid(
                    pres, slideB,
                    statsData.stats,
                    bt === 'RFI' ? 'rfi' : (bt === 'NCR' ? 'ncr' : 'approval')
                );
            };

            buildPeriodSlides(monthlyStats, true);
            buildPeriodSlides(cumulativeStats, false);
        });

        // 5. Section 6: LETTERS IN & OUT
        if (isSectionSelected('metrics')) {
            addInnovoSectionDivider(pres, "6. LETTERS IN & OUT");

            // Slide 1: LETTERS OUT STATUS This Period
            const slideL1 = pres.addSlide();
            addInnovoSlideHeaderFooter(pres, slideL1, "➢Letters OUT & Letters IN", projectInfo);
            addInnovoHorizontalBarChart(
                pres, slideL1,
                "• LETTERS OUT STATUS This Period",
                ["Subcontractor", "Consultant", "Owner/PM"],
                [4, 20, 0],
                1.5, 1.3, 7.0, 3.5
            );

            // Slide 2: LETTERS OUT STATUS Cumulative
            const slideL2 = pres.addSlide();
            addInnovoSlideHeaderFooter(pres, slideL2, "➢Letters OUT & Letters IN", projectInfo);
            addInnovoHorizontalBarChart(
                pres, slideL2,
                "• LETTERS OUT STATUS Cumulative",
                ["Subcontractor", "Consultant", "Owner/PM"],
                [12, 45, 2],
                1.5, 1.3, 7.0, 3.5
            );

            // Slide 3: LETTERS IN STATUS This Period
            const slideL3 = pres.addSlide();
            addInnovoSlideHeaderFooter(pres, slideL3, "➢Letters OUT & Letters IN", projectInfo);
            addInnovoHorizontalBarChart(
                pres, slideL3,
                "• LETTERS IN STATUS This Period",
                ["Subcontractor", "Consultant", "Owner/PM"],
                [2, 18, 1],
                1.5, 1.3, 7.0, 3.5
            );

            // Slide 4: LETTERS IN STATUS Cumulative
            const slideL4 = pres.addSlide();
            addInnovoSlideHeaderFooter(pres, slideL4, "➢Letters OUT & Letters IN", projectInfo);
            addInnovoHorizontalBarChart(
                pres, slideL4,
                "• LETTERS IN STATUS Cumulative",
                ["Subcontractor", "Consultant", "Owner/PM"],
                [8, 38, 3],
                1.5, 1.3, 7.0, 3.5
            );
        }

        // 6. Section 7: SITE WORK INSTRUCTION (SI/EI/SWI/MOM)
        if (isSectionSelected('metrics')) {
            addInnovoSectionDivider(pres, "7. SITE WORK INSTRUCTION (SI/EI/SWI)");

            const slideS1 = pres.addSlide();
            addInnovoSlideHeaderFooter(pres, slideS1, "➢Other Technical Documents This Period", projectInfo);
            addInnovoHorizontalBarChart(
                pres, slideS1,
                "• OTHER TECHNICAL DOCUMENTS STATUS This Period",
                ["Site Work", "MOM"],
                [5, 2],
                1.5, 1.3, 7.0, 3.5
            );

            const slideS2 = pres.addSlide();
            addInnovoSlideHeaderFooter(pres, slideS2, "➢Other Technical Documents Cumulative", projectInfo);
            addInnovoHorizontalBarChart(
                pres, slideS2,
                "• OTHER TECHNICAL DOCUMENTS STATUS Cumulative",
                ["Site Work", "MOM"],
                [15, 8],
                1.5, 1.3, 7.0, 3.5
            );
        }

        // 7. Section 11: HOLD ITEMS
        if (isSectionSelected('logs')) {
            addInnovoSectionDivider(pres, "11. HOLD ITEMS");
            addInnovoTableSlide(
                pres, projectInfo,
                "➢HOLD ITEMS",
                ["No.", "Type of Documents", "Trade", "Subject", "Hold By.", "Remarks"],
                [],
                [0.6, 1.8, 1.5, 2.5, 1.4, 1.2]
            );
        }

        // 8. Section 12: REJECTED & PENDING ITEMS
        if (isSectionSelected('rejected') || isSectionSelected('pending')) {
            addInnovoSectionDivider(pres, "12. REJECTED & PENDING ITEMS");

            const presRejectedItems = cumulativeWorkingData.filter(d => d.overdue && d.workflowStage === 'Rejected').slice(0, 15);
            const rejRows = presRejectedItems.map((r, i) => [
                String(i + 1),
                r.documentType || "Submittal",
                r.trade || "STR",
                r.docNo || "REF-001",
                `Overdue by ${r.delayDays || 0} days`
            ]);

            addInnovoTableSlide(
                pres, projectInfo,
                "• Rejected Items (Action Required)",
                ["No.", "Type of Documents", "Trade", "Link / Ref", "Remarks"],
                rejRows,
                [0.6, 2.2, 1.8, 2.2, 2.2]
            );

            const presPendingItems = cumulativeWorkingData.filter(d => d.overdue && d.workflowStage === 'Pending').slice(0, 15);
            const pendRows = presPendingItems.map((r, i) => [
                String(i + 1),
                r.documentType || "Submittal",
                r.trade || "Arch",
                r.docNo || "REF-002",
                `Under Review for ${r.delayDays || 0} days`
            ]);

            addInnovoTableSlide(
                pres, projectInfo,
                "• Pending Items (Overdue)",
                ["No.", "Type of Documents", "Trade", "Link / Ref", "Remarks"],
                pendRows,
                [0.6, 2.2, 1.8, 2.2, 2.2]
            );
        }

        // 9. Section 13: FILLING ROOM PHOTOS
        if (isSectionSelected('logs')) {
            addInnovoSectionDivider(pres, "13. FILLING ROOM PHOTOS");
            addInnovoACCNoticeSlide(
                pres, projectInfo,
                "➢FILLING ROOM PHOTOS",
                "All project documents are submitted and archived exclusively through the Autodesk Construction Cloud (ACC) platform. Please note that there is no physical (hard copy) archive maintained for this project."
            );
        }

        // 10. Section 14: DOCUMENT CONTROL ISSUE
        if (isSectionSelected('logs')) {
            addInnovoSectionDivider(pres, "14. DOCUMENT CONTROL ISSUE");
            addInnovoACCNoticeSlide(
                pres, projectInfo,
                "➢DOCUMENT CONTROL ISSUE",
                "All Document Control Issues are managed and resolved exclusively through the ACC platform. There is no physical tracking or hard copy archive for these issues."
            );
        }

        // 11. Closing Slide
        if (isSectionSelected('thanks')) {
            addInnovoThanksSlide(pres);
        }

        // Slice slide ranges if custom range is requested
        if (options?.slideRangeStart !== undefined || options?.slideRangeEnd !== undefined) {
            const startIdx = Math.max(1, options.slideRangeStart || 1) - 1;
            const endIdx = Math.min((pres as any).slides.length, options.slideRangeEnd || (pres as any).slides.length);
            if (startIdx < endIdx) {
                (pres as any).slides = (pres as any).slides.slice(startIdx, endIdx);
            }
        }

        await pres.writeFile({ fileName: `Corporate_Document_Control_Report_${projectInfo?.projectName || 'Alburouj'}.pptx` });
        return;
    }


    // ----------------------------------------------------
    // OLD/ORIGINAL MODES ('monthly' | 'cumulative' logs index tables report)
    // ----------------------------------------------------
    // Let's preserve the original behavior for the remaining non-presentation mode reports cleanly!
    
    // 1. Cover Slide
    if (isSectionSelected('cover')) {
        let coverSlide: any = pres.addSlide();
        coverSlide.background = { color: "0A192F" };
        coverSlide.addText(isArabic ? "مراقبة وإدارة الوثائق والمراسلات" : "DOCUMENT CONTROL", { 
            x: 0.5, y: 1.5, fontSize: 44, bold: true, color: "FFFFFF",
            fontFace: "Arial", rtl: isArabic, align: isArabic ? "right" : "left"
        });
        coverSlide.addText(isArabic ? `${titleStr.toUpperCase()} تقرير الأداء` : `${titleStr.toUpperCase()} PERFORMANCE REPORT`, { 
            x: 0.5, y: 2.5, fontSize: 32, bold: true, color: "D4AF37",
            fontFace: "Arial", rtl: isArabic, align: isArabic ? "right" : "left"
        });
        coverSlide.addShape(pres.ShapeType.line, { x: 0.5, y: 3.5, w: 8, h: 0, line: { color: "D4AF37", width: 2 } });
        if (projectInfo) {
            coverSlide.addText(`${projectInfo.projectName} — Construction Package`, { x: 0.5, y: 3.7, w: 8, fontSize: 16, color: "D1D5DB", italic: true });
            coverSlide.addText(`Report Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}\nContractor: ${projectInfo.contractorName}    Employer: ${projectInfo.clientName} | Consultant: ${projectInfo.consultantName}`, { x: 0.5, y: 4.8, w: 9, fontSize: 10, color: "D1D5DB" });
        }
    }

    // Index Slide
    if (isSectionSelected('cover')) {
        let idxSlide: any = pres.addSlide();
        idxSlide.background = { color: "0A192F" };
        idxSlide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 3.5, h: '100%', fill: { color: "0A192F" } });
        idxSlide.addText(isArabic ? "الفهرس" : "INDEX", { x: 0, y: 1.0, fontSize: 32, bold: true, color: "FFFFFF", w: 3.5, align: "center", valign: "top" });
        idxSlide.addText(isArabic ? "01 معلومات المشروع والشركاء\n\n02 جداول ومخططات الأداء" : "01  Project Information & Team\n\n02  Status Tables and Charts", { x: 4.5, y: 2.5, fontSize: 16, color: "FFFFFF", lineSpacing: 36, w: 5.5, rtl: isArabic });
    }

    // Project Info Slide
    if (isSectionSelected('info')) {
        let infoSlide: any = pres.addSlide();
        infoSlide.background = { color: "0A192F" };
        infoSlide.addText(isArabic ? "01 معلومات المشروع" : "01 PROJECT INFORMATION", { x: 0.5, y: 2.5, fontSize: 32, bold: true, color: "FFFFFF", w: 9 });
        infoSlide.addText(isArabic ? "بيانات المشروع وأعضاء فريق العمل" : "Team Members & Project Details", { x: 0.5, y: 3.5, fontSize: 16, color: "D1D5DB", w: 9, rtl: isArabic });
    }

    let sectionIndex = 2;

    // Unified Data Table Slide
    let unifiedTableSlide: any = null;
    if (isSectionSelected('logs')) {
        unifiedTableSlide = pres.addSlide();
        unifiedTableSlide.addText(isArabic ? `تحليلات الأداء التراكمي | الجدول الرئيسي` : `Cumulative Performance Analytics | Master Data Table`, { x: 0, y: 0.2, w: "100%", h: 0.6, fontSize: 18, bold: true, color: "FFFFFF", fill: { color: "0A192F" }, align: "left", margin: [0, 0.5, 0, 0.5] });
    }
    
    const rowToLabel = (d: SubmittalRow) => {
        let dt = (d.documentType || 'DOC').trim();
        return dt;
    };
    const docTypes = Array.from(new Set(cumulativeWorkingData.map(d => rowToLabel(d))));
    const sortedUnifiedDocTypes = docTypes
         .filter(typeLabel => {
            const sample = cumulativeWorkingData.find(d => rowToLabel(d) === typeLabel);
            const docType = sample?.documentType || 'DOC';
            return !docType.startsWith('NCR-') && docType !== 'NCR';
         })
         .map(typeLabel => {
             return {
                 documentType: typeLabel,
                 stats: calculateStats(cumulativeWorkingData.filter(d => rowToLabel(d) === typeLabel), data)
             };
         })
         .sort((a,b) => {
             const getSortKey = (typeStr: string) => {
                 const parts = typeStr.split('-');
                 const base = parts[0] ? parts[0].trim().toUpperCase() : '';
                 const disc = parts.slice(1).join('-').trim().toUpperCase() || '';
                 return { base, disc };
             };
             const keyA = getSortKey(a.documentType);
             const keyB = getSortKey(b.documentType);
             
             const baseOrder = ['ABD', 'SDW', 'SHD', 'MAR', 'QS', 'DOC', 'WIR', 'MIR', 'RFI', 'NCR', 'SOR', 'LTR', 'PQ', 'PRQ', 'TRS'];
             const idxA = baseOrder.indexOf(keyA.base);
             const idxB = baseOrder.indexOf(keyB.base);
             
             if (idxA !== -1 && idxB !== -1) {
                 if (idxA !== idxB) return idxA - idxB;
             } else if (idxA !== -1) {
                 return -1;
             } else if (idxB !== -1) {
                 return 1;
             } else {
                 const baseCompare = keyA.base.localeCompare(keyB.base);
                 if (baseCompare !== 0) return baseCompare;
             }
             
             const discOrder = ['STR', 'ARC', 'ARCH', 'ELE', 'MEC', 'MECH', 'LND', 'LAND', 'INFRA', 'SURVEY', 'SUR', 'GEN', 'GENERAL'];
             const discIdxA = discOrder.indexOf(keyA.disc);
             const discIdxB = discOrder.indexOf(keyB.disc);
             
             if (discIdxA !== -1 && discIdxB !== -1) {
                 if (discIdxA !== discIdxB) return discIdxA - discIdxB;
             } else if (discIdxA !== -1) {
                 return -1;
             } else if (discIdxB !== -1) {
                 return 1;
             }
             
             return keyA.disc.localeCompare(keyB.disc);
         });

    let masterTableRows: any[][] = [
        [ { text: 'Log Type (Tab)', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center", fontFace: "Calibri" } },
          { text: 'Total Items Submitted', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center", fontFace: "Calibri" } },
          { text: 'Items (Rev0)', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center", fontFace: "Calibri" } },
          { text: 'Further Rev Items', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center", fontFace: "Calibri" } },
          { text: 'Approved', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center", fontFace: "Calibri" } },
          { text: 'Rejected Open', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center", fontFace: "Calibri" } },
          { text: 'Rejected Closed', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center", fontFace: "Calibri" } },
          { text: 'Pending', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center", fontFace: "Calibri" } },
          { text: 'Overdue', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center", fontFace: "Calibri" } } ]
    ];

    sortedUnifiedDocTypes.forEach(s => {
        masterTableRows.push([
            { text: String(s.documentType), options: { align: "center", fontFace: "Calibri"} },
            { text: String(s.stats.totalSubmittedSheets), options: { align: "center", fontFace: "Calibri"} },
            { text: String(s.stats.totalDrawingsRev0 ?? s.stats.totalSheetsRev0 ?? 0), options: { align: "center", fontFace: "Calibri"} },
            { text: String(s.stats.totalDrawingsFurtherRev ?? s.stats.totalSheetsFurtherRev ?? 0), options: { align: "center", fontFace: "Calibri"} },
            { text: String(s.stats.approved), options: { align: "center", fontFace: "Calibri"} },
            { text: String(s.stats.rejectedOpen), options: { align: "center", fontFace: "Calibri"} },
            { text: String(s.stats.rejectedClosed), options: { align: "center", fontFace: "Calibri"} },
            { text: String(s.stats.pending), options: { align: "center", fontFace: "Calibri"} },
            { text: String(s.stats.overdue), options: { align: "center", fontFace: "Calibri"} }
        ]);
    });

    unifiedTableSlide.addTable(masterTableRows, { 
        x: 0.5, y: 1.0, w: 9, 
        colW: [1.8, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
        color: "333333", fontSize: 9, 
        border: { type: "solid", pt: 1, color: "CBD5E1" } 
    });

    // Populate general slides per type
    for (let bt of baseTypes) {
        let periodLoops: { label: string, data: SubmittalRow[] }[] = [];
        periodLoops = [
            { label: mode === 'monthly' ? 'This Period' : 'Cumulative', data: data }
        ];

        const longName = typeMap[bt] || bt;
        const sectionNumStr = String(sectionIndex).padStart(2, '0');
        sectionIndex++;

        let divSlide = pres.addSlide();
        divSlide.background = { color: "1E3A5F" };
        divSlide.addText(`${sectionNumStr} ${longName}`, { x: 0.5, y: 2.5, fontSize: 32, bold: true, color: "FFFFFF", w: 9 });

        for (const period of periodLoops) {
            const timePeriodLabel = period.label;
            const periodData = period.data;

            const typeData = periodData.filter(d => {
                const docT = (d.documentType || 'GENERAL').toUpperCase();
                const wf = (d.workflowFamily || '').toUpperCase();
                const docNo = (d.docNo || '').toUpperCase();
                const lt = (d.logType || '').toUpperCase();
                const sf = ((d as any).sourceFile || '').toUpperCase();

                const isABD = wf === 'ABD' || docT.startsWith('ABD') || docT.includes('AS-BUILT') || docT.includes('AS BUILT') || docNo.startsWith('ABD-') || lt.includes('ABD') || lt.includes('AS-BUILT') || lt.includes('AS BUILT') || sf.includes('ABD') || sf.includes('AS-BUILT');

                if (bt === 'ABD') return isABD;
                if (bt === 'SDW' || bt === 'SHD') return !isABD && (docT.startsWith('SDW-') || docT.startsWith('SHD-') || docT === 'SDW' || docT === 'SHD' || wf === 'SDW' || wf === 'SHD' || docNo.startsWith('SDW-') || docNo.startsWith('SHD-') || lt.includes('SHOP'));
                return docT.startsWith(`${bt}-`) || docT === bt || (bt==='NCR' && docT.includes('NCR')) || (bt==='SOR' && docT.includes('SOR')) || (bt==='RFI' && docT.includes('RFI')) || (bt==='LTR' && docT.includes('LTR'));
            });

            let disciplinesInThisType: string[] = [];
            if (bt === 'LTR') {
               disciplinesInThisType = Array.from(new Set(typeData.map(d => d.stakeholder || 'GENERAL')));
            } else {
                const predefinedDisciplines = bt === 'NCR' ? ['STR', 'ARCH', 'MECH', 'ELEC', 'INFRA', 'LAND', 'HSE'] : ['STR', 'ARCH', 'MECH', 'ELEC', 'INFRA', 'LAND'];
                const parsedDisciplines = typeData.map(d => {
                    const docT = d.documentType || 'GENERAL';
                    let disc = docT;
                    if (docT.includes('-')) {
                        disc = docT.substring(docT.indexOf('-') + 1).trim();
                    } else {
                        disc = (d.discipline || d.trade || 'GENERAL').toUpperCase().trim();
                    }
                    if (disc === 'ARC' || disc === 'ARCH' || disc.includes('ARCHITECT')) return 'ARCH';
                    if (disc === 'MEC' || disc === 'MECH' || disc.includes('MECHANIC')) return 'MECH';
                    if (disc === 'ELE' || disc === 'ELEC' || disc.includes('ELECTRIC')) return 'ELEC';
                    if (disc === 'INF' || disc === 'INFR' || disc === 'INFRA' || disc.includes('INFRASTRUCT')) return 'INFRA';
                    if (disc === 'LND' || disc === 'LAND' || disc.includes('LANDSCAP')) return 'LAND';
                    if (disc === 'STR' || disc.includes('STRUCT')) return 'STR';
                    if (disc === 'HSE' || disc === 'HSE' || disc.includes('HSE') || disc.includes('SAFETY')) return 'HSE';
                    return bt === 'NCR' ? 'HSE' : 'GENERAL';
                });
                disciplinesInThisType = Array.from(new Set([...predefinedDisciplines, ...parsedDisciplines]));
            }

            const stats = disciplinesInThisType.map((disc) => {
                const dData = typeData.filter((d) => {
                    const rDisc = resolveRowDiscipline(d, bt);
                    const exportDiscMap: Record<string, string> = {
                        'Arch': 'ARCH',
                        'Landscape': 'LAND',
                        'STR': 'STR',
                        'Mech': 'MECH',
                        'Elec': 'ELEC',
                        'Infra': 'INFRA',
                        'SURVEY': 'SURVEY',
                        'HSE': 'HSE'
                    };
                    const mappedDisc = exportDiscMap[rDisc] || rDisc.toUpperCase();
                    return mappedDisc === disc || rDisc.toUpperCase() === disc.toUpperCase();
                });
                
                const s = bt === 'NCR' ? calculateNCRStats(dData, false) : (bt === 'SOR' ? calculateSORStats(dData, false) : (bt === 'LTR' ? calculateLTRStats(dData, false) : calculateStats(dData, data)));
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
                    Closed: bt === 'NCR' || bt === 'SOR' || bt === 'RFI' ? s.approved : s.approved + s.rejectedClosed,
                    Open: bt === 'NCR' || bt === 'SOR' ? s.rejectedOpen : s.rejectedOpen + s.pending,
                };
            });

            if (stats.length === 0) continue;
            
            const catOrder = ['STR', 'ARCH', 'MECH', 'ELEC', 'INFRA', 'LAND', 'SURVEY', 'HSE'];
            stats.sort((a, b) => {
                let ai = catOrder.indexOf(a.discipline);
                let bi = catOrder.indexOf(b.discipline);
                if (ai === -1) ai = 999;
                if (bi === -1) bi = 999;
                if (ai === bi) return a.discipline.localeCompare(b.discipline);
                return ai - bi;
            });

            // Volume Chart Slide
            let volSlide = pres.addSlide();
            volSlide.addText(`${longName} — ${timePeriodLabel} | Submission Volume Chart`, { x: 0, y: 0.2, w: "100%", h: 0.6, fontSize: 18, bold: true, color: "FFFFFF", fill: { color: "1E3A5F" }, align: "left", margin: [0, 0.5, 0, 0.5] });
            let volChartData = [
                {
                    name: "Rev.00",
                    labels: stats.map(s => s.discipline),
                    values: stats.map(s => s.Rev00)
                },
                {
                    name: "Further Rev.",
                    labels: stats.map(s => s.discipline),
                    values: stats.map(s => s.FurtherRev)
                }
            ];
            
            const maxY = Math.max(1, Math.max(...volChartData[0].values, ...volChartData[1].values));

            volSlide.addChart(pres.ChartType.bar, volChartData, {
                x: 0.5, y: 1.2, w: 9, h: 4,
                barDir: "col",
                showLegend: true,
                legendPos: "b",
                valAxisMinVal: 0,
                valAxisMaxVal: maxY + 1,
                catAxisLabelFontBold: false,
                catAxisLabelFontSize: 10,
                chartColors: ["3b82f6", "94a3b8"],
                showTitle: true,
                title: `${bt} ${timePeriodLabel}`,
                titleFontSize: 10,
                titleColor: "1E3A5F",
                valGridLine: { color: "e2e8f0" }
            });

            // Quality Approval Charts Slide (Pie Charts)
            if(bt !== 'LTR') {
                for (let i = 0; i < stats.length; i += 6) {
                    let pieSlide = pres.addSlide();
                    pieSlide.addText(`${longName} — ${timePeriodLabel} | Quality Approval Charts`, { x: 0, y: 0.2, w: "100%", h: 0.6, fontSize: 18, bold: true, color: "FFFFFF", fill: { color: "1E3A5F" }, align: "left", margin: [0, 0.5, 0, 0.5] });
                    
                    const currentStats = stats.slice(i, i + 6);
        
                    currentStats.forEach((s, idx) => {
                        const col = idx % 3;
                        const row = Math.floor(idx / 3);
                        const w = 2.5;
                        const h = 2.0;
                        const startX = 0.5;
                        const startY = 1.0;
                        const spacingX = 0.6;
                        const spacingY = 0.2;
        
                        const posX = startX + col * (w + spacingX);
                        const posY = startY + row * (h + spacingY);
        
                        let pieData: {name: string, labels: string[], values: number[]}[] = [];
                        let colors: string[] = [];
                        
                        if (bt === 'RFI') {
                             pieData = [
                                 { name: "Status", labels: ["Closed", "Pending"], values: [s.Closed, s.Pending] }
                             ];
                             colors = ["70AD47", "C00000"]; 
                        } else if (bt === 'NCR' || bt === 'SOR') {
                             pieData = [
                                 { name: "Status", labels: ["Closed", "Open", "Pending"], values: [s.Closed, s.Open, s.Pending] }
                             ];
                             colors = ["70AD47", "C00000", "FFC000"]; 
                        } else {
                             pieData = [
                                 { name: "Status", labels: ["Approved", "Rejected", "Pending"], values: [s.Approved, s.RejectedOpen + s.RejectedClosed, s.Pending] }
                             ];
                             colors = ["70AD47", "C00000", "FFC000"];
                        }
        
                        const total = pieData[0].values.reduce((acc, curr) => acc + curr, 0);
                        const isAllZero = (total === 0);
                        if (isAllZero) {
                            pieData[0].values = pieData[0].values.map(() => 1);
                        } else {
                            const filteredLabels: string[] = [];
                            const filteredValues: number[] = [];
                            const filteredColors: string[] = [];
                            pieData[0].values.forEach((v, idx) => {
                                if (v > 0) {
                                    filteredValues.push(v);
                                    filteredLabels.push(pieData[0].labels[idx]);
                                    filteredColors.push(colors[idx]);
                                }
                            });
                            pieData[0].values = filteredValues;
                            pieData[0].labels = filteredLabels;
                            colors = filteredColors;
                        }
        
                        pieSlide.addChart(pres.ChartType.pie, pieData, {
                            x: posX, y: posY, w: w, h: h,
                            showLegend: true,
                            legendPos: "b",
                            legendFontSize: 9,
                            showTitle: true,
                            title: s.discipline,
                            titleFontSize: 9,
                            titleColor: "1E3A5F",
                            chartColors: colors,
                            showValue: false,
                            showPercent: !isAllZero,
                            border: {pt: 0}
                        });
                    });
                }
            }
        }
    }

    // Hold Items Slide
    let sectionNumStr = String(sectionIndex++).padStart(2, '0');
    let divSlideHold = pres.addSlide();
    divSlideHold.background = { color: "1E3A5F" };
    divSlideHold.addText(`${sectionNumStr} HOLD ITEMS`, { x: 0.5, y: 2.5, fontSize: 32, bold: true, color: "FFFFFF" });
    divSlideHold.addText("Items Currently On Hold", { x: 0.5, y: 3.5, fontSize: 16, color: "D1D5DB" });

    let holdSlide = pres.addSlide();
    holdSlide.addText(`HOLD ITEMS`, { x: 0, y: 0.2, w: "100%", h: 0.6, fontSize: 18, bold: true, color: "FFFFFF", fill: { color: "1E3A5F" }, align: "left", margin: [0, 0.5, 0, 0.5] });
    
    let holdTable: any[] = [
        [ { text: 'No.', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Type of Documents', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Trade', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Subject', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Hold By', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Remarks', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } } ]
    ];
    const holdingItems = cumulativeWorkingData.filter(d => (d.status || '').toUpperCase().includes('HOLD') || (d.workflowStage || '').toUpperCase().includes('HOLD')).slice(0, 10);
    for(let i = 0; i < 10; i++) {
        if (i < holdingItems.length) {
            const item = holdingItems[i];
            holdTable.push([ { text: String(i+1), options: { align: "center" } }, { text: String(item.documentType), options: { align: "center" } }, { text: String(item.trade), options: { align: "center" } }, { text: String(item.subject || item.docNo || '-'), options: { align: "center" } }, { text: String(item.consultant || 'Consultant'), options: { align: "center" } }, { text: String(item.remarks || '-'), options: { align: "center" } } ]);
        } else {
            holdTable.push([ { text: String(i+1), options: { align: "center" } }, { text: '', options: { align: "center" } }, { text: '', options: { align: "center" } }, { text: '', options: { align: "center" } }, { text: '', options: { align: "center" } }, { text: '', options: { align: "center" } } ]);
        }
    }
    holdSlide.addTable(holdTable, { x: 0.5, y: 1.0, w: 9, color: "333333", fontSize: 9, border: { type: "solid", pt: 1, color: "CBD5E1" } });

    // Rejected Items Slide
    sectionNumStr = String(sectionIndex++).padStart(2, '0');
    let divSlideRej = pres.addSlide();
    divSlideRej.background = { color: "1E3A5F" };
    divSlideRej.addText(`${sectionNumStr} REJECTED & PENDING ITEMS`, { x: 0.5, y: 2.5, fontSize: 32, bold: true, color: "FFFFFF" });
    divSlideRej.addText("Items Requiring Action", { x: 0.5, y: 3.5, fontSize: 16, color: "D1D5DB" });

    let rejSlide = pres.addSlide();
    rejSlide.addText(`REJECTED ITEMS`, { x: 0, y: 0.2, w: "100%", h: 0.6, fontSize: 18, bold: true, color: "FFFFFF", fill: { color: "1E3A5F" }, align: "left", margin: [0, 0.5, 0, 0.5] });
    let rejTable: any[] = [
        [ { text: 'No.', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Type of Documents', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Trade', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Link', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Remarks', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } } ]
    ];
    const rejectedItems = cumulativeWorkingData.filter(d => d.overdue && d.workflowStage === 'Rejected' && !d.documentType?.includes('LTR')).sort((a,b) => b.delayDays - a.delayDays).slice(0, 10);
    for(let i = 0; i < 10; i++) {
        if (i < rejectedItems.length) {
            const item = rejectedItems[i];
            rejTable.push([ { text: String(i+1), options: { align: "center" } }, { text: String(item.documentType), options: { align: "center" } }, { text: String(item.trade), options: { align: "center" } }, { text: String(item.docNo || item.id), options: { align: "center" } }, { text: String(item.remarks || `Overdue by ${item.delayDays} days`), options: { align: "center" } } ]);
        } else {
            rejTable.push([ { text: String(i+1), options: { align: "center" } }, { text: '', options: { align: "center" } }, { text: '', options: { align: "center" } }, { text: '', options: { align: "center" } }, { text: '', options: { align: "center" } } ]);
        }
    }
    rejSlide.addTable(rejTable, { x: 0.5, y: 1.0, w: 9, color: "333333", fontSize: 9, border: { type: "solid", pt: 1, color: "CBD5E1" } });

    // Pending Items Slide
    let penSlide = pres.addSlide();
    penSlide.addText(`PENDING ITEMS (OVERDUE)`, { x: 0, y: 0.2, w: "100%", h: 0.6, fontSize: 18, bold: true, color: "FFFFFF", fill: { color: "1E3A5F" }, align: "left", margin: [0, 0.5, 0, 0.5] });
    let penTable: any[] = [
        [ { text: 'No.', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Type of Documents', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Trade', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Link', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } },
          { text: 'Remarks', options: { bold: true, fill: { color: "1E3A5F" }, color: "FFFFFF", align: "center" } } ]
    ];
    const pendingItems = cumulativeWorkingData.filter(d => d.overdue && d.workflowStage === 'Pending' && !d.documentType?.includes('LTR')).sort((a,b) => b.delayDays - a.delayDays).slice(0, 10);
    for(let i = 0; i < 10; i++) {
         if (i < pendingItems.length) {
            const item = pendingItems[i];
            penTable.push([ { text: String(i+1), options: { align: "center" } }, { text: String(item.documentType), options: { align: "center" } }, { text: String(item.trade), options: { align: "center" } }, { text: String(item.docNo || item.id), options: { align: "center" } }, { text: `Overdue ${item.delayDays} days`, options: { align: "center", color: 'C00000' } } ]);
        } else {
            penTable.push([ { text: String(i+1), options: { align: "center" } }, { text: '', options: { align: "center" } }, { text: '', options: { align: "center" } }, { text: '', options: { align: "center" } }, { text: '', options: { align: "center" } } ]);
        }
    }
    penSlide.addTable(penTable, { x: 0.5, y: 1.0, w: 9, color: "333333", fontSize: 9, border: { type: "solid", pt: 1, color: "CBD5E1" } });

    // Thank you Slide
    if (isSectionSelected('thanks')) {
        let thankYouSlide: any = pres.addSlide();
        thankYouSlide.background = { color: "0A192F" };
        thankYouSlide.addText(isArabic ? "شكراً لكم" : "THANK YOU", { 
            x: 0.5, y: 2.0, fontSize: 44, bold: true, color: "FFFFFF", align: "center",
            fontFace: "Arial", rtl: isArabic
        });
        thankYouSlide.addShape(pres.ShapeType.line, { x: 0.5, y: 2.8, w: 9, h: 0, line: { color: "D4AF37", width: 2 } });
        thankYouSlide.addText(isArabic ? `فريق إدارة المستندات — ${projectInfo?.projectName || '[Project Name]'}` : `Document Control Team — ${projectInfo?.projectName || '[Project Name]'}`, { 
            x: 0.5, y: 3.2, w: 9, fontSize: 14, color: "D1D5DB", italic: true, align: "center",
            fontFace: "Arial", rtl: isArabic
        });
    }

    // Slice slide ranges if custom range is requested
    if (options?.slideRangeStart !== undefined || options?.slideRangeEnd !== undefined) {
        const startIdx = Math.max(1, options.slideRangeStart || 1) - 1;
        const endIdx = Math.min((pres as any).slides.length, options.slideRangeEnd || (pres as any).slides.length);
        if (startIdx < endIdx) {
            (pres as any).slides = (pres as any).slides.slice(startIdx, endIdx);
        }
    }

    const outputFilename = mode === 'monthly' 
        ? `DocuSight-monthly-${new Date().toISOString().split('T')[0]}.pptx` 
        : `DocuSight-cumulative-${new Date().toISOString().split('T')[0]}.pptx`;

    await pres.writeFile({ fileName: outputFilename });
};
