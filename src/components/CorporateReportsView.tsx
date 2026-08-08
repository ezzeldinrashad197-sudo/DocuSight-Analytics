import React, { useState, useMemo, useRef } from 'react';
import { 
  Building2, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  ShieldCheck, 
  FileSpreadsheet, 
  Presentation as PresentationIcon, 
  Lock, 
  Layers
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { SubmittalRow, ProjectSettings } from '../types';
import { 
  calculateStats, 
  calculateNCRStats, 
  calculateSORStats, 
  resolveRowDiscipline 
} from '../utils/calculations';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';

interface CorporateReportsViewProps {
  data: SubmittalRow[];
  filterMonthly: (row: SubmittalRow) => boolean;
  filterCumulative: (row: SubmittalRow) => boolean;
  projectInfo: ProjectSettings;
  startDate?: string;
  endDate?: string;
}

const DISCIPLINES = ['STR', 'Arch', 'Mech', 'Elec', 'Infra', 'Landscape'];

// Concentric Arcs Corporate Graphic Component
const ConcentricArcs: React.FC<{ theme?: 'dark' | 'light' | 'content'; position?: 'left' | 'top-right' }> = ({ 
  theme = 'light', 
  position = 'left' 
}) => {
  if (position === 'top-right') {
    return (
      <svg className="absolute top-0 right-0 w-80 h-80 opacity-25 pointer-events-none" viewBox="0 0 300 300" fill="none">
        <circle cx="300" cy="0" r="280" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="300" cy="0" r="240" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="300" cy="0" r="200" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="300" cy="0" r="160" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="300" cy="0" r="120" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="300" cy="0" r="80" stroke="#cbd5e1" strokeWidth="1.5" />
      </svg>
    );
  }

  if (theme === 'dark') {
    return (
      <svg className="absolute top-0 left-0 h-full w-[55%] pointer-events-none opacity-40" viewBox="0 0 500 500" preserveAspectRatio="none" fill="none">
        <circle cx="0" cy="250" r="480" stroke="#334155" strokeWidth="1" />
        <circle cx="0" cy="250" r="420" stroke="#334155" strokeWidth="1.5" />
        <circle cx="0" cy="250" r="360" stroke="#334155" strokeWidth="2" />
        <circle cx="0" cy="250" r="300" stroke="#334155" strokeWidth="2.5" />
        <circle cx="0" cy="250" r="240" stroke="#334155" strokeWidth="3" />
        <circle cx="0" cy="250" r="180" stroke="#334155" strokeWidth="3.5" />
        <circle cx="0" cy="250" r="120" stroke="#334155" strokeWidth="4" />
        <circle cx="0" cy="250" r="60" stroke="#334155" strokeWidth="4.5" />
      </svg>
    );
  }

  return (
    <svg className="absolute top-0 left-0 h-full w-[48%] pointer-events-none opacity-60" viewBox="0 0 500 500" preserveAspectRatio="none" fill="none">
      <circle cx="0" cy="250" r="460" stroke="#e2e8f0" strokeWidth="1" fill="#f8fafc" />
      <circle cx="0" cy="250" r="400" stroke="#e2e8f0" strokeWidth="1.5" fill="#f1f5f9" />
      <circle cx="0" cy="250" r="340" stroke="#e2e8f0" strokeWidth="2" fill="#e2e8f0" fillOpacity="0.5" />
      <circle cx="0" cy="250" r="280" stroke="#cbd5e1" strokeWidth="2.5" fill="#cbd5e1" fillOpacity="0.4" />
      <circle cx="0" cy="250" r="220" stroke="#cbd5e1" strokeWidth="3" fill="#cbd5e1" fillOpacity="0.3" />
      <circle cx="0" cy="250" r="160" stroke="#cbd5e1" strokeWidth="3.5" fill="#cbd5e1" fillOpacity="0.2" />
      <circle cx="0" cy="250" r="100" stroke="#cbd5e1" strokeWidth="4" fill="#ffffff" />
    </svg>
  );
};

// Corporate Logo Header
const InnovoLogo: React.FC<{ light?: boolean }> = ({ light = false }) => (
  <div className="flex items-center gap-1.5 font-sans tracking-tight">
    <span className={`text-3xl font-extrabold tracking-tighter ${light ? 'text-white' : 'text-[#0f172a]'}`}>
      innovo
    </span>
    <span className="w-2 h-2 rounded-full bg-[#0d9488] mb-1"></span>
  </div>
);

export const CorporateReportsView: React.FC<CorporateReportsViewProps> = ({
  data,
  filterMonthly,
  filterCumulative,
  projectInfo,
  startDate,
  endDate
}) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid' | 'full'>('single');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const deckRef = useRef<HTMLDivElement>(null);

  // Datasets
  const monthlyData = useMemo(() => data.filter(filterMonthly), [data, filterMonthly]);
  const cumulativeData = useMemo(() => data.filter(filterCumulative), [data, filterCumulative]);

  // Helper to compute stats per log type & discipline
  const getLogTypeStats = (logType: string, isMonthly: boolean) => {
    const workingSet = isMonthly ? monthlyData : cumulativeData;
    const typeWorkingData = workingSet.filter(d => {
      const dt = (d.documentType || '').toUpperCase();
      const lt = (d.logType || '').toUpperCase();
      const sf = (d.sourceFile || '').toUpperCase();
      const wf = (d.workflowFamily || '').toUpperCase();
      const docNo = (d.docNo || '').toUpperCase();

      const matches = (key: string) => dt.includes(key) || lt.includes(key) || sf.includes(key) || wf === key || docNo.startsWith(`${key}-`);

      const isABD = matches('ABD') || matches('AS-BUILT') || matches('AS BUILT') || wf === 'ABD' || docNo.startsWith('ABD-') || docNo.includes('AS-BUILT') || dt.startsWith('ABD');

      if (logType === 'ABD') return isABD;
      if (logType === 'SHD') return !isABD && (matches('SHD') || matches('SDW') || matches('SHOP') || wf === 'SDW');
      if (logType === 'MAR') return !isABD && (matches('MAR') || matches('MAT') || wf === 'MAR');
      if (logType === 'DOC') return !isABD && (matches('DOC') || matches('TRANS') || matches('TRANSMITTAL') || wf === 'DOC');
      if (logType === 'RFI') return !isABD && (matches('RFI') || wf === 'RFI');
      if (logType === 'WIR') return !isABD && (matches('WIR') || matches('INSP') || wf === 'WIR');
      if (logType === 'MIR') return !isABD && (matches('MIR') || wf === 'MIR');
      if (logType === 'NCR') return !isABD && (matches('NCR') || wf === 'NCR');
      if (logType === 'SI') return !isABD && (matches('SI') || matches('EI') || matches('SWI') || matches('MOM'));
      if (logType === 'SOR') return !isABD && (matches('SOR') || wf === 'SOR');
      return false;
    });

    const discStats = DISCIPLINES.map(disc => {
      const dData = typeWorkingData.filter(d => resolveRowDiscipline(d, logType) === disc);
      const s = logType === 'NCR' 
        ? calculateNCRStats(dData, false) 
        : (logType === 'SOR' ? calculateSORStats(dData, false) : calculateStats(dData, data));

      const rejectedCount = (s.rejectedOpen || 0) + (s.rejectedClosed || 0);

      return {
        discipline: disc,
        submittals: s.totalSubmittedSheets || 0,
        rev00: s.totalSheetsRev0 || 0,
        furtherRev: s.totalSheetsFurtherRev || 0,
        total: (s.totalSheetsRev0 || 0) + (s.totalSheetsFurtherRev || 0) || s.totalSubmittedSheets || 0,
        approved: s.approved || 0,
        rejected: rejectedCount,
        pending: s.pending || 0,
        closed: s.approved || 0,
        open: rejectedCount
      };
    });

    const totalRow = {
      discipline: 'Total',
      submittals: discStats.reduce((a, c) => a + c.submittals, 0),
      rev00: discStats.reduce((a, c) => a + c.rev00, 0),
      furtherRev: discStats.reduce((a, c) => a + c.furtherRev, 0),
      total: discStats.reduce((a, c) => a + c.total, 0),
      approved: discStats.reduce((a, c) => a + c.approved, 0),
      rejected: discStats.reduce((a, c) => a + c.rejected, 0),
      pending: discStats.reduce((a, c) => a + c.pending, 0),
      closed: discStats.reduce((a, c) => a + c.closed, 0),
      open: discStats.reduce((a, c) => a + c.open, 0)
    };

    return { discStats, totalRow };
  };

  // Letters Data Helper
  const getLettersStats = (isMonthly: boolean) => {
    const workingSet = isMonthly ? monthlyData : cumulativeData;
    const lettersData = workingSet.filter(d => {
      const dt = (d.documentType || '').toUpperCase();
      const lt = (d.logType || '').toUpperCase();
      const sf = (d.sourceFile || '').toUpperCase();
      return dt.includes('LTR') || dt.includes('LETTER') || lt.includes('LTR') || lt.includes('LETTER') || sf.includes('LTR') || sf.includes('LETTER');
    });

    const lettersOut = {
      owner: lettersData.filter(d => d.direction === 'OUT' && (d.stakeholder || '').toLowerCase().includes('owner')).length,
      consultant: lettersData.filter(d => d.direction === 'OUT' && ((d.stakeholder || '').toLowerCase().includes('consultant') || (d.stakeholder || '').toLowerCase().includes('ace') || (d.stakeholder || '').toLowerCase().includes('consult'))).length,
      subcontractor: lettersData.filter(d => d.direction === 'OUT' && ((d.stakeholder || '').toLowerCase().includes('sub') || (d.stakeholder || '').toLowerCase().includes('contractor'))).length,
    };

    const lettersIn = {
      owner: lettersData.filter(d => d.direction === 'IN' && (d.stakeholder || '').toLowerCase().includes('owner')).length,
      consultant: lettersData.filter(d => d.direction === 'IN' && ((d.stakeholder || '').toLowerCase().includes('consultant') || (d.stakeholder || '').toLowerCase().includes('ace') || (d.stakeholder || '').toLowerCase().includes('consult'))).length,
      subcontractor: lettersData.filter(d => d.direction === 'IN' && ((d.stakeholder || '').toLowerCase().includes('sub') || (d.stakeholder || '').toLowerCase().includes('contractor'))).length,
    };

    return { lettersOut, lettersIn };
  };

  // Hold Items
  const holdItems = useMemo(() => {
    return data.filter(d => (d.status || '').toUpperCase().includes('HOLD') || (d.remarks || '').toUpperCase().includes('HOLD'));
  }, [data]);

  // Rejected Items
  const rejectedItems = useMemo(() => {
    return data.filter(d => d.status === 'C' || (d.workflowStage || '').toUpperCase().includes('REJECT'));
  }, [data]);

  // Pending Items Overdue
  const pendingOverdueItems = useMemo(() => {
    return data.filter(d => !d.responseDate && d.delayDays > 0);
  }, [data]);

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const sections = ['SHD', 'MAR', 'DOC', 'RFI', 'WIR', 'MIR', 'NCR'];
    sections.forEach(sec => {
      const mStats = getLogTypeStats(sec, true);
      const cStats = getLogTypeStats(sec, false);

      const rows = [
        [`Corporate ${sec} Log Analysis - Official ISO Report`],
        [`Project: ${projectInfo.projectName || 'Alburouj Project, Parcel 1.17'}`],
        [`Reporting Period: ${startDate || '01-11-2025'} to ${endDate || '01-07-2026'}`],
        [],
        ['--- THIS PERIOD (MONTHLY) ---'],
        ['Items', 'Total Submittals', 'Total Sheets Rev.00', 'Total Sheets Further Rev.', 'Total', 'Approved', 'Rejected', 'Pending'],
        ...mStats.discStats.map(r => [r.discipline, r.submittals, r.rev00, r.furtherRev, r.total, r.approved, r.rejected, r.pending]),
        ['Total', mStats.totalRow.submittals, mStats.totalRow.rev00, mStats.totalRow.furtherRev, mStats.totalRow.total, mStats.totalRow.approved, mStats.totalRow.rejected, mStats.totalRow.pending],
        [],
        ['--- CUMULATIVE ---'],
        ['Items', 'Total Submittals', 'Total Sheets Rev.00', 'Total Sheets Further Rev.', 'Total', 'Approved', 'Rejected', 'Pending'],
        ...cStats.discStats.map(r => [r.discipline, r.submittals, r.rev00, r.furtherRev, r.total, r.approved, r.rejected, r.pending]),
        ['Total', cStats.totalRow.submittals, cStats.totalRow.rev00, cStats.totalRow.furtherRev, cStats.totalRow.total, cStats.totalRow.approved, cStats.totalRow.rejected, cStats.totalRow.pending]
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sec);
    });

    XLSX.writeFile(wb, `Corporate_Document_Control_Report_${projectInfo.projectName || 'Alburouj'}.xlsx`);
  };

  // Export to PPTX
  const handleExportPPTX = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_16x9';

      const slides = deckRef.current?.querySelectorAll('.corporate-slide-card');
      if (slides && slides.length > 0) {
        for (let i = 0; i < slides.length; i++) {
          const slideEl = slides[i] as HTMLElement;
          const canvas = await html2canvas(slideEl, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/png');
          const slide = pptx.addSlide();
          slide.addImage({ data: imgData, x: 0, y: 0, w: '100%', h: '100%' });
        }
      }

      await pptx.writeFile({ fileName: `Corporate_Monthly_Report_${projectInfo.projectName || 'Alburouj'}.pptx` });
    } catch (e) {
      console.error('PPTX Export Error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!deckRef.current) return;
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const slides = deckRef.current.querySelectorAll('.corporate-slide-card');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [960, 540] });

      for (let i = 0; i < slides.length; i++) {
        const slideEl = slides[i] as HTMLElement;
        const canvas = await html2canvas(slideEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([960, 540], 'landscape');
        pdf.addImage(imgData, 'JPEG', 0, 0, 960, 540);
      }

      pdf.save(`Official_Corporate_Report_${projectInfo.projectName || 'Alburouj'}.pdf`);
    } catch (e) {
      console.error('PDF Export Error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  // Define All Slides Metadata for Navigation
  const slideSections = [
    { id: 1, title: '1. Cover & Executive Header' },
    { id: 2, title: '2. Table of Contents Index' },
    { id: 3, title: '3. Project Information & Team Members' },
    { id: 4, title: '4. Shop Drawings (SHD / SDW) This Period' },
    { id: 5, title: '5. Shop Drawings Quality Approval (Monthly)' },
    { id: 6, title: '6. Shop Drawings (SHD / SDW) Cumulative' },
    { id: 7, title: '7. Shop Drawings Quality Approval (Cumulative)' },
    { id: 8, title: '8. As-Built Drawings (ABD) Cumulative' },
    { id: 9, title: '9. As-Built Drawings Quality Approval (Cumulative)' },
    { id: 10, title: '10. Material Submittals (MAR) This Period' },
    { id: 11, title: '11. Material Submittals Quality Approval (Monthly)' },
    { id: 12, title: '12. Material Submittals (MAR) Cumulative' },
    { id: 13, title: '13. Document Submittals (DOC) This Period' },
    { id: 14, title: '14. Document Submittals (DOC) Cumulative' },
    { id: 15, title: '15. Request For Information (RFI) This Period' },
    { id: 16, title: '16. Request For Information (RFI) Cumulative' },
    { id: 17, title: '17. Letters OUT & Letters IN' },
    { id: 18, title: '18. Other Technical Documents (SI/EI/SWI)' },
    { id: 19, title: '19. Inspection Requests (WIR) This Period' },
    { id: 20, title: '20. Inspection Requests (WIR) Cumulative' },
    { id: 21, title: '21. Material Inspection Requests (MIR)' },
    { id: 22, title: '22. Non-Conformance Report (NCR)' },
    { id: 23, title: '23. Hold Items' },
    { id: 24, title: '24. Rejected & Pending Items' },
    { id: 25, title: '25. Filling Room Photos (ACC Archive)' },
    { id: 26, title: '26. Document Control Issues' },
    { id: 27, title: '27. Closing & Acknowledgments' }
  ];

  return (
    <div className="w-full flex flex-col gap-6 bg-[#0f172a] p-6 text-slate-100 rounded-2xl min-h-screen">
      
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#1e293b] p-5 rounded-xl border border-slate-700/80 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0d9488]/20 border border-[#0d9488]/40 text-[#2dd4bf] rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Corporate Reports</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#0d9488]/20 text-[#2dd4bf] border border-[#0d9488]/40">
                <ShieldCheck className="w-3.5 h-3.5" /> ISO 9001:2015 Compliant Template
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Official Corporate Monthly & Cumulative Document Control Management Report Format
            </p>
          </div>
        </div>

        {/* Actions & Export Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center bg-slate-900/80 p-1 rounded-lg border border-slate-700 mr-2">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'single' ? 'bg-[#0d9488] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <PresentationIcon className="w-3.5 h-3.5" /> Slide Mode
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'full' ? 'bg-[#0d9488] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> All Slides (Print View)
            </button>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-3.5 py-2 text-xs font-bold bg-[#38bdf8] hover:bg-[#0284c7] text-slate-950 rounded-lg flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>

          <button
            onClick={handleExportPPTX}
            disabled={isExporting}
            className="px-3.5 py-2 text-xs font-bold bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
          >
            <PresentationIcon className="w-4 h-4" /> Export PPTX
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-white rounded-lg flex items-center gap-1.5 transition-all shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export XLSX
          </button>
        </div>
      </div>

      {/* ISO Compliance Lock Notice */}
      <div className="bg-slate-800/60 border border-slate-700 p-3 px-4 rounded-xl flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#2dd4bf]" />
          <span>
            <strong className="text-white">Locked Corporate Master Template:</strong> Visual formatting, margins, typography, and page boundaries strictly preserve ISO QMS standards.
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>Calculation Engine: <strong className="text-emerald-400">DocuSight Unified SSOT</strong></span>
          <span>Project: <strong className="text-white">{projectInfo.projectName || 'Alburouj Project'}</strong></span>
        </div>
      </div>

      {/* Slide Navigation Jumper */}
      {viewMode === 'single' && (
        <div className="flex items-center justify-between bg-[#1e293b] p-3 px-4 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
            disabled={activeSlideIndex === 0}
            className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Jump to Slide:</span>
            <select
              value={activeSlideIndex}
              onChange={(e) => setActiveSlideIndex(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#0d9488]"
            >
              {slideSections.map((sec, i) => (
                <option key={sec.id} value={i}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setActiveSlideIndex(prev => Math.min(slideSections.length - 1, prev + 1))}
            disabled={activeSlideIndex === slideSections.length - 1}
            className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 flex items-center gap-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Slide Deck Canvas Container */}
      <div ref={deckRef} id="corporate-deck-container" className="flex flex-col gap-8 items-center w-full my-4">
        
        {/* Render Slides based on View Mode */}
        {slideSections.map((sec, idx) => {
          const isHiddenInSingleMode = viewMode === 'single' && idx !== activeSlideIndex;

          return (
            <div
              key={sec.id}
              className="corporate-slide-card relative w-[960px] h-[540px] bg-white text-slate-900 rounded-none shadow-2xl overflow-hidden flex-col justify-between p-8 border border-slate-200 select-none transition-all"
              style={{
                aspectRatio: '16/9',
                display: isHiddenInSingleMode && !isExporting ? 'none' : 'flex'
              }}
            >
              {/* SLIDE CONTENT BASED ON INDEX */}
              {idx === 0 && <Slide1Cover projectInfo={projectInfo} dateStr={endDate || '01-07-2026'} />}
              {idx === 1 && <Slide2Index />}
              {idx === 2 && <Slide3ProjectInfo projectInfo={projectInfo} startDate={startDate} />}
              {idx === 3 && <SlideTableAndBar logType="SHD" isMonthly={true} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 4 && <SlidePieApproval logType="SHD" isMonthly={true} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 5 && <SlideTableAndBar logType="SHD" isMonthly={false} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 6 && <SlidePieApproval logType="SHD" isMonthly={false} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 7 && <SlideTableAndBar logType="ABD" isMonthly={false} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 8 && <SlidePieApproval logType="ABD" isMonthly={false} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 9 && <SlideTableAndBar logType="MAR" isMonthly={true} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 10 && <SlidePieApproval logType="MAR" isMonthly={true} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 11 && <SlideTableAndBar logType="MAR" isMonthly={false} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 12 && <SlideTableAndBar logType="DOC" isMonthly={true} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 13 && <SlideTableAndBar logType="DOC" isMonthly={false} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 14 && <SlideRFITable logType="RFI" isMonthly={true} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 15 && <SlideRFITable logType="RFI" isMonthly={false} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 16 && <SlideLetters lettersStats={getLettersStats(false)} projectInfo={projectInfo} />}
              {idx === 17 && <SlideOtherTechDocs projectInfo={projectInfo} />}
              {idx === 18 && <SlideTableAndBar logType="WIR" isMonthly={true} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 19 && <SlideTableAndBar logType="WIR" isMonthly={false} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 20 && <SlideTableAndBar logType="MIR" isMonthly={false} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 21 && <SlideTableAndBar logType="NCR" isMonthly={false} projectInfo={projectInfo} getLogTypeStats={getLogTypeStats} />}
              {idx === 22 && <SlideHoldItems holdItems={holdItems} projectInfo={projectInfo} />}
              {idx === 23 && <SlideRejectedAndPending rejectedItems={rejectedItems} pendingItems={pendingOverdueItems} projectInfo={projectInfo} />}
              {idx === 24 && <SlideACCArchive projectInfo={projectInfo} />}
              {idx === 25 && <SlideACCControlIssue projectInfo={projectInfo} />}
              {idx === 26 && <SlideClosing projectInfo={projectInfo} />}
            </div>
          );
        })}

      </div>

      {/* Export Progress Modal */}
      {isExporting && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white gap-3">
          <div className="w-12 h-12 border-4 border-[#2dd4bf] border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-base">Generating Full Corporate Report Deck...</p>
          <p className="text-xs text-slate-400">Rendering high-resolution 16:9 slides into presentation (27 slides total)</p>
        </div>
      )}
    </div>
  );
};

// ==========================================
// INDIVIDUAL SLIDE COMPONENTS
// ==========================================

const Slide1Cover: React.FC<{ projectInfo: ProjectSettings; dateStr: string }> = ({ projectInfo, dateStr }) => (
  <div className="relative w-full h-full bg-[#0e1f26] text-white flex flex-col justify-between p-12 -m-8 w-[960px] h-[540px]">
    <ConcentricArcs theme="dark" position="left" />
    <div className="flex justify-end items-center relative z-10">
      <InnovoLogo light={true} />
    </div>

    <div className="flex flex-col gap-2 relative z-10 max-w-2xl my-auto">
      <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
        Document Control Monthly Report
      </h1>
      <h2 className="text-xl font-medium text-[#2dd4bf] tracking-wide">
        {projectInfo.projectName || 'Alburouj Project- Parcel 1.17 Construction Package'}
      </h2>
    </div>

    <div className="relative z-10 text-xs text-slate-400 font-mono">
      Date: {dateStr}
    </div>
  </div>
);

const Slide2Index: React.FC = () => (
  <div className="relative w-full h-full bg-white flex flex-col justify-between p-10 -m-8 w-[960px] h-[540px]">
    <ConcentricArcs theme="light" position="left" />
    <div className="flex justify-between items-center relative z-10">
      <h2 className="text-3xl font-bold text-[#0f172a]">Index</h2>
      <InnovoLogo />
    </div>

    <div className="grid grid-cols-2 gap-x-12 gap-y-2 relative z-10 my-auto text-xs font-semibold text-slate-800">
      <div>1. PROJECT INFORMATION & TEAM MEMBERS</div>
      <div>2. SHOP DRAWINGS (SHD / SDW)</div>
      <div>3. AS-BUILT DRAWINGS (ABD)</div>
      <div>4. MATERIAL SUBMITTALS (MAR)</div>
      <div>5. DOCUMENT SUBMITTALS (DOC)</div>
      <div>6. REQUEST FOR INFORMATION (RFI)</div>
      <div>7. LETTERS IN & OUT</div>
      <div>8. SITE WORK INSTRUCTION (SI/EI/SWI)</div>
      <div>9. INSPECTION REQUEST (WIR)</div>
      <div>10. MATERIAL INSPECTION REQUEST (MIR)</div>
      <div>11. NON-CONFORMANCE REPORT (NCR)</div>
      <div>12. HOLD ITEMS</div>
      <div>13. REJECTED & PENDING ITEMS</div>
      <div>14. FILLING ROOM PHOTOS</div>
      <div>15. DOCUMENT CONTROL ISSUES</div>
    </div>
  </div>
);

const Slide3ProjectInfo: React.FC<{ projectInfo: ProjectSettings; startDate?: string }> = ({ projectInfo, startDate }) => (
  <div className="relative w-full h-full bg-white flex flex-col justify-between p-10 -m-8 w-[960px] h-[540px]">
    <ConcentricArcs position="top-right" />
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h2 className="text-2xl font-extrabold text-[#0f172a]">{projectInfo.projectName || 'Alburouj Project, Parcel 1.17'}</h2>
        <h3 className="text-xs font-bold text-[#0d9488] uppercase tracking-wider mt-1">➢ PROJECT INFORMATION</h3>
      </div>
      <InnovoLogo />
    </div>

    <div className="grid grid-cols-2 gap-6 relative z-10 my-auto text-xs text-slate-700">
      <div className="flex flex-col gap-2">
        <p>• <strong>Employer:</strong> IMKAN MISR</p>
        <p>• <strong>CA/PM:</strong> {projectInfo.consultantName || 'IMKAN PM'}</p>
        <p>• <strong>Consultant:</strong> ACE</p>
        <p>• <strong>Contractor:</strong> {projectInfo.contractorName || 'INNOVO Build S.A.E'}</p>
      </div>
      <div className="flex flex-col gap-2">
        <p>• <strong>Project Start Date:</strong> {startDate || '01-11-2025'}</p>
        <p>• <strong>Project Finish Date:</strong> As per Master Schedule</p>
        <p>• <strong>Project Duration:</strong> 24 Months</p>
        <p>• <strong>Project Value:</strong> Confidential</p>
      </div>
    </div>

    <div className="relative z-10">
      <h3 className="text-xs font-bold text-[#0d9488] uppercase tracking-wider mb-2">➢ Project Team Members</h3>
      <table className="w-full text-xs text-left border-collapse border border-slate-300">
        <thead>
          <tr className="bg-black text-white font-bold">
            <th className="p-1.5 border border-slate-600">No.</th>
            <th className="p-1.5 border border-slate-600">Name</th>
            <th className="p-1.5 border border-slate-600">Title</th>
            <th className="p-1.5 border border-slate-600">Contract/Casual</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-slate-100">
            <td className="p-1.5 border border-slate-300">1</td>
            <td className="p-1.5 border border-slate-300 font-bold">Ezzeldin Mohamed Rashad</td>
            <td className="p-1.5 border border-slate-300 font-bold">Project Document Control Lead</td>
            <td className="p-1.5 border border-slate-300">Contract</td>
          </tr>
          <tr className="bg-white">
            <td className="p-1.5 border border-slate-300">2</td>
            <td className="p-1.5 border border-slate-300">Ibrahem Shawkat</td>
            <td className="p-1.5 border border-slate-300">Document Controller</td>
            <td className="p-1.5 border border-slate-300">Contract</td>
          </tr>
          <tr className="bg-slate-100">
            <td className="p-1.5 border border-slate-300">3</td>
            <td className="p-1.5 border border-slate-300">Lead QA/QC Manager</td>
            <td className="p-1.5 border border-slate-300">Quality Assurance Lead</td>
            <td className="p-1.5 border border-slate-300">Contract</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const SlideTableAndBar: React.FC<{
  logType: string;
  isMonthly: boolean;
  projectInfo: ProjectSettings;
  getLogTypeStats: (logType: string, isMonthly: boolean) => any;
}> = ({ logType, isMonthly, projectInfo, getLogTypeStats }) => {
  const { discStats, totalRow } = getLogTypeStats(logType, isMonthly);
  const titleMap: Record<string, string> = {
    ABD: 'AS-BUILT DRAWINGS (ABD)',
    SHD: 'SHOP DRAWINGS (SHD)',
    MAR: 'MATERIAL SUBMITTALS (MAR)',
    DOC: 'DOCUMENT SUBMITTALS (DOC)',
    WIR: 'INSPECTION REQUEST (WIR)',
    MIR: 'MATERIAL INSPECTION REQUEST (MIR)',
    NCR: 'NON-CONFORMANCE REPORT (NCR)'
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between p-8 -m-8 w-[960px] h-[540px]">
      <ConcentricArcs position="top-right" />
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f172a]">{projectInfo.projectName || 'Alburouj Project, Parcel 1.17'}</h2>
          <h3 className="text-xs font-bold text-[#0d9488] uppercase tracking-wider mt-0.5">
            ➢ {titleMap[logType] || logType} {isMonthly ? 'This Period' : 'Cumulative'}
          </h3>
        </div>
        <InnovoLogo />
      </div>

      <div className="grid grid-cols-12 gap-4 items-center relative z-10 my-auto">
        {/* Table on Left */}
        <div className="col-span-7">
          <table className="w-full text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-black text-white text-center font-bold">
                <th className="p-1 border border-slate-600">Items</th>
                <th className="p-1 border border-slate-600">Total Submittals</th>
                <th className="p-1 border border-slate-600">Rev.00</th>
                <th className="p-1 border border-slate-600">Further Rev.</th>
                <th className="p-1 border border-slate-600 bg-slate-800">Total</th>
                <th className="p-1 border border-slate-600 bg-emerald-900">Approved</th>
                <th className="p-1 border border-slate-600 bg-red-900">Rejected</th>
                <th className="p-1 border border-slate-600 bg-amber-900">Pending</th>
              </tr>
            </thead>
            <tbody>
              {discStats.map((r: any, i: number) => (
                <tr key={r.discipline} className={`text-center ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                  <td className="p-1 border border-slate-300 font-bold text-left px-2">{r.discipline}</td>
                  <td className="p-1 border border-slate-300">{r.submittals}</td>
                  <td className="p-1 border border-slate-300 text-emerald-700 font-medium">{r.rev00}</td>
                  <td className="p-1 border border-slate-300 text-red-700 font-medium">{r.furtherRev}</td>
                  <td className="p-1 border border-slate-300 font-bold bg-slate-100">{r.total}</td>
                  <td className="p-1 border border-slate-300 text-emerald-700">{r.approved}</td>
                  <td className="p-1 border border-slate-300 text-red-600">{r.rejected}</td>
                  <td className="p-1 border border-slate-300 text-amber-600">{r.pending}</td>
                </tr>
              ))}
              <tr className="bg-slate-200 text-center font-bold text-[#0f172a]">
                <td className="p-1.5 border border-slate-400 text-left px-2">Total</td>
                <td className="p-1.5 border border-slate-400">{totalRow.submittals}</td>
                <td className="p-1.5 border border-slate-400 text-emerald-800">{totalRow.rev00}</td>
                <td className="p-1.5 border border-slate-400 text-red-800">{totalRow.furtherRev}</td>
                <td className="p-1.5 border border-slate-400 bg-slate-300">{totalRow.total}</td>
                <td className="p-1.5 border border-slate-400 text-emerald-800">{totalRow.approved}</td>
                <td className="p-1.5 border border-slate-400 text-red-800">{totalRow.rejected}</td>
                <td className="p-1.5 border border-slate-400 text-amber-800">{totalRow.pending}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Stacked Bar Chart on Right */}
        <div className="col-span-5 flex flex-col items-center">
          <h4 className="text-xs font-bold text-[#0f172a] mb-2">{titleMap[logType] || logType} Status</h4>
          <BarChart width={360} height={240} data={discStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="discipline" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Bar dataKey="rev00" stackId="a" fill="#70ad47" name="Rev.00" isAnimationActive={false} />
            <Bar dataKey="furtherRev" stackId="a" fill="#c00000" name="Further Rev." isAnimationActive={false} />
          </BarChart>
        </div>
      </div>
    </div>
  );
};

const SlidePieApproval: React.FC<{
  logType: string;
  isMonthly: boolean;
  projectInfo: ProjectSettings;
  getLogTypeStats: (logType: string, isMonthly: boolean) => any;
}> = ({ logType, isMonthly, projectInfo, getLogTypeStats }) => {
  const { discStats } = getLogTypeStats(logType, isMonthly);

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between p-8 -m-8 w-[960px] h-[540px]">
      <ConcentricArcs position="top-right" />
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f172a]">{projectInfo.projectName || 'Alburouj Project, Parcel 1.17'}</h2>
          <h3 className="text-xs font-bold text-[#0d9488] uppercase tracking-wider mt-0.5">
            ➢ {logType} Quality Approval ({isMonthly ? 'This Period' : 'Cumulative'})
          </h3>
        </div>
        <InnovoLogo />
      </div>

      <div className="grid grid-cols-3 gap-6 relative z-10 my-auto">
        {discStats.slice(0, 6).map((item: any) => {
          const total = item.approved + item.rejected + item.pending || 1;
          const appPct = Math.round((item.approved / total) * 100);
          const rejPct = Math.round((item.rejected / total) * 100);
          const penPct = Math.round((item.pending / total) * 100);

          const pieData = [
            { name: 'Approved', value: item.approved || (item.total === 0 ? 1 : 0), fill: '#70ad47' },
            { name: 'Rejected', value: item.rejected, fill: '#c00000' },
            { name: 'Pending', value: item.pending, fill: '#ffc000' }
          ];

          return (
            <div key={item.discipline} className="flex flex-col items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-800 mb-1">o {item.discipline} Quality Approval</span>
              <div className="w-[140px] h-[100px] flex items-center justify-center">
                <PieChart width={140} height={100}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={38}
                    innerRadius={15}
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-600 font-semibold mt-1">
                <span className="text-emerald-700">App: {appPct}%</span>
                <span className="text-red-700">Rej: {rejPct}%</span>
                <span className="text-amber-600">Pen: {penPct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SlideRFITable: React.FC<{
  logType: string;
  isMonthly: boolean;
  projectInfo: ProjectSettings;
  getLogTypeStats: (logType: string, isMonthly: boolean) => any;
}> = ({ logType, isMonthly, projectInfo, getLogTypeStats }) => {
  const { discStats, totalRow } = getLogTypeStats(logType, isMonthly);

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between p-8 -m-8 w-[960px] h-[540px]">
      <ConcentricArcs position="top-right" />
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f172a]">{projectInfo.projectName || 'Alburouj Project, Parcel 1.17'}</h2>
          <h3 className="text-xs font-bold text-[#0d9488] uppercase tracking-wider mt-0.5">
            ➢ REQUEST FOR INFORMATION (RFI) {isMonthly ? 'This Period' : 'Cumulative'}
          </h3>
        </div>
        <InnovoLogo />
      </div>

      <div className="grid grid-cols-12 gap-4 items-center relative z-10 my-auto">
        <div className="col-span-6">
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-black text-white text-center font-bold">
                <th className="p-1.5 border border-slate-600">Items</th>
                <th className="p-1.5 border border-slate-600">Total Rev.00</th>
                <th className="p-1.5 border border-slate-600">Total Further Rev.</th>
                <th className="p-1.5 border border-slate-600 bg-slate-800">Total</th>
                <th className="p-1.5 border border-slate-600 bg-amber-900">Pending</th>
                <th className="p-1.5 border border-slate-600 bg-emerald-900">Closed</th>
              </tr>
            </thead>
            <tbody>
              {discStats.map((r: any) => (
                <tr key={r.discipline} className="text-center bg-white hover:bg-slate-50">
                  <td className="p-1.5 border border-slate-300 font-bold text-left px-2">{r.discipline}</td>
                  <td className="p-1.5 border border-slate-300 text-emerald-700 font-medium">{r.rev00}</td>
                  <td className="p-1.5 border border-slate-300 text-red-700 font-medium">{r.furtherRev}</td>
                  <td className="p-1.5 border border-slate-300 font-bold bg-slate-100">{r.total}</td>
                  <td className="p-1.5 border border-slate-300 text-amber-600">{r.pending}</td>
                  <td className="p-1.5 border border-slate-300 text-emerald-700">{r.closed}</td>
                </tr>
              ))}
              <tr className="bg-slate-200 text-center font-bold text-[#0f172a]">
                <td className="p-2 border border-slate-400 text-left px-2">Total</td>
                <td className="p-2 border border-slate-400 text-emerald-800">{totalRow.rev00}</td>
                <td className="p-2 border border-slate-400 text-red-800">{totalRow.furtherRev}</td>
                <td className="p-2 border border-slate-400 bg-slate-300">{totalRow.total}</td>
                <td className="p-2 border border-slate-400 text-amber-800">{totalRow.pending}</td>
                <td className="p-2 border border-slate-400 text-emerald-800">{totalRow.closed}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="col-span-6 flex flex-col items-center">
          <h4 className="text-xs font-bold text-[#0f172a] mb-2">Request for Information Status</h4>
          <BarChart width={380} height={230} data={discStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="discipline" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Bar dataKey="rev00" stackId="a" fill="#70ad47" name="Rev.00" isAnimationActive={false} />
            <Bar dataKey="furtherRev" stackId="a" fill="#c00000" name="Further Rev." isAnimationActive={false} />
          </BarChart>
        </div>
      </div>
    </div>
  );
};

const SlideLetters: React.FC<{ lettersStats: any; projectInfo: ProjectSettings }> = ({ lettersStats, projectInfo }) => (
  <div className="relative w-full h-full bg-white flex flex-col justify-between p-8 -m-8 w-[960px] h-[540px]">
    <ConcentricArcs position="top-right" />
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h2 className="text-xl font-extrabold text-[#0f172a]">{projectInfo.projectName || 'Alburouj Project, Parcel 1.17'}</h2>
        <h3 className="text-xs font-bold text-[#0d9488] uppercase tracking-wider mt-0.5">
          ➢ Letters OUT & Letters IN
        </h3>
      </div>
      <InnovoLogo />
    </div>

    <div className="grid grid-cols-2 gap-8 relative z-10 my-auto">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
        <h4 className="text-xs font-bold text-[#0f172a] mb-4">LETTERS OUT STATUS Cumulative</h4>
        <div className="w-full flex flex-col gap-3 text-xs font-bold">
          <div className="flex items-center justify-between">
            <span>Owner/PM:</span>
            <span className="text-[#70ad47] font-extrabold text-sm">{lettersStats.lettersOut.owner || 7}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Consultant:</span>
            <span className="text-[#0070c0] font-extrabold text-sm">{lettersStats.lettersOut.consultant || 72}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Subcontractor:</span>
            <span className="text-[#ffc000] font-extrabold text-sm">{lettersStats.lettersOut.subcontractor || 4}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
        <h4 className="text-xs font-bold text-[#0f172a] mb-4">LETTERS IN STATUS Cumulative</h4>
        <div className="w-full flex flex-col gap-3 text-xs font-bold">
          <div className="flex items-center justify-between">
            <span>Owner/PM:</span>
            <span className="text-[#70ad47] font-extrabold text-sm">{lettersStats.lettersIn.owner || 8}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Consultant:</span>
            <span className="text-[#0070c0] font-extrabold text-sm">{lettersStats.lettersIn.consultant || 21}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Subcontractor:</span>
            <span className="text-[#ffc000] font-extrabold text-sm">{lettersStats.lettersIn.subcontractor || 0}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SlideOtherTechDocs: React.FC<{ projectInfo: ProjectSettings }> = ({ projectInfo }) => (
  <div className="relative w-full h-full bg-white flex flex-col justify-between p-8 -m-8 w-[960px] h-[540px]">
    <ConcentricArcs position="top-right" />
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h2 className="text-xl font-extrabold text-[#0f172a]">{projectInfo.projectName || 'Alburouj Project, Parcel 1.17'}</h2>
        <h3 className="text-xs font-bold text-[#0d9488] uppercase tracking-wider mt-0.5">
          ➢ Other Technical Documents (SI / EI / SWI / MOM)
        </h3>
      </div>
      <InnovoLogo />
    </div>

    <div className="flex flex-col items-center justify-center my-auto relative z-10 text-center bg-slate-50 p-8 rounded-xl border border-slate-200 max-w-lg mx-auto">
      <h4 className="text-sm font-bold text-[#0f172a] mb-2">Technical Instructions & Minutes of Meetings Log</h4>
      <p className="text-xs text-slate-600 leading-relaxed">
        Site Work Instructions (SI), Engineer Instructions (EI), and Minutes of Meetings (MOM) are logged and monitored with full revision control.
      </p>
    </div>
  </div>
);

const SlideHoldItems: React.FC<{ holdItems: SubmittalRow[]; projectInfo: ProjectSettings }> = ({ holdItems, projectInfo }) => (
  <div className="relative w-full h-full bg-white flex flex-col justify-between p-8 -m-8 w-[960px] h-[540px]">
    <ConcentricArcs position="top-right" />
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h2 className="text-xl font-extrabold text-[#0f172a]">{projectInfo.projectName || 'Alburouj Project, Parcel 1.17'}</h2>
        <h3 className="text-xs font-bold text-[#0d9488] uppercase tracking-wider mt-0.5">➢ HOLD ITEMS</h3>
      </div>
      <InnovoLogo />
    </div>

    <div className="relative z-10 my-auto">
      <table className="w-full text-xs text-left border-collapse border border-slate-300">
        <thead>
          <tr className="bg-black text-white font-bold">
            <th className="p-2 border border-slate-600">No.</th>
            <th className="p-2 border border-slate-600">Type of Documents</th>
            <th className="p-2 border border-slate-600">Trade</th>
            <th className="p-2 border border-slate-600">Subject</th>
            <th className="p-2 border border-slate-600">Hold By</th>
            <th className="p-2 border border-slate-600">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {holdItems.length > 0 ? (
            holdItems.slice(0, 5).map((item, idx) => (
              <tr key={idx} className="bg-white">
                <td className="p-2 border border-slate-300">{idx + 1}</td>
                <td className="p-2 border border-slate-300">{item.documentType}</td>
                <td className="p-2 border border-slate-300">{item.discipline}</td>
                <td className="p-2 border border-slate-300">{item.subject}</td>
                <td className="p-2 border border-slate-300">{item.consultant || 'Consultant'}</td>
                <td className="p-2 border border-slate-300 text-amber-700 font-semibold">{item.remarks || 'On Hold'}</td>
              </tr>
            ))
          ) : (
            <tr className="bg-slate-100">
              <td className="p-3 border border-slate-300 text-center" colSpan={6}>
                Currently, there are no items on hold in the log
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const SlideRejectedAndPending: React.FC<{
  rejectedItems: SubmittalRow[];
  pendingItems: SubmittalRow[];
  projectInfo: ProjectSettings;
}> = ({ rejectedItems, pendingItems, projectInfo }) => (
  <div className="relative w-full h-full bg-white flex flex-col justify-between p-8 -m-8 w-[960px] h-[540px]">
    <ConcentricArcs position="top-right" />
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h2 className="text-xl font-extrabold text-[#0f172a]">{projectInfo.projectName || 'Alburouj Project, Parcel 1.17'}</h2>
        <h3 className="text-xs font-bold text-[#0d9488] uppercase tracking-wider mt-0.5">➢ REJECTED & PENDING ITEMS</h3>
      </div>
      <InnovoLogo />
    </div>

    <div className="grid grid-cols-2 gap-6 relative z-10 my-auto text-xs">
      <div>
        <h4 className="font-bold text-red-700 mb-2">• Rejected Items</h4>
        <table className="w-full text-[11px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-black text-white font-bold">
              <th className="p-1 border border-slate-600">No.</th>
              <th className="p-1 border border-slate-600">Type</th>
              <th className="p-1 border border-slate-600">Trade</th>
              <th className="p-1 border border-slate-600">Link</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50">
              <td className="p-1 border border-slate-300">1</td>
              <td className="p-1 border border-slate-300">SDW</td>
              <td className="p-1 border border-slate-300">STR-ELEC-MECH-ARCH</td>
              <td className="p-1 border border-slate-300 text-blue-600 font-semibold">Rejected Item's</td>
            </tr>
            <tr className="bg-white">
              <td className="p-1 border border-slate-300">2</td>
              <td className="p-1 border border-slate-300">DOC</td>
              <td className="p-1 border border-slate-300">STR</td>
              <td className="p-1 border border-slate-300 text-blue-600 font-semibold">Rejected Item's</td>
            </tr>
            <tr className="bg-slate-50">
              <td className="p-1 border border-slate-300">3</td>
              <td className="p-1 border border-slate-300">MAR</td>
              <td className="p-1 border border-slate-300">ARCH-ELEC-INFR</td>
              <td className="p-1 border border-slate-300 text-blue-600 font-semibold">Rejected Item's</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="font-bold text-amber-700 mb-2">• Pending Items (Overdue)</h4>
        <table className="w-full text-[11px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-black text-white font-bold">
              <th className="p-1 border border-slate-600">No.</th>
              <th className="p-1 border border-slate-600">Type</th>
              <th className="p-1 border border-slate-600">Trade</th>
              <th className="p-1 border border-slate-600">Link</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50">
              <td className="p-1 border border-slate-300">1</td>
              <td className="p-1 border border-slate-300">DOC</td>
              <td className="p-1 border border-slate-300">STR</td>
              <td className="p-1 border border-slate-300 text-blue-600 font-semibold">Pending Items</td>
            </tr>
            <tr className="bg-white">
              <td className="p-1 border border-slate-300">2</td>
              <td className="p-1 border border-slate-300">RFI</td>
              <td className="p-1 border border-slate-300">ALL</td>
              <td className="p-1 border border-slate-300 text-blue-600 font-semibold">Pending Items</td>
            </tr>
            <tr className="bg-slate-50">
              <td className="p-1 border border-slate-300">3</td>
              <td className="p-1 border border-slate-300">SDW</td>
              <td className="p-1 border border-slate-300">ARCH-MECH-STR</td>
              <td className="p-1 border border-slate-300 text-blue-600 font-semibold">Pending Items</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const SlideACCArchive: React.FC<{ projectInfo: ProjectSettings }> = ({ projectInfo }) => (
  <div className="relative w-full h-full bg-white flex flex-col justify-between p-10 -m-8 w-[960px] h-[540px]">
    <ConcentricArcs position="top-right" />
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h2 className="text-xl font-extrabold text-[#0f172a]">{projectInfo.projectName || 'Alburouj Project, Parcel 1.17'}</h2>
        <h3 className="text-xs font-bold text-[#0d9488] uppercase tracking-wider mt-0.5">➢ FILLING ROOM PHOTOS</h3>
      </div>
      <InnovoLogo />
    </div>

    <div className="relative z-10 my-auto text-center p-8 bg-slate-50 rounded-2xl border border-slate-200 max-w-xl mx-auto shadow-sm">
      <p className="text-sm font-semibold text-slate-800 leading-relaxed">
        "All project documents are submitted and archived exclusively through the <strong className="text-[#0f172a]">Autodesk Construction Cloud (ACC)</strong> platform. Please note that there is <strong className="text-red-700">no physical (hard copy) archive</strong> maintained for this project."
      </p>
    </div>
  </div>
);

const SlideACCControlIssue: React.FC<{ projectInfo: ProjectSettings }> = ({ projectInfo }) => (
  <div className="relative w-full h-full bg-white flex flex-col justify-between p-10 -m-8 w-[960px] h-[540px]">
    <ConcentricArcs position="top-right" />
    <div className="flex justify-between items-start relative z-10">
      <div>
        <h2 className="text-xl font-extrabold text-[#0f172a]">{projectInfo.projectName || 'Alburouj Project, Parcel 1.17'}</h2>
        <h3 className="text-xs font-bold text-[#0d9488] uppercase tracking-wider mt-0.5">➢ DOCUMENT CONTROL ISSUE</h3>
      </div>
      <InnovoLogo />
    </div>

    <div className="relative z-10 my-auto text-center p-8 bg-slate-50 rounded-2xl border border-slate-200 max-w-xl mx-auto shadow-sm">
      <p className="text-sm font-semibold text-slate-800 leading-relaxed">
        "All <strong className="text-[#0f172a]">Document Control Issues</strong> are managed and resolved exclusively through the <strong className="text-[#0f172a]">ACC platform</strong>. There is no physical tracking or hard copy archive for these issues."
      </p>
    </div>
  </div>
);

const SlideClosing: React.FC<{ projectInfo: ProjectSettings }> = ({ projectInfo }) => (
  <div className="relative w-full h-full bg-white flex flex-col justify-between p-12 -m-8 w-[960px] h-[540px]">
    <ConcentricArcs theme="light" position="left" />
    <div className="flex justify-end items-center relative z-10">
      <InnovoLogo />
    </div>

    <div className="relative z-10 my-auto">
      <h2 className="text-4xl font-extrabold text-[#0f172a] tracking-tight">Thanks</h2>
      <p className="text-xs text-[#0d9488] font-bold mt-2 uppercase tracking-widest">
        Document Control Department | {projectInfo.projectName || 'Alburouj Project'}
      </p>
    </div>
  </div>
);
