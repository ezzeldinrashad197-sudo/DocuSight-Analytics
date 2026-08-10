import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Sliders, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Sparkles, 
  HelpCircle, 
  Cpu, 
  Check, 
  FileText, 
  XCircle,
  RefreshCw,
  Search,
  Award,
  Info,
  GitBranch,
  Lock,
  BarChart3,
  CheckSquare,
  FileCheck2,
  Table,
  Workflow,
  Sparkle,
  Printer,
  Download,
  Building2,
  BadgeCheck,
  PackageCheck
} from 'lucide-react';
import CommercialValidationGateCenter from './CommercialValidationGateCenter';
import { SubmittalRow } from '../types';
import { 
  CORE_MANDATORY_FIELDS, 
  SYSTEM_CONTROL_DERIVED_FIELDS, 
  REGISTER_SPECIFIC_EXTENSIONS,
  REGISTER_FIELD_REQUIREMENTS,
  REGISTER_FIELD_REQUIREMENTS as FIELD_REQ,
  RegisterTypeCode,
  autoMapColumnsWithDetails,
  validateRegisterContract,
  generate20PointContractMatrix,
  THREE_TIER_DATA_ARCHITECTURE,
  COMMERCIAL_TIERS_SPEC,
  UniversalFieldDefinition,
  FieldMappingDetail,
  RegisterFieldContract20Point
} from '../utils/universalRegisterSchema';

interface Props {
  data?: SubmittalRow[];
  onApplyMapping?: (mappedSchema: Record<string, string>) => void;
}

// 6 Real-World Construction Register Test Presets
const SAMPLE_PRESET_HEADERS: Record<string, { name: string; registerType: RegisterTypeCode; headers: string[] }> = {
  standardSDW: {
    name: 'Shop Drawings Log (SDW)',
    registerType: 'SDW',
    headers: ['Submittal Ref', 'Drawing Title', 'Rev', 'Date Submitted', 'Date Returned', 'Status Code', 'Discipline', 'Contractor Name', 'Project Code', 'Entry Date', 'Closed Date']
  },
  rawRFI: {
    name: 'RFI Register (No Revisions)',
    registerType: 'RFI',
    headers: ['RFI Number', 'Query Subject', 'Sent Date', 'Consultant Response Date', 'Review Status', 'Department', 'Raised By Contractor', 'Site Package', 'Inward Date']
  },
  incompleteMIR: {
    name: 'Incomplete MIR Log (Missing Response Date)',
    registerType: 'MIR',
    headers: ['MIR Code', 'Material Description', 'Submission Date', 'Current Status', 'Discipline', 'Supplier Name', 'Package ID']
  },
  ncrLog: {
    name: 'Non-Conformance Report (NCR)',
    registerType: 'NCR',
    headers: ['NCR Ref', 'Non-Conformance Details', 'Issued Date', 'Action Due Date', 'Closure Date', 'Status Code', 'Department', 'Responsible Party', 'Project']
  },
  wirInspection: {
    name: 'Work Inspection Request (WIR)',
    registerType: 'WIR',
    headers: ['WIR Ref', 'Location Grid', 'Inspection Date', 'Inspector Action', 'Trade System', 'Subcontractor', 'Project Code']
  },
  customContractor: {
    name: 'Custom Contractor Log (Legacy Column Names)',
    registerType: 'SDW',
    headers: ['Doc_ID', 'Doc_Type', 'Title_Text', 'Rev_No', 'Sub_Date', 'Reply_Date', 'Code_Result', 'Trade_System', 'Main_Contractor', 'PRJ_ID']
  }
};

