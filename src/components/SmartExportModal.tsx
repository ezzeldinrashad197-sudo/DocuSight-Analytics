import React, { useState, useRef } from 'react';
import { X, Check, Settings, AlertCircle, HelpCircle, Layout, FileText, ChevronRight, Download, Eye, Languages, CalendarDays, Clock, Palette, Upload, Type, EyeOff } from 'lucide-react';
import { useLanguage } from '../utils/i18n';
import { ProjectSettings, SubmittalRow } from '../types';
import { generatePptxReport } from '../analytics/exportEngine';

interface SmartExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    exportType: 'pptx' | 'pdf';
    data: SubmittalRow[];
    activeTab: string;
    activeProject: ProjectSettings | null;
    filterMonthly: (row: SubmittalRow) => boolean;
    filterCumulative: (row: SubmittalRow) => boolean;
    startDate?: string;
    endDate?: string;
    isExcludedFromGeneralStats: (row: SubmittalRow) => boolean;
    matchesFilters: (row: SubmittalRow) => boolean;
    isExporting: boolean;
    setIsExporting: (exporting: boolean) => void;
    setParseMessage: (msg: string) => void;
    setIsError: (err: boolean) => void;
}

export default function SmartExportModal({
    isOpen,
    onClose,
    exportType,
    data,
    activeTab,
    activeProject,
    filterMonthly,
    filterCumulative,
    startDate,
    endDate,
    isExcludedFromGeneralStats,
    matchesFilters,
    isExporting,
    setIsExporting,
    setParseMessage,
    setIsError
}: SmartExportModalProps) {
    const { t, language, isRtl } = useLanguage();

    // Active Customization Tab
    const [activeConfigTab, setActiveConfigTab] = useState<'content' | 'design' | 'print'>('content');

    // Default sections based on export type/tab
    const [selectedSections, setSelectedSections] = useState({
        cover: true,
        info: true,
        metrics: true,
        logs: true,
        rejected: true,
        pending: true,
        hold: true,
        thanks: true,
    });

    const [rangeType, setRangeType] = useState<'all' | 'custom'>('all');
    const [rangeStart, setRangeStart] = useState<number>(1);
    const [rangeEnd, setRangeEnd] = useState<number>(20);
    const [arabicEnabled, setArabicEnabled] = useState<boolean>(true);
    const [dataScope, setDataScope] = useState<'active' | 'monthly' | 'cumulative'>('active');

    // --- Enterprise Customization States ---
    const [primaryColor, setPrimaryColor] = useState<string>('#0A192F');
    const [accentColor, setAccentColor] = useState<string>('#D4AF37');
    const [pageSize, setPageSize] = useState<'a3' | 'a4' | 'letter'>('a3');
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [coverStyle, setCoverStyle] = useState<'corporate' | 'minimal' | 'luxe'>('luxe');
    const [fontFace, setFontFace] = useState<string>('Arial');
    
    // Visibility Toggles
    const [showLogo, setShowLogo] = useState<boolean>(true);
    const [showProjectInfo, setShowProjectInfo] = useState<boolean>(true);
    const [showSignatures, setShowSignatures] = useState<boolean>(true);
    const [showFooterNotes, setShowFooterNotes] = useState<boolean>(true);
    
    // Custom Headers & Footers
    const [customHeader, setCustomHeader] = useState<string>('STRUCTUSIGHT ENTERPRISE INTELLIGENCE');
    const [customFooter, setCustomFooter] = useState<string>('');
    const [logoUrl, setLogoUrl] = useState<string>(''); // Base64 encoded uploaded logo
    const fileInputRef = useRef<HTMLInputElement>(null);

    const COLOR_PRESETS = [
        { name: isRtl ? 'كلاسيك كحلي وذهبي' : 'Classic Blue & Gold', primary: '#0A192F', accent: '#D4AF37' },
        { name: isRtl ? 'الأخضر الرئاسي' : 'Emerald Executive', primary: '#0F5132', accent: '#FFC107' },
        { name: isRtl ? 'الرمادي والمودرن' : 'Steel Tech', primary: '#1E293B', accent: '#38BDF8' },
        { name: isRtl ? 'الفخامة القرمزية' : 'Crimson Executive', primary: '#6B1F1F', accent: '#94A3B8' },
        { name: isRtl ? 'الحبر الكوني' : 'Deep Cosmic Slate', primary: '#0D1527', accent: '#F59E0B' },
    ];

    const APPROVED_FONTS = [
        { id: 'Arial', label: 'Arial (Standard)' },
        { id: 'Cairo', label: 'Cairo (Elegant Arabic)' },
        { id: 'Space Grotesk', label: 'Space Grotesk (Modern Tech)' },
        { id: 'Playfair Display', label: 'Playfair Display (Serif/Editorial)' },
        { id: 'Montserrat', label: 'Montserrat (Geometric)' },
        { id: 'Inter', label: 'Inter (UI Sans-Serif)' },
    ];

    if (!isOpen) return null;

    const toggleSection = (key: keyof typeof selectedSections) => {
        setSelectedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExecuteExport = async () => {
        setIsExporting(true);
        setParseMessage(isRtl ? "جاري تجهيز وتصدير التقرير المخصص للمؤسسة..." : "Preparing and compiling custom Enterprise Report...");
        setIsError(false);

        // Compile list of selected sections
        const sectionsList = Object.keys(selectedSections).filter(
            k => selectedSections[k as keyof typeof selectedSections]
        );

        // Helper to parse hex colors
        const hexToRgb = (hex: string) => {
            const cleanHex = hex.replace('#', '');
            const num = parseInt(cleanHex, 16);
            return {
                r: (num >> 16) & 255,
                g: (num >> 8) & 255,
                b: num & 255
            };
        };

        try {
            await new Promise(r => setTimeout(r, 400));

            const scopeMode = dataScope === 'active' 
                ? (activeTab === 'monthly' ? 'monthly' : activeTab === 'cumulative' ? 'cumulative' : 'presentation')
                : dataScope;

            const exportOptions = {
                selectedSections: sectionsList,
                slideRangeStart: rangeType === 'custom' ? rangeStart : undefined,
                slideRangeEnd: rangeType === 'custom' ? rangeEnd : undefined,
                arabicEnabled: arabicEnabled,
                monthlyStart: startDate,
                primaryColor,
                accentColor,
                pageSize,
                orientation,
                coverStyle,
                fontFace,
                showLogo,
                showProjectInfo,
                showSignatures,
                showFooterNotes,
                customHeader,
                customFooter: customFooter || (activeProject ? `[${activeProject.projectName}]  |  Document Control Enterprise Report  |  Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}` : `Document Control Enterprise Report`),
                logoUrl: logoUrl || undefined,
            };

            if (exportType === 'pptx') {
                // Trigger Native Smart PPTX Export
                const filters = { filterMonthly, filterCumulative };
                await generatePptxReport(data, activeProject, scopeMode as any, filters, exportOptions);
                setParseMessage(isRtl ? "تم تصدير ملف PowerPoint بنجاح بهويتك المؤسسية المخصصة!" : "PowerPoint exported successfully with custom corporate identity elements!");
            } else {
                // Smart PDF Outline Bookmarks & Export with custom styles
                const elementId = activeTab === 'presentation' ? 'presentation-container' : 'export-container';
                const exportElement = document.getElementById(elementId);

                if (!exportElement) {
                    throw new Error(`Report container #${elementId} not found.`);
                }

                // Add PDF specific class for layout styles & hide non-printable UI elements
                const hiddenElements: { el: HTMLElement; prevDisplay: string }[] = [];
                if (activeTab === 'presentation') {
                    const printHiddenEls = exportElement.querySelectorAll('.print\\:hidden, [class*="print:hidden"]');
                    printHiddenEls.forEach((el) => {
                        const htmlEl = el as HTMLElement;
                        hiddenElements.push({ el: htmlEl, prevDisplay: htmlEl.style.display });
                        htmlEl.style.display = 'none';
                    });
                } else {
                    document.body.classList.add('pdf-export');
                    const headersFooters = exportElement.querySelectorAll('.pdf-only-header, .pdf-only-footer');
                    headersFooters.forEach(el => {
                        (el as HTMLElement).classList.remove('hidden');
                        (el as HTMLElement).classList.add('flex');
                    });
                }

                const originalWidth = exportElement.style.width;
                const originalPadding = exportElement.style.padding;
                const originalMaxWidth = exportElement.style.maxWidth;

                exportElement.style.width = '1500px';
                exportElement.style.maxWidth = '1500px';
                exportElement.style.padding = activeTab === 'presentation' ? '0' : '20px';

                // Import html2pdf dynamically to avoid build-time issues
                // @ts-ignore
                const html2pdf = (await import('html2pdf.js')).default;

                const filename = `StructuSight-Smart-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`;

                const opt: any = {
                    margin:       activeTab === 'presentation' ? [0, 0, 0, 0] : [16, 0, 14, 0], // Zero margin for standalone slides
                    filename:     filename,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { 
                        scale: 2, 
                        useCORS: true, 
                        allowTaint: true, 
                        backgroundColor: '#ffffff',
                        logging: false,
                        windowWidth: 1550
                    },
                    jsPDF:        { unit: 'mm', format: pageSize.toLowerCase(), orientation: activeTab === 'presentation' ? 'landscape' : orientation.toLowerCase() },
                    pagebreak:    { mode: ['css', 'legacy'], avoid: ['tr', '.page-break-inside-avoid', '.chart-card', '.kpi-card', 'h1', 'h2', 'h3'], after: ['.page-break-after-always', '.chart-card', '.presentation-slide'] }
                };

                await (html2pdf().set(opt).from(exportElement).toPdf().get('pdf').then((pdf: any) => {
                    const totalPages = pdf.internal.getNumberOfPages();
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

                    // Presentation slides already have embedded high-res slide headers and footers; skip document report overlays for presentation
                    if (activeTab !== 'presentation') {
                        // --- INJECT ENTERPRISE OUTLINE BOOKMARKS ---
                        if (pdf.outline) {
                            const rootOutline = pdf.outline;
                            if (selectedSections.cover) rootOutline.add(null, isRtl ? "صفحة الغلاف والفهرس" : "Cover Page & Index", { pageNumber: 1 });
                            if (selectedSections.info) rootOutline.add(null, isRtl ? "بيانات المشروع" : "Project Settings & Teams", { pageNumber: Math.min(2, totalPages) });
                            if (selectedSections.metrics) rootOutline.add(null, isRtl ? "الملخص التنفيذي ومؤشرات الأداء" : "Executive Performance Summary", { pageNumber: Math.min(3, totalPages) });
                            if (selectedSections.logs) rootOutline.add(null, isRtl ? "مخططات وتوزيع المستندات" : "Log Distributions & Tables", { pageNumber: Math.min(4, totalPages) });
                            if (selectedSections.rejected) rootOutline.add(null, isRtl ? "الوثائق المرفوضة المعلقة" : "Overdue Rejected Items", { pageNumber: Math.min(7, totalPages) });
                            if (selectedSections.pending) rootOutline.add(null, isRtl ? "المعلقات المتأخرة" : "Overdue Pending Actions", { pageNumber: Math.min(9, totalPages) });
                        }

                        // --- DRAW HEADER & FOOTER OVERLAY ---
                        let periodStr = "Cumulative Period";
                        if (activeTab === 'monthly') {
                            periodStr = "Monthly Period";
                        }
                        if (startDate && endDate) {
                            const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                            const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                            periodStr = `${start} - ${end}`;
                        }

                        const projName = (activeProject?.projectName || "No Project Configured").substring(0, 30);
                        const projCode = activeProject?.projectCode || "P1.17";
                        const contractor = activeProject?.contractorName || "INNOVO";
                        const consultant = activeProject?.consultantName || "ACE";
                        const reportName = activeTab.toUpperCase() + " PERFORMANCE REPORT";

                        const primRgb = hexToRgb(primaryColor);
                        const accRgb = hexToRgb(accentColor);

                        for (let i = 1; i <= totalPages; i++) {
                            // Skip header/footer on first cover page if selected
                            if (i === 1 && selectedSections.cover) continue;

                            pdf.setPage(i);
                            
                            // Header background (Custom Primary Color)
                            pdf.setFillColor(primRgb.r, primRgb.g, primRgb.b);
                            pdf.rect(0, 0, pdfWidth, 14, 'F');
                            
                            // Custom Accent bottom line
                            pdf.setFillColor(accRgb.r, accRgb.g, accRgb.b);
                            pdf.rect(0, 14, pdfWidth, 0.8, 'F');
                            
                            // Title on the left
                            pdf.setTextColor(255, 255, 255);
                            pdf.setFont("helvetica", "bold");
                            pdf.setFontSize(9);
                            const topHeaderVal = customHeader || "STRUCTUSIGHT ENTERPRISE INTELLIGENCE";
                            pdf.text(topHeaderVal.toUpperCase(), 10, 6);
                            
                            pdf.setFont("helvetica", "normal");
                            pdf.setFontSize(7.5);
                            pdf.setTextColor(accRgb.r, accRgb.g, accRgb.b);
                            pdf.text(reportName, 10, 10.5);
                            
                            // Metadata on the right
                            if (activeProject && showProjectInfo) {
                                pdf.setTextColor(255, 255, 255);
                                pdf.setFont("helvetica", "normal");
                                pdf.setFontSize(6.5);
                                
                                // Draw elegant metadata columns
                                let metaX = pdfWidth - 215; // default start pos
                                if (metaX < 120) metaX = 120; // safe bounds
                                
                                // Column 1: Project & Code
                                pdf.setTextColor(148, 163, 184); // silver/slate
                                pdf.text("PROJECT:", metaX, 5.5);
                                pdf.text("PARCEL/CODE:", metaX, 10);
                                pdf.setTextColor(255, 255, 255);
                                pdf.setFont("helvetica", "bold");
                                pdf.text(projName, metaX + 22, 5.5);
                                pdf.text(projCode, metaX + 22, 10);
                                
                                // Column 2: Contractor & Consultant
                                pdf.setFont("helvetica", "normal");
                                pdf.setTextColor(148, 163, 184);
                                pdf.text("CONTRACTOR:", metaX + 70, 5.5);
                                pdf.text("CONSULTANT:", metaX + 70, 10);
                                pdf.setTextColor(255, 255, 255);
                                pdf.setFont("helvetica", "bold");
                                pdf.text(contractor, metaX + 92, 5.5);
                                pdf.text(consultant, metaX + 92, 10);

                                // Column 3: Period & Generated Date
                                pdf.setFont("helvetica", "normal");
                                pdf.setTextColor(148, 163, 184);
                                pdf.text("PERIOD:", metaX + 140, 5.5);
                                pdf.text("GENERATED:", metaX + 140, 10);
                                pdf.setTextColor(255, 255, 255);
                                pdf.setFont("helvetica", "bold");
                                pdf.text(periodStr, metaX + 158, 5.5);
                                pdf.text(dateStr, metaX + 158, 10);
                            }

                            // Draw Footer Bar
                            pdf.setDrawColor(226, 232, 240); // light slate border
                            pdf.setLineWidth(0.2);
                            pdf.line(10, pdfHeight - 12, pdfWidth - 10, pdfHeight - 12);
                            
                            // Footer texts
                            pdf.setFont("helvetica", "normal");
                            pdf.setFontSize(7);
                            pdf.setTextColor(100, 116, 139); // slate-500
                            const footerBottomText = customFooter || `StructuSight Enterprise Engineering Intelligence Platform | CONCEPT & PRODUCT VISION BY EZZ RASHAD`;
                            pdf.text(footerBottomText, 10, pdfHeight - 7);
                            pdf.text(`Page ${i} of ${totalPages}`, pdfWidth - 30, pdfHeight - 7);
                        }
                    }
                }) as any).save();

                // Restore dimensions immediately after imaging
                exportElement.style.width = originalWidth;
                exportElement.style.maxWidth = originalMaxWidth;
                exportElement.style.padding = originalPadding;

                hiddenElements.forEach(({ el, prevDisplay }) => {
                    el.style.display = prevDisplay;
                });

                if (activeTab !== 'presentation') {
                    document.body.classList.remove('pdf-export');
                    const headersFooters = exportElement.querySelectorAll('.pdf-only-header, .pdf-only-footer');
                    headersFooters.forEach(el => {
                        (el as HTMLElement).classList.add('hidden');
                        (el as HTMLElement).classList.remove('flex');
                    });
                }

                setParseMessage(isRtl ? "تم تصدير ملف PDF بنجاح بهويتك المؤسسية المخصصة!" : "PDF document exported successfully with professional custom branding overlays!");
            }
        } catch (e: unknown) {
            console.error(e);
            setIsError(true);
            setParseMessage(isRtl ? "فشل التصدير المخصص للتقرير." : "Failed to execute custom branded Report Export.");
        } finally {
            setIsExporting(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#0A192F] text-[#D4AF37] rounded-xl shadow-inner">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#0A192F]">
                                {exportType === 'pptx' 
                                    ? (isRtl ? 'منصة التقارير المخصصة - PowerPoint' : 'Enterprise Report Customizer - PowerPoint')
                                    : (isRtl ? 'منصة التقارير المخصصة - PDF' : 'Enterprise Report Customizer - PDF')
                                }
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {isRtl ? 'تخصيص كامل للهوية البصرية واللوغو والخطوط والألوان والطباعة' : 'Configure corporate identity, brand colors, custom logos, fonts, and structures'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub-Tabs Selector */}
                <div className="flex border-b border-slate-100 bg-white px-5">
                    <button
                        onClick={() => setActiveConfigTab('content')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeConfigTab === 'content' ? 'border-[#0A192F] text-[#0A192F]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        <FileText className="w-4 h-4" />
                        {isRtl ? 'محتوى وبنية التقرير' : 'Content & Structure'}
                    </button>
                    <button
                        onClick={() => setActiveConfigTab('design')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeConfigTab === 'design' ? 'border-[#0A192F] text-[#0A192F]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        <Palette className="w-4 h-4" />
                        {isRtl ? 'الهوية البصرية والألوان واللوغو' : 'Branding & Visuals'}
                    </button>
                    <button
                        onClick={() => setActiveConfigTab('print')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeConfigTab === 'print' ? 'border-[#0A192F] text-[#0A192F]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        <Layout className="w-4 h-4" />
                        {isRtl ? 'تخطيط الصفحة والطباعة' : 'Print & Visibility'}
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                    
                    {/* --- TAB 1: CONTENT & STRUCTURE --- */}
                    {activeConfigTab === 'content' && (
                        <div className="space-y-6">
                            {/* Data Scope Selector */}
                            <div>
                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    {isRtl ? 'نطاق بيانات التقرير' : 'Report Data Scope'}
                                </span>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDataScope('active')}
                                        className={`p-3 rounded-xl border text-sm font-semibold transition-all flex flex-col items-center gap-1.5 ${dataScope === 'active' ? 'border-[#0A192F] bg-white text-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-white bg-white/40 text-slate-600'}`}
                                    >
                                        <Eye className="w-4.5 h-4.5 text-[#D4AF37]" />
                                        <span>{isRtl ? 'التبويب النشط حالياً' : 'Current Active Tab'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDataScope('monthly')}
                                        className={`p-3 rounded-xl border text-sm font-semibold transition-all flex flex-col items-center gap-1.5 ${dataScope === 'monthly' ? 'border-[#0A192F] bg-white text-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-white bg-white/40 text-slate-600'}`}
                                    >
                                        <CalendarDays className="w-4.5 h-4.5 text-[#D4AF37]" />
                                        <span>{isRtl ? 'التقرير الشهري فقط' : 'Monthly Only'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDataScope('cumulative')}
                                        className={`p-3 rounded-xl border text-sm font-semibold transition-all flex flex-col items-center gap-1.5 ${dataScope === 'cumulative' ? 'border-[#0A192F] bg-white text-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-white bg-white/40 text-slate-600'}`}
                                    >
                                        <Clock className="w-4.5 h-4.5 text-[#D4AF37]" />
                                        <span>{isRtl ? 'التقرير التراكمي الشامل' : 'Cumulative Only'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Report Section Checklist */}
                            <div>
                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    {isRtl ? 'اختيار الأقسام والشرائح المضمنة' : 'Select Target Sections & Elements'}
                                </span>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-white ${selectedSections.cover ? 'border-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedSections.cover} 
                                            onChange={() => toggleSection('cover')}
                                            className="rounded border-slate-300 text-[#0A192F] focus:ring-[#0A192F] w-4 h-4"
                                        />
                                        <div className="text-sm">
                                            <span className="block font-bold text-slate-800">{isRtl ? 'صفحة الغلاف والفهرس' : 'Cover & Slide Index'}</span>
                                            <span className="text-xs text-slate-400">{isRtl ? 'تخطيط رسمي للواجهة' : 'Formal cover page'}</span>
                                        </div>
                                    </label>

                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-white ${selectedSections.info ? 'border-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedSections.info} 
                                            onChange={() => toggleSection('info')}
                                            className="rounded border-slate-300 text-[#0A192F] focus:ring-[#0A192F] w-4 h-4"
                                        />
                                        <div className="text-sm">
                                            <span className="block font-bold text-slate-800">{isRtl ? 'بيانات المشروع والشركاء' : 'Project Info & Stakeholders'}</span>
                                            <span className="text-xs text-slate-400">{isRtl ? 'الاستشاري، المقاول، المالك' : 'Consultant, contractor, PM'}</span>
                                        </div>
                                    </label>

                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-white ${selectedSections.metrics ? 'border-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedSections.metrics} 
                                            onChange={() => toggleSection('metrics')}
                                            className="rounded border-slate-300 text-[#0A192F] focus:ring-[#0A192F] w-4 h-4"
                                        />
                                        <div className="text-sm">
                                            <span className="block font-bold text-slate-800">{isRtl ? 'مؤشرات الأداء العامة' : 'Executive KPI Metrics'}</span>
                                            <span className="text-xs text-slate-400">{isRtl ? 'الرسوم البيانية والمعدلات' : 'Performance rate visualizer'}</span>
                                        </div>
                                    </label>

                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-white ${selectedSections.logs ? 'border-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedSections.logs} 
                                            onChange={() => toggleSection('logs')}
                                            className="rounded border-slate-300 text-[#0A192F] focus:ring-[#0A192F] w-4 h-4"
                                        />
                                        <div className="text-sm">
                                            <span className="block font-bold text-slate-800">{isRtl ? 'سجلات الوثائق والإحصائيات' : 'Document Log Statistics'}</span>
                                            <span className="text-xs text-slate-400">{isRtl ? 'تفصيل المخططات، المواد، إلخ' : 'SHD, MAR, MIR breakdowns'}</span>
                                        </div>
                                    </label>

                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-white ${selectedSections.rejected ? 'border-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedSections.rejected} 
                                            onChange={() => toggleSection('rejected')}
                                            className="rounded border-slate-300 text-[#0A192F] focus:ring-[#0A192F] w-4 h-4"
                                        />
                                        <div className="text-sm">
                                            <span className="block font-bold text-slate-800">{isRtl ? 'الوثائق المرفوضة متأخرة' : 'Rejected Overdue Items'}</span>
                                            <span className="text-xs text-slate-400">{isRtl ? 'يتطلب إعادة تقديم عاجلة' : 'Immediate action required'}</span>
                                        </div>
                                    </label>

                                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-white ${selectedSections.pending ? 'border-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedSections.pending} 
                                            onChange={() => toggleSection('pending')}
                                            className="rounded border-slate-300 text-[#0A192F] focus:ring-[#0A192F] w-4 h-4"
                                        />
                                        <div className="text-sm">
                                            <span className="block font-bold text-slate-800">{isRtl ? 'المعلقات قيد المراجعة' : 'Pending Action Items'}</span>
                                            <span className="text-xs text-slate-400">{isRtl ? 'مستندات متأخرة بالاستشاري' : 'Awaiting consultant response'}</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Page Range Filter */}
                            <div>
                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    {isRtl ? 'نطاق الصفحات / الشرائح' : 'Specific Slide/Page Range'}
                                </span>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                                            <input 
                                                type="radio" 
                                                name="rangeType" 
                                                checked={rangeType === 'all'} 
                                                onChange={() => setRangeType('all')} 
                                                className="text-[#0A192F] focus:ring-[#0A192F]"
                                            />
                                            <span>{isRtl ? 'تصدير كل الصفحات' : 'All Pages/Slides'}</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                                            <input 
                                                type="radio" 
                                                name="rangeType" 
                                                checked={rangeType === 'custom'} 
                                                onChange={() => setRangeType('custom')} 
                                                className="text-[#0A192F] focus:ring-[#0A192F]"
                                            />
                                            <span>{isRtl ? 'نطاق صفحات مخصص' : 'Custom Slide Range'}</span>
                                        </label>
                                    </div>

                                    {rangeType === 'custom' && (
                                        <div className="flex items-center gap-3" dir="ltr">
                                            <div className="w-1/2">
                                                <span className="text-xs text-slate-400 block mb-1">{isRtl ? 'من شريحة رقم' : 'From Page'}</span>
                                                <input 
                                                    type="number" 
                                                    value={rangeStart} 
                                                    onChange={(e) => setRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-semibold text-[#0A192F] focus:border-[#0A192F]"
                                                />
                                            </div>
                                            <div className="text-slate-400 font-bold pt-4">to</div>
                                            <div className="w-1/2">
                                                <span className="text-xs text-slate-400 block mb-1">{isRtl ? 'إلى شريحة رقم' : 'To Page'}</span>
                                                <input 
                                                    type="number" 
                                                    value={rangeEnd} 
                                                    onChange={(e) => setRangeEnd(Math.max(rangeStart, parseInt(e.target.value) || rangeStart))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-semibold text-[#0A192F] focus:border-[#0A192F]"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 2: BRANDING & VISUALS --- */}
                    {activeConfigTab === 'design' && (
                        <div className="space-y-6">
                            {/* Color Presets */}
                            <div>
                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                                    {isRtl ? 'لوحة الألوان المعتمدة ومطابقة الهوية' : 'Corporate Identity Color Presets'}
                                </span>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    {COLOR_PRESETS.map((preset) => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => {
                                                setPrimaryColor(preset.primary);
                                                setAccentColor(preset.accent);
                                            }}
                                            className={`p-3 rounded-xl border bg-white hover:border-slate-400 transition-all text-center flex flex-col items-center gap-2 ${primaryColor === preset.primary && accentColor === preset.accent ? 'border-[#0A192F] ring-2 ring-[#0A192F]/10' : 'border-slate-200'}`}
                                        >
                                            <div className="flex gap-1">
                                                <span className="w-4 h-4 rounded-full border border-black/5 block" style={{ backgroundColor: preset.primary }} />
                                                <span className="w-4 h-4 rounded-full border border-black/5 block" style={{ backgroundColor: preset.accent }} />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-700 truncate w-full">{preset.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Color Picker */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        {isRtl ? 'اللون الرئيسي للهوية' : 'Primary Brand Color'}
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="color" 
                                            value={primaryColor} 
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="w-10 h-10 rounded border-0 cursor-pointer"
                                        />
                                        <input 
                                            type="text" 
                                            value={primaryColor} 
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-700 w-full"
                                        />
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        {isRtl ? 'اللون الثانوي / التمييز' : 'Accent Accent Color'}
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="color" 
                                            value={accentColor} 
                                            onChange={(e) => setAccentColor(e.target.value)}
                                            className="w-10 h-10 rounded border-0 cursor-pointer"
                                        />
                                        <input 
                                            type="text" 
                                            value={accentColor} 
                                            onChange={(e) => setAccentColor(e.target.value)}
                                            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-700 w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Corporate Logo Uploader */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200">
                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    {isRtl ? 'شعار الشركة المخصص للتقارير' : 'Corporate Logo Upload'}
                                </span>
                                
                                <div className="flex items-center gap-5">
                                    <div className="w-24 h-24 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Uploaded logo" className="max-w-full max-h-full object-contain p-2" />
                                        ) : (
                                            <Upload className="w-7 h-7 text-slate-300 animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            {isRtl 
                                                ? 'قم بتحميل شعار شركتك المعتمد ليتم طبعه تلقائياً بدقة ممتازة على كافة صفحات وغلاف ملفات الـ PowerPoint والـ PDF.' 
                                                : 'Upload your company logo in PNG/JPG format. The system automatically scales and embeds it into the headers, cover design, and section divider panels.'
                                            }
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-1.5 bg-[#0A192F] hover:bg-[#132c4f] text-[#D4AF37] font-bold text-xs rounded-lg transition-all"
                                            >
                                                {isRtl ? 'تحميل ملف الشعار' : 'Choose Logo File'}
                                            </button>
                                            {logoUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setLogoUrl('')}
                                                    className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs rounded-lg transition-all"
                                                >
                                                    {isRtl ? 'إزالة' : 'Clear Logo'}
                                                </button>
                                            )}
                                        </div>
                                        <input 
                                            ref={fileInputRef}
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleLogoUpload}
                                            className="hidden" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Approved Corporate Fonts */}
                            <div>
                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    {isRtl ? 'نوع الخط المعتمد للتقارير المؤسسية' : 'Approved Fonts'}
                                </span>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {APPROVED_FONTS.map((font) => (
                                        <button
                                            key={font.id}
                                            type="button"
                                            onClick={() => setFontFace(font.id)}
                                            className={`p-3 bg-white rounded-xl border text-sm font-semibold transition-all text-center flex flex-col items-center gap-1.5 ${fontFace === font.id ? 'border-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                                            style={{ fontFamily: font.id === 'Cairo' ? 'Cairo, sans-serif' : 'inherit' }}
                                        >
                                            <Type className="w-4 h-4 text-[#D4AF37]" />
                                            <span>{font.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cover Slide Style Options */}
                            <div>
                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    {isRtl ? 'شكل وأسلوب الغلاف الرئيسي' : 'Cover Page Visual Theme'}
                                </span>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCoverStyle('luxe')}
                                        className={`p-3 bg-white rounded-xl border text-sm font-semibold transition-all flex flex-col items-center gap-1 ${coverStyle === 'luxe' ? 'border-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        <span className="font-bold text-[#D4AF37] text-lg">LUXE</span>
                                        <span className="text-[10px] text-slate-400">{isRtl ? 'ذهبي وإمبراطوري فاخر' : 'Luxury Golden Edge'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCoverStyle('corporate')}
                                        className={`p-3 bg-white rounded-xl border text-sm font-semibold transition-all flex flex-col items-center gap-1 ${coverStyle === 'corporate' ? 'border-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        <span className="font-bold text-blue-900 text-lg">CORP</span>
                                        <span className="text-[10px] text-slate-400">{isRtl ? 'كلاسيكي رسمي للشركات' : 'Corporate Grid'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCoverStyle('minimal')}
                                        className={`p-3 bg-white rounded-xl border text-sm font-semibold transition-all flex flex-col items-center gap-1 ${coverStyle === 'minimal' ? 'border-[#0A192F] shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        <span className="font-bold text-slate-800 text-lg">MINI</span>
                                        <span className="text-[10px] text-slate-400">{isRtl ? 'بسيط وعصري بأسلوب ناصع' : 'Clean Off-white'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 3: PRINT LAYOUT & VISIBILITY --- */}
                    {activeConfigTab === 'print' && (
                        <div className="space-y-6">
                            {/* Page Orientation & Size */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        {isRtl ? 'حجم صفحة المستند (PDF)' : 'Page Format / Size (PDF)'}
                                    </span>
                                    <div className="flex gap-2">
                                        {['a3', 'a4', 'letter'].map((size) => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => setPageSize(size as any)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${pageSize === size ? 'bg-[#0A192F] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        {isRtl ? 'اتجاه الصفحة وطباعتها' : 'Page Orientation'}
                                    </span>
                                    <div className="flex gap-2">
                                        {['landscape', 'portrait'].map((orient) => (
                                            <button
                                                key={orient}
                                                type="button"
                                                onClick={() => setOrientation(orient as any)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${orientation === orient ? 'bg-[#0A192F] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                                            >
                                                {orient}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Visibility Toggles Grid */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {isRtl ? 'عناصر ترويسة وتذييل الصفحات' : 'Page Elements & Toggle Visibility'}
                                </span>
                                
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={showLogo} 
                                            onChange={() => setShowLogo(!showLogo)}
                                            className="rounded border-slate-300 text-[#0A192F] w-4.5 h-4.5"
                                        />
                                        <span className="text-sm font-semibold text-slate-700">{isRtl ? 'إظهار لوغو المقاول / المشروع' : 'Display Corporate Logo'}</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={showProjectInfo} 
                                            onChange={() => setShowProjectInfo(!showProjectInfo)}
                                            className="rounded border-slate-300 text-[#0A192F] w-4.5 h-4.5"
                                        />
                                        <span className="text-sm font-semibold text-slate-700">{isRtl ? 'إظهار ترويسة معلومات المشروع' : 'Show Project Metadata Column'}</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={showSignatures} 
                                            onChange={() => setShowSignatures(!showSignatures)}
                                            className="rounded border-slate-300 text-[#0A192F] w-4.5 h-4.5"
                                        />
                                        <span className="text-sm font-semibold text-slate-700">{isRtl ? 'إظهار بلوك التوقيع والاعتماد' : 'Include Executive Signatures'}</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={showFooterNotes} 
                                            onChange={() => setShowFooterNotes(!showFooterNotes)}
                                            className="rounded border-slate-300 text-[#0A192F] w-4.5 h-4.5"
                                        />
                                        <span className="text-sm font-semibold text-slate-700">{isRtl ? 'إظهار الهوامش والملاحظات بالأسفل' : 'Show Footer Confidentiality Line'}</span>
                                    </label>
                                </div>
                            </div>

                            {/* Custom Header & Footer Texts */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        {isRtl ? 'ترويسة التقرير المخصصة' : 'Custom Header Text'}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={customHeader}
                                        onChange={(e) => setCustomHeader(e.target.value)}
                                        placeholder="STRUCTUSIGHT ENTERPRISE INTELLIGENCE"
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 focus:ring-1 focus:ring-[#0A192F] focus:border-[#0A192F]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        {isRtl ? 'تذييل الصفحة وملاحظات التوقيع' : 'Custom Footer / Disclaimer Notes'}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={customFooter}
                                        onChange={(e) => setCustomFooter(e.target.value)}
                                        placeholder={isRtl ? 'مثال: سري للغاية - للاستخدام الداخلي فقط لشركاء المشروع' : 'e.g. Confidential - Document Control Enterprise Platform'}
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 focus:ring-1 focus:ring-[#0A192F] focus:border-[#0A192F]"
                                    />
                                </div>
                            </div>

                            {/* Language RTL Switch */}
                            <div>
                                <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={arabicEnabled} 
                                        onChange={() => setArabicEnabled(!arabicEnabled)}
                                        className="rounded mt-1 border-slate-300 text-[#0A192F] focus:ring-[#0A192F] w-4.5 h-4.5"
                                    />
                                    <div className="text-sm">
                                        <span className="block font-bold text-slate-800 flex items-center gap-1.5">
                                            <Languages className="w-4 h-4 text-[#D4AF37]" />
                                            {isRtl ? 'تفعيل معالجة اللغة العربية وخدمة RTL للفقرات' : 'Optimize Arabic Text & RTL Alignment'}
                                        </span>
                                        <span className="text-xs text-slate-400 block mt-0.5">
                                            {isRtl 
                                                ? 'محاذاة تلقائية كاملة للنصوص والجداول والشروح مع دقة دمج الحروف العربية لتفادي الانفصال' 
                                                : 'Keeps Arabic script cohesive and right-aligned across all native tables and diagrams'
                                            }
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold text-sm transition-colors"
                    >
                        {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                        type="button"
                        onClick={handleExecuteExport}
                        disabled={isExporting}
                        className="px-6 py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#132c4f] text-[#D4AF37] font-bold text-sm shadow-lg shadow-blue-900/10 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isExporting ? (
                            <span className="inline-block w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <Download className="w-4.5 h-4.5" />
                        )}
                        <span>
                            {exportType === 'pptx' 
                                ? (isRtl ? 'تصدير بوربوينت مخصص' : 'Download Custom PPTX')
                                : (isRtl ? 'تصدير بي دي إف مخصص' : 'Download Custom PDF')
                            }
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
