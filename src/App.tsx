import React, { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, FileUp, LayoutDashboard, CalendarDays, Clock, Database, CheckCircle2, AlertCircle, Printer, Presentation as PresentationIcon, Filter, Settings, Bot, ChevronLeft, ChevronRight, BarChart, Loader2, FileText, CheckSquare, ShieldAlert, Network, Hexagon, LogOut, Globe } from 'lucide-react';
import { SubmittalRow, ProjectSettings } from './types';
import MasterRegister from './components/MasterRegister';
import ReportTable from './ReportTable';
import DelayAnalysis from './DelayAnalysis';
import Presentation from './Presentation';
import EnterpriseDashboard from './EnterpriseDashboard';
import PortfolioCenter from './PortfolioCenter';
import SettingsCenter from './SettingsCenter';
import AIInsights from './AIInsights';
import NCRAnalytics from './NCRAnalytics';
import SORAnalytics from './SORAnalytics';
import CorrespondenceAnalytics from './CorrespondenceAnalytics';
import RFIAnalytics from './RFIAnalytics';
import DataValidationEngine from './components/DataValidationEngine';
import AdvancedAgingAnalysis from './components/AdvancedAgingAnalysis';
import SLAMonitoring from './components/SLAMonitoring';
import ActionTracker from './components/ActionTracker';
import TrendAndForecastEngine from './components/TrendAndForecastEngine';
import HistoricalDataWarehouse from './components/HistoricalDataWarehouse';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import Logo from './Logo';

import { useExport } from './hooks/useExport';
import { useUpload } from './hooks/useUpload';
import { useFilters } from './hooks/useFilters';
import { useLanguage } from './utils/i18n';

import LoginScreen from './LoginScreen';
import { syncProjectStats } from './firebase';
import EnterpriseMonitoringDashboard from './components/EnterpriseMonitoringDashboard';