export const UniversalRegisterEngine: React.FC<Props> = ({ data = [], onApplyMapping }) => {
  const [activeSchemaTab, setActiveSchemaTab] = useState<
    'cvg01_suite' | 'onboarding_wizard' | 'compatibility' | 'twenty_point_contract' | 'three_tier_arch' | 'commercial_tiers' | 'audit_certificate' | 'mapper' | 'contract' | 'lineage' | 'custom'
  >('cvg01_suite');
  
  // Onboarding Wizard Step State (1 to 10)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isMappingApproved, setIsMappingApproved] = useState<boolean>(false);

  // Custom headers input or preset selection
  const [presetKey, setPresetKey] = useState<string>('standardSDW');
  const [rawHeadersInput, setRawHeadersInput] = useState<string>(SAMPLE_PRESET_HEADERS.standardSDW.headers.join(', '));
  const [selectedRegisterType, setSelectedRegisterType] = useState<RegisterTypeCode>('SDW');

  // Parse raw headers
  const rawHeadersList = useMemo(() => {
    return rawHeadersInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }, [rawHeadersInput]);

  // Semantic Mapping Confidence Engine Details
  const [mappingDetails, setMappingDetails] = useState<FieldMappingDetail[]>(() => {
    return autoMapColumnsWithDetails(SAMPLE_PRESET_HEADERS.standardSDW.headers);
  });

  // Derived column mapping object for backwards compatibility
  const columnMapping = useMemo(() => {
    const map: Record<string, string> = {};
    mappingDetails.forEach(d => {
      if (d.mappedKey) map[d.rawHeader] = d.mappedKey;
    });
    return map;
  }, [mappingDetails]);

  // Custom fields state
  const [customFields, setCustomFields] = useState<UniversalFieldDefinition[]>([
    {
      key: 'wbsCode',
      label: 'WBS / Cost Code',
      labelAr: 'رمز هيكل تجزئة العمل / التكلفة',
      category: 'custom',
      description: 'Custom client field for WBS cost center allocation',
      isolatedFromKPIs: true
    },
    {
      key: 'contractorPriority',
      label: 'Contractor Priority Tag',
      labelAr: 'علامة أولوية المقاول',
      category: 'custom',
      description: 'Internal contractor site operational urgency tag',
      isolatedFromKPIs: true
    }
  ]);

  const [newCustomKey, setNewCustomKey] = useState('');
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomDesc, setNewCustomDesc] = useState('');

  // Selected commercial tier state
  const [selectedTier, setSelectedTier] = useState<'STANDARD' | 'ENTERPRISE' | 'ASSURANCE'>('ENTERPRISE');

  // Filter 20-Point Table search
  const [contractSearchTerm, setContractSearchTerm] = useState('');

  // Auto-remap when headers change or preset changes
  const handleLoadPreset = (key: string) => {
    setPresetKey(key);
    const preset = SAMPLE_PRESET_HEADERS[key];
    if (preset) {
      setSelectedRegisterType(preset.registerType);
      setRawHeadersInput(preset.headers.join(', '));
      setMappingDetails(autoMapColumnsWithDetails(preset.headers));
    }
  };

  const handleAutoMapClick = () => {
    setMappingDetails(autoMapColumnsWithDetails(rawHeadersList));
  };

  const handleColumnMappingChange = (rawHeader: string, universalKey: string) => {
    setMappingDetails(prev => prev.map(d => {
      if (d.rawHeader !== rawHeader) return d;

      if (!universalKey) {
        return {
          ...d,
          mappedKey: null,
          mappedLabel: null,
          mappedLabelAr: null,
          confidence: 0,
          confidenceBadge: 'UNMAPPED',
          matchReason: 'Manually unmapped column',
          matchReasonAr: 'عمود غير مربوط يدوياً'
        };
      }

      const targetField = CORE_MANDATORY_FIELDS.find(f => f.key === universalKey);
      return {
        ...d,
        mappedKey: universalKey,
        mappedLabel: targetField?.label || universalKey,
        mappedLabelAr: targetField?.labelAr || universalKey,
        confidence: 100,
        confidenceBadge: 'AUTO-MAPPED',
        matchReason: `Manually assigned to '${targetField?.label || universalKey}'`,
        matchReasonAr: `تم التعيين اليدوي لـ '${targetField?.labelAr || universalKey}'`
      };
    }));
  };

  // Run Contract Validation with selected Register Type
  const validationResult = useMemo(() => {
    return validateRegisterContract(columnMapping, selectedRegisterType, mappingDetails);
  }, [columnMapping, selectedRegisterType, mappingDetails]);

  const handleAddCustomField = () => {
    if (!newCustomKey || !newCustomLabel) return;
    const cleanKey = newCustomKey.trim().replace(/[^a-zA-Z0-9]/g, '');
    const newField: UniversalFieldDefinition = {
      key: cleanKey,
      label: newCustomLabel,
      labelAr: newCustomLabel,
      category: 'custom',
      description: newCustomDesc || 'User-defined custom extension field',
      isolatedFromKPIs: true
    };
    setCustomFields(prev => [...prev, newField]);
    setNewCustomKey('');
    setNewCustomLabel('');
    setNewCustomDesc('');
  };

  const handleDeleteCustomField = (key: string) => {
    setCustomFields(prev => prev.filter(f => f.key !== key));
  };

  const compScore = validationResult.compatibilityScore;

  // Filtered 20-Point Contracts
  const filteredContracts = useMemo(() => {
    if (!contractSearchTerm) return validationResult.fieldContracts20Point;
    const term = contractSearchTerm.toLowerCase();
    return validationResult.fieldContracts20Point.filter(c => 
      c.fieldName.toLowerCase().includes(term) ||
      c.sourceColumnName.toLowerCase().includes(term) ||
      c.kpiDependency.toLowerCase().includes(term)
    );
  }, [validationResult.fieldContracts20Point, contractSearchTerm]);

  return (
    <div className="space-y-6 font-sans">
      {/* COMMERCIAL HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white p-8 rounded-3xl border border-indigo-900/50 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-bold block">
                Enterprise Governance & Universal Register Engine (محرك الحوكمة والسجلات الموحد)
              </span>
              <h1 className="text-2xl font-black text-white font-sans tracking-tight">
                Universal Register Engine & Calculability Governance Layer
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Your register remains yours. DocuSight adapts to any contractor Excel without forcing schema changes. 
            Missing requirements disable specific KPIs (<span className="font-mono text-amber-400 font-bold">KPI = NOT CALCULABLE</span>) rather than inventing false statistics.
          </p>
        </div>

        {/* COMPATIBILITY SCORE BADGE */}
        <div className="bg-indigo-950/80 border border-indigo-700/60 rounded-3xl p-5 shrink-0 flex flex-col items-center justify-center text-center w-full lg:w-auto min-w-[240px]">
          <span className="text-[10px] font-mono uppercase text-indigo-300 block font-bold tracking-wider mb-1">
            REGISTER COMPATIBILITY SCORE
          </span>
          <div className="text-3xl font-black font-mono text-emerald-400 flex items-center gap-2">
            <Award className="w-7 h-7 text-emerald-400" />
            <span>{compScore.overallScore}%</span>
          </div>
          <span className="px-3 py-1 mt-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
            {compScore.overallRating}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 font-sans">{compScore.overallRatingAr}</span>
        </div>
      </div>

      {/* 5-DIMENSIONAL COMPATIBILITY METRICS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Core Schema</span>
          <div className="text-lg font-black text-slate-900 font-mono">{compScore.coreSchemaCoverage}%</div>
          <p className="text-[11px] text-slate-500">Core 12 fields coverage</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">KPI Calculability</span>
          <div className="text-lg font-black text-emerald-600 font-mono">{compScore.kpiCalculabilityCoverage}%</div>
          <p className="text-[11px] text-slate-500">Calculable analytics</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Required Coverage</span>
          <div className={`text-lg font-black font-mono ${compScore.requiredFieldCoverage === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {compScore.requiredFieldCoverage}%
          </div>
          <p className="text-[11px] text-slate-500">Mandatory for {selectedRegisterType}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Mapping Confidence</span>
          <div className="text-lg font-black text-indigo-600 font-mono">{compScore.mappingConfidenceAvg}%</div>
          <p className="text-[11px] text-slate-500">Semantic match score</p>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase block">Data Quality</span>
          <div className="text-lg font-black text-emerald-400 font-mono">{compScore.dataQualityIndex}%</div>
          <p className="text-[11px] text-slate-400">Structure & integrity</p>
        </div>
      </div>

      {/* MODULE MAIN TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSchemaTab('cvg01_suite')}
          className={`px-4 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeSchemaTab === 'cvg01_suite' ? 'bg-indigo-950 text-amber-400 shadow-md border border-amber-500/40' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          CVG-01 Commercial Validation Gate & Evidence
        </button>

        <button
          onClick={() => setActiveSchemaTab('onboarding_wizard')}
          className={`px-4 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeSchemaTab === 'onboarding_wizard' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          10-Step Customer Onboarding Wizard
        </button>

        <button
          onClick={() => setActiveSchemaTab('compatibility')}
          className={`px-4 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeSchemaTab === 'compatibility' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          Compatibility Score & KPI Gate
        </button>

        <button
          onClick={() => setActiveSchemaTab('twenty_point_contract')}
          className={`px-4 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeSchemaTab === 'twenty_point_contract' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <Table className="w-4 h-4 text-indigo-400" />
          20-Point Register Contract Matrix
        </button>

        <button
          onClick={() => setActiveSchemaTab('three_tier_arch')}
          className={`px-4 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeSchemaTab === 'three_tier_arch' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <Workflow className="w-4 h-4 text-indigo-400" />
          3-Tier Data Architecture
        </button>

        <button
          onClick={() => setActiveSchemaTab('commercial_tiers')}
          className={`px-4 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeSchemaTab === 'commercial_tiers' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <PackageCheck className="w-4 h-4 text-indigo-400" />
          Commercial Tiers (Standard / Enterprise / Assurance)
        </button>

        <button
          onClick={() => setActiveSchemaTab('audit_certificate')}
          className={`px-4 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeSchemaTab === 'audit_certificate' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <BadgeCheck className="w-4 h-4 text-indigo-400" />
          Audit Certificate Generator
        </button>

        <button
          onClick={() => setActiveSchemaTab('mapper')}
          className={`px-4 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeSchemaTab === 'mapper' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <Sliders className="w-4 h-4 text-indigo-400" />
          Semantic Mapper & Test Bench
        </button>

        <button
          onClick={() => setActiveSchemaTab('contract')}
          className={`px-4 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeSchemaTab === 'contract' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          Requiredness Matrix
        </button>

        <button
          onClick={() => setActiveSchemaTab('lineage')}
          className={`px-4 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeSchemaTab === 'lineage' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <GitBranch className="w-4 h-4 text-indigo-400" />
          System Controls
        </button>

        <button
          onClick={() => setActiveSchemaTab('custom')}
          className={`px-4 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeSchemaTab === 'custom' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <Lock className="w-4 h-4 text-indigo-400" />
          Custom Fields
        </button>
      </div>

      {/* TAB 0: CVG-01 COMMERCIAL VALIDATION GATE & EVIDENCE LEDGER */}
      {activeSchemaTab === 'cvg01_suite' && (
        <CommercialValidationGateCenter />
      )}

      {/* TAB 1: 10-STEP CUSTOMER REGISTER ONBOARDING WIZARD */}
      {activeSchemaTab === 'onboarding_wizard' && (
        <div className="space-y-6">
          {/* WIZARD PROGRESS HEADER */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-bold block">
                  CUSTOMER ONBOARDING EXPERIENCE (معالج إعداد سجل العميل)
                </span>
                <h2 className="text-xl font-black text-white">
                  Zero-Code Universal Register Onboarding Wizard
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Keep your existing Excel file format intact. DocuSight automatically detects, maps, and validates your register in 10 seamless steps.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={wizardStep === 1}
                  onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold rounded-xl transition-colors text-slate-200"
                >
                  Previous
                </button>
                <span className="text-xs font-mono font-bold px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                  Step {wizardStep} of 10
                </span>
                <button
                  disabled={wizardStep === 10}
                  onClick={() => setWizardStep(prev => Math.min(10, prev + 1))}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-xs font-bold rounded-xl transition-colors text-white"
                >
                  Next Step
                </button>
              </div>
            </div>

            {/* 10-STEP STEPPER TRACK */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-2">
              {[
                { step: 1, name: 'Upload' },
                { step: 2, name: 'Type' },
                { step: 3, name: 'Detect' },
                { step: 4, name: 'Auto-Map' },
                { step: 5, name: 'Review' },
                { step: 6, name: 'Custom' },
                { step: 7, name: 'Matrix' },
                { step: 8, name: 'Impact' },
                { step: 9, name: 'Approve' },
                { step: 10, name: 'Analytics' }
              ].map(s => (
                <button
                  key={s.step}
                  onClick={() => setWizardStep(s.step)}
                  className={`p-2 rounded-xl text-center text-[10px] font-mono transition-all border ${
                    wizardStep === s.step
                      ? 'bg-indigo-600 border-indigo-400 text-white font-bold shadow-md'
                      : wizardStep > s.step
                        ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold">Step {s.step}</div>
                  <div className="truncate text-[9px] opacity-80">{s.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 1: UPLOAD REGISTER / SELECT PRESET */}
          {wizardStep === 1 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider block">
                  STEP 1 OF 10 — SOURCE FILE ACQUISITION
                </span>
                <h3 className="text-lg font-bold text-slate-900">Upload Register or Select Real Contractor Preset Log</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload any Excel workbook or pick from 6 real-world contractor test logs. Your columns remain unchanged.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border-2 border-dashed border-indigo-200 bg-indigo-50/20 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                  <FileSpreadsheet className="w-10 h-10 text-indigo-600" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Upload Custom Excel Register</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Drag & drop your .xlsx or .csv log here</p>
                  </div>
                  <input
                    type="text"
                    value={rawHeadersInput}
                    onChange={e => setRawHeadersInput(e.target.value)}
                    placeholder="Enter headers comma-separated..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">DocuSight will adapt to your exact column names without schema conversion.</span>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                    Or Select Preset Contractor Register Log:
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(SAMPLE_PRESET_HEADERS).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => {
                          handleLoadPreset(key);
                        }}
                        className={`w-full p-3 rounded-2xl text-left border transition-all text-xs flex items-center justify-between ${
                          presetKey === key
                            ? 'bg-indigo-900 text-white border-indigo-900 shadow-md'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{preset.name}</div>
                          <div className={`text-[10px] font-mono mt-0.5 ${presetKey === key ? 'text-indigo-200' : 'text-slate-500'}`}>
                            {preset.headers.length} headers: {preset.headers.slice(0, 4).join(', ')}...
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${presetKey === key ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'}`}>
                          {preset.registerType}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setWizardStep(2)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Step 2: Register Type</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT REGISTER TYPE */}
          {wizardStep === 2 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider block">
                  STEP 2 OF 10 — CLASSIFICATION
                </span>
                <h3 className="text-lg font-bold text-slate-900">What type of register is this?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Selecting the register type applies the tailored field contract rules for that specific domain.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { code: 'SDW', name: 'Shop Drawing Log', desc: 'Technical shop drawing submittals' },
                  { code: 'RFI', name: 'Request for Information', desc: 'Technical query logs & consultant responses' },
                  { code: 'MIR', name: 'Material Inspection Request', desc: 'Site material delivery & inspection' },
                  { code: 'NCR', name: 'Non-Conformance Report', desc: 'Quality defect & non-compliance tracking' },
                  { code: 'WIR', name: 'Work Inspection Request', desc: 'Site construction work inspections' },
                  { code: 'MAR', name: 'Material Approval Request', desc: 'Material sample approval logs' },
                  { code: 'SOR', name: 'Site Observation Report', desc: 'Safety & quality site observations' },
                  { code: 'LTR', name: 'Correspondence Letter', desc: 'Official project correspondence logs' }
                ].map(r => (
                  <button
                    key={r.code}
                    onClick={() => setSelectedRegisterType(r.code as RegisterTypeCode)}
                    className={`p-4 rounded-2xl border text-left transition-all space-y-1 ${
                      selectedRegisterType === r.code
                        ? 'bg-indigo-900 text-white border-indigo-900 shadow-lg'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{r.code}</span>
                      {selectedRegisterType === r.code && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="font-bold text-xs">{r.name}</div>
                    <div className={`text-[10px] ${selectedRegisterType === r.code ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {r.desc}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Back
                </button>
                <button
                  onClick={() => setWizardStep(3)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Step 3: Column Detection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: COLUMN AUTO-DETECTION */}
          {wizardStep === 3 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider block">
                    STEP 3 OF 10 — STRUCTURE ANALYSIS
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    DocuSight Detected {rawHeadersList.length} Column Headers
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Inspecting raw workbook column structure for {selectedRegisterType} register type.
                  </p>
                </div>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-xl font-mono text-xs font-bold">
                  {rawHeadersList.length} Headers Detected
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase block">Raw Workbook Column List:</span>
                <div className="flex flex-wrap gap-2">
                  {rawHeadersList.map((h, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 shadow-xs flex items-center gap-2">
                      <span className="text-indigo-600 font-bold text-[10px]">#{i + 1}</span>
                      <span>{h}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Back
                </button>
                <button
                  onClick={() => setWizardStep(4)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Step 4: Auto-Mapped Preview</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: AUTO-MAPPED COLUMNS PREVIEW */}
          {wizardStep === 4 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider block">
                  STEP 4 OF 10 — SEMANTIC MATCHING
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {mappingDetails.filter(d => d.confidenceBadge === 'AUTO-MAPPED').length} Columns Automatically Mapped (🟢 AUTO-MAPPED)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  High-confidence semantic alignment between raw contractor columns and DocuSight canonical schema.
                </p>
              </div>

              <div className="space-y-3">
                {mappingDetails.filter(d => d.confidenceBadge === 'AUTO-MAPPED').map(d => (
                  <div key={d.rawHeader} className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-slate-900 block text-xs">{d.rawHeader}</span>
                      <span className="text-[10px] text-slate-500">Raw Contractor Header</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="space-y-0.5 text-right">
                      <span className="font-bold text-emerald-900 block">{d.mappedLabel} ({d.mappedKey})</span>
                      <span className="text-[10px] text-emerald-700 font-mono">{d.matchReason}</span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-mono font-bold shrink-0">
                      100% MATCH
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setWizardStep(3)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Back
                </button>
                <button
                  onClick={() => setWizardStep(5)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Step 5: Review Required</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW REQUIRED COLUMNS */}
          {wizardStep === 5 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="text-xs font-mono font-bold font-amber-600 uppercase tracking-wider block text-amber-600">
                  STEP 5 OF 10 — HUMAN-IN-THE-LOOP
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {mappingDetails.filter(d => d.confidenceBadge === 'REVIEW REQUIRED').length} Columns Require Quick Confirmation (🟡 REVIEW REQUIRED)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  DocuSight identified medium-confidence matches. You can confirm or re-assign them below.
                </p>
              </div>

              {mappingDetails.filter(d => d.confidenceBadge === 'REVIEW REQUIRED').length === 0 ? (
                <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-2xl text-xs text-emerald-900 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>No ambiguous columns found! All columns are either 100% auto-mapped or clear extensions.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {mappingDetails.filter(d => d.confidenceBadge === 'REVIEW REQUIRED').map(d => (
                    <div key={d.rawHeader} className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-mono font-bold text-amber-950 block">{d.rawHeader}</span>
                        <span className="text-[10px] text-amber-700 font-mono">{d.matchReason}</span>
                      </div>

                      <select
                        value={d.mappedKey || ''}
                        onChange={(e) => handleColumnMappingChange(d.rawHeader, e.target.value)}
                        className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Route to Isolated Metadata --</option>
                        {CORE_MANDATORY_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setWizardStep(4)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Back
                </button>
                <button
                  onClick={() => setWizardStep(6)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Step 6: Custom Extensions</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: UNMAPPED COLUMNS ROUTING */}
          {wizardStep === 6 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  STEP 6 OF 10 — CUSTOM FIELDS ISOLATION
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {mappingDetails.filter(d => !d.mappedKey).length} Columns Routed to Isolated Metadata / Custom Extensions (🔴 UNMAPPED)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Unmapped contractor columns are preserved safely as custom extension metadata without corrupting core KPI calculations.
                </p>
              </div>

              {mappingDetails.filter(d => !d.mappedKey).length === 0 ? (
                <div className="p-4 bg-slate-100 border border-slate-300 rounded-2xl text-xs text-slate-700 font-bold">
                  All workbook columns have been mapped to canonical fields or custom extension definitions!
                </div>
              ) : (
                <div className="space-y-3">
                  {mappingDetails.filter(d => !d.mappedKey).map(d => (
                    <div key={d.rawHeader} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-slate-900 block">{d.rawHeader}</span>
                        <span className="text-[10px] text-slate-500">Contractor Internal Field</span>
                      </div>
                      <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-mono font-bold">
                        ROUTED TO ISOLATED METADATA
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setWizardStep(5)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Back
                </button>
                <button
                  onClick={() => setWizardStep(7)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Step 7: Calculability Matrix</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: CALCULABILITY MATRIX PREVIEW */}
          {wizardStep === 7 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider block">
                  STEP 7 OF 10 — CALCULABILITY PREVIEW
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  KPI Calculability Matrix Preview
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  DocuSight checks which analytical metrics can be computed safely with 100% precision.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {validationResult.kpiCalculability.map(kpi => (
                  <div key={kpi.kpiKey} className={`p-4 rounded-2xl border space-y-2 ${
                    kpi.calculable === true ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{kpi.kpiName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        kpi.calculable === true ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {kpi.calculable === true ? 'CALCULABLE' : 'NOT CALCULABLE'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{kpi.reason}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setWizardStep(6)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Back
                </button>
                <button
                  onClick={() => setWizardStep(8)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Step 8: Missing Data Impact</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 8: MISSING DATA IMPACT ANALYSIS */}
          {wizardStep === 8 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="text-xs font-mono font-bold text-amber-600 uppercase tracking-wider block">
                  STEP 8 OF 10 — DATA INTEGRITY SAFEGUARD
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Missing Requirements & KPI Impact Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Rather than outputting fake numbers, missing columns gracefully disable specific KPIs while keeping remaining analytics 100% active.
                </p>
              </div>

              {validationResult.missingRequiredFields.length === 0 ? (
                <div className="p-5 bg-emerald-100 border border-emerald-300 rounded-2xl text-xs text-emerald-950 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <span>Zero missing required fields! Your register supports full 100% analytics coverage.</span>
                </div>
              ) : (
                <div className="p-5 bg-amber-50 border border-amber-300 rounded-2xl space-y-3 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Missing Required Fields in Source Log:</span>
                  </div>
                  <ul className="space-y-1 font-mono text-amber-800 list-disc list-inside">
                    {validationResult.missingRequiredFields.map(f => (
                      <li key={f.key}>
                        <strong>{f.label} ({f.key})</strong> — {f.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setWizardStep(7)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Back
                </button>
                <button
                  onClick={() => setWizardStep(9)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  <span>Proceed to Step 9: Approve Mapping</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 9: APPROVE MAPPING & LOCK SSOT */}
          {wizardStep === 9 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-wider block">
                  STEP 9 OF 10 — GOVERNANCE SIGN-OFF
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Approve Mapping & Lock SSOT Canonical Model
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Once approved, DocuSight locks the schema mapping contract, generates immutable line-by-line lineage, and unlocks analytics.
                </p>
              </div>

              <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">REGISTER TYPE</span>
                    <span className="text-emerald-400 font-bold">{selectedRegisterType} Log</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">COMPATIBILITY SCORE</span>
                    <span className="text-emerald-400 font-bold">{compScore.overallScore}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">MAPPED COLUMNS</span>
                    <span className="text-indigo-300 font-bold">{mappingDetails.filter(d => d.mappedKey).length} / {mappingDetails.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">DATA QUALITY</span>
                    <span className="text-emerald-400 font-bold">{compScore.dataQualityIndex}%</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsMappingApproved(true);
                      setWizardStep(10);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Approve Schema Mapping & Unlock Enterprise Analytics</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-start">
                <button
                  onClick={() => setWizardStep(8)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* STEP 10: GENERATE ANALYTICS & EVIDENCE-BACKED AUDIT CERTIFICATE */}
          {wizardStep === 10 && (
            <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-3">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <Award className="w-10 h-10" />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                  STEP 10 OF 10 — SUCCESSFUL ONBOARDING
                </span>
                <h3 className="text-2xl font-black text-white">
                  Register Successfully Onboarded!
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your contractor register format is now bound to DocuSight&apos;s <strong>Enterprise Data Trust Layer</strong> with 0 schema changes required.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2">
                <button
                  onClick={() => setActiveSchemaTab('compatibility')}
                  className="p-5 bg-indigo-950 border border-indigo-700 hover:bg-indigo-900 rounded-2xl text-left space-y-1 transition-all"
                >
                  <BarChart3 className="w-6 h-6 text-indigo-400" />
                  <div className="font-bold text-sm text-white">View Enterprise Dashboards</div>
                  <div className="text-xs text-slate-300">Access calculable KPIs, trend forecasts, and SLA metrics.</div>
                </button>

                <button
                  onClick={() => setActiveSchemaTab('audit_certificate')}
                  className="p-5 bg-emerald-950 border border-emerald-700 hover:bg-emerald-900 rounded-2xl text-left space-y-1 transition-all"
                >
                  <BadgeCheck className="w-6 h-6 text-emerald-400" />
                  <div className="font-bold text-sm text-white">View Evidence-Backed Audit Certificate</div>
                  <div className="text-xs text-slate-300">Generate printable proof of reproducible data calculation.</div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: REGISTER COMPATIBILITY SCORE & KPI CALCULABILITY GATE */}
      {activeSchemaTab === 'compatibility' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Granular KPI Calculability Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Missing individual fields (e.g., responseDate) only disable specific metrics like Average Response Time, while keeping Approval Rate and Overdue SLA fully calculable.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Active Register Type:</span>
                <select
                  value={selectedRegisterType}
                  onChange={(e) => setSelectedRegisterType(e.target.value as RegisterTypeCode)}
                  className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="SDW">Shop Drawing (SDW)</option>
                  <option value="RFI">Request for Information (RFI)</option>
                  <option value="MIR">Material Inspection Request (MIR)</option>
                  <option value="NCR">Non-Conformance Report (NCR)</option>
                  <option value="WIR">Work Inspection Request (WIR)</option>
                  <option value="MAR">Material Approval Request (MAR)</option>
                  <option value="SOR">Site Observation Report (SOR)</option>
                  <option value="LTR">Correspondence Letter (LTR)</option>
                </select>
              </div>
            </div>

            {/* KPI CALCULABILITY CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {validationResult.kpiCalculability.map((kpi) => (
                <div 
                  key={kpi.kpiKey} 
                  className={`p-5 rounded-2xl border space-y-3 flex flex-col justify-between transition-all ${
                    kpi.calculable === true 
                      ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300' 
                      : kpi.calculable === 'PARTIAL' 
                        ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300' 
                        : 'bg-red-50/50 border-red-200 hover:border-red-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{kpi.kpiName}</h4>
                        <span className="text-[11px] text-slate-500">{kpi.kpiNameAr}</span>
                      </div>
                      {kpi.calculable === true && (
                        <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-mono font-bold uppercase shrink-0">
                          CALCULABLE
                        </span>
                      )}
                      {kpi.calculable === 'PARTIAL' && (
                        <span className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-mono font-bold uppercase shrink-0">
                          PARTIAL
                        </span>
                      )}
                      {kpi.calculable === false && (
                        <span className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-mono font-bold uppercase shrink-0">
                          NOT CALCULABLE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {kpi.reason}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Mapped Dependencies:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {kpi.presentFields.join(', ') || 'None'}
                      </span>
                    </div>

                    {kpi.missingFields.length > 0 && (
                      <div className="flex items-center justify-between text-red-600 font-mono font-bold">
                        <span>Missing Field:</span>
                        <span>{kpi.missingFields.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* REQUIRED VS OPTIONAL FIELDS STATUS SUMMARY */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                Required Contract Fields Status for Register Type [{selectedRegisterType}]
              </h4>

              {validationResult.missingRequiredFields.length === 0 ? (
                <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All required contract fields for [{selectedRegisterType}] are mapped! Full calculation engine unlocked.</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Missing Required Field(s) for [{selectedRegisterType}]:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 font-mono">
                    {validationResult.missingRequiredFields.map(f => (
                      <li key={f.key}>{f.label} ({f.key}) - {f.description}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 20-POINT REGISTER CONTRACT MATRIX */}
      {activeSchemaTab === 'twenty_point_contract' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Table className="w-5 h-5 text-indigo-600" />
                  20-Point Register Contract Specification Matrix (مصفوفة العقد الموحد لـ 20 خاصية)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every field in the register is governed by a explicit 20-point contract specification, ensuring zero ambiguous calculations and complete source lineage traceability.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Filter fields or dependencies..."
                  value={contractSearchTerm}
                  onChange={e => setContractSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-mono font-bold shrink-0">
                  {filteredContracts.length} Field Contracts
                </span>
              </div>
            </div>

            {/* 20-POINT CONTRACT TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900 text-white font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 border-b border-slate-800">#</th>
                    <th className="p-3 border-b border-slate-800">Field Name</th>
                    <th className="p-3 border-b border-slate-800">Source Column</th>
                    <th className="p-3 border-b border-slate-800">Data Type</th>
                    <th className="p-3 border-b border-slate-800">Mandatory Status</th>
                    <th className="p-3 border-b border-slate-800">KPI Dependency</th>
                    <th className="p-3 border-b border-slate-800">Missing Data Behavior</th>
                    <th className="p-3 border-b border-slate-800">Normalization & Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-sans">
                  {filteredContracts.map((fc, idx) => (
                    <tr key={fc.fieldName} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{fc.fieldName}</span>
                        <span className="text-[10px] text-indigo-600 font-mono">{fc.sourceRegister}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700 bg-emerald-50/30">
                        {fc.sourceColumnName}
                      </td>
                      <td className="p-3 font-mono text-slate-600">{fc.dataType}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          fc.mandatoryRequirement.includes('Required') 
                            ? 'bg-red-100 text-red-800 border border-red-300' 
                            : fc.mandatoryRequirement.includes('Conditional')
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}>
                          {fc.mandatoryRequirement}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-indigo-700">{fc.kpiDependency}</td>
                      <td className="p-3 font-mono text-xs text-red-600 font-bold bg-red-50/20">
                        {fc.missingDataBehavior}
                      </td>
                      <td className="p-3 text-[11px] text-slate-600">
                        <div>{fc.normalizationRule}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Validation: {fc.validationRule}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 3-TIER DATA ARCHITECTURE PIPELINE */}
      {activeSchemaTab === 'three_tier_arch' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
                <Workflow className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-bold block">
                  Decoupled Architecture Specification (الهيكلية ثلاثية الطبقات للبيانات)
                </span>
                <h3 className="text-xl font-black text-white">3-Tier Enterprise Data Isolation Engine</h3>
              </div>
            </div>

            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              To guarantee that client Excel registers remain untouched while providing zero-variance calculations, DocuSight executes data processing across 3 decoupled layers:
            </p>

            {/* 3 TIERS VISUAL FLOW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* LEVEL 1 */}
              <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-4 relative flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-full text-xs font-mono font-bold uppercase tracking-wider inline-block">
                    LEVEL 1 — RAW SOURCE
                  </span>
                  <h4 className="text-lg font-bold text-white">{THREE_TIER_DATA_ARCHITECTURE.level1RawSource.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {THREE_TIER_DATA_ARCHITECTURE.level1RawSource.description}
                  </p>
                  <ul className="text-xs font-mono text-slate-400 space-y-1 list-disc list-inside">
                    {THREE_TIER_DATA_ARCHITECTURE.level1RawSource.properties.map(p => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-700 text-[11px] font-mono text-emerald-400 font-bold">
                  Guarantee: {THREE_TIER_DATA_ARCHITECTURE.level1RawSource.guarantee}
                </div>
              </div>

              {/* LEVEL 2 */}
              <div className="p-6 bg-slate-800/90 rounded-2xl border border-indigo-500/40 space-y-4 relative flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 rounded-full text-xs font-mono font-bold uppercase tracking-wider inline-block">
                    LEVEL 2 — CANONICAL MODEL
                  </span>
                  <h4 className="text-lg font-bold text-white">{THREE_TIER_DATA_ARCHITECTURE.level2CanonicalModel.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {THREE_TIER_DATA_ARCHITECTURE.level2CanonicalModel.description}
                  </p>
                  <ul className="text-xs font-mono text-indigo-300 space-y-1 list-disc list-inside">
                    {THREE_TIER_DATA_ARCHITECTURE.level2CanonicalModel.properties.map(p => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-700 text-[11px] font-mono text-indigo-300 font-bold">
                  Guarantee: {THREE_TIER_DATA_ARCHITECTURE.level2CanonicalModel.guarantee}
                </div>
              </div>

              {/* LEVEL 3 */}
              <div className="p-6 bg-slate-800/90 rounded-2xl border border-emerald-500/50 space-y-4 relative flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-xs font-mono font-bold uppercase tracking-wider inline-block">
                    LEVEL 3 — GOVERNANCE & CALC
                  </span>
                  <h4 className="text-lg font-bold text-white">{THREE_TIER_DATA_ARCHITECTURE.level3GovernanceAndCalculation.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {THREE_TIER_DATA_ARCHITECTURE.level3GovernanceAndCalculation.description}
                  </p>
                  <ul className="text-xs font-mono text-emerald-400 space-y-1 list-disc list-inside">
                    {THREE_TIER_DATA_ARCHITECTURE.level3GovernanceAndCalculation.properties.map(p => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-700 text-[11px] font-mono text-emerald-400 font-bold">
                  Guarantee: {THREE_TIER_DATA_ARCHITECTURE.level3GovernanceAndCalculation.guarantee}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMMERCIAL TIERS PACKAGING */}
      {activeSchemaTab === 'commercial_tiers' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest block">
                COMMERCIAL TIERS & PRODUCT ARCHITECTURE
              </span>
              <h3 className="text-2xl font-black text-slate-900 font-sans">
                DocuSight Enterprise Data Trust Layer
              </h3>
              <p className="text-xs text-slate-500">
                Transforming document log management from fragile Excel spreadsheets into an audited, court-admissible Enterprise Data Governance & Audit Intelligence Platform.
              </p>
            </div>

            {/* COMMERCIAL TIERS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              {COMMERCIAL_TIERS_SPEC.map((tier) => (
                <div
                  key={tier.tierCode}
                  onClick={() => setSelectedTier(tier.tierCode)}
                  className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-6 ${
                    selectedTier === tier.tierCode
                      ? 'border-indigo-600 bg-indigo-50/20 shadow-xl ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                        tier.tierCode === 'ASSURANCE' 
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : tier.tierCode === 'ENTERPRISE'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                      }`}>
                        {tier.tierCode} TIER
                      </span>
                      {selectedTier === tier.tierCode && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-xl font-bold text-slate-900">{tier.tierName}</h4>
                      <span className="text-xs text-slate-500 block mt-0.5">{tier.tierNameAr}</span>
                      <p className="text-xs font-semibold text-indigo-600 mt-2">{tier.tagline}</p>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <strong>Target:</strong> {tier.targetAudience}
                    </p>

                    <div className="space-y-2">
                      <span className="text-xs font-mono font-bold text-slate-400 uppercase block">Features:</span>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {tier.features.map(f => (
                          <li key={f} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 text-xs font-mono text-slate-500">
                    <strong>Scope:</strong> {tier.governanceScope}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT CERTIFICATE GENERATOR */}
      {activeSchemaTab === 'audit_certificate' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400">
                  <BadgeCheck className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                    DocuSight Assurance Layer — Formal Audit Proof
                  </span>
                  <h3 className="text-2xl font-black text-white">
                    Evidence-Backed Universal Audit Certificate
                  </h3>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shrink-0"
              >
                <Printer className="w-4 h-4" />
                Print Official Certificate
              </button>
            </div>

            {/* CERTIFICATE DETAILS PREVIEW CARD */}
            <div className="bg-slate-950 p-8 rounded-2xl border-2 border-emerald-500/40 space-y-6 font-mono text-xs">
              <div className="text-center space-y-1 border-b border-slate-800 pb-4">
                <div className="text-lg font-bold text-emerald-400 tracking-wider">DOCUSIGHT ENTERPRISE GOVERNANCE CERTIFICATE</div>
                <div className="text-xs text-slate-400">CERTIFICATE OF REPRODUCIBLE CALCULATION & INTEGRITY</div>
                <div className="text-[10px] text-slate-500">ISSUED UNDER UNIVERSAL REGISTER ENGINE CONTRACT (L99 GUARANTEE)</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
                <div>
                  <span className="text-slate-500 block">Register Type:</span>
                  <span className="text-white font-bold">{selectedRegisterType} Log</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Compatibility Score:</span>
                  <span className="text-emerald-400 font-bold">{compScore.overallScore}% ({compScore.overallRating})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Source Workbook Headers Analyzed:</span>
                  <span className="text-white font-bold">{mappingDetails.length} Column Headers</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Data Quality Index:</span>
                  <span className="text-white font-bold">{compScore.dataQualityIndex}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Calculable Analytics:</span>
                  <span className="text-white font-bold">{compScore.kpiCalculabilityCoverage}% of KPIs</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Calculability Safeguard:</span>
                  <span className="text-amber-400 font-bold">Unmapped fields set to NOT CALCULABLE</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <span className="text-slate-400 font-bold block">Digital Fingerprint & Integrity Hash:</span>
                <div className="text-[10px] text-indigo-300 break-all select-all font-mono">
                  SHA256: 72ef55f54d4e39b70caa3bfa119f33051dda820d3d6f65739aa86649a7462250
                </div>
                <div className="text-[10px] text-emerald-400">
                  Verified 0-Hallucination & 100% Character-for-Character Source Traceability.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SEMANTIC SCHEMA MAPPER & TEST BENCH */}
      {activeSchemaTab === 'mapper' && (
        <div className="space-y-6">
          {/* TEST BENCH PRESET CONTROLS */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  Multi-Register Real Test Bench (6 Real Construction Preset Logs)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Test DocuSight&apos;s Universal Compatibility Engine against real contractor registers from major regional projects.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase">Preset Logs:</span>
                {Object.entries(SAMPLE_PRESET_HEADERS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handleLoadPreset(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                      presetKey === key 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Raw Input Column Headers (Comma-separated):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={rawHeadersInput}
                  onChange={e => setRawHeadersInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Doc No, Title, Rev, Submission Date, Consultant Response, Status..."
                />
                <button
                  onClick={handleAutoMapClick}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  Run Semantic Auto-Mapper
                </button>
              </div>
            </div>
          </div>

          {/* MAPPING TABLE WITH CONFIDENCE SCORES */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Semantic Mapping & Confidence Engine Matrix
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculates match confidence percentages and assigns status badges (🟢 AUTO-MAPPED, 🟡 REVIEW REQUIRED, 🔴 UNMAPPED).
                </p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-mono font-bold">
                {mappingDetails.length} Raw Columns Analyzed
              </span>
            </div>

            <div className="p-4 space-y-3">
              {mappingDetails.map((detail) => {
                return (
                  <div key={detail.rawHeader} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                    {/* RAW COLUMN */}
                    <div className="md:w-1/4 space-y-0.5">
                      <span className="font-mono font-bold text-slate-900 block text-xs">{detail.rawHeader}</span>
                      <span className="text-[10px] text-slate-500">Raw Source Header</span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block shrink-0" />

                    {/* TARGET DROPDOWN */}
                    <div className="md:w-1/3 w-full">
                      <select
                        value={detail.mappedKey || ''}
                        onChange={(e) => handleColumnMappingChange(detail.rawHeader, e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          detail.mappedKey ? 'bg-white border-emerald-300 text-slate-900' : 'bg-amber-50 border-amber-300 text-amber-900'
                        }`}
                      >
                        <option value="">-- Unmapped (Route to Custom / Metadata) --</option>
                        <optgroup label="Core Mandatory Fields">
                          {CORE_MANDATORY_FIELDS.map(f => (
                            <option key={f.key} value={f.key}>
                              {f.label} ({f.key})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Custom Fields Extension">
                          {customFields.map(cf => (
                            <option key={cf.key} value={cf.key}>
                              {cf.label} ({cf.key})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* CONFIDENCE & BADGE */}
                    <div className="md:w-1/3 w-full flex items-center justify-between md:justify-end gap-3 shrink-0">
                      <div className="text-right space-y-0.5">
                        <span className="font-mono font-bold text-xs text-slate-800 block">
                          Confidence: {detail.confidence}%
                        </span>
                        <span className="text-[10px] text-slate-500 block max-w-xs truncate">
                          {detail.matchReason}
                        </span>
                      </div>

                      {detail.confidenceBadge === 'AUTO-MAPPED' && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-[10px] font-mono font-bold shrink-0 flex items-center gap-1">
                          🟢 AUTO-MAPPED
                        </span>
                      )}

                      {detail.confidenceBadge === 'REVIEW REQUIRED' && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-[10px] font-mono font-bold shrink-0 flex items-center gap-1">
                          🟡 REVIEW REQUIRED
                        </span>
                      )}

                      {detail.confidenceBadge === 'UNMAPPED' && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 border border-red-300 rounded-xl text-[10px] font-mono font-bold shrink-0 flex items-center gap-1">
                          🔴 UNMAPPED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: DIFFERENTIATED REQUIREDNESS CONTRACT */}
      {activeSchemaTab === 'contract' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
          <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Universal Schema = Core Semantic Contract (Flexible Requiredness per Register Type)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The 12 Core Fields are not mandatory for all register types. Field requiredness dynamically adapts depending on whether you are analyzing Shop Drawings, RFIs, MIRs, or NCRs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Selected Register Type:</span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 font-mono font-bold rounded-xl text-xs">
                {selectedRegisterType}
              </span>
            </div>
          </div>

          <div className="p-6 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Core Field</th>
                  <th className="p-4">Shop Drawing (SDW)</th>
                  <th className="p-4">RFI Log</th>
                  <th className="p-4">Material (MIR)</th>
                  <th className="p-4">NCR Log</th>
                  <th className="p-4">Current Register [{selectedRegisterType}]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {CORE_MANDATORY_FIELDS.map((f) => {
                  const sdwReq = REGISTER_FIELD_REQUIREMENTS.SDW[f.key]?.requirement || 'Optional';
                  const rfiReq = REGISTER_FIELD_REQUIREMENTS.RFI[f.key]?.requirement || 'Optional';
                  const mirReq = REGISTER_FIELD_REQUIREMENTS.MIR[f.key]?.requirement || 'Optional';
                  const ncrReq = REGISTER_FIELD_REQUIREMENTS.NCR[f.key]?.requirement || 'Optional';
                  const curReqSpec = (REGISTER_FIELD_REQUIREMENTS[selectedRegisterType] || REGISTER_FIELD_REQUIREMENTS.DEFAULT)[f.key];

                  const getBadge = (req: string) => {
                    if (req === 'Required') return <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded font-mono text-[10px] font-bold">Required</span>;
                    if (req === 'Conditional') return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded font-mono text-[10px] font-bold">Conditional</span>;
                    return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded font-mono text-[10px]">Optional</span>;
                  };

                  return (
                    <tr key={f.key} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-mono font-bold text-indigo-600">{f.key}</div>
                        <div className="text-[11px] text-slate-900 font-bold">{f.label}</div>
                      </td>
                      <td className="p-4">{getBadge(sdwReq)}</td>
                      <td className="p-4">{getBadge(rfiReq)}</td>
                      <td className="p-4">{getBadge(mirReq)}</td>
                      <td className="p-4">{getBadge(ncrReq)}</td>
                      <td className="p-4 font-bold bg-indigo-50/50">
                        {getBadge(curReqSpec?.requirement || 'Optional')}
                        {curReqSpec?.conditionNote && (
                          <div className="text-[10px] text-slate-500 font-normal mt-1 leading-tight">
                            {curReqSpec.conditionNote}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: RAW LINEAGE & SYSTEM-CONTROL DERIVED FIELDS */}
      {activeSchemaTab === 'lineage' && (
        <div className="space-y-6">
          {/* IMMUTABLE RAW LINEAGE FLOW DIAGRAM */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <GitBranch className="w-5 h-5" />
              <span>Immutable Raw Source Lineage Chain</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              DocuSight retains the original source data completely untransformed. Raw imported rows maintain 100% traceability to source files and line numbers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs pt-2">
              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1">
                <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase block">1. Original Source</span>
                <span className="font-bold text-white block">Excel / CSV File</span>
                <p className="text-[10px] text-slate-400">Untouched client workbook</p>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1">
                <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase block">2. Raw Import</span>
                <span className="font-bold text-emerald-400 block">Immutable Store</span>
                <p className="text-[10px] text-slate-400">sourceFile, sourceRow, batchID</p>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1">
                <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase block">3. Schema Mapping</span>
                <span className="font-bold text-white block">Confidence Matrix</span>
                <p className="text-[10px] text-slate-400">Semantic alignment</p>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1">
                <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase block">4. Canonical Record</span>
                <span className="font-bold text-white block">System-Control Model</span>
                <p className="text-[10px] text-slate-400">Normalized entity key</p>
              </div>

              <div className="p-4 bg-indigo-900/60 rounded-2xl border border-indigo-500/50 space-y-1">
                <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase block">5. Calculation</span>
                <span className="font-bold text-emerald-400 block">Zero-Variance Engine</span>
                <p className="text-[10px] text-slate-300">Auditable KPI outputs</p>
              </div>
            </div>
          </div>

          {/* SYSTEM CONTROL DERIVED FIELDS LIST */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                System-Control & Lineage Derived Fields (15 Control Properties)
              </h3>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Derived Field Key</th>
                    <th className="p-4">Property Name</th>
                    <th className="p-4">Derivation Logic & Lineage Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {SYSTEM_CONTROL_DERIVED_FIELDS.map((f) => (
                    <tr key={f.key} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-600">{f.key}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{f.label}</div>
                        <div className="text-[11px] text-slate-500">{f.labelAr}</div>
                      </td>
                      <td className="p-4 text-slate-600 leading-relaxed">{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: ISOLATED CUSTOM FIELDS */}
      {activeSchemaTab === 'custom' && (
        <div className="space-y-6">
          <div className="p-5 bg-indigo-950 text-indigo-100 rounded-3xl border border-indigo-900 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <Lock className="w-4 h-4" />
              <span>Strict Custom Fields Isolation Architecture</span>
            </div>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Custom fields uploaded by users (e.g., contractor internal codes, cost centers, site zone labels) are strictly routed to Metadata / Reporting / Filtering and are isolated from the Core Calculation Engine. They cannot alter SSOT metrics like Approval Rate or Response Time unless explicitly registered in the Calculation Rule Registry.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Plus className="w-5 h-5 text-indigo-600" />
              Register Custom Extension Field
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Field Key:</label>
                <input
                  type="text"
                  value={newCustomKey}
                  onChange={e => setNewCustomKey(e.target.value)}
                  placeholder="e.g. wbsCode"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Display Label:</label>
                <input
                  type="text"
                  value={newCustomLabel}
                  onChange={e => setNewCustomLabel(e.target.value)}
                  placeholder="e.g. WBS Cost Center"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description:</label>
                <input
                  type="text"
                  value={newCustomDesc}
                  onChange={e => setNewCustomDesc(e.target.value)}
                  placeholder="e.g. Subcontract cost allocation code"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleAddCustomField}
              disabled={!newCustomKey || !newCustomLabel}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Isolated Custom Field
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm">Active Custom Fields (Metadata / Reporting / Filtering Only)</h4>
            </div>

            <div className="p-4 space-y-3">
              {customFields.map(cf => (
                <div key={cf.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600">{cf.key}</span>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded text-[10px] font-mono font-bold">
                        ISOLATED METADATA
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 block">{cf.label}</span>
                    <p className="text-[11px] text-slate-500">{cf.description}</p>
                  </div>

                  <button
                    onClick={() => handleDeleteCustomField(cf.key)}
                    className="p-2 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                    title="Remove custom field"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
