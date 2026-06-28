import pptxgen from "pptxgenjs";
import { ProjectSettings, SubmittalRow } from "../types";
import { calculateStats, calculateNCRStats, calculateSORStats, calculateLTRStats } from "../utils/calculations";
import {
  compileStatsForBaseType,
  renderLuxeLogoBox,
  addHeaderAndFooter,
  addDividerSlide,
  buildTableData
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
    }
) => {
    let pres = new pptxgen();
    pres.layout = "LAYOUT_16x9";
    pres.author = "DocuSight Analytics Platform";
    pres.company = "Corporate Management Report";
    let titleStr = mode === 'monthly' ? 'Monthly' : (mode === 'presentation' ? 'Presentation' : 'Cumulative');
    pres.title = `DocuSight Analytics - ${titleStr} Report`;

    let cumulativeWorkingData = data;
    let monthlyWorkingData = data;
    
    if (filters) {
        if (filters.filterCumulative) cumulativeWorkingData = data.filter(filters.filterCumulative);
        if (filters.filterMonthly) monthlyWorkingData = data.filter(filters.filterMonthly);
    }

    const typeMap: Record<string, string> = {
      'SHD': 'SHOP DRAWINGS',
      'SDW': 'SHOP DRAWINGS',
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
    const orderedPredefinedBaseTypes = ['SHD', 'SDW', 'MAR', 'QS', 'DOC', 'RFI', 'LTR', 'WIR', 'MIR', 'NCR', 'SOR'];
    const baseTypes = Array.from(new Set(data.map(d => {
        let dt = d && d.documentType ? String(d.documentType) : "GENERAL";
        if (dt === 'NCR') dt = 'NCR-HSE'; 
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

    if (mode === 'presentation') {
        const logoUrl = projectInfo?.logoUrl;

        // Cover Slide
        let coverSlide = pres.addSlide();
        coverSlide.background = { color: "203864" };
        coverSlide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: "eab308" } });
        coverSlide.addText("DOCUMENT CONTROL", { x: 1.2, y: 1.0, w: 7, h: 0.8, fontSize: 36, bold: true, color: "FFFFFF", fontFace: "Georgia" });
        coverSlide.addText("MONTHLY REPORT", { x: 1.2, y: 1.8, w: 7, h: 0.8, fontSize: 32, bold: true, color: "eab308", fontFace: "Georgia" });
        coverSlide.addShape(pres.ShapeType.rect, { x: 1.2, y: 2.7, w: 5.5, h: 0.02, fill: { color: "eab308" } });
        coverSlide.addText(`[${projectInfo?.projectName || 'Project'}]`, { x: 1.2, y: 2.9, w: 5.5, h: 0.4, fontSize: 14, color: "FFFFFF", fontFace: "Arial" });
        coverSlide.addShape(pres.ShapeType.rect, { x: 1.2, y: 3.5, w: 5.5, h: 0.02, fill: { color: "eab308" } });
        const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
        coverSlide.addText(`Report Date: ${dateStr}`, { x: 1.2, y: 3.7, w: 5.5, h: 0.3, fontSize: 13, color: "FFFFFF" });
        coverSlide.addText(`[${projectInfo?.contractorName || 'Contractor'}]`, { x: 1.2, y: 4.1, w: 5.5, h: 0.3, fontSize: 13, color: "FFFFFF" });
        // Cover slide logo using standardized premium badge layout
        renderLuxeLogoBox(pres, coverSlide, 7.2, 0.8, 2.2, 1.2, projectInfo, logoUrl);

        // Index Slide
        let idxSlide = pres.addSlide();
        idxSlide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 3.0, h: 5.625, fill: { color: "203864" } });
        idxSlide.addText("INDEX", { x: 0.4, y: 2.0, w: 2.2, h: 0.6, fontSize: 36, bold: true, color: "FFFFFF" });
        idxSlide.addText("Table of Contents", { x: 0.4, y: 2.6, w: 2.2, h: 0.4, fontSize: 12, color: "CBD5E1" });
        idxSlide.addShape(pres.ShapeType.rect, { x: 0.4, y: 3.2, w: 2.2, h: 0.03, fill: { color: "eab308" } });
        
        // Index slide logo using standardized premium badge layout
        renderLuxeLogoBox(pres, idxSlide, 8.2, 0.4, 1.4, 0.6, projectInfo, logoUrl);
        let currentY = 1.0;
        idxSlide.addText("01", { x: 3.5, y: currentY, w: 0.4, h: 0.25, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: "2F75B5" }, align: "center" });
        idxSlide.addText("Project Information & Team", { x: 4.1, y: currentY, w: 4.0, h: 0.25, fontSize: 11, bold: true, color: "333333" });
        currentY += 0.32;
        baseTypes.forEach((bt, idx) => {
            const lName = typeMap[bt] || bt;
            idxSlide.addText(String(idx + 2).padStart(2, '0'), { x: 3.5, y: currentY, w: 0.4, h: 0.25, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: "2F75B5" }, align: "center" });
            idxSlide.addText(`${lName} (${bt})`, { x: 4.1, y: currentY, w: 4.0, h: 0.25, fontSize: 11, bold: true, color: "333333" });
            currentY += 0.32;
        });
        idxSlide.addText(String(baseTypes.length + 2).padStart(2, '0'), { x: 3.5, y: currentY, w: 0.4, h: 0.25, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: "C00000" }, align: "center" });
        idxSlide.addText("Rejected Items (المرفوضات)", { x: 4.1, y: currentY, w: 4.0, h: 0.25, fontSize: 11, bold: true, color: "333333" });
        currentY += 0.32;
        idxSlide.addText(String(baseTypes.length + 3).padStart(2, '0'), { x: 3.5, y: currentY, w: 0.4, h: 0.25, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: "2F75B5" }, align: "center" });
        idxSlide.addText("Pending Items (المعلقات)", { x: 4.1, y: currentY, w: 4.0, h: 0.25, fontSize: 11, bold: true, color: "333333" });
        idxSlide.addText(`[${projectInfo?.projectName || 'Project'}]  |  Document Control Monthly Report  |  [${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}]`, { x: 3.5, y: 5.15, w: 6.0, h: 0.25, fontSize: 8, color: "94A3B8" });

        // Project Info Divider + Content Slides
        addDividerSlide(pres, "Team Members & Project Details", "01 PROJECT INFORMATION", projectInfo, logoUrl);
        let infoSlide = pres.addSlide();
        addHeaderAndFooter(pres, infoSlide, "PROJECT INFORMATION", projectInfo, logoUrl);
        infoSlide.addShape(pres.ShapeType.rect, { x: 0.6, y: 1.5, w: 2.7, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 } });
        infoSlide.addText("Employer", { x: 0.6, y: 1.5, w: 2.7, h: 0.35, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: "2F75B5" }, align: "center" });
        infoSlide.addText(projectInfo?.clientName || "N/A", { x: 0.7, y: 1.9, w: 2.5, h: 0.9, fontSize: 14, bold: true, color: "333333", align: "center", valign: "middle" });
        infoSlide.addShape(pres.ShapeType.rect, { x: 3.65, y: 1.5, w: 2.7, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 } });
        infoSlide.addText("Consultant", { x: 3.65, y: 1.5, w: 2.7, h: 0.35, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: "2F75B5" }, align: "center" });
        infoSlide.addText(projectInfo?.consultantName || "N/A", { x: 3.75, y: 1.9, w: 2.5, h: 0.9, fontSize: 14, bold: true, color: "333333", align: "center", valign: "middle" });
        infoSlide.addShape(pres.ShapeType.rect, { x: 6.7, y: 1.5, w: 2.7, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 } });
        infoSlide.addText("CA / PM", { x: 6.7, y: 1.5, w: 2.7, h: 0.35, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: "2F75B5" }, align: "center" });
        infoSlide.addText(projectInfo?.projectManager || "N/A", { x: 6.8, y: 1.9, w: 2.5, h: 0.9, fontSize: 14, bold: true, color: "333333", align: "center", valign: "middle" });
        infoSlide.addShape(pres.ShapeType.rect, { x: 0.6, y: 3.3, w: 4.2, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 } });
        infoSlide.addText("Contractor", { x: 0.6, y: 3.3, w: 4.2, h: 0.35, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: "5B9BD5" }, align: "center" });
        infoSlide.addText(projectInfo?.contractorName || "N/A", { x: 0.7, y: 3.7, w: 4.0, h: 0.9, fontSize: 16, bold: true, color: "333333", align: "center", valign: "middle" });
        infoSlide.addShape(pres.ShapeType.rect, { x: 5.2, y: 3.3, w: 4.2, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 } });
        infoSlide.addText("Document Control Manager / Team", { x: 5.2, y: 3.3, w: 4.2, h: 0.35, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: "5B9BD5" }, align: "center" });
        infoSlide.addText(projectInfo?.documentControlManager || "N/A", { x: 5.3, y: 3.7, w: 4.0, h: 0.9, fontSize: 16, bold: true, color: "333333", align: "center", valign: "middle" });

        // Compile Slides For Base Types
        baseTypes.forEach((bt, sectionIdx) => {
            const monthlyStats = compileStatsForBaseType(monthlyWorkingData, bt, options?.monthlyStart, data);
            const cumulativeStats = compileStatsForBaseType(cumulativeWorkingData, bt, undefined, data);
            
            if (!monthlyStats.hasData && !cumulativeStats.hasData) return;
            
            const longName = typeMap[bt] || bt;
            let sectionNumber = sectionIdx + 2;
            let sectionTitle = `${String(sectionNumber).padStart(2, '0')} ${longName}`;
            
            // 1. Section Divider
            addDividerSlide(pres, bt, sectionTitle, projectInfo, logoUrl);
            
            // Columns variables
            let cols = [
               { label: "Items", key: "discipline" },
               { label: "Total Rev.00", key: "Rev00" },
               { label: "Total Further Rev.", key: "FurtherRev" },
               { label: "Total", key: "Total" },
               { label: "Approved", key: "Approved" },
               { label: "Rejected", key: "RejectedOpen" },
               { label: "Pending", key: "Pending" },
            ];
            let pieLabels = ["Approved", "Rejected", "Pending"];

            if (bt !== 'RFI' && bt !== 'NCR' && bt !== 'SOR' && bt !== 'LTR') {
                monthlyStats.stats.forEach(s => { s.RejectedOpen = Number(s.RejectedOpen) + Number(s.RejectedClosed); });
                cumulativeStats.stats.forEach(s => { s.RejectedOpen = Number(s.RejectedOpen) + Number(s.RejectedClosed); });
            }

            if (bt === 'RFI') {
               cols = [
                  { label: "Items", key: "discipline" },
                  { label: "Total Rev.00", key: "Rev00" },
                  { label: "Total Further Rev.", key: "FurtherRev" },
                  { label: "Total", key: "Total" },
                  { label: "Pending", key: "Pending" },
                  { label: "Closed", key: "Closed" },
               ];
               pieLabels = ["Closed", "Pending"];
            } else if (bt === 'NCR' || bt === 'SOR') {
               cols = [
                  { label: "Items", key: "discipline" },
                  { label: "Total Rev.00", key: "Rev00" },
                  { label: "Total Further Rev.", key: "FurtherRev" },
                  { label: "Total", key: "Total" },
                  { label: "Closed", key: "Closed" },
                  { label: "Open", key: "Open" },
                  { label: "Pending", key: "Pending" },
               ];
               pieLabels = ["Closed", "Open", "Pending"];
            } else if (bt === 'LTR') {
               cols = [
                  { label: "Stakeholder", key: "discipline" },
                  { label: "Sent", key: "Rev00" }, 
                  { label: "Received", key: "FurtherRev" }, 
                  { label: "Total", key: "Total" },
               ];
               pieLabels = ["Sent", "Received"];
            }

            // Slide creation helper for both Monthly & Cumulative
            const createPeriodSlidesForBaseType = (statsData: any, isMonthlyPeriod: boolean) => {
                if (!statsData.hasData) return;
                const periodLabel = isMonthlyPeriod ? "This Period" : "Cumulative";
                
                // Slide A: Table + Bar Chart
                let slideA = pres.addSlide();
                addHeaderAndFooter(pres, slideA, `${longName} (${bt}) ${periodLabel}`, projectInfo, logoUrl);
                
                // Add Table
                const tableRows = buildTableData(statsData.stats, statsData.totalRow, cols);
                const colW = cols.length === 7 
                    ? [1.3, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55] 
                    : [1.6, 1.0, 1.0, 1.0];
                slideA.addTable(tableRows, { 
                    x: 0.4, y: 1.25, w: 4.6, 
                    colW: colW,
                    color: "333333", fontSize: 8.5,
                    border: { type: "solid", pt: 1, color: "CBD5E1" }
                });
                
                // Add Native Stacked Column Chart
                const chartVal1Label = bt === 'LTR' ? "Sent" : "Rev.00";
                const chartVal2Label = bt === 'LTR' ? "Received" : "Further Rev.";
                let barChartData = [
                    {
                        name: chartVal1Label,
                        labels: statsData.stats.map((s: any) => s.discipline),
                        values: statsData.stats.map((s: any) => Number(s.Rev00) || 0)
                    },
                    {
                        name: chartVal2Label,
                        labels: statsData.stats.map((s: any) => s.discipline),
                        values: statsData.stats.map((s: any) => Number(s.FurtherRev) || 0)
                    }
                ];
                
                slideA.addChart(pres.ChartType.bar, barChartData, {
                    x: 5.15, y: 1.25, w: 4.45, h: 3.65,
                    barDir: "col",
                    barGrouping: "stacked",
                    showLegend: true,
                    legendPos: "b",
                    legendFontSize: 8,
                    catAxisLabelFontSize: 8.5,
                    chartColors: ["2F75B5", "BDD7EE"],
                    valGridLine: { color: "E2E8F0" },
                    showValue: false
                });

                // Slide B: 3x2 Grid of Pie Charts
                let slideB = pres.addSlide();
                addHeaderAndFooter(pres, slideB, `${longName} (${bt}) ${periodLabel}`, projectInfo, logoUrl);
                
                // Centered Section Header inside slideB
                slideB.addText(bt === 'LTR' ? "Correspondence Type Distribution" : `${bt} Quality Approval`, { x: 0.5, y: 1.05, w: 9.0, h: 0.3, fontSize: 12, bold: true, color: "1E3A5F", align: "center" });

                // Construct 3x2 Grid
                statsData.stats.slice(0, 6).forEach((s: any, idx: number) => {
                    const colIdx = idx % 3;
                    const rowIdx = Math.floor(idx / 3);
                    const posX = 0.5 + colIdx * 3.0; // Column positions: 0.5, 3.5, 6.5
                    const posY = 1.35 + rowIdx * 1.85; // Row positions: 1.35, 3.2

                    // Discipline name
                    slideB.addText(s.discipline, { x: posX, y: posY, w: 2.6, h: 0.25, fontSize: 10, bold: true, color: "1E3A5F", align: "center" });
                    
                    let pieDataValues: number[] = [];
                    let pieLabelsList: string[] = [];
                    let colors: string[] = [];

                    if (pieLabels.length === 2 && pieLabels[0] === "Closed") {
                        pieDataValues = [Number(s.Closed) || 0, Number(s.Pending) || 0];
                        pieLabelsList = ["Closed", "Pending"];
                        colors = ["70AD47", "FFC000"];
                    } else if (pieLabels.length === 3 && pieLabels[1] === "Open") {
                        pieDataValues = [Number(s.Closed) || 0, Number(s.Open) || 0, Number(s.Pending) || 0];
                        pieLabelsList = ["Closed", "Open", "Pending"];
                        colors = ["70AD47", "C00000", "FFC000"];
                    } else if (pieLabels.length === 2 && pieLabels[0] === "Sent") {
                        pieDataValues = [Number(s.Rev00) || 0, Number(s.FurtherRev) || 0];
                        pieLabelsList = ["Sent", "Received"];
                        colors = ["5B9BD5", "ED7D31"];
                    } else {
                        pieDataValues = [Number(s.Approved) || 0, (Number(s.RejectedOpen) || 0), Number(s.Pending) || 0];
                        pieLabelsList = ["Approved", "Rejected", "Pending"];
                        colors = ["70AD47", "C00000", "FFC000"];
                    }

                    const pieTotal = pieDataValues.reduce((acc, curr) => acc + curr, 0);
                    const isAllZero = (pieTotal === 0);
                    
                    let finalPieData = [
                        { name: "Status", labels: pieLabelsList, values: pieDataValues }
                    ];

                    if (isAllZero) {
                        finalPieData[0].values = finalPieData[0].values.map(() => 1);
                    } else {
                        const filteredLabels: string[] = [];
                        const filteredValues: number[] = [];
                        const filteredColors: string[] = [];
                        finalPieData[0].values.forEach((v, vIdx) => {
                            if (v > 0) {
                                filteredValues.push(v);
                                filteredLabels.push(finalPieData[0].labels[vIdx]);
                                filteredColors.push(colors[vIdx]);
                            }
                        });
                        finalPieData[0].values = filteredValues;
                        finalPieData[0].labels = filteredLabels;
                        colors = filteredColors;
                    }

                    // Native pie chart integration
                    slideB.addChart(pres.ChartType.pie, finalPieData, {
                        x: posX, y: posY + 0.25, w: 2.6, h: 1.45,
                        showLegend: true,
                        legendPos: "b",
                        legendFontSize: 7,
                        chartColors: colors,
                        showValue: false,
                        showPercent: !isAllZero
                    });
                });
            };

            // Compile slides for both Period & Cumulative
            createPeriodSlidesForBaseType(monthlyStats, true);
            createPeriodSlidesForBaseType(cumulativeStats, false);
        });

        // Rejected Items Section
        const presRejectedPageSize = options?.rejectedPageSize || 15;
        const showRefCol = options?.showRefCol !== false;
        const showTradeCol = options?.showTradeCol !== false;
        const showRemarksCol = options?.showRemarksCol !== false;

        const presRejectedItems = cumulativeWorkingData.filter(d => d.overdue && d.workflowStage === 'Rejected' && !d.documentType?.includes('LTR')).sort((a, b) => b.delayDays - a.delayDays);
        const rejectedPages: SubmittalRow[][] = [];
        for (let i = 0; i < presRejectedItems.length; i += presRejectedPageSize) {
            rejectedPages.push(presRejectedItems.slice(i, i + presRejectedPageSize));
        }

        const sectionNumRejected = baseTypes.length + 2;
        addDividerSlide(pres, "Items Requiring Resubmission", `${String(sectionNumRejected).padStart(2, '0')} REJECTED ITEMS`, projectInfo, logoUrl);

        if (rejectedPages.length === 0) {
            let slide = pres.addSlide();
            addHeaderAndFooter(pres, slide, "REJECTED ITEMS", projectInfo, logoUrl);
            slide.addText("No Rejected Items", { x: 1.0, y: 2.2, w: 8, h: 0.6, fontSize: 24, bold: true, color: "7A1515", align: "center" });
            slide.addText("All rejected submittals are resolved or resubmitted.", { x: 1.0, y: 2.9, w: 8, h: 0.4, fontSize: 14, color: "666666", align: "center" });
        } else {
            rejectedPages.forEach((pageData, pageIdx) => {
                let slide = pres.addSlide();
                addHeaderAndFooter(pres, slide, "REJECTED ITEMS", projectInfo, logoUrl);
                
                // Slide title
                slide.addText(`Rejected Items (Action Required) / الوثائق المرفوضة  - Page ${pageIdx + 1} of ${rejectedPages.length}`, { x: 0.5, y: 1.0, w: 9.0, h: 0.35, fontSize: 13, bold: true, color: "7A1515" });
                
                // Build Table
                let tableDataRows: any[] = [];
                // Headers row
                let headersRow: any[] = [
                    { text: "No.", options: { bold: true, fill: "7A1515", color: "FFFFFF", align: "center" } },
                    { text: "Type of Documents", options: { bold: true, fill: "7A1515", color: "FFFFFF", align: "center" } }
                ];
                if (showRefCol) headersRow.push({ text: "Ref / Link", options: { bold: true, fill: "7A1515", color: "FFFFFF", align: "center" } });
                if (showTradeCol) headersRow.push({ text: "Trade", options: { bold: true, fill: "7A1515", color: "FFFFFF", align: "center" } });
                if (showRemarksCol) headersRow.push({ text: "Remarks", options: { bold: true, fill: "7A1515", color: "FFFFFF", align: "center" } });
                tableDataRows.push(headersRow);

                // Body rows
                pageData.forEach((row, i) => {
                    const rowNo = pageIdx * presRejectedPageSize + i + 1;
                    const isEven = i % 2 === 1;
                    const fillBg = isEven ? "FFF5F5" : "FFFFFF";

                    let bodyRow: any[] = [
                        { text: String(rowNo), options: { fill: fillBg, align: "center" } },
                        { text: String(row.documentType || "-"), options: { fill: fillBg, align: "center", bold: true, color: "7A1515" } }
                    ];
                    if (showRefCol) bodyRow.push({ text: String(row.docNo || "-"), options: { fill: fillBg, align: "center" } });
                    if (showTradeCol) bodyRow.push({ text: String(row.trade || "-"), options: { fill: fillBg, align: "center" } });
                    if (showRemarksCol) bodyRow.push({ text: `Overdue by ${row.delayDays} days`, options: { fill: fillBg, align: "center", color: "C00000", bold: true } });
                    tableDataRows.push(bodyRow);
                });

                slide.addTable(tableDataRows, {
                    x: 0.5, y: 1.45, w: 9.0,
                    color: "333333", fontSize: 8.5,
                    border: { type: "solid", pt: 1, color: "CBD5E1" }
                });
            });
        }

        // Pending Items Section
        const presPendingPageSize = options?.pendingPageSize || 15;
        const presPendingItems = cumulativeWorkingData.filter(d => d.overdue && d.workflowStage === 'Pending' && !d.documentType?.includes('LTR')).sort((a, b) => b.delayDays - a.delayDays);
        const pendingPages: SubmittalRow[][] = [];
        for (let i = 0; i < presPendingItems.length; i += presPendingPageSize) {
            pendingPages.push(presPendingItems.slice(i, i + presPendingPageSize));
        }

        const sectionNumPending = baseTypes.length + 3;
        addDividerSlide(pres, "Items Requiring Response", `${String(sectionNumPending).padStart(2, '0')} PENDING ITEMS`, projectInfo, logoUrl);

        if (pendingPages.length === 0) {
            let slide = pres.addSlide();
            addHeaderAndFooter(pres, slide, "PENDING ITEMS", projectInfo, logoUrl);
            slide.addText("No Pending Items", { x: 1.0, y: 2.2, w: 8, h: 0.6, fontSize: 24, bold: true, color: "203864", align: "center" });
            slide.addText("All pending documents are closed.", { x: 1.0, y: 2.9, w: 8, h: 0.4, fontSize: 14, color: "666666", align: "center" });
        } else {
            pendingPages.forEach((pageData, pageIdx) => {
                let slide = pres.addSlide();
                addHeaderAndFooter(pres, slide, "PENDING ITEMS", projectInfo, logoUrl);
                
                // Slide title
                slide.addText(`Pending Items (Overdue) / المعلقات المتأخرة  - Page ${pageIdx + 1} of ${pendingPages.length}`, { x: 0.5, y: 1.0, w: 9.0, h: 0.35, fontSize: 13, bold: true, color: "203864" });
                
                // Build Table
                let tableDataRows: any[] = [];
                // Headers row
                let headersRow: any[] = [
                    { text: "No.", options: { bold: true, fill: "203864", color: "FFFFFF", align: "center" } },
                    { text: "Type of Documents", options: { bold: true, fill: "203864", color: "FFFFFF", align: "center" } }
                ];
                if (showRefCol) headersRow.push({ text: "Ref / Link", options: { bold: true, fill: "203864", color: "FFFFFF", align: "center" } });
                if (showTradeCol) headersRow.push({ text: "Trade", options: { bold: true, fill: "203864", color: "FFFFFF", align: "center" } });
                if (showRemarksCol) headersRow.push({ text: "Remarks", options: { bold: true, fill: "203864", color: "FFFFFF", align: "center" } });
                tableDataRows.push(headersRow);

                // Body rows
                pageData.forEach((row, i) => {
                    const rowNo = pageIdx * presPendingPageSize + i + 1;
                    const isEven = i % 2 === 1;
                    const fillBg = isEven ? "F8FAFC" : "FFFFFF";

                    let bodyRow: any[] = [
                        { text: String(rowNo), options: { fill: fillBg, align: "center" } },
                        { text: String(row.documentType || "-"), options: { fill: fillBg, align: "center", bold: true, color: "203864" } }
                    ];
                    if (showRefCol) bodyRow.push({ text: String(row.docNo || "-"), options: { fill: fillBg, align: "center" } });
                    if (showTradeCol) bodyRow.push({ text: String(row.trade || "-"), options: { fill: fillBg, align: "center" } });
                    if (showRemarksCol) bodyRow.push({ text: `Overdue by ${row.delayDays} days`, options: { fill: fillBg, align: "center", color: "C00000", bold: true } });
                    tableDataRows.push(bodyRow);
                });

                slide.addTable(tableDataRows, {
                    x: 0.5, y: 1.45, w: 9.0,
                    color: "333333", fontSize: 8.5,
                    border: { type: "solid", pt: 1, color: "CBD5E1" }
                });
            });
        }

        // Thank you Slide
        addDividerSlide(pres, "Document Control Team", "Thanks", projectInfo, logoUrl);

        await pres.writeFile({ fileName: `DocuSight-Presentation-${new Date().toISOString().split('T')[0]}.pptx` });
        return;
    }


    // ----------------------------------------------------
    // OLD/ORIGINAL MODES ('monthly' | 'cumulative' logs index tables report)
    // ----------------------------------------------------
    // Let's preserve the original behavior for the remaining non-presentation mode reports cleanly!
    
    // 1. Cover Slide
    let coverSlide = pres.addSlide();
    coverSlide.background = { color: "1E3A5F" };
    coverSlide.addText("DOCUMENT CONTROL", { x: 0.5, y: 1.5, fontSize: 44, bold: true, color: "FFFFFF" });
    coverSlide.addText(`${titleStr.toUpperCase()} REPORT`, { x: 0.5, y: 2.5, fontSize: 36, bold: true, color: "D4AF37" });
    coverSlide.addShape(pres.ShapeType.line, { x: 0.5, y: 3.5, w: 8, h: 0, line: { color: "D4AF37", width: 2 } });
    if (projectInfo) {
        coverSlide.addText(`${projectInfo.projectName} — Construction Package`, { x: 0.5, y: 3.7, w: 8, fontSize: 16, color: "D1D5DB", italic: true });
        coverSlide.addText(`Report Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}\nContractor: ${projectInfo.contractorName}    Employer: ${projectInfo.clientName} | Consultant: ${projectInfo.consultantName}`, { x: 0.5, y: 4.8, w: 9, fontSize: 10, color: "D1D5DB" });
    }

    // Index Slide
    let idxSlide = pres.addSlide();
    idxSlide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 3.5, h: '100%', fill: { color: "1E3A5F" } });
    idxSlide.addText("INDEX", { x: 0, y: 1.0, fontSize: 32, bold: true, color: "FFFFFF", w: 3.5, align: "center", valign: "top" });
    idxSlide.addText("01  Project Information & Team\n\n02  Status Tables and Charts", { x: 4.5, y: 2.5, fontSize: 16, color: "333333", lineSpacing: 36, w: 5.5 });

    // Project Info Slide
    let infoSlide = pres.addSlide();
    infoSlide.background = { color: "1E3A5F" };
    infoSlide.addText("01 PROJECT INFORMATION", { x: 0.5, y: 2.5, fontSize: 32, bold: true, color: "FFFFFF", w: 9 });
    infoSlide.addText("Team Members & Project Details", { x: 0.5, y: 3.5, fontSize: 16, color: "D1D5DB", w: 9 });

    let sectionIndex = 2;

    // Unified Data Table Slide
    let unifiedTableSlide = pres.addSlide();
    unifiedTableSlide.addText(`Cumulative Performance Analytics | Master Data Table`, { x: 0, y: 0.2, w: "100%", h: 0.6, fontSize: 18, bold: true, color: "FFFFFF", fill: { color: "1E3A5F" }, align: "left", margin: [0, 0.5, 0, 0.5] });
    
    const rowToLabel = (d: SubmittalRow) => (d.documentType || 'DOC').trim();
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
                 stats: calculateStats(cumulativeWorkingData.filter(d => rowToLabel(d) === typeLabel))
             };
         })
         .sort((a,b) => {
             const getSortKey = (typeStr: any) => {
                 const safeStr = typeof typeStr === 'string' ? typeStr : '';
                 const parts = safeStr.split('-');
                 const base = parts[0] ? parts[0].trim().toUpperCase() : '';
                 const disc = parts.slice(1).join('-').trim().toUpperCase() || '';
                 return { base, disc };
             };
             const keyA = getSortKey(a.documentType);
             const keyB = getSortKey(b.documentType);
             
             const baseOrder = ['SDW', 'SHD', 'MAR', 'QS', 'DOC', 'WIR', 'MIR', 'RFI', 'NCR', 'SOR', 'LTR', 'PQ', 'PRQ', 'TRS'];
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
            { text: String(s.stats.totalSheetsRev0), options: { align: "center", fontFace: "Calibri"} },
            { text: String(s.stats.totalSheetsFurtherRev), options: { align: "center", fontFace: "Calibri"} },
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
                return docT.startsWith(`${bt}-`) || docT === bt || (bt==='NCR' && docT.includes('NCR')) || (bt==='SOR' && docT.includes('SOR')) || (bt==='RFI' && docT.includes('RFI')) || (bt==='LTR' && docT.includes('LTR'));
            });

            let disciplinesInThisType: string[] = [];
            if (bt === 'LTR') {
               disciplinesInThisType = Array.from(new Set(typeData.map(d => d.stakeholder || 'GENERAL')));
            } else {
                const predefinedDisciplines = bt === 'NCR' ? ['STR', 'ARCH', 'MECH', 'ELEC', 'INFRA', 'LAND', 'NCR-HSE'] : ['STR', 'ARCH', 'MECH', 'ELEC', 'INFRA', 'LAND'];
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
                    if (disc === 'HSE' || disc === 'NCR-HSE' || disc.includes('HSE') || disc.includes('SAFETY')) return 'NCR-HSE';
                    return bt === 'NCR' ? 'NCR-HSE' : 'GENERAL';
                });
                disciplinesInThisType = Array.from(new Set([...predefinedDisciplines, ...parsedDisciplines]));
            }

            const stats = disciplinesInThisType.map((disc) => {
                const dData = typeData.filter((d) => {
                    if (bt === 'LTR') return (d.stakeholder || 'GENERAL') === disc;

                    const docT = d.documentType || 'GENERAL';
                    let rDisc = docT.includes('-') ? docT.substring(docT.indexOf('-') + 1).trim() : (d.discipline || d.trade || 'GENERAL').toUpperCase().trim();
                    if (rDisc === 'ARC' || rDisc === 'ARCH' || rDisc.includes('ARCHITECT')) rDisc = 'ARCH';
                    else if (rDisc === 'MEC' || rDisc === 'MECH' || rDisc.includes('MECHANIC')) rDisc = 'MECH';
                    else if (rDisc === 'ELE' || rDisc === 'ELEC' || rDisc.includes('ELECTRIC')) rDisc = 'ELEC';
                    else if (rDisc === 'INF' || rDisc === 'INFR' || rDisc === 'INFRA' || rDisc.includes('INFRASTRUCT')) rDisc = 'INFRA';
                    else if (rDisc === 'LND' || rDisc === 'LAND' || rDisc.includes('LANDSCAP')) rDisc = 'LAND';
                    else if (rDisc === 'STR' || rDisc.includes('STRUCT')) rDisc = 'STR';
                    else if (rDisc === 'HSE' || rDisc === 'NCR-HSE' || rDisc.includes('HSE') || rDisc.includes('SAFETY')) rDisc = 'NCR-HSE';
                    else rDisc = bt === 'NCR' ? 'NCR-HSE' : 'GENERAL';
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
                    Closed: bt === 'NCR' || bt === 'SOR' || bt === 'RFI' ? s.approved : s.approved + s.rejectedClosed,
                    Open: bt === 'NCR' || bt === 'SOR' ? s.rejectedOpen : s.rejectedOpen + s.pending,
                };
            });

            if (stats.length === 0) continue;
            
            const catOrder = ['STR', 'ARCH', 'MECH', 'ELEC', 'INFRA', 'LAND', 'GENERAL', 'NCR-HSE'];
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
    let thankYouSlide = pres.addSlide();
    thankYouSlide.background = { color: "1E3A5F" };
    thankYouSlide.addText("THANK YOU", { x: 0.5, y: 2.0, fontSize: 44, bold: true, color: "FFFFFF", align: "center" });
    thankYouSlide.addShape(pres.ShapeType.line, { x: 0.5, y: 2.8, w: 9, h: 0, line: { color: "D4AF37", width: 2 } });
    thankYouSlide.addText(`Document Control Team — ${projectInfo?.projectName || '[Project Name]'}`, { x: 0.5, y: 3.2, w: 9, fontSize: 14, color: "D1D5DB", italic: true, align: "center" });

    const outputFilename = mode === 'monthly' 
        ? `DocuSight-monthly-${new Date().toISOString().split('T')[0]}.pptx` 
        : `DocuSight-cumulative-${new Date().toISOString().split('T')[0]}.pptx`;

    await pres.writeFile({ fileName: outputFilename });
};
