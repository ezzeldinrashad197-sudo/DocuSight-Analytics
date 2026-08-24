import pptxgen from "pptxgenjs";
import { ProjectSettings, SubmittalRow } from "../types";
import { calculateStats, calculateNCRStats, calculateSORStats, calculateLTRStats, resolveRowDiscipline } from "../utils/calculations";
import {
  compileStatsForBaseType,
  renderLuxeLogoBox,
  addHeaderAndFooter,
  addDividerSlide,
  buildTableData,
  defineStructusightSlideMaster,
  calculateExecutiveDashboardData,
  addExecutiveOverviewSlide,
  addChartsAndBottlenecksSlide,
  addRegisterBreakdownSlide,
  addRecommendationsSlide
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
    pres.author = "StructuSight Engineering Intelligence Platform";
    pres.company = "Corporate Management Report";
    let titleStr = mode === 'monthly' ? 'Monthly' : (mode === 'presentation' ? 'Presentation' : 'Cumulative');
    pres.title = `StructuSight Intelligence - ${titleStr} Report`;

    // Define native slide master layout for branding and metadata consistency
    defineStructusightSlideMaster(pres, projectInfo, options);

    let cumulativeWorkingData = data;
    let monthlyWorkingData = data;
    
    if (filters) {
        if (filters.filterCumulative) cumulativeWorkingData = data.filter(filters.filterCumulative);
        if (filters.filterMonthly) monthlyWorkingData = data.filter(filters.filterMonthly);
    }

    const isArabic = !!options?.arabicEnabled;

    // Compile Executive Dashboard Data for Monthly and Cumulative scopes
    const monthlyDashboard = calculateExecutiveDashboardData(monthlyWorkingData, data, true, isArabic ? 'ar' : 'en');
    const cumulativeDashboard = calculateExecutiveDashboardData(cumulativeWorkingData, data, false, isArabic ? 'ar' : 'en');

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

    // ----------------------------------------------------
    // UNIFIED PRESENTATION & REPORT TEMPLATE GENERATION
    // ----------------------------------------------------
    const logoUrl = options?.logoUrl || projectInfo?.logoUrl;
    const primColor = options?.primaryColor ? options.primaryColor.replace('#', '') : "0A192F";
    const accColor = options?.accentColor ? options.accentColor.replace('#', '') : "D4AF37";
    const font = options?.fontFace || "Arial";
    const style = options?.coverStyle || "luxe"; // luxe, minimal, corporate, bold
    const showLogo = options?.showLogo !== false;

    const reportTitleMain = isArabic 
        ? "مراقبة وإدارة الوثائق" 
        : "DOCUMENT CONTROL";

    const reportSubtitle = mode === 'monthly'
        ? (isArabic ? "التقرير الإحصائي ومؤشرات الأداء الشهرية" : "MONTHLY PERFORMANCE & KPI ANALYTICS")
        : (mode === 'cumulative' 
            ? (isArabic ? "التقرير الإحصائي ومؤشرات الأداء التراكمية" : "CUMULATIVE PERFORMANCE ANALYTICS REPORT")
            : (isArabic ? "العرض التنفيذي التراكمي الشامل" : "EXECUTIVE PERFORMANCE PRESENTATION"));

    // Cover Slide
    if (isSectionSelected('cover')) {
        let coverSlide: any = pres.addSlide();
        
        if (style === "minimal") {
            coverSlide.background = { color: "FAF9F6" };
            coverSlide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: accColor } });
            
            coverSlide.addText(reportTitleMain, { 
                x: 1.2, y: 1.0, w: 5.8, h: 0.8, 
                fontSize: 34, bold: true, color: primColor, 
                fontFace: font, rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addText(reportSubtitle, { 
                x: 1.2, y: 1.8, w: 5.8, h: 0.8, 
                fontSize: 24, bold: true, color: accColor, 
                fontFace: font, rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addShape(pres.ShapeType.rect, { x: 1.2, y: 2.7, w: 5.5, h: 0.02, fill: { color: accColor } });
            coverSlide.addText(`[${projectInfo?.projectName || 'Project'}]`, { 
                x: 1.2, y: 2.9, w: 5.5, h: 0.4, 
                fontSize: 14, color: "475569", fontFace: font, 
                rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addShape(pres.ShapeType.rect, { x: 1.2, y: 3.5, w: 5.5, h: 0.02, fill: { color: accColor } });
            const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
            coverSlide.addText(isArabic ? `تاريخ التقرير: ${dateStr}` : `Report Date: ${dateStr}`, { 
                x: 1.2, y: 3.7, w: 5.5, h: 0.3, 
                fontSize: 13, color: "475569", fontFace: font,
                rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addText(`[${projectInfo?.contractorName || 'Contractor'}]`, { 
                x: 1.2, y: 4.1, w: 5.5, h: 0.3, 
                fontSize: 13, color: "475569", fontFace: font,
                rtl: isArabic, align: isArabic ? "right" : "left"
            });
        } else if (style === "corporate") {
            coverSlide.background = { color: "F1F5F9" };
            coverSlide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 3.2, h: 5.625, fill: { color: primColor } });
            
            coverSlide.addText(reportTitleMain, { 
                x: 3.7, y: 1.0, w: 5.4, h: 0.8, 
                fontSize: 32, bold: true, color: primColor, 
                fontFace: font, rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addText(reportSubtitle, { 
                x: 3.7, y: 1.8, w: 5.4, h: 0.8, 
                fontSize: 22, bold: true, color: accColor, 
                fontFace: font, rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addShape(pres.ShapeType.rect, { x: 3.7, y: 2.7, w: 5.5, h: 0.02, fill: { color: accColor } });
            coverSlide.addText(`[${projectInfo?.projectName || 'Project'}]`, { 
                x: 3.7, y: 2.9, w: 5.5, h: 0.4, 
                fontSize: 14, color: "334155", fontFace: font, 
                rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addShape(pres.ShapeType.rect, { x: 3.7, y: 3.5, w: 5.5, h: 0.02, fill: { color: accColor } });
            const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
            coverSlide.addText(isArabic ? `تاريخ التقرير: ${dateStr}` : `Report Date: ${dateStr}`, { 
                x: 3.7, y: 3.7, w: 5.5, h: 0.3, 
                fontSize: 13, color: "334155", fontFace: font,
                rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addText(`[${projectInfo?.contractorName || 'Contractor'}]`, { 
                x: 3.7, y: 4.1, w: 5.5, h: 0.3, 
                fontSize: 13, color: "334155", fontFace: font,
                rtl: isArabic, align: isArabic ? "right" : "left"
            });
        } else {
            // Luxe Deep or Bold Geometric
            coverSlide.background = { color: primColor };
            coverSlide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: 5.625, fill: { color: accColor } });
            
            coverSlide.addText(reportTitleMain, { 
                x: 1.0, y: 1.0, w: 6.2, h: 0.8, 
                fontSize: 34, bold: true, color: "FFFFFF", 
                fontFace: font, rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addText(reportSubtitle, { 
                x: 1.0, y: 1.8, w: 6.2, h: 0.8, 
                fontSize: 24, bold: true, color: accColor, 
                fontFace: font, rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addShape(pres.ShapeType.rect, { x: 1.0, y: 2.7, w: 5.5, h: 0.02, fill: { color: accColor } });
            coverSlide.addText(`[${projectInfo?.projectName || 'Project'}]`, { 
                x: 1.0, y: 2.9, w: 5.5, h: 0.4, 
                fontSize: 14, color: "FFFFFF", fontFace: font, 
                rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addShape(pres.ShapeType.rect, { x: 1.0, y: 3.5, w: 5.5, h: 0.02, fill: { color: accColor } });
            const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
            coverSlide.addText(isArabic ? `تاريخ التقرير: ${dateStr}` : `Report Date: ${dateStr}`, { 
                x: 1.0, y: 3.7, w: 5.5, h: 0.3, 
                fontSize: 13, color: "FFFFFF", fontFace: font,
                rtl: isArabic, align: isArabic ? "right" : "left"
            });
            coverSlide.addText(`[${projectInfo?.contractorName || 'Contractor'}]`, { 
                x: 1.0, y: 4.1, w: 5.5, h: 0.3, 
                fontSize: 13, color: "FFFFFF", fontFace: font,
                rtl: isArabic, align: isArabic ? "right" : "left"
            });
        }
        // Cover slide logo placed strictly on the top-right without overlapping header texts
        if (showLogo) {
            renderLuxeLogoBox(pres, coverSlide, 7.5, 0.8, 2.1, 1.2, projectInfo, logoUrl);
        }
    }

    // Index Slide
    if (isSectionSelected('cover')) {
        let idxSlide: any = pres.addSlide();
        idxSlide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 3.0, h: 5.625, fill: { color: primColor } });
        idxSlide.addText(isArabic ? "الفهرس" : "INDEX", { 
            x: 0.4, y: 2.0, w: 2.2, h: 0.6, 
            fontSize: 34, bold: true, color: "FFFFFF", 
            fontFace: font, rtl: isArabic, align: isArabic ? "right" : "left" 
        });
        idxSlide.addText(isArabic ? "جدول المحتويات" : "Table of Contents", { 
            x: 0.4, y: 2.6, w: 2.2, h: 0.4, 
            fontSize: 12, color: "CBD5E1", 
            fontFace: font, rtl: isArabic, align: isArabic ? "right" : "left"
        });
        idxSlide.addShape(pres.ShapeType.rect, { x: 0.4, y: 3.2, w: 2.2, h: 0.03, fill: { color: accColor } });
        
        // Index slide logo
        if (showLogo) {
            renderLuxeLogoBox(pres, idxSlide, 8.2, 0.4, 1.4, 0.6, projectInfo, logoUrl);
        }
        
        // Dynamic Table of Contents Items
        const tocItems: { num: string; titleEn: string; titleAr: string; color?: string }[] = [];
        let runningNum = 1;

        if (isSectionSelected('info')) {
            tocItems.push({
                num: String(runningNum++).padStart(2, '0'),
                titleEn: "Project Information & Management Team",
                titleAr: "بيانات المشروع وفريق العمل والإدارة"
            });
        }

        if (isSectionSelected('metrics')) {
            if (mode === 'monthly') {
                tocItems.push({
                    num: String(runningNum++).padStart(2, '0'),
                    titleEn: "Monthly Executive Performance & KPIs",
                    titleAr: "التقرير التنفيذي ومؤشرات الأداء الشهرية"
                });
                tocItems.push({
                    num: String(runningNum++).padStart(2, '0'),
                    titleEn: "Monthly Status Charts & Critical Bottlenecks",
                    titleAr: "المخططات الإحصائية وبؤر التكدس الحرجة"
                });
                if (isSectionSelected('logs')) {
                    tocItems.push({
                        num: String(runningNum++).padStart(2, '0'),
                        titleEn: "Primary Register Workload Breakdown",
                        titleAr: "جدول تفصيل السجلات الهندسية الشامل"
                    });
                }
                tocItems.push({
                    num: String(runningNum++).padStart(2, '0'),
                    titleEn: "Monthly Strategic Recommendations & Action Plan",
                    titleAr: "التوصيات الإدارية وخطة العمل التنفيذية"
                });
            } else if (mode === 'cumulative') {
                tocItems.push({
                    num: String(runningNum++).padStart(2, '0'),
                    titleEn: "Cumulative Performance & Executive KPIs",
                    titleAr: "التقرير التنفيذي ومؤشرات الأداء التراكمية"
                });
                tocItems.push({
                    num: String(runningNum++).padStart(2, '0'),
                    titleEn: "Cumulative Status Charts & Critical Bottlenecks",
                    titleAr: "المخططات الإحصائية وبؤر التكدس الحرجة"
                });
                if (isSectionSelected('logs')) {
                    tocItems.push({
                        num: String(runningNum++).padStart(2, '0'),
                        titleEn: "Primary Register Workload Breakdown",
                        titleAr: "جدول تفصيل السجلات الهندسية الشامل"
                    });
                }
                tocItems.push({
                    num: String(runningNum++).padStart(2, '0'),
                    titleEn: "Cumulative Strategic Recommendations & Action Plan",
                    titleAr: "التوصيات الإدارية وخطة العمل التنفيذية"
                });
            } else {
                tocItems.push({
                    num: String(runningNum++).padStart(2, '0'),
                    titleEn: "Monthly Performance Analytics Dossier",
                    titleAr: "ملف تقييم ومؤشرات الأداء الشهرية"
                });
                tocItems.push({
                    num: String(runningNum++).padStart(2, '0'),
                    titleEn: "Cumulative Performance Analytics Dossier",
                    titleAr: "ملف تقييم ومؤشرات الأداء التراكمية"
                });
            }
        }

        if (isSectionSelected('logs')) {
            baseTypes.slice(0, 4).forEach((bt) => {
                const lName = typeMap[bt] || bt;
                tocItems.push({
                    num: String(runningNum++).padStart(2, '0'),
                    titleEn: `${lName} (${bt}) Detailed Quality Analysis`,
                    titleAr: `تحليل جودة وسجلات تقديمات ${lName}`
                });
            });
        }

        if (isSectionSelected('rejected')) {
            tocItems.push({
                num: String(runningNum++).padStart(2, '0'),
                titleEn: "Top Rejected Items Requiring Resubmission",
                titleAr: "أعلى المعاملات المرفوضة التي تتطلب إعادة تقديم",
                color: "C00000"
            });
        }

        if (isSectionSelected('pending')) {
            tocItems.push({
                num: String(runningNum++).padStart(2, '0'),
                titleEn: "Top Critical Pending Items Overdue",
                titleAr: "أعلى المعاملات المعلقة المتأخرة قيد المراجعة"
            });
        }

        let currentY = 0.95;
        const maxItems = Math.min(tocItems.length, 9);
        const itemGap = maxItems > 7 ? 0.36 : 0.42;

        tocItems.slice(0, maxItems).forEach((item) => {
            const itemBg = item.color || primColor;
            idxSlide.addText(item.num, {
                x: 3.5, y: currentY, w: 0.42, h: 0.26,
                fontSize: 9.5, bold: true, color: "FFFFFF",
                fill: { color: itemBg }, align: "center", fontFace: font
            });
            idxSlide.addText(isArabic ? item.titleAr : item.titleEn, { 
                x: 4.1, y: currentY, w: 5.3, h: 0.26, 
                fontSize: 9.5, bold: true, color: "1E293B", 
                fontFace: font, rtl: isArabic, align: isArabic ? "right" : "left"
            });
            currentY += itemGap;
        });

        idxSlide.addText(`[${projectInfo?.projectName || 'Project'}]  |  Document Control Intelligence  |  [${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}]`, { 
            x: 3.5, y: 5.15, w: 6.0, h: 0.25, 
            fontSize: 7.5, color: "94A3B8", fontFace: font 
        });
    }

    // Project Info Divider + Content Slides
    if (isSectionSelected('info')) {
        addDividerSlide(pres, isArabic ? "بيانات المشروع والشركاء وفريق العمل" : "Team Members & Project Details", isArabic ? "01 معلومات المشروع" : "01 PROJECT INFORMATION", projectInfo, logoUrl, options);
        let infoSlide = pres.addSlide({ masterName: "STRUCTUSIGHT_MASTER" });
        addHeaderAndFooter(pres, infoSlide, isArabic ? "معلومات المشروع العامة" : "PROJECT INFORMATION", projectInfo, logoUrl, options);
        infoSlide.addShape(pres.ShapeType.rect, { x: 0.6, y: 1.5, w: 2.7, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 } });
        infoSlide.addText(isArabic ? "صاحب العمل / المالك" : "Employer", { x: 0.6, y: 1.5, w: 2.7, h: 0.35, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: primColor }, align: "center", fontFace: font });
        infoSlide.addText(projectInfo?.clientName || "N/A", { x: 0.7, y: 1.9, w: 2.5, h: 0.9, fontSize: 14, bold: true, color: "333333", align: "center", valign: "middle", fontFace: font });
        
        infoSlide.addShape(pres.ShapeType.rect, { x: 3.65, y: 1.5, w: 2.7, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 } });
        infoSlide.addText(isArabic ? "الاستشاري المشرف" : "Consultant", { x: 3.65, y: 1.5, w: 2.7, h: 0.35, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: primColor }, align: "center", fontFace: font });
        infoSlide.addText(projectInfo?.consultantName || "N/A", { x: 3.75, y: 1.9, w: 2.5, h: 0.9, fontSize: 14, bold: true, color: "333333", align: "center", valign: "middle", fontFace: font });
        
        infoSlide.addShape(pres.ShapeType.rect, { x: 6.7, y: 1.5, w: 2.7, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 } });
        infoSlide.addText(isArabic ? "مدير المشروع المشرف" : "CA / PM", { x: 6.7, y: 1.5, w: 2.7, h: 0.35, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: primColor }, align: "center", fontFace: font });
        const pmDisplay = (projectInfo?.projectManager && projectInfo.projectManager !== "N/A" && projectInfo.projectManager.trim() !== "") 
            ? projectInfo.projectManager 
            : (isArabic ? "سيتم التحديد" : "To Be Appointed");
        infoSlide.addText(pmDisplay, { x: 6.8, y: 1.9, w: 2.5, h: 0.9, fontSize: 14, bold: true, color: "333333", align: "center", valign: "middle", fontFace: font });
        
        infoSlide.addShape(pres.ShapeType.rect, { x: 0.6, y: 3.3, w: 4.2, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 } });
        infoSlide.addText(isArabic ? "المقاول الرئيسي للمشروع" : "Contractor", { x: 0.6, y: 3.3, w: 4.2, h: 0.35, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: "5B9BD5" }, align: "center", fontFace: font });
        infoSlide.addText(projectInfo?.contractorName || "N/A", { x: 0.7, y: 3.7, w: 4.0, h: 0.9, fontSize: 16, bold: true, color: "333333", align: "center", valign: "middle", fontFace: font });
        
        infoSlide.addShape(pres.ShapeType.rect, { x: 5.2, y: 3.3, w: 4.2, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "CBD5E1", width: 1 } });
        infoSlide.addText(isArabic ? "إدارة مراقبة وجرد المستندات" : "Document Control Manager / Team", { x: 5.2, y: 3.3, w: 4.2, h: 0.35, fontSize: 10, bold: true, color: "FFFFFF", fill: { color: "5B9BD5" }, align: "center", fontFace: font });
        infoSlide.addText(projectInfo?.documentControlManager || "N/A", { x: 5.3, y: 3.7, w: 4.0, h: 0.9, fontSize: 16, bold: true, color: "333333", align: "center", valign: "middle", fontFace: font });
    }

    // ----------------------------------------------------
    // EXECUTIVE DASHBOARD & CORE KPI ANALYTICS SLIDES
    // ----------------------------------------------------
    if (isSectionSelected('metrics')) {
        if (mode === 'monthly') {
            addDividerSlide(
                pres,
                isArabic ? "ملخص مؤشرات الأداء والتحليلات الشهرية" : "Monthly Executive Dashboard & KPIs",
                isArabic ? "02 الأداء الشهري" : "02 MONTHLY PERFORMANCE",
                projectInfo, logoUrl, options
            );
            addExecutiveOverviewSlide(pres, monthlyDashboard, true, projectInfo, logoUrl, options);
            addChartsAndBottlenecksSlide(pres, monthlyDashboard, true, projectInfo, logoUrl, options);
            if (isSectionSelected('logs')) {
                addRegisterBreakdownSlide(pres, monthlyDashboard, true, projectInfo, logoUrl, options);
            }
            addRecommendationsSlide(pres, monthlyDashboard, true, projectInfo, logoUrl, options);
        } else if (mode === 'cumulative') {
            addDividerSlide(
                pres,
                isArabic ? "ملخص مؤشرات الأداء والتحليلات التراكمية" : "Cumulative Executive Dashboard & KPIs",
                isArabic ? "02 الأداء التراكمي" : "02 CUMULATIVE PERFORMANCE",
                projectInfo, logoUrl, options
            );
            addExecutiveOverviewSlide(pres, cumulativeDashboard, false, projectInfo, logoUrl, options);
            addChartsAndBottlenecksSlide(pres, cumulativeDashboard, false, projectInfo, logoUrl, options);
            if (isSectionSelected('logs')) {
                addRegisterBreakdownSlide(pres, cumulativeDashboard, false, projectInfo, logoUrl, options);
            }
            addRecommendationsSlide(pres, cumulativeDashboard, false, projectInfo, logoUrl, options);
        } else {
            // Presentation mode: Full Monthly section + Full Cumulative section
            addDividerSlide(
                pres,
                isArabic ? "ملخص مؤشرات الأداء والتحليلات الشهرية" : "Monthly Executive Dashboard & KPIs",
                isArabic ? "02 الأداء الشهري" : "02 MONTHLY PERFORMANCE",
                projectInfo, logoUrl, options
            );
            addExecutiveOverviewSlide(pres, monthlyDashboard, true, projectInfo, logoUrl, options);
            addChartsAndBottlenecksSlide(pres, monthlyDashboard, true, projectInfo, logoUrl, options);
            if (isSectionSelected('logs')) {
                addRegisterBreakdownSlide(pres, monthlyDashboard, true, projectInfo, logoUrl, options);
            }
            addRecommendationsSlide(pres, monthlyDashboard, true, projectInfo, logoUrl, options);

            addDividerSlide(
                pres,
                isArabic ? "ملخص مؤشرات الأداء والتحليلات التراكمية" : "Cumulative Executive Dashboard & KPIs",
                isArabic ? "03 الأداء التراكمي" : "03 CUMULATIVE PERFORMANCE",
                projectInfo, logoUrl, options
            );
            addExecutiveOverviewSlide(pres, cumulativeDashboard, false, projectInfo, logoUrl, options);
            addChartsAndBottlenecksSlide(pres, cumulativeDashboard, false, projectInfo, logoUrl, options);
            if (isSectionSelected('logs')) {
                addRegisterBreakdownSlide(pres, cumulativeDashboard, false, projectInfo, logoUrl, options);
            }
            addRecommendationsSlide(pres, cumulativeDashboard, false, projectInfo, logoUrl, options);
        }
    }

    // ----------------------------------------------------
    // DETAILED SLIDES FOR BASE TYPES
    // ----------------------------------------------------
    baseTypes.forEach((bt, sectionIdx) => {
        if (!isSectionSelected('logs')) return;
        
        const monthlyStats = compileStatsForBaseType(monthlyWorkingData, bt, options?.monthlyStart || 'ACTIVE_PERIOD', data);
        const cumulativeStats = compileStatsForBaseType(cumulativeWorkingData, bt, undefined, data);
        
        if (!monthlyStats.hasData && !cumulativeStats.hasData) return;
        
        const longName = typeMap[bt] || bt;
        let sectionNumber = sectionIdx + 4;
        let sectionTitle = `${String(sectionNumber).padStart(2, '0')} ${longName}`;
        
        // 1. Section Divider with descriptive subtitle
        const sectionSubtitle = isArabic ? `سجل ومخططات أداء تقديمات ${longName}` : `Performance Log & Quality Charts for ${longName}`;
        addDividerSlide(pres, sectionSubtitle, sectionTitle, projectInfo, logoUrl, options);
        
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

        if (bt === 'DOC') {
           cols = [
              { label: "Items", key: "discipline" },
              { label: "Workload", key: "TotalSubmittals" },
              { label: "Rev.00", key: "Rev00" },
              { label: "Further Rev.", key: "FurtherRev" },
              { label: "Unique Items", key: "Total" },
              { label: "Approved", key: "Approved" },
              { label: "Rej. Open", key: "RejectedOpen" },
              { label: "Rej. Closed", key: "RejectedClosed" },
              { label: "Total Rej.", key: "Rejected" },
              { label: "Pending", key: "Pending" },
           ];
           pieLabels = ["Approved", "Rej. Open", "Rej. Closed", "Pending"];
        } else if (bt === 'SDW' || bt === 'SHD' || bt === 'ABD') {
           cols = [
              { label: "Items", key: "discipline" },
              { label: "Total Submittals", key: "TotalSubmittals" },
              { label: "Total Sheets Rev.00", key: "Rev00" },
              { label: "Total Sheets Further Rev.", key: "FurtherRev" },
              { label: "Total", key: "Total" },
              { label: "Approved", key: "Approved" },
              { label: "Rejected", key: "Rejected" },
              { label: "Pending", key: "Pending" },
           ];
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

        // Slide creation helper for Monthly & Cumulative datasets
        const createPeriodSlidesForBaseType = (statsData: any, isMonthlyPeriod: boolean) => {
            if (!statsData.hasData) return;
            const periodLabel = isMonthlyPeriod ? (isArabic ? "لهذه الفترة" : "This Period") : (isArabic ? "تراكمي" : "Cumulative");
            const periodHeaderTag = isMonthlyPeriod ? "This Period" : "Cumulative";
            
            // Slide A: Table + Bar Chart
            let slideA = pres.addSlide({ masterName: "STRUCTUSIGHT_MASTER" });
            addHeaderAndFooter(pres, slideA, `${longName} (${bt}) ${periodHeaderTag}`, projectInfo, logoUrl, options);
            
            // Add Table
            const tableRows = buildTableData(statsData.stats, statsData.totalRow, cols, options?.fontFace);
            const colW = cols.length === 10
                ? [0.85, 0.44, 0.40, 0.44, 0.44, 0.42, 0.45, 0.45, 0.45, 0.40]
                : (cols.length === 8
                    ? [1.0, 0.55, 0.55, 0.55, 0.45, 0.5, 0.5, 0.5]
                    : (cols.length === 7 
                        ? [1.3, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55] 
                        : [1.6, 1.0, 1.0, 1.0]));
            slideA.addTable(tableRows, { 
                x: 0.35, y: 1.25, w: cols.length === 10 ? 4.74 : (cols.length === 8 ? 4.8 : 4.6), 
                colW: colW,
                color: "333333", fontSize: cols.length === 10 ? 6.5 : (cols.length === 8 ? 7.5 : 8.5),
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
            let slideB = pres.addSlide({ masterName: "STRUCTUSIGHT_MASTER" });
            addHeaderAndFooter(pres, slideB, `${longName} (${bt}) ${periodHeaderTag}`, projectInfo, logoUrl, options);
            
            // Centered Section Header inside slideB
            slideB.addText(bt === 'LTR' ? "Correspondence Type Distribution" : `${bt} Quality Approval (${periodLabel})`, { x: 0.5, y: 1.05, w: 9.0, h: 0.3, fontSize: 12, bold: true, color: "1E3A5F", align: "center" });

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

                if (pieLabels.length === 4) {
                    pieDataValues = [Number(s.Approved) || 0, Number(s.RejectedOpen) || 0, Number(s.RejectedClosed) || 0, Number(s.Pending) || 0];
                    pieLabelsList = ["Approved", "Rej. Open", "Rej. Closed", "Pending"];
                    colors = ["70AD47", "F43F5E", "B91C1C", "FFC000"];
                } else if (pieLabels.length === 2 && pieLabels[0] === "Closed") {
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

        // Determine which period slides to generate based on requested mode
        if (mode === 'monthly') {
            createPeriodSlidesForBaseType(monthlyStats, true);
        } else if (mode === 'cumulative') {
            createPeriodSlidesForBaseType(cumulativeStats, false);
        } else {
            createPeriodSlidesForBaseType(monthlyStats, true);
            createPeriodSlidesForBaseType(cumulativeStats, false);
        }
    });

    // ----------------------------------------------------
    // REJECTED ITEMS SECTION
    // ----------------------------------------------------
    if (isSectionSelected('rejected')) {
        const presRejectedPageSize = options?.rejectedPageSize || 15;
        const showRefCol = options?.showRefCol !== false;
        const showTradeCol = options?.showTradeCol !== false;
        const showRemarksCol = options?.showRemarksCol !== false;

        // Deduplicate items strictly by docNo / id so that each submittal reference appears only once
        const seenRejectedRefs = new Set<string>();
        const targetRejectedDataset = mode === 'monthly' ? monthlyWorkingData : cumulativeWorkingData;
        const presRejectedItems = targetRejectedDataset
            .filter(d => d.overdue && d.workflowStage === 'Rejected' && !d.documentType?.includes('LTR'))
            .filter(d => {
                const refKey = (d.docNo || d.id || `${d.documentType}-${d.trade}-${d.rev}`).toUpperCase().trim();
                if (seenRejectedRefs.has(refKey)) return false;
                seenRejectedRefs.add(refKey);
                return true;
            })
            .sort((a, b) => (b.delayDays || 0) - (a.delayDays || 0));

        const rejectedPages: SubmittalRow[][] = [];
        for (let i = 0; i < presRejectedItems.length; i += presRejectedPageSize) {
            rejectedPages.push(presRejectedItems.slice(i, i + presRejectedPageSize));
        }

        const sectionNumRejected = baseTypes.length + 5;
        addDividerSlide(pres, isArabic ? "الوثائق التي تتطلب إعادة تقديم" : "Items Requiring Resubmission", `${String(sectionNumRejected).padStart(2, '0')} REJECTED ITEMS`, projectInfo, logoUrl, options);

        if (rejectedPages.length === 0) {
            let slide: any = pres.addSlide({ masterName: "STRUCTUSIGHT_MASTER" });
            addHeaderAndFooter(pres, slide, "REJECTED ITEMS", projectInfo, logoUrl, options);
            slide.addText(isArabic ? "لا توجد وثائق مرفوضة متأخرة" : "No Rejected Items", { x: 1.0, y: 2.2, w: 8, h: 0.6, fontSize: 24, bold: true, color: "7A1515", align: "center", rtl: isArabic });
            slide.addText(isArabic ? "كل المستندات المرفوضة تم الرد عليها أو إغلاقها." : "All rejected submittals are resolved or resubmitted.", { x: 1.0, y: 2.9, w: 8, h: 0.4, fontSize: 14, color: "666666", align: "center", rtl: isArabic });
        } else {
            rejectedPages.forEach((pageData, pageIdx) => {
                let slide = pres.addSlide({ masterName: "STRUCTUSIGHT_MASTER" });
                addHeaderAndFooter(pres, slide, "REJECTED ITEMS", projectInfo, logoUrl, options);
                
                // Slide title
                const totalCountLabel = presRejectedItems.length;
                slide.addText(isArabic ? `أعلى الوثائق المرفوضة تأخيراً (إجمالي: ${totalCountLabel}) - صفحة ${pageIdx + 1} من ${rejectedPages.length}` : `Top Rejected Items by Delay (Total: ${totalCountLabel}) - Page ${pageIdx + 1} of ${rejectedPages.length}`, { x: 0.5, y: 1.0, w: 9.0, h: 0.35, fontSize: 13, bold: true, color: "7A1515" });
                
                // Build Table
                let tableDataRows: any[] = [];
                // Headers row
                let headersRow: any[] = [
                    { text: isArabic ? "م" : "No.", options: { bold: true, fill: "7A1515", color: "FFFFFF", align: "center" } },
                    { text: isArabic ? "نوع الوثيقة" : "Type of Documents", options: { bold: true, fill: "7A1515", color: "FFFFFF", align: "center" } }
                ];
                if (showRefCol) headersRow.push({ text: isArabic ? "الرقم المرجعي" : "Ref / Link", options: { bold: true, fill: "7A1515", color: "FFFFFF", align: "center" } });
                if (showTradeCol) headersRow.push({ text: isArabic ? "التخصص" : "Trade", options: { bold: true, fill: "7A1515", color: "FFFFFF", align: "center" } });
                if (showRemarksCol) headersRow.push({ text: isArabic ? "مدة التأخير" : "Delay Days", options: { bold: true, fill: "7A1515", color: "FFFFFF", align: "center" } });
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
                    if (showRemarksCol) bodyRow.push({ text: isArabic ? `متأخر منذ ${row.delayDays} يوم` : `Overdue ${row.delayDays} days`, options: { fill: fillBg, align: "center", color: "C00000", bold: true } });
                    tableDataRows.push(bodyRow);
                });

                slide.addTable(tableDataRows, {
                    x: 0.5, y: 1.45, w: 9.0,
                    color: "333333", fontSize: 8.5,
                    border: { type: "solid", pt: 1, color: "CBD5E1" }
                });
            });
        }
    }

    // ----------------------------------------------------
    // PENDING ITEMS SECTION
    // ----------------------------------------------------
    if (isSectionSelected('pending')) {
        const presPendingPageSize = options?.pendingPageSize || 15;
        const showRefCol = options?.showRefCol !== false;
        const showTradeCol = options?.showTradeCol !== false;
        const showRemarksCol = options?.showRemarksCol !== false;

        // Deduplicate items strictly by docNo / id
        const seenPendingRefs = new Set<string>();
        const targetPendingDataset = mode === 'monthly' ? monthlyWorkingData : cumulativeWorkingData;
        const presPendingItems = targetPendingDataset
            .filter(d => d.overdue && d.workflowStage === 'Pending' && !d.documentType?.includes('LTR'))
            .filter(d => {
                const refKey = (d.docNo || d.id || `${d.documentType}-${d.trade}-${d.rev}`).toUpperCase().trim();
                if (seenPendingRefs.has(refKey)) return false;
                seenPendingRefs.add(refKey);
                return true;
            })
            .sort((a, b) => (b.delayDays || 0) - (a.delayDays || 0));

        const pendingPages: SubmittalRow[][] = [];
        for (let i = 0; i < presPendingItems.length; i += presPendingPageSize) {
            pendingPages.push(presPendingItems.slice(i, i + presPendingPageSize));
        }

        const sectionNumPending = baseTypes.length + 6;
        addDividerSlide(pres, isArabic ? "الوثائق تحت المراجعة المتأخرة" : "Items Requiring Response", `${String(sectionNumPending).padStart(2, '0')} PENDING ITEMS`, projectInfo, logoUrl, options);

        if (pendingPages.length === 0) {
            let slide: any = pres.addSlide({ masterName: "STRUCTUSIGHT_MASTER" });
            addHeaderAndFooter(pres, slide, "PENDING ITEMS", projectInfo, logoUrl, options);
            slide.addText(isArabic ? "لا توجد معلقات متأخرة" : "No Pending Items", { x: 1.0, y: 2.2, w: 8, h: 0.6, fontSize: 24, bold: true, color: "0A192F", align: "center", rtl: isArabic });
            slide.addText(isArabic ? "كل المستندات المعلقة مغلقة بالكامل." : "All pending documents are closed.", { x: 1.0, y: 2.9, w: 8, h: 0.4, fontSize: 14, color: "666666", align: "center", rtl: isArabic });
        } else {
            pendingPages.forEach((pageData, pageIdx) => {
                let slide = pres.addSlide({ masterName: "STRUCTUSIGHT_MASTER" });
                addHeaderAndFooter(pres, slide, "PENDING ITEMS", projectInfo, logoUrl, options);
                
                // Slide title
                const totalPendingCount = presPendingItems.length;
                slide.addText(isArabic ? `المعلقات المتأخرة (قيد المراجعة - إجمالي: ${totalPendingCount}) - صفحة ${pageIdx + 1} من ${pendingPages.length}` : `Top Pending Items Overdue (Total: ${totalPendingCount}) - Page ${pageIdx + 1} of ${pendingPages.length}`, { x: 0.5, y: 1.0, w: 9.0, h: 0.35, fontSize: 13, bold: true, color: "0A192F" });
                
                // Build Table
                let tableDataRows: any[] = [];
                // Headers row
                let headersRow: any[] = [
                    { text: isArabic ? "م" : "No.", options: { bold: true, fill: "0A192F", color: "FFFFFF", align: "center" } },
                    { text: isArabic ? "نوع الوثيقة" : "Type of Documents", options: { bold: true, fill: "0A192F", color: "FFFFFF", align: "center" } }
                ];
                if (showRefCol) headersRow.push({ text: isArabic ? "الرقم المرجعي" : "Ref / Link", options: { bold: true, fill: "0A192F", color: "FFFFFF", align: "center" } });
                if (showTradeCol) headersRow.push({ text: isArabic ? "التخصص" : "Trade", options: { bold: true, fill: "0A192F", color: "FFFFFF", align: "center" } });
                if (showRemarksCol) headersRow.push({ text: isArabic ? "مدة التأخير" : "Delay Days", options: { bold: true, fill: "0A192F", color: "FFFFFF", align: "center" } });
                tableDataRows.push(headersRow);

                // Body rows
                pageData.forEach((row, i) => {
                    const rowNo = pageIdx * presPendingPageSize + i + 1;
                    const isEven = i % 2 === 1;
                    const fillBg = isEven ? "F8FAFC" : "FFFFFF";

                    let bodyRow: any[] = [
                        { text: String(rowNo), options: { fill: fillBg, align: "center" } },
                        { text: String(row.documentType || "-"), options: { fill: fillBg, align: "center", bold: true, color: "0A192F" } }
                    ];
                    if (showRefCol) bodyRow.push({ text: String(row.docNo || "-"), options: { fill: fillBg, align: "center" } });
                    if (showTradeCol) bodyRow.push({ text: String(row.trade || "-"), options: { fill: fillBg, align: "center" } });
                    if (showRemarksCol) bodyRow.push({ text: isArabic ? `متأخر منذ ${row.delayDays} يوم` : `Overdue ${row.delayDays} days`, options: { fill: fillBg, align: "center", color: "C00000", bold: true } });
                    tableDataRows.push(bodyRow);
                });

                slide.addTable(tableDataRows, {
                    x: 0.5, y: 1.45, w: 9.0,
                    color: "333333", fontSize: 8.5,
                    border: { type: "solid", pt: 1, color: "CBD5E1" }
                });
            });
        }
    }

    // Thank you Slide
    if (isSectionSelected('thanks')) {
        addDividerSlide(pres, isArabic ? "فريق مراقبة وجودة الوثائق" : "Document Control Team", isArabic ? "شكراً لكم" : "Thanks", projectInfo, logoUrl, options);
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
        ? `StructuSight-monthly-${new Date().toISOString().split('T')[0]}.pptx` 
        : (mode === 'presentation' 
            ? `StructuSight-Presentation-${new Date().toISOString().split('T')[0]}.pptx` 
            : `StructuSight-cumulative-${new Date().toISOString().split('T')[0]}.pptx`);

    await pres.writeFile({ fileName: outputFilename });
};