export default function App() {
  const { t, language, setLanguage, isRtl } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'enterprise_dashboard' | 'portfolio' | 'master_register' | 'validation' | 'aging' | 'sla' | 'actions' | 'monthly' | 'cumulative' | 'delay' | 'rfi' | 'presentation' | 'insights' | 'ncr' | 'sor' | 'ltr' | 'trend_forecast' | 'warehouse' | 'monitoring'>('portfolio');
  const [activeRole, setActiveRole] = useState<string>('all');

  const activeRoleRef = useRef(activeRole);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeRoleRef.current = activeRole;
  }, [activeRole]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // --- AUTHORIZATION INTEGRITY PROTECTION (Issue #1: Real-Time Event-Driven Security) ---
  useEffect(() => {
    if (!isAuthenticated) return;
    
    let unsubscribe: () => void = () => {};
    let active = true;
    
    const setupRealtimeListener = async () => {
      try {
        const { auth, db } = await import('./firebase');
        const { doc, onSnapshot } = await import('firebase/firestore');
        
        let currentUserUid = '';
        let currentUserEmail = '';
        
        const currentUser = auth.currentUser;
        if (currentUser) {
          currentUserUid = currentUser.uid;
          currentUserEmail = (currentUser.email || '').trim().toLowerCase();
        } else {
          const bypassEmail = sessionStorage.getItem('bypass_email_session');
          const bypassUid = sessionStorage.getItem('bypass_uid_session');
          if (bypassEmail && bypassUid) {
            currentUserUid = bypassUid;
            currentUserEmail = bypassEmail.trim().toLowerCase();
          }
        }
        
        if (!currentUserUid) return;
        
        // --- Anti-Downgrade Absolute Shield for Owner ---
        if (currentUserEmail === 'ezzeldinrashad197@gmail.com') {
          if (activeRoleRef.current !== 'all') {
            console.info("[Security Policy] Owner account detected. Enforcing absolute master-admin rights ('all') instantly.");
            setActiveRole('all');
          }
          return; // The Owner has static absolute rights, no need for active listener mutations
        }
        
        const userDocRef = doc(db, 'users', currentUserUid);
        
        unsubscribe = onSnapshot(userDocRef, async (docSnap: any) => {
          if (!active) return;
          
          const currentRoleVal = activeRoleRef.current;
          const currentTabVal = activeTabRef.current;
          
          // --- Failure / Missing Document Fallback Guard ---
          // Rule: في حالة فشل جلب الصلاحيات يتم الاحتفاظ بآخر صلاحية صحيحة بدلاً من Viewer.
          if (!docSnap.exists()) {
            const isFromCache = docSnap.metadata.fromCache;
            if (!isFromCache) {
              console.warn("[Security Alert] Current user UID document confirmed missing on Firestore server. Retaining last valid correct permission to prevent fallback to Viewer.");
              // Do not transition to 'viewer'. Maintain currentRoleVal.
            } else {
              console.info("[Security Info] UID document is transiently missing in local cache. Retaining existing resolved role state.");
            }
            return;
          }
          
          const userData = docSnap.data();
          const retrievedRole = userData?.role || 'viewer';
          const accountStatus = userData?.accountStatus || 'active';
          const accessLevel = userData?.accessLevel || 'approved';
          
          // User disabled or access revoked
          if (accountStatus === 'disabled' || accessLevel === 'revoked') {
            console.warn("[Security Alert] Account is disabled or access level is revoked. Session destroyed instantly.");
            
            const performLocalLogout = () => {
              sessionStorage.removeItem('bypass_email_session');
              sessionStorage.removeItem('bypass_uid_session');
              localStorage.removeItem('docuCtrl_activeRole');
              localStorage.removeItem('docuCtrl_activeEmail');
              setIsAuthenticated(false);
              setActiveRole('viewer');
            };

            if (auth.currentUser) {
              auth.signOut().then(performLocalLogout).catch(performLocalLogout);
            } else {
              performLocalLogout();
            }
            return;
          }
          
          // --- Instantaneous Role Synchronization (Fast UI Switch Engine) ---
          // Avoid slow, nested resolveUserPermissions transactions in active listener sessions.
          // Directly apply the server's authoritative role to the active screen state instantly.
          if (retrievedRole !== currentRoleVal) {
            console.info(`[Security Policy] Authoritative role update detected on server (from '${currentRoleVal}' to '${retrievedRole}'). Applying instantly...`);
            setActiveRole(retrievedRole);
            
            // Persist the updated authority to local storage to maintain 0-second opening states on reload
            localStorage.setItem('docuCtrl_activeRole', retrievedRole);
            if (currentUserEmail) {
              localStorage.setItem('docuCtrl_activeEmail', currentUserEmail);
            }
            
            // Force active tab compatibility
            const rolesList = retrievedRole.split(',').map((r: string) => r.trim().toLowerCase());
            if (!rolesList.includes('all') && !rolesList.includes('executive') && !rolesList.includes('pd')) {
               if (currentTabVal === 'portfolio' || currentTabVal === 'enterprise_dashboard' || currentTabVal === 'monitoring') {
                  setActiveTab('master_register');
               }
            }
          }
        }, (error) => {
          console.error("Firestore real-time event subscription disconnected, performing recovery: ", error);
          if (active) {
            // Graceful retry and recovery reconnect interval
            setTimeout(setupRealtimeListener, 5000);
          }
        });
      } catch (err) {
        console.warn("Real-time listener initialization deferred: ", err);
      }
    };

    setupRealtimeListener();
    
    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated]);
  
  const hasPermission = (allowedRoles: string[]) => {
    const rolesList = activeRole.split(',').map(r => r.trim().toLowerCase());
    if (rolesList.includes('all')) return true;
    return allowedRoles.some(allowed => rolesList.includes(allowed.toLowerCase()));
  };
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showProjectConfig, setShowProjectConfig] = useState(false);
  
  // Project Settings State with defensive parse & corruption guards
  const [projects, setProjects] = useState<ProjectSettings[]>(() => {
    try {
      const saved = localStorage.getItem('docuCtrl_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("[Local Storage Diagnostics] Corrupted projects data in localStorage. Resetting projects state:", e);
    }
    return [];
  });
  
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('docuCtrl_activeProjectId');
      if (saved && typeof saved === 'string') {
        return saved;
      }
    } catch (e) {
      console.error("[Local Storage Diagnostics] Corrupted activeProjectId in localStorage:", e);
    }
    return '';
  });

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;

  useEffect(() => {
    try {
      const serialized = JSON.stringify(projects);
      // Prevent oversized payloads (Quota limits)
      if (serialized.length > 4 * 1024 * 1024) {
        console.warn("[Local Storage Diagnostics] Projects state size is too large (>4MB). Skipping persist to avoid browser crash.");
        return;
      }
      localStorage.setItem('docuCtrl_projects', serialized);
    } catch (e) {
      console.error("[Local Storage Diagnostics] Failed to write projects to localStorage:", e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem('docuCtrl_activeProjectId', activeProjectId);
    } catch (e) {
      console.error("[Local Storage Diagnostics] Failed to write activeProjectId to localStorage:", e);
    }
  }, [activeProjectId]);

  const handleSaveProjects = (newProjects: ProjectSettings[], newActiveId: string) => {
    setProjects(newProjects);
    setActiveProjectId(newActiveId);
  };

  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [data, setData] = useState<SubmittalRow[]>([]);
  // Custom Hooks
  const { parseMessage, isError, isLoading, fileInputRef, handleFileUpload, setParseMessage, setIsError } = useUpload(setData, setActiveTab as any, setStartDate, setEndDate);
  const { filters, pendingFilters, setPendingFilters, applyFilters, resetFilters, isDirty, uniqueOpts, matchesFilters, filterMonthly, filterCumulative } = useFilters(data, startDate, endDate);
  
  useEffect(() => {
    if (data.length > 0 && activeProjectId) {
       const generalData = data.filter(d => !isExcludedFromGeneralStats(d));
       const totalDocs = generalData.length;
       const approved = generalData.filter(d => ['A', 'B', 'APP', 'APPROVED'].includes(d.status || '')).length;
       const overdue = generalData.filter(d => (d.delayDays || 0) > 0).length;
       
       const approvalRate = totalDocs > 0 ? (approved / totalDocs) * 100 : 0;
       const overdueRate = totalDocs > 0 ? (overdue / totalDocs) * 100 : 0;
       const healthScore = Math.max(0, Math.min(100, Math.round(100 - overdueRate + (approvalRate * 0.5))));

       syncProjectStats(activeProjectId, {
           totalDocs,
           approvalRate,
           overdueRate,
           healthScore
       });
    }
  }, [data, activeProjectId]);

  const { isExporting, handleDownloadPPTX, handleDownloadPDF } = useExport({
      data,
      activeTab,
      filterMonthly,
      filterCumulative,
      activeProject,
      setParseMessage,
      setIsError,
      startDate
  });

  const isExcludedFromGeneralStats = (row: SubmittalRow) => {
    const docT = row.documentType ? row.documentType.toUpperCase() : '';
    const logT = row.logType ? row.logType.toUpperCase() : '';
    return docT.includes('RFI') || logT.includes('RFI') || docT.includes('NCR') || logT.includes('NCR') || docT.includes('SOR') || logT.includes('SOR') || docT.includes('LTR') || logT.includes('LETTERS') || logT.includes('LTR');
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: React.ElementType }) => {
    const translationKey = `tab_${id}`;
    const translatedLabel = t(translationKey) !== translationKey ? t(translationKey) : label;
    return (
      <button 
         onClick={() => setActiveTab(id)}
         title={!sidebarOpen ? translatedLabel : undefined}
         className={`px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all ${!sidebarOpen && 'justify-center'} ${
            activeTab === id 
            ? 'bg-[#D4AF37] text-[#0A192F] font-bold shadow-md' 
            : 'text-[#cbd5e1] hover:bg-[#1e293b] hover:text-white font-medium'
         }`}
      >
         <Icon className={`w-5 h-5 shrink-0 ${activeTab === id ? 'text-[#0A192F]' : 'text-slate-400'}`} />
         {sidebarOpen && <span className="truncate text-sm">{translatedLabel}</span>}
      </button>
    );
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={(role) => {
        setActiveRole(role);
        const rolesList = role.split(',').map(r => r.trim().toLowerCase());
        if (rolesList.includes('executive') || rolesList.includes('pd') || rolesList.includes('all')) {
            setActiveTab('portfolio');
        } else if (rolesList.includes('dc')) {
            setActiveTab('validation');
        } else {
            setActiveTab('master_register');
        }
        setIsAuthenticated(true);
    }} />
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-[#1e293b]" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {isExporting && (
        <div className="fixed inset-0 z-[99999] bg-slate-900 backdrop-blur-sm flex flex-col items-center justify-center text-white" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Loader2 className="w-16 h-16 animate-spin text-[#D4AF37] mb-6" />
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            {t('generating_export_report')}
          </h2>
          <p className="text-slate-300 font-medium">
            {t('wait_processing_document')}
          </p>
        </div>
      )}


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
        
        {sidebarOpen && (
          <div className="px-4 pt-4 border-b border-slate-700 pb-4">
              <div className="w-full bg-slate-800 text-slate-300 text-xs font-bold p-2 outline-none rounded text-center uppercase tracking-widest border border-slate-700">
                  Role: {
                      activeRole.split(',').map((r: string) => {
                          const trim = r.trim().toLowerCase();
                          if (trim === 'all') return 'Admin';
                          if (trim === 'executive') return 'Executive';
                          if (trim === 'pd') return 'Project Director';
                          if (trim === 'pm') return 'Project Manager';
                          if (trim === 'em') return 'Eng Manager';
                          if (trim === 'qaqc') return 'QA/QC Mgr';
                          if (trim === 'dc') return 'Doc Controller';
                          if (trim === 'viewer') return 'Viewer';
                          return trim.toUpperCase();
                      }).join(' + ') || 'Read-Only Viewer'
                  }
              </div>
          </div>
        )}

        {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="mx-auto mt-4 text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
            </button>
        )}

        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3 custom-scrollbar">
            {hasPermission(['executive', 'pd', 'pm', 'em', 'qaqc', 'dc']) && (
                <>
                    <div className="px-3 mb-2">
                        <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">{t('sidebar_analytical_engines')}</span>
                    </div>
                </>
            )}
            
            {/* Enterprise Executive Dashboard */}
            {hasPermission(['executive', 'pd']) && (
                <TabButton id="portfolio" label="Portfolio Command Center" icon={Hexagon} />
            )}
            {hasPermission(['executive', 'pd']) && (
                <TabButton id="enterprise_dashboard" label="Intelligence Engine" icon={Network} />
            )}
        
        <TabButton id="master_register" label="Master Register" icon={LayoutDashboard} />
            
            {hasPermission(['executive', 'pd', 'pm']) && (
                <TabButton id="presentation" label="Executive Monthly Report" icon={PresentationIcon} />
            )}
            
            {hasPermission(['executive', 'pd', 'pm']) && (
                <TabButton id="insights" label="AI Insight Engine" icon={Bot} />
            )}
            
            {hasPermission(['executive', 'pd', 'pm', 'em']) && (
                <TabButton id="trend_forecast" label="Trend & Forecast Engine" icon={BarChart} />
            )}
            
            {hasPermission(['executive', 'pd', 'dc']) && (
                <TabButton id="warehouse" label="Data Warehouse" icon={Database} />
            )}

            {hasPermission(['dc', 'pm', 'qaqc', 'em', 'pd']) && (
                <div className="px-3 mt-6 mb-2">
                    <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">{t('sidebar_technical_modules')}</span>
                </div>
            )}
            
            {hasPermission(['pd', 'executive', 'dc']) && (
                <TabButton id="monitoring" label="Security Telemetry Console" icon={ShieldAlert} />
            )}
            
            {hasPermission(['dc', 'qaqc', 'em']) && (
                <TabButton id="validation" label="Data Validation Engine" icon={CheckSquare} />
            )}
            
            {hasPermission(['dc', 'pm', 'pd', 'em']) && (
                <TabButton id="sla" label="SLA Monitoring" icon={ShieldAlert} />
            )}
            
            {hasPermission(['pm', 'qaqc', 'dc', 'em']) && (
                <TabButton id="actions" label="Action Tracker" icon={FileSpreadsheet} />
            )}
            
            {hasPermission(['dc', 'em', 'pd']) && (
                <TabButton id="aging" label="Advanced Aging Analysis" icon={Clock} />
            )}

            <div className="px-3 mt-6 mb-2">
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">{t('sidebar_technical_modules')}</span>
            </div>
            
            {hasPermission(['dc', 'pm', 'em', 'pd', 'viewer']) && (
               <>
                <TabButton id="monthly" label="Monthly Analytics" icon={CalendarDays} />
                <TabButton id="cumulative" label="Cumulative Analytics" icon={Database} />
               </>
            )}
            
            {hasPermission(['pm', 'dc', 'em', 'viewer']) && (
               <TabButton id="rfi" label="RFI Analytics" icon={FileText} />
            )}
            
            {hasPermission(['qaqc', 'dc', 'em', 'pm', 'viewer']) && (
                 <>
                 <TabButton id="ncr" label="NCR Analytics" icon={AlertCircle} />
                 <TabButton id="sor" label="SOR Analytics" icon={AlertCircle} />
                 </>
            )}
            
            {hasPermission(['dc', 'pm', 'viewer']) && (
                <TabButton id="ltr" label="Correspondence Tracker" icon={FileText} />
            )}
        </div>

        <div className="p-4 border-t border-slate-700 flex flex-col gap-2" dir={isRtl ? 'rtl' : 'ltr'}>
            <button 
                onClick={() => setShowProjectConfig(true)}
                className={`flex items-center gap-3 w-full p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors ${!sidebarOpen && 'justify-center'}`}
                title={t('sidebar_settings')}
            >
                <Settings className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium whitespace-nowrap">{t('sidebar_settings')}</span>}
            </button>
            <button 
                onClick={async () => {
                    const { auth } = await import('./firebase');
                    const performManualLogout = () => {
                        sessionStorage.removeItem('bypass_email_session');
                        sessionStorage.removeItem('bypass_uid_session');
                        localStorage.removeItem('docuCtrl_activeRole');
                        localStorage.removeItem('docuCtrl_activeEmail');
                        setIsAuthenticated(false);
                        setActiveRole('viewer');
                    };
                    auth.signOut().then(performManualLogout).catch(performManualLogout);
                }}
                className={`flex items-center gap-3 w-full p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors ${!sidebarOpen && 'justify-center'}`}
                title={t('sidebar_sign_out')}
            >
                <LogOut className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium whitespace-nowrap">{t('sidebar_sign_out')}</span>}
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="bg-white text-[#1e293b] shadow-sm z-20 print:hidden border-b border-[#e2e8f0]">
            <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="flex items-center gap-4">
                {activeProject?.logoUrl && (
                    <img src={activeProject.logoUrl} alt="Company Logo" className="h-12 w-auto object-contain border border-[#e2e8f0] rounded p-1 bg-[#ffffff]" />
                )}
                <div className="flex flex-col">
                    <Logo className="h-10" />
                    <p className="text-xs text-[#64748b] font-medium tracking-widest uppercase mt-0.5">
                        {activeProject ? `${activeProject.projectName} - ${activeProject.projectCode}` : 'No Project Configured'}
                    </p>
                </div>
            </div>

            <div className={`flex items-center gap-3 ${isRtl ? 'mr-auto' : 'ml-auto'} text-sm`}>
                <button
                  type="button"
                  onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-lg border border-slate-300 transition-colors"
                >
                  <Globe className="w-4 h-4 text-slate-600" />
                  {language === 'en' ? 'العربية' : 'English'}
                </button>
                <input 
                type="file" 
                multiple
                accept=".xlsx, .xls, .csv, .zip" 
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
                {isLoading ? t('btn_processing') : t('btn_upload_excel')}
                </button>
                {data.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button 
                        onClick={handleDownloadPPTX}
                        disabled={isExporting}
                        className="bg-[#D4AF37] hover:bg-[#eab308] text-[#0A192F] font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PresentationIcon className="w-4 h-4" />}
                        {isExporting ? t('btn_exporting') : t('btn_export_pptx')}
                    </button>
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={isExporting}
                        className="bg-[#334155] hover:bg-[#475569] text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        {isExporting ? t('btn_exporting_pdf') : t('btn_export_pdf')}
                    </button>
                  </div>
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
                    <div className="px-6 pt-4 pb-4 animate-in slide-in-from-top-2 border-t border-slate-100 mt-3 bg-slate-50/50 rounded-b-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
                            {Object.entries(uniqueOpts).map(([key, opts]) => (
                                <div key={key} className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                    <select 
                                        value={pendingFilters[key as keyof typeof pendingFilters]}
                                        onChange={e => setPendingFilters(prev => ({...prev, [key]: e.target.value}))}
                                        className="border border-[#cbd5e1] rounded px-2 py-1.5 text-sm bg-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none"
                                    >
                                        <option value="All">All {key}</option>
                                        {(opts as string[]).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                            {isDirty && (
                                <span className="text-xs text-amber-600 font-medium animate-pulse flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                                    ● Pending Unsaved Filter State
                                </span>
                            )}
                            <button
                                onClick={resetFilters}
                                className="px-4 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
                            >
                                  Reset Filters
                            </button>
                            <button
                                onClick={applyFilters}
                                className={`px-5 py-1.5 rounded-md text-xs font-bold transition-all ${isDirty ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div id="export-container" className="relative w-full print:m-0 print:p-0 max-w-[1600px] mx-auto min-h-screen bg-[#f8fafc]">
                
                {/* PDF Only Header */}
                <div className="pdf-only-header hidden w-full p-6 pt-10 pb-4 border-b border-[#e2e8f0] bg-white flex-col gap-4">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-6">
                            {activeProject?.logoUrl && (
                                <img src={activeProject.logoUrl} alt="Company Logo" className="h-16 w-auto object-contain" />
                            )}
                            <Logo className="h-12" />
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold tracking-tight text-[#0A192F]">DocuSight Analytics Form</h2>
                            <p className="text-xs text-[#64748b] font-medium tracking-widest uppercase mt-0.5">
                                {activeProject ? `${activeProject.projectName} - ${activeProject.projectCode}` : 'No Project Configured'}
                            </p>
                        </div>
                    </div>
                    {/* Active Filters Display */}
                    <div className="w-full bg-slate-50 border border-slate-250 rounded-lg p-3 text-[10px] flex flex-wrap gap-x-5 gap-y-1 text-slate-755">
                        <div className="font-bold text-slate-700 mr-2 border-r border-slate-300 pr-3 uppercase tracking-wider">Report Filters:</div>
                        <div><span className="font-semibold text-slate-500">Doc Type:</span> <span className="font-bold text-slate-800">{filters.documentType}</span></div>
                        <div><span className="font-semibold text-slate-500">Discipline:</span> <span className="font-bold text-slate-800">{filters.discipline}</span></div>
                        <div><span className="font-semibold text-slate-500">Contractor:</span> <span className="font-bold text-slate-800">{filters.contractor}</span></div>
                        <div><span className="font-semibold text-slate-500">Consultant:</span> <span className="font-bold text-slate-800">{filters.consultant}</span></div>
                        <div><span className="font-semibold text-slate-500">Log Type:</span> <span className="font-bold text-slate-800">{filters.logType}</span></div>
                        <div><span className="font-semibold text-slate-500">Status:</span> <span className="font-bold text-slate-800">{filters.status}</span></div>
                        <div><span className="font-semibold text-slate-500">Area:</span> <span className="font-bold text-slate-800">{filters.area}</span></div>
                        <div><span className="font-semibold text-slate-500">Trade System:</span> <span className="font-bold text-slate-800">{filters.tradeSystem}</span></div>
                    </div>
                </div>

                <main id="report-content" className="w-full p-6 print:m-0 print:p-0">
                    {showProjectConfig && (
                <SettingsCenter 
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSaveProjects={handleSaveProjects}
                    onClose={() => setShowProjectConfig(false)}
                    activeRole={activeRole}
                />
                )}

                {parseMessage && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border print:hidden ${isError ? 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]' : 'bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8]'}`}>
                    {isError ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                    <span className="font-medium text-sm">{parseMessage}</span>
                </div>
                )}

                {data.length === 0 && activeTab !== 'portfolio' && activeTab !== 'monitoring' ? (
                <div className="h-[50vh] flex flex-col items-center justify-center text-[#94a3b8] border-2 border-dashed border-[#e2e8f0] rounded-2xl mx-10 mt-10">
                    <FileSpreadsheet className="w-20 h-20 text-slate-300 mb-4" />
                    <h2 className="text-xl font-bold text-[#475569] mb-2">No Data Available</h2>
                    <p className="text-sm">Upload a Log Excel File (.xlsx) to generate automated reports.</p>
                </div>
                ) : (
                <div className="transition-all">
                  {activeTab === 'portfolio' && <PortfolioCenter projects={projects} />}
                  {activeTab === 'monitoring' && <EnterpriseMonitoringDashboard />}
                  {activeTab === 'enterprise_dashboard' && data.length > 0 && <EnterpriseDashboard data={data.filter(matchesFilters)} />}
                  {activeTab === 'master_register' && data.length > 0 && <MasterRegister data={data.filter(matchesFilters)} projectInfo={activeProject} />}
                  {activeTab === 'validation' && (
                    <DataValidationEngine 
                      data={data.filter(matchesFilters)} 
                      onUpdateData={setData} 
                      onExportPDF={handleDownloadPDF} 
                    />
                  )}
                  {activeTab === 'aging' && <AdvancedAgingAnalysis data={data.filter(filterCumulative)} projectInfo={activeProject} />}
                  {activeTab === 'sla' && <SLAMonitoring data={data} projectInfo={activeProject} />}
                  {activeTab === 'actions' && <ActionTracker data={data} projectInfo={activeProject} />}
                  {activeTab === 'trend_forecast' && <TrendAndForecastEngine data={data} projectInfo={activeProject} />}
                  {activeTab === 'warehouse' && <HistoricalDataWarehouse data={data.filter(matchesFilters)} projects={projects} />}
                  {activeTab === 'monthly' && <ReportTable data={data.filter(d => !isExcludedFromGeneralStats(d))} filterFn={filterMonthly} title="Monthly KPI Analytics" projectInfo={activeProject} />}
                  {activeTab === 'cumulative' && <ReportTable data={data.filter(d => !isExcludedFromGeneralStats(d))} filterFn={filterCumulative} title="Cumulative Performance Analytics" projectInfo={activeProject} />}
                  {activeTab === 'delay' && <DelayAnalysis data={data.filter(filterCumulative)} projectInfo={activeProject} />}
                  {activeTab === 'rfi' && <RFIAnalytics data={data.filter(matchesFilters)} projectInfo={activeProject} monthlyStart={startDate} monthlyEnd={endDate} />}
                  {activeTab === 'presentation' && <Presentation data={data.filter(matchesFilters)} filterMonthly={filterMonthly} filterCumulative={filterCumulative} projectInfo={activeProject} startDate={startDate} />}
                  {activeTab === 'insights' && <AIInsights data={data.filter(matchesFilters)} projectInfo={activeProject} />}
                  {activeTab === 'ncr' && <NCRAnalytics data={data.filter(matchesFilters)} projectInfo={activeProject} monthlyStart={startDate} monthlyEnd={endDate} />}
                  {activeTab === 'sor' && <SORAnalytics data={data.filter(matchesFilters)} projectInfo={activeProject} monthlyStart={startDate} monthlyEnd={endDate} />}
                  {activeTab === 'ltr' && <CorrespondenceAnalytics data={data.filter(matchesFilters)} projectInfo={activeProject} monthlyStart={startDate} monthlyEnd={endDate} />}
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

                {/* PDF Only Footer */}
                <div className="pdf-only-footer hidden w-full p-6 pb-8 border-t border-[#e2e8f0] bg-white items-end justify-between">
                    <div></div>
                    <div className="flex flex-col items-end text-right">
                        <p className="text-xs font-bold text-[#334155] tracking-widest uppercase mb-1">CONCEPT & PRODUCT VISION BY EZZ RASHAD</p>
                        <p className="text-[10px] text-[#64748b] uppercase tracking-wider">Enterprise Document Control Intelligence Platform</p>
                    </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}

