import React, { useState, useRef, useMemo, useEffect } from 'react';
import { FileSpreadsheet, FileUp, LayoutDashboard, CalendarDays, Clock, Database, CheckCircle2, AlertCircle, Printer, Presentation as PresentationIcon, Filter, Settings, Bot, ChevronLeft, ChevronRight, BarChart, Loader2 } from 'lucide-react';
import { SubmittalRow, ProjectSettings } from './types';
import { parseExcelFile } from './utils/parser';
import Dashboard from './Dashboard';
import ReportTable from './ReportTable';
import DelayAnalysis from './DelayAnalysis';
import DocumentRegister from './DocumentRegister';
import Presentation from './Presentation';
import ProjectConfigModal from './ProjectConfigModal';
import AIInsights from './AIInsights';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monthly' | 'cumulative' | 'delay' | 'presentation' | 'register' | 'insights'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showProjectConfig, setShowProjectConfig] = useState(false);
  
  // Project Settings State
  const [projects, setProjects] = useState<ProjectSettings[]>(() => {
    const saved = localStorage.getItem('docuCtrl_projects');
    if (saved) return JSON.parse(saved);
    return [];
  });
  
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const saved = localStorage.getItem('docuCtrl_activeProjectId');
    if (saved) return saved;
    return '';
  });

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;

  useEffect(() => {
    localStorage.setItem('docuCtrl_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('docuCtrl_activeProjectId', activeProjectId);
  }, [activeProjectId]);

  const handleSaveProjects = (newProjects: ProjectSettings[], newActiveId: string) => {
    setProjects(newProjects);
    setActiveProjectId(newActiveId);
  };

  
  // States for Date filtering
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));

  // Multi-filters
  const [filters, setFilters] = useState({
      discipline: 'All',
      contractor: 'All',
      consultant: 'All',
      logType: 'All',
      status: 'All',
      area: 'All',
      tradeSystem: 'All'
  });

  const [data, setData] = useState<SubmittalRow[]>([]);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
       const parsed = await parseExcelFile(file);
       if (parsed.length === 0) {
           setParseMessage("لم يتم العثور على أي بيانات مطابقة. تأكد من تطابق عناوين الأعمدة.");
           setIsError(true);
       } else {
           // Auto adjust dates
           const dates = parsed.map(d => new Date(d.submissionDate).getTime()).filter(t => !isNaN(t));
           if (dates.length > 0) {
               const maxDate = new Date(Math.max(...dates));
               setStartDate(format(startOfMonth(maxDate), 'yyyy-MM-dd'));
               setEndDate(format(endOfMonth(maxDate), 'yyyy-MM-dd'));
           }

           setData(parsed);
           setParseMessage(`تم قراءة ${parsed.length} صف من البيانات بنجاح.`);
           setIsError(false);
           setActiveTab('dashboard');
       }
    } catch (err) {
       setParseMessage("حدث خطأ أثناء قراءة الملف.");
       setIsError(true);
    }
    setIsLoading(false);
  };

  // Generate unique filter options
  const uniqueOpts = useMemo(() => {
     const getUniques = (key: keyof SubmittalRow) => {
         const s = new Set<string>();
         data.forEach(d => {
             const val = d[key];
             if (val && typeof val === 'string' && val.trim()) s.add(val.trim());
         });
         return Array.from(s).sort();
     };
     return {
         discipline: getUniques('discipline'),
         contractor: getUniques('contractor'),
         consultant: getUniques('consultant'),
         logType: getUniques('logType'),
         status: getUniques('status'),
         area: getUniques('area'),
         tradeSystem: getUniques('tradeSystem'),
     };
  }, [data]);

  const matchesFilters = (row: SubmittalRow) => {
      if (filters.discipline !== 'All' && row.discipline !== filters.discipline) return false;
      if (filters.contractor !== 'All' && row.contractor !== filters.contractor) return false;
      if (filters.consultant !== 'All' && row.consultant !== filters.consultant) return false;
      if (filters.logType !== 'All' && row.logType !== filters.logType) return false;
      if (filters.status !== 'All' && row.status !== filters.status) return false;
      if (filters.area !== 'All' && row.area !== filters.area) return false;
      if (filters.tradeSystem !== 'All' && row.tradeSystem !== filters.tradeSystem) return false;
      return true;
  };

  // Filter functions
  const filterMonthly = (row: SubmittalRow) => {
     if (!row.submissionDate) return false;
     if (!matchesFilters(row)) return false;
     return row.submissionDate >= startDate && row.submissionDate <= endDate;
  };

  const filterCumulative = (row: SubmittalRow) => {
     if (!row.submissionDate) return false;
     if (!matchesFilters(row)) return false;
     return row.submissionDate <= endDate;
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);

    try {
        if (activeTab === 'presentation') {
            const presentationElement = document.getElementById('presentation-container');
            if (presentationElement) {
                const slides = presentationElement.querySelectorAll('.presentation-slide');
                if (slides.length > 0) {
                    const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
                    for (let i = 0; i < slides.length; i++) {
                        const element = slides[i] as HTMLElement;
                        const slideWidth = element.scrollWidth;
                        const slideHeight = element.scrollHeight;
                        const imgData = await toPng(element, { 
                            backgroundColor: '#ffffff', 
                            pixelRatio: 2,
                            width: slideWidth,
                            height: slideHeight,
                            style: {
                                width: `${slideWidth}px`,
                                height: `${slideHeight}px`,
                            }
                        });
                        
                        const img = new Image();
                        img.src = imgData;
                        await new Promise(r => { img.onload = r; });

                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (img.height * pdfWidth) / img.width;
                        if (i > 0) pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    }
                    pdf.save(`Analytics-Presentation-${new Date().toISOString().split('T')[0]}.pdf`);
                    setIsExporting(false);
                    return;
                }
            }
        }

        const reportContent = document.getElementById('report-content');
        if (!reportContent) {
           setIsExporting(false);
           return;
        }

        document.body.classList.add('pdf-export');
        
        await new Promise(r => setTimeout(r, 100)); // Allow DOM to process class changes

        const scrollWidth = 1400; // Fixed width to ensure desktop layout
        const scrollHeight = reportContent.scrollHeight;

        const imgData = await toPng(reportContent, {
            backgroundColor: '#f8fafc',
            pixelRatio: 2,
            width: scrollWidth,
            height: scrollHeight,
            style: {
                // Ensure layout dimensions
                width: `${scrollWidth}px`,
                height: `${scrollHeight}px`,
                margin: '0',
                padding: '48px' // Enhanced padding for executive report layout
            }
        });

        document.body.classList.remove('pdf-export');

        // Load the image to get accurate dimensions after cloning and styling
        const img = new Image();
        img.src = imgData;
        await new Promise(r => { img.onload = r; });
        
        const isLandscape = ['monthly', 'cumulative', 'register'].includes(activeTab);
        const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const margin = 10;
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pdfWidth - (margin * 2);
        const maxPageContentHeight = pdfHeight - (margin * 2);
        
        const ratio = img.width / img.height; 
        const totalContentHeight = contentWidth / ratio;

        let heightLeft = totalContentHeight;
        let positionY = margin;

        pdf.addImage(imgData, 'PNG', margin, positionY, contentWidth, totalContentHeight);
        heightLeft -= maxPageContentHeight;

        while (heightLeft > 0) {
            positionY -= maxPageContentHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', margin, positionY, contentWidth, totalContentHeight);
            heightLeft -= maxPageContentHeight;
        }

        pdf.save(`Analytics-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`);
        
    } catch (error: any) {
        console.error('Error generating PDF', error);
        setParseMessage(`Error exporting PDF: ${error.message || error}`);
        setIsError(true);
    }
    
    document.body.classList.remove('pdf-export');
    setIsExporting(false);
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
     <button 
        onClick={() => setActiveTab(id)}
        title={!sidebarOpen ? label : undefined}
        className={`px-3 py-2.5 rounded-lg flex items-center transition-all ${!sidebarOpen && 'justify-center'} ${
           activeTab === id 
           ? 'bg-[#D4AF37] text-[#0A192F] font-bold shadow-md' 
           : 'text-[#cbd5e1] hover:bg-[#1e293b] hover:text-white font-medium'
        }`}
     >
        <Icon className={`w-5 h-5 shrink-0 ${activeTab === id ? 'text-[#0A192F]' : 'text-slate-400'}`} />
        {sidebarOpen && <span className="ml-3 truncate text-sm">{label}</span>}
     </button>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-[#1e293b]">
      
      {/* SIDEBAR */}
      <aside className={`bg-[#0A192F] text-white flex flex-col transition-all duration-300 ease-in-out border-r border-slate-700 print:hidden ${sidebarOpen ? 'w-64' : 'w-20'} sticky top-0 h-screen z-30`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-700">
            <div className={`flex items-center gap-3 overflow-hidden ${!sidebarOpen && 'justify-center w-full'}`}>
                <div className="bg-white p-1 rounded-md shrink-0">
                    <BarChart className="w-6 h-6 text-[#0A192F]" />
                </div>
                {sidebarOpen && <span className="font-bold tracking-wide whitespace-nowrap text-sm">DocuSight</span>}
            </div>
            {sidebarOpen && (
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
            )}
        </div>
        
        {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="mx-auto mt-4 text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
            </button>
        )}

        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3">
            <div className="px-3 mb-2">
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Executive Mode</span>
            </div>
            <TabButton id="dashboard" label="Intelligence Dashboard" icon={LayoutDashboard} />
            <TabButton id="presentation" label="Executive Presentation" icon={PresentationIcon} />
            <TabButton id="insights" label="AI Insight Engine" icon={Bot} />

            <div className="px-3 mt-6 mb-2">
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Technical Mode</span>
            </div>
            <TabButton id="monthly" label="Monthly Analytics" icon={CalendarDays} />
            <TabButton id="cumulative" label="Cumulative Analytics" icon={Database} />
            <TabButton id="delay" label="Delay Logistics" icon={Clock} />
            <TabButton id="register" label="Raw Record Logs" icon={FileSpreadsheet} />
        </div>

        <div className="p-4 border-t border-slate-700">
            <button 
                onClick={() => setShowProjectConfig(true)}
                className={`flex items-center gap-3 w-full p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors ${!sidebarOpen && 'justify-center'}`}
                title="Project Config"
            >
                <Settings className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium whitespace-nowrap">Settings</span>}
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="bg-white text-[#1e293b] shadow-sm z-20 print:hidden border-b border-[#e2e8f0]">
            <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight text-[#0A192F]">DocuSight Analytics</h1>
                <p className="text-xs text-[#64748b] font-medium tracking-widest uppercase mt-0.5">
                    {activeProject ? `${activeProject.projectName} - ${activeProject.projectCode}` : 'No Project Configured'}
                </p>
            </div>

            <div className="flex items-center gap-3 ml-auto text-sm">
                <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                />
                <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="bg-[#D4AF37] hover:bg-[#eab308] text-[#0A192F] font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                <FileUp className="w-4 h-4" />
                {isLoading ? 'Processing...' : 'Upload Excel Log'}
                </button>
                {data.length > 0 && (
                <button 
                    onClick={handleDownloadPDF}
                    disabled={isExporting}
                    className="bg-[#334155] hover:bg-[#475569] text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors ml-2 disabled:opacity-50"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    {isExporting ? 'Exporting PDF...' : 'Export PDF'}
                </button>
                )}
            </div>
            </div>
        </header>

        {/* CONTENT SCROLL AREA */}
        <div className="flex-1 overflow-auto bg-[#f8fafc]" id="report-content-wrapper">
            {/* FILTERS */}
            <div className="bg-white border-b border-[#e2e8f0] py-3 shadow-sm relative z-10 print:hidden sticky top-0">
                <div className="px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm font-medium">
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${showFilters ? 'bg-slate-800 text-white' : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'}`}
                        >
                            <Filter className="w-4 h-4" />
                            {showFilters ? 'Hide Multi-Filters' : 'Show Multi-Filters'}
                        </button>
                    </div>

                    <div className="flex items-center gap-3 bg-[#f8fafc] px-4 py-1.5 rounded-md border border-[#e2e8f0]">
                        <span className="text-[#64748b] uppercase text-xs font-bold">Reporting Period</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-[#cbd5e1] rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[#D4AF37] outline-none" />
                        <span className="text-[#94a3b8]">to</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-[#cbd5e1] rounded px-2 py-1 text-xs focus:ring-1 focus:ring-[#D4AF37] outline-none" />
                    </div>
                </div>
                
                {showFilters && (
                    <div className="px-6 pt-4 pb-2 animate-in slide-in-from-top-2 border-t border-slate-100 mt-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                            {Object.entries(uniqueOpts).map(([key, opts]) => (
                                <div key={key} className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                    <select 
                                        value={filters[key as keyof typeof filters]}
                                        onChange={e => setFilters(prev => ({...prev, [key]: e.target.value}))}
                                        className="border border-[#cbd5e1] rounded px-2 py-1.5 text-sm bg-[#f8fafc] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none"
                                    >
                                        <option value="All">All {key}</option>
                                        {(opts as string[]).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <main id="report-content" className="w-full p-6 print:m-0 print:p-0 max-w-[1600px] mx-auto">
                {showProjectConfig && (
                <ProjectConfigModal 
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSave={handleSaveProjects}
                    onClose={() => setShowProjectConfig(false)}
                />
                )}

                {parseMessage && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border print:hidden ${isError ? 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]' : 'bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8]'}`}>
                    {isError ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                    <span className="font-medium text-sm">{parseMessage}</span>
                </div>
                )}

                {data.length === 0 ? (
                <div className="h-[50vh] flex flex-col items-center justify-center text-[#94a3b8] border-2 border-dashed border-[#e2e8f0] rounded-2xl mx-10 mt-10">
                    <FileSpreadsheet className="w-20 h-20 text-slate-300 mb-4" />
                    <h2 className="text-xl font-bold text-[#475569] mb-2">No Data Available</h2>
                    <p className="text-sm">Upload a Log Excel File (.xlsx) to generate automated reports.</p>
                </div>
                ) : (
                <div className="transition-all">
                    {activeTab === 'dashboard' && <Dashboard data={data.filter(filterMonthly)} projectInfo={activeProject} />}
                    {activeTab === 'monthly' && <ReportTable data={data} filterFn={filterMonthly} title="Monthly KPI Analytics" projectInfo={activeProject} />}
                    {activeTab === 'cumulative' && <ReportTable data={data} filterFn={filterCumulative} title="Cumulative Performance Analytics" projectInfo={activeProject} />}
                    {activeTab === 'delay' && <DelayAnalysis data={data.filter(filterCumulative)} projectInfo={activeProject} />}
                    {activeTab === 'register' && <DocumentRegister data={data.filter(filterCumulative)} projectInfo={activeProject} />}
                    {activeTab === 'presentation' && <Presentation data={data} filterMonthly={filterMonthly} filterCumulative={filterCumulative} projectInfo={activeProject} />}
                    {activeTab === 'insights' && <AIInsights data={data} projectInfo={activeProject} />}
                </div>
                )}

                <style type="text/css">
                {`
                    @media print {
                    @page {
                        size: landscape;
                    }
                    }
                `}
                </style>
            </main>
        </div>
      </div>
    </div>
  );
}
