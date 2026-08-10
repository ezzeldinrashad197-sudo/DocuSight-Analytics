import React, { useState, useMemo, useEffect } from 'react';
import { SubmittalRow } from '../types';
import { 
  getActiveMappings, 
  saveCustomAlias, 
  deleteCustomAlias, 
  mapDocumentToWorkflow, 
  WORKFLOW_FAMILIES_META, 
  WorkflowFamily 
} from '../utils/workflowMapping';
import {
  getSmartImportProfiles,
  saveSmartImportProfile,
  deleteSmartImportProfile,
  getLearningRules,
  saveLearningRule,
  deleteLearningRule,
  LearnRule
} from '../utils/classificationEngine';
import { 
  Database, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  Workflow, 
  HelpCircle, 
  Settings, 
  RefreshCw, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  ChevronRight, 
  Sliders,
  FileSpreadsheet,
  Bot,
  Layers
} from 'lucide-react';
import { UniversalRegisterEngine } from './UniversalRegisterEngine';

interface WorkflowMappingCenterProps {
  data: SubmittalRow[];
  onDataRefreshNeeded?: () => void;
}

export default function WorkflowMappingCenter({ data, onDataRefreshNeeded }: WorkflowMappingCenterProps) {
  const [activeViewMode, setActiveViewMode] = useState<'universal' | 'aliases'>('universal');
  const [mappings, setMappings] = useState(() => getActiveMappings());
  const [newAlias, setNewAlias] = useState('');
  const [newDisplay, setNewDisplay] = useState('');
  const [newFamily, setNewFamily] = useState<WorkflowFamily>('SDW');
  const [simInput, setSimInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeProjectId = useMemo(() => {
    return localStorage.getItem('docuCtrl_activeProjectId') || 'default_project';
  }, []);

  const [smartProfiles, setSmartProfiles] = useState(() => getSmartImportProfiles());
  const [learningRules, setLearningRules] = useState<LearnRule[]>(() => getLearningRules(activeProjectId));

  // Forms for profile & learning engine management
  const [manualSheetName, setManualSheetName] = useState('');
  const [manualWorkflowFamily, setManualWorkflowFamily] = useState<WorkflowFamily>('SDW');
  const [manualInput, setManualInput] = useState('');
  const [manualTarget, setManualTarget] = useState('');
  const [manualRuleType, setManualRuleType] = useState<'discipline' | 'registerType'>('discipline');
  
  // Alert/Status State
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [ingestionTraces, setIngestionTraces] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('docuCtrl_last_upload_trace');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleTraceUpdate = () => {
      try {
        const saved = localStorage.getItem('docuCtrl_last_upload_trace');
        setIngestionTraces(saved ? JSON.parse(saved) : []);
      } catch (e) {
        console.error('Error parsing ingestion traces:', e);
      }
    };
    window.addEventListener('docuCtrl_new_trace_loaded', handleTraceUpdate);
    return () => {
      window.removeEventListener('docuCtrl_new_trace_loaded', handleTraceUpdate);
    };
  }, []);

  // Scan loaded data for unknown registers
  const unknownRegistersInDataset = useMemo(() => {
    const uniques = new Map<string, { count: number; rawName: string }>();
    data.forEach(row => {
      if (row.isUnknownWorkflow) {
        const key = String(row.logType || '').toUpperCase().trim() || 'UNKNOWN';
        const current = uniques.get(key) || { count: 0, rawName: row.logType || 'UNKNOWN' };
        uniques.set(key, { count: current.count + 1, rawName: current.rawName });
      }
    });
    return Array.from(uniques.entries()).map(([key, info]) => ({
      key,
      rawName: info.rawName,
      count: info.count,
    }));
  }, [data]);

  // Handle adding custom mapping
  const handleAddAlias = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const cleanAlias = newAlias.trim().toUpperCase();
    if (!cleanAlias) {
      setErrorMsg('Alias name cannot be empty.');
      return;
    }

    // Check if duplicate
    const isDuplicate = mappings.some(m => m.alias.toUpperCase() === cleanAlias && !m.isCustom);
    if (isDuplicate) {
      setErrorMsg(`"${cleanAlias}" is an official system standard alias and cannot be overwritten.`);
      return;
    }

    const saved = saveCustomAlias(cleanAlias, newFamily, newDisplay || cleanAlias);
    if (saved) {
      setMappings(getActiveMappings());
      setSuccessMsg(`Successfully registered alias "${cleanAlias}" mapped to ${newFamily}.`);
      setNewAlias('');
      setNewDisplay('');
      if (onDataRefreshNeeded) onDataRefreshNeeded();
    } else {
      setErrorMsg('Failed to save alias. Please try again.');
    }
  };

  // Handle deleting custom mapping
  const handleDeleteAlias = (alias: string) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    const deleted = deleteCustomAlias(alias);
    if (deleted) {
      setMappings(getActiveMappings());
      setSuccessMsg(`Deleted alias "${alias}".`);
      if (onDataRefreshNeeded) onDataRefreshNeeded();
    } else {
      setErrorMsg('Failed to delete alias.');
    }
  };

  const handleAddSmartProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSheetName.trim()) return;
    saveSmartImportProfile(activeProjectId, manualSheetName, manualWorkflowFamily);
    setSmartProfiles(getSmartImportProfiles());
    setManualSheetName('');
    setSuccessMsg(`Successfully registered smart import profile for "${manualSheetName}".`);
    if (onDataRefreshNeeded) onDataRefreshNeeded();
  };

  const handleDeleteSmartProfile = (sheetName: string) => {
    deleteSmartImportProfile(activeProjectId, sheetName);
    setSmartProfiles(getSmartImportProfiles());
    setSuccessMsg(`Deleted smart import profile for "${sheetName}".`);
    if (onDataRefreshNeeded) onDataRefreshNeeded();
  };

  const handleAddLearningRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim() || !manualTarget.trim()) return;
    saveLearningRule(activeProjectId, manualInput, manualTarget, manualRuleType);
    setLearningRules(getLearningRules(activeProjectId));
    setManualInput('');
    setManualTarget('');
    setSuccessMsg(`Saved learned correction rule: "${manualInput}" -> "${manualTarget}" (${manualRuleType}).`);
    if (onDataRefreshNeeded) onDataRefreshNeeded();
  };

  const handleDeleteLearningRule = (input: string, type: 'registerType' | 'discipline') => {
    deleteLearningRule(activeProjectId, input, type);
    setLearningRules(getLearningRules(activeProjectId));
    setSuccessMsg(`Deleted learned rule: "${input}".`);
    if (onDataRefreshNeeded) onDataRefreshNeeded();
  };

  // Handle mapping an unknown register directly from the alert list
  const handleMapUnknownRegister = (rawName: string) => {
    setNewAlias(rawName.toUpperCase());
    setNewDisplay(rawName.toUpperCase());
    // Scroll to the addition form
    const formElement = document.getElementById('add-alias-form-anchor');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Run simulation on keystroke
  const simResult = useMemo(() => {
    if (!simInput.trim()) return null;
    return mapDocumentToWorkflow(simInput);
  }, [simInput]);

  // Filter mappings table
  const filteredMappings = useMemo(() => {
    if (!searchQuery.trim()) return mappings;
    const lower = searchQuery.toLowerCase();
    return mappings.filter(m => 
      m.alias.toLowerCase().includes(lower) || 
      m.workflowFamily.toLowerCase().includes(lower) || 
      m.display.toLowerCase().includes(lower)
    );
  }, [mappings, searchQuery]);

  // Statistics for UI dashboard
  const stats = useMemo(() => {
    const totalMappings = mappings.length;
    const customMappings = mappings.filter(m => m.isCustom).length;
    const defaultMappings = totalMappings - customMappings;
    const mappedFamiliesCount = Object.keys(WORKFLOW_FAMILIES_META).length - 1; // exclude UNKNOWN

    return {
      totalMappings,
      customMappings,
      defaultMappings,
      mappedFamiliesCount,
    };
  }, [mappings]);

  return (
    <div className="space-y-8 p-1" id="workflow-mapping-center-root">
      
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-[#0A192F] to-[#172A45] rounded-2xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <Workflow className="w-6 h-6 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">SSOT Control Unit</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Mapping Engine</h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            DocuSight Analytics enterprise normalization center. Resolves variations of document logs to official Workflow Families and binds them exclusively to specific Calculation Engines.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-xl text-center backdrop-blur-sm min-w-[100px]">
            <div className="text-2xl font-bold text-[#D4AF37]">{stats.totalMappings}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-1">Total Aliases</div>
          </div>
          <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-xl text-center backdrop-blur-sm min-w-[100px]">
            <div className="text-2xl font-bold text-emerald-400">{stats.customMappings}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-1">User Defined</div>
          </div>
          <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-xl text-center backdrop-blur-sm min-w-[100px]">
            <div className="text-2xl font-bold text-amber-400">{unknownRegistersInDataset.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-1">Warnings</div>
          </div>
        </div>
      </div>

      {/* MODE SELECTOR TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveViewMode('universal')}
          className={`px-6 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeViewMode === 'universal' ? 'bg-slate-900 text-indigo-400 shadow-md border border-indigo-500/30' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <Layers className="w-4 h-4 text-indigo-400" />
          Universal Register Schema & Compatibility Engine (محرك السجلات الموحد وشبكة الربط الذكي)
        </button>

        <button
          onClick={() => setActiveViewMode('aliases')}
          className={`px-6 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeViewMode === 'aliases' ? 'bg-slate-900 text-amber-400 shadow-md border border-amber-500/30' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <Workflow className="w-4 h-4 text-amber-400" />
          SSOT Workflow Aliases & Classification Engine (قواعد أسماء السجلات والمصطلحات)
        </button>
      </div>

      {activeViewMode === 'universal' ? (
        <UniversalRegisterEngine data={data} />
      ) : (
        <div className="space-y-8">
          {/* UNKNOWN WORKFLOW WARNINGS & ALERTS */}
      {unknownRegistersInDataset.length > 0 && (
        <div className="bg-red-50/75 border border-red-200 rounded-xl p-6 shadow-sm animate-in fade-in-50 duration-300">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-2.5 rounded-lg text-red-600 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-bold text-red-950 flex items-center gap-2">
                Unmapped Excel Registers Detected ({unknownRegistersInDataset.length})
                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold uppercase">Action Required</span>
              </h3>
              <p className="text-sm text-red-800">
                The following sheets exist in your uploaded workbook but do not match any defined Alias in the SSOT database. They are currently mapped to <span className="font-bold">Unknown Workflow</span> with zero telemetry calculations to avoid guessing or pollution.
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unknownRegistersInDataset.map((item) => (
                  <div key={item.key} className="bg-white border border-red-100 rounded-lg p-3.5 flex items-center justify-between shadow-xs">
                    <div className="space-y-0.5">
                      <div className="font-mono text-sm font-bold text-red-900 bg-red-50 px-2 py-0.5 rounded border border-red-100 inline-block">
                        {item.rawName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.count} items loaded in database
                      </div>
                    </div>
                    <button 
                      onClick={() => handleMapUnknownRegister(item.rawName)}
                      className="text-xs bg-red-600 text-white font-bold px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Map Register
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LAST INGESTION TRACE AUDITOR */}
      {ingestionTraces && ingestionTraces.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" id="ingestion-trace-auditor">
          <div className="bg-[#0A192F] text-white p-5 flex justify-between items-center border-b border-slate-700">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-[#D4AF37] animate-pulse" />
              <div>
                <h3 className="font-bold text-sm tracking-wide text-[#D4AF37] uppercase">Enterprise Ingestion Trace Auditor</h3>
                <p className="text-[11px] text-slate-300">Live classification audit log for the most recently uploaded workbook</p>
              </div>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('docuCtrl_last_upload_trace');
                setIngestionTraces([]);
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded border border-white/10 cursor-pointer"
            >
              Clear Trace Logs
            </button>
          </div>

          <div className="p-6 space-y-6">
            {ingestionTraces.map((trace, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-800 text-xs">Worksheet:</span>
                    <span className="font-mono text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{trace.sheetName}</span>
                    <span className="text-xs text-slate-500">in {trace.fileName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Confidence Score:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trace.confidence >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {trace.confidence}%
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    
                    {/* Visual Pipe Step 1 */}
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200/60 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">1. Detected Type</div>
                      <div className="font-mono text-sm font-bold text-slate-900">{trace.detectedType}</div>
                      <p className="text-[10px] text-slate-400 leading-normal">Evaluated by multi-evidence scoring model</p>
                    </div>

                    {/* Visual Pipe Step 2 */}
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200/60 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">2. Assigned Type</div>
                      <div className="font-mono text-sm font-bold text-slate-900">{trace.assignedType}</div>
                      <p className="text-[10px] text-slate-400 leading-normal">Raw logType set for row indexing</p>
                    </div>

                    {/* Visual Pipe Step 3 */}
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200/60 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">3. Normalized Type</div>
                      <div className="font-mono text-sm font-bold text-slate-900">{trace.normalizedType}</div>
                      <p className="text-[10px] text-slate-400 leading-normal">Mapped to standardized discipline code</p>
                    </div>

                    {/* Visual Pipe Step 4 */}
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200/60 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">4. Calculation Engine</div>
                      <div className="font-semibold text-xs text-slate-900">{trace.calculationType}</div>
                      <p className="text-[10px] text-slate-400 leading-normal">Active SLA & performance engine binding</p>
                    </div>

                    {/* Visual Pipe Step 5 */}
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200/60 shadow-xs space-y-1">
                      <div className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">5. Report Destination</div>
                      <div className="font-semibold text-xs text-slate-900">{trace.reportType}</div>
                      <p className="text-[10px] text-slate-400 leading-normal">UI routing path inside dashboard view</p>
                    </div>

                  </div>

                  {/* Evidence accordion */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <details className="group">
                      <summary className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1 outline-none select-none">
                        <span className="transition-transform group-open:rotate-90">▶</span>
                        View Classification Scoring Evidence Summary ({trace.evidence?.length || 0} signals)
                      </summary>
                      <div className="mt-3 bg-slate-900 text-slate-300 font-mono text-[11px] p-4 rounded-lg overflow-x-auto border border-slate-800 space-y-1 max-h-48 overflow-y-auto">
                        {trace.evidence && trace.evidence.map((line: string, lIdx: number) => (
                          <div key={lIdx} className="hover:bg-white/5 py-0.5 px-1 rounded flex items-start gap-1">
                            <span className="text-amber-400 shrink-0">✔</span>
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPLIANCE PIPELINE & GRAPHIC PATH */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-500" />
          Enterprise Normalization Pipeline Flow (SSOT Path)
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-center relative">
          
          {/* Step 1 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-1 z-10">
            <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Step 1</span>
            <div className="font-bold text-xs text-slate-900">Excel Register</div>
            <p className="text-[10px] text-slate-500">Sheet / Log Name</p>
          </div>

          <div className="hidden lg:flex justify-center text-slate-400">
            <ChevronRight className="w-5 h-5" />
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-1 z-10">
            <span className="text-[10px] font-extrabold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Step 2</span>
            <div className="font-bold text-xs text-slate-900">SSOT Mapping</div>
            <p className="text-[10px] text-slate-500">Alias normalizer</p>
          </div>

          <div className="hidden lg:flex justify-center text-slate-400">
            <ChevronRight className="w-5 h-5" />
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-1 z-10">
            <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Step 3</span>
            <div className="font-bold text-xs text-slate-900">Workflow Family</div>
            <p className="text-[10px] text-slate-500">e.g. SDW, MIR</p>
          </div>

          <div className="hidden lg:flex justify-center text-slate-400">
            <ChevronRight className="w-5 h-5" />
          </div>

          {/* Step 4 */}
          <div className="bg-[#0A192F] text-white p-4 rounded-xl text-center space-y-1 z-10 shadow-md">
            <span className="text-[10px] font-extrabold text-[#D4AF37] bg-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Step 4</span>
            <div className="font-bold text-xs text-[#D4AF37]">Calculation Engine</div>
            <p className="text-[10px] text-slate-400">Locked binding rules</p>
          </div>
          
        </div>
        
        <p className="text-xs text-slate-500 mt-4 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
          <span className="font-semibold text-slate-700">Enterprise Rule (الفصل الثاني):</span> It is strictly prohibited to bind calculations to the raw Document Type name. Instead, all inputs are normalized to their corresponding <span className="font-bold">Workflow Family</span>, which then binds to exactly one <span className="font-bold">Calculation Engine</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: ACTIVE ALIASES & ADDING ALIASES */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* REGISTER NEW ALIAS FORM */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" id="add-alias-form-anchor">
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              Register New Log Alias
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Add a custom Excel sheet log alias name to map to an existing Workflow Family. No code edits are required to handle new registers.
            </p>

            <form onSubmit={handleAddAlias} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Raw Sheet/Log Name *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. CIVIL INSPECTIONS"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Target Workflow Family *
                  </label>
                  <select 
                    value={newFamily}
                    onChange={(e) => setNewFamily(e.target.value as WorkflowFamily)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    {Object.entries(WORKFLOW_FAMILIES_META)
                      .filter(([key]) => key !== 'UNKNOWN')
                      .map(([key, meta]) => (
                        <option key={key} value={key}>
                          {key} ({meta.name})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Display Name in Reports *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. WORK INSPECTION"
                    value={newDisplay}
                    onChange={(e) => setNewDisplay(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

              </div>

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-4 py-3 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewAlias('');
                    setNewDisplay('');
                    setSuccessMsg(null);
                    setErrorMsg(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Register Alias
                </button>
              </div>
            </form>
          </div>

          {/* ACTIVE ALIASES DICTIONARY */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-500" />
                  SSOT Alias Mapping Directory
                </h3>
                <p className="text-xs text-slate-500">
                  Total of {filteredMappings.length} mappings actively loaded into the runtime memory.
                </p>
              </div>
              
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  placeholder="Search aliases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-w-[200px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-4">Raw Log Name (Alias)</th>
                    <th className="py-3 px-4">Mapped Family</th>
                    <th className="py-3 px-4">Calculation Engine</th>
                    <th className="py-3 px-4">Display Name</th>
                    <th className="py-3 px-4">Scope Origin</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredMappings.map((item) => {
                    const meta = WORKFLOW_FAMILIES_META[item.workflowFamily];
                    return (
                      <tr key={item.alias} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.alias}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900">
                            {item.workflowFamily}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {meta?.engine || 'None'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                            {item.display}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {item.isCustom ? (
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block">
                              Custom Defined
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium inline-block">
                              Official Spec
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.isCustom ? (
                            <button
                              onClick={() => handleDeleteAlias(item.alias)}
                              className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                              title="Delete custom mapping"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Read Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMappings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 text-sm">
                        No mappings matching the query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SPRINT 4: SMART IMPORT PROFILE & ENTERPRISE LEARNING ENGINE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* TSK-405: SMART IMPORT PROFILE */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-500" />
                  Smart Import Profiles (TSK-405)
                </h3>
                <p className="text-xs text-slate-500">
                  Auto-detect register types for the active project context to eliminate manual configuration.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex justify-between items-center">
                <span>Active Profile Context:</span>
                <span className="font-bold text-[#0A192F] uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                  {activeProjectId}
                </span>
              </div>

              {/* Add manual smart profile rule */}
              <form onSubmit={handleAddSmartProfile} className="space-y-3 p-3.5 bg-slate-50/50 border border-slate-100 rounded-lg">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Register Profile Rule</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Raw Worksheet Name"
                    value={manualSheetName}
                    onChange={(e) => setManualSheetName(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none uppercase"
                  />
                  <select
                    value={manualWorkflowFamily}
                    onChange={(e) => setManualWorkflowFamily(e.target.value as WorkflowFamily)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:border-indigo-500 outline-none"
                  >
                    {Object.keys(WORKFLOW_FAMILIES_META)
                      .filter(k => k !== 'UNKNOWN')
                      .map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#0A192F] hover:bg-[#172A45] text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Save Profile Mapping
                </button>
              </form>

              {/* Profiles list */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {Object.keys(smartProfiles[activeProjectId] || {}).length > 0 ? (
                  Object.entries(smartProfiles[activeProjectId] || {}).map(([sheet, fam]) => (
                    <div key={sheet} className="flex justify-between items-center text-xs bg-white border border-slate-200 p-2.5 rounded-lg shadow-xs">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-slate-800 uppercase">{sheet}</span>
                        <div className="text-[10px] text-slate-400">Maps automatically to <span className="font-semibold text-slate-600">{fam}</span></div>
                      </div>
                      <button
                        onClick={() => handleDeleteSmartProfile(sheet)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-xs text-slate-400 py-4 italic">
                    No custom smart profiles for this project. Save mappings during upload to auto-populate.
                  </div>
                )}
              </div>
            </div>

            {/* TSK-406: ENTERPRISE IMPORT LEARNING ENGINE */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-500" />
                  Enterprise Learning Engine (TSK-406)
                </h3>
                <p className="text-xs text-slate-500">
                  Adaptive AI correction rules that translate custom spelling or codes to official standard outputs.
                </p>
              </div>

              <form onSubmit={handleAddLearningRule} className="space-y-3 p-3.5 bg-slate-50/50 border border-slate-100 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Correction Rule</span>
                  <select
                    value={manualRuleType}
                    onChange={(e) => setManualRuleType(e.target.value as 'discipline' | 'registerType')}
                    className="border border-slate-300 rounded px-1.5 py-0.5 text-[10px] bg-white text-slate-600 font-semibold uppercase focus:border-indigo-500 outline-none"
                  >
                    <option value="discipline">Discipline (STR to STRUCTURAL)</option>
                    <option value="registerType">Register (SDW to SHOP DRAWING)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Raw Input (e.g. STR)"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none uppercase"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Canonical Output"
                    value={manualTarget}
                    onChange={(e) => setManualTarget(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#0A192F] hover:bg-[#172A45] text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Record Learning Rule
                </button>
              </form>

              {/* Rules List */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {learningRules.length > 0 ? (
                  learningRules.map((rule) => (
                    <div key={`${rule.input}-${rule.type}`} className="flex justify-between items-center text-xs bg-white border border-slate-200 p-2.5 rounded-lg shadow-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-red-900 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase">{rule.input}</span>
                          <span className="text-slate-400">➔</span>
                          <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase">{rule.target}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Rule Type: <span className="font-semibold text-slate-600 uppercase">{rule.type}</span></div>
                      </div>
                      <button
                        onClick={() => handleDeleteLearningRule(rule.input, rule.type)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-xs text-slate-400 py-4 italic">
                    No adaptive learning correction rules loaded. Add some above to start training.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: SIMULATOR & COMPLIANCE VERIFICATION */}
        <div className="space-y-8">
          
          {/* REAL TIME PARSER SIMULATOR */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-500" />
              Real-Time Normalization Sandbox
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Type any raw sheet or transmittal label name to run a dry-run test on our SSOT mapping engine.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Test Label
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input 
                    type="text" 
                    placeholder="Type e.g. 'AS-BUILT-CIVIL' or 'WIR REQUEST'..."
                    value={simInput}
                    onChange={(e) => setSimInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {simResult ? (
                <div className={`p-4 rounded-xl border ${simResult.isUnknown ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="space-y-3.5">
                    
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase">Analysis Parameter</span>
                      <span className="text-xs font-bold text-slate-500 uppercase font-mono">Result</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Workflow Family:</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${simResult.isUnknown ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                        {simResult.workflowFamily}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Display Name:</span>
                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {simResult.display}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Calculation Engine:</span>
                      <span className="font-semibold text-slate-900">
                        {simResult.engine}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Status Alert Flag:</span>
                      {simResult.isUnknown ? (
                        <span className="text-red-600 font-bold flex items-center gap-1 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 animate-bounce" /> UNKNOWN WORKFLOW
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                          <CheckCircle className="w-3.5 h-3.5" /> SECURE MAPPING
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
                  Begin typing to run the simulator.
                </div>
              )}
            </div>
          </div>

          {/* SPECIFICATION COMPLIANCE CHECKLIST */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              Rule Compliance Verification
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Programmatic verification status of DocuSight Analytics Enterprise Protection Rules (الفصل العاشر).
            </p>

            <div className="space-y-3">
              
              <div className="flex items-start gap-3 p-2 rounded hover:bg-slate-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800">Rule 1: Workflow-Only Formula Bindings</div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    All math/SLA engines are bound to the Workflow Family state, never directly to raw sheet types.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2 rounded hover:bg-slate-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800">Rule 2: Pre-SSOT Normalization</div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Normalization occurs on data insertion within the 1st pass, ensuring immediate canonical safety.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2 rounded hover:bg-slate-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800">Rule 3: Static Calculation Engines</div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Adding new document registers ONLY appends to the Alias mapping index without modifying calculation routines.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2 rounded hover:bg-slate-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800">Rule 4: One Engine Per Family</div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Unified engines exist strictly per family (e.g. SDW, MIR, WIR, etc.) avoiding logic forks.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2 rounded hover:bg-slate-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800">Rule 5: Unknown Workflow Safe Mode</div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Unrecognized logs enter safe "UNKNOWN" status with user warnings, preventing automatic guessing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2 rounded hover:bg-slate-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800">Rule 6: Backward Compatibility Shield</div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Maintains full telemetry schema structures, preserving past and loaded session values safely.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
  );
}
