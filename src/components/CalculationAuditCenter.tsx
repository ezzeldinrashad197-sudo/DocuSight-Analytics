import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, CheckCircle2, Award, FileText, BarChart3, Database, 
  Network, ArrowRight, AlertTriangle, RefreshCw, FileDown, 
  Activity, Check, Layers, ChevronRight, Search, Filter, History, 
  Info, GitCommit, GitBranch, ArrowDown, FolderTree, AlertOctagon, 
  CheckCircle, HelpCircle, Eye, Cpu, Zap, Lock, Sparkles, Code
} from 'lucide-react';
import { SubmittalRow, ProjectSettings } from '../types';
import { calculateStats, calculateNCRStats, calculateSORStats, parseDateTimestamp } from '../utils/calculations';
import { compareRevisions, isValidRevision } from '../analytics/analyticsCore';
import { getRevisionWeight } from '../analytics/revisionResolver';
import { AuditIntegrityCenter } from './AuditIntegrityCenter';

interface CalculationAuditCenterProps {
  data: SubmittalRow[];
  projectInfo?: ProjectSettings | null;
}

export const CalculationAuditCenter: React.FC<CalculationAuditCenterProps> = ({
  data,
  projectInfo
}) => {
  const [activeTab, setActiveTab] = useState<'governance' | 'revision' | 'decisionTree' | 'kpiSource' | 'duplicates' | 'rules'>('governance');

  // Filters for Revision Audit
  const [revSearchTerm, setRevSearchTerm] = useState('');
  const [revFilterWorkflow, setRevFilterWorkflow] = useState('ALL');
  const [revFilterClass, setRevFilterClass] = useState('ALL');
  const [revFilterDisc, setRevFilterDisc] = useState('ALL');
  const [selectedAuditDoc, setSelectedAuditDoc] = useState<string | null>(null);

  // States for KPI Source Audit
  const [selectedKpiMetric, setSelectedKpiMetric] = useState<string>('approved');
  const [selectedKpiWf, setSelectedKpiWf] = useState<string>('ALL');

  // Build Document-level Revision Resolution Dataset
  const auditDataset = useMemo(() => {
    const map = new Map<string, {
      docNo: string;
      logType: string;
      workflowFamily: string;
      discipline: string;
      contractor: string;
      history: SubmittalRow[];
      revHistoryChain: string;
      invalidRevCount: number;
      latestRow: SubmittalRow;
      latestRevStr: string;
      latestRevNum: number;
      isRev0: boolean;
      classification: 'Rev0' | 'Further Rev' | 'Missing Revision';
      ruleApplied: string;
      reason: string;
      approvalCode: string;
      currentStatus: string;
    }>();

    data.forEach(row => {
      const key = (row.docNo || row.ncrRef || row.sorRef || (row as any).drawingNo || '').trim().toUpperCase();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          docNo: key,
          logType: row.logType || row.documentType || 'LOG',
          workflowFamily: row.workflowFamily || 'GENERAL',
          discipline: row.discipline || row.trade || 'General',
          contractor: row.contractor || 'N/A',
          history: [],
          revHistoryChain: '',
          invalidRevCount: 0,
          latestRow: row,
          latestRevStr: '0',
          latestRevNum: 0,
          isRev0: true,
          classification: 'Rev0',
          ruleApplied: 'ER-REV-001',
          reason: '',
          approvalCode: (row as any).code || row.status || 'Pending',
          currentStatus: row.status || 'Under Review'
        });
      }
      map.get(key)!.history.push(row);
    });

    return Array.from(map.values()).map(item => {
      // Sort history chronologically then by revision
      item.history.sort((a, b) => {
        const da = parseDateTimestamp(a.submissionDate);
        const db = parseDateTimestamp(b.submissionDate);
        if (da !== db) return da - db;
        return compareRevisions(a.rev, b.rev);
      });

      const invalidCount = item.history.filter(h => !isValidRevision(h.rev)).length;
      item.invalidRevCount = invalidCount;

      item.revHistoryChain = item.history.map(h => isValidRevision(h.rev) ? String(h.rev).trim() : '(blank)').join(' → ');

      const validHistory = item.history.filter(h => isValidRevision(h.rev));

      const latestOverall = item.history[item.history.length - 1];
      item.latestRow = latestOverall;
      item.approvalCode = (latestOverall as any).code || latestOverall.status || 'Pending';
      item.currentStatus = latestOverall.status || 'Under Review';

      if (validHistory.length > 0) {
        const sortedValid = [...validHistory].sort((a, b) => {
          const da = parseDateTimestamp(a.submissionDate);
          const db = parseDateTimestamp(b.submissionDate);
          if (da !== db) return da - db;
          return compareRevisions(a.rev, b.rev);
        });
        const latestValid = sortedValid[sortedValid.length - 1];
        const revRaw = (latestValid.rev || '').trim();
        item.latestRevStr = revRaw;
        item.latestRevNum = getRevisionWeight(revRaw);

        const isRev0 = getRevisionWeight(revRaw) === 0;
        item.isRev0 = isRev0;
        item.classification = isRev0 ? 'Rev0' : 'Further Rev';

        const ignoredNote = invalidCount > 0 ? ` (Ignored ${invalidCount} blank/invalid revision value(s)).` : '';

        if (item.history.length === 1) {
          if (isRev0) {
            item.ruleApplied = 'ER-REV-001 (Initial Release)';
            item.reason = `Single transmittal row recorded. Latest resolved revision is "${revRaw}". Classified as Rev0.${ignoredNote}`;
          } else {
            item.ruleApplied = 'ER-REV-002 (Single-Entry Revision >0)';
            item.reason = `Single transmittal row recorded with pre-incremented revision "${revRaw}". Classified as Further Rev.${ignoredNote}`;
          }
        } else {
          if (isRev0) {
            item.ruleApplied = 'ER-REV-003 (Multi-Transmittal Rev0 Maintenance)';
            item.reason = `Document has ${item.history.length} transmittal cycles. Latest resolved revision remains "${revRaw}". Classified as Rev0.${ignoredNote}`;
          } else {
            item.ruleApplied = 'ER-REV-004 (Multi-Transmittal Revision Increment)';
            item.reason = `Document re-submitted across ${item.history.length} transmittal cycles. Latest resolved revision is "${revRaw}". Classified as Further Rev.${ignoredNote}`;
          }
        }
      } else {
        item.latestRevStr = '(blank)';
        item.latestRevNum = -1;
        item.isRev0 = false;
        item.classification = 'Missing Revision';
        item.ruleApplied = 'ER-REV-000 (No Valid Revision)';
        item.reason = `Document has ${item.history.length} row(s) but all revision values are blank/invalid. Excluded from Rev0/Further Rev classification.`;
      }

      return item;
    });
  }, [data]);

  // Unique Disciplines and Workflows for Filters
  const uniqueWorkflows = useMemo(() => Array.from(new Set(auditDataset.map(d => d.logType))), [auditDataset]);
  const uniqueDisciplines = useMemo(() => Array.from(new Set(auditDataset.map(d => d.discipline))), [auditDataset]);

  // Duplicate & Conflict Detection
  const conflictsData = useMemo(() => {
    const statusConflicts: any[] = [];
    const revisionConflicts: any[] = [];
    const workflowMismatches: any[] = [];

    auditDataset.forEach(item => {
      // Check for status conflicts across transmittals
      if (item.history.length > 1) {
        const statuses = new Set(item.history.map(h => (h.status || '').trim().toLowerCase()));
        if (statuses.size > 1) {
          statusConflicts.push({
            docNo: item.docNo,
            logType: item.logType,
            count: item.history.length,
            statuses: Array.from(statuses),
            latestStatus: item.currentStatus
          });
        }
      }

      // Check for non-sequential revision dates
      for (let i = 0; i < item.history.length - 1; i++) {
        const dateA = new Date(item.history[i].submissionDate || 0).getTime();
        const dateB = new Date(item.history[i + 1].submissionDate || 0).getTime();
        if (dateA > dateB && dateA > 0 && dateB > 0) {
          revisionConflicts.push({
            docNo: item.docNo,
            logType: item.logType,
            prevRev: item.history[i].rev,
            nextRev: item.history[i + 1].rev,
            prevDate: item.history[i].submissionDate,
            nextDate: item.history[i + 1].submissionDate
          });
        }
      }

      // Check for Workflow Family vs Sheet Name Mismatch
      if (item.docNo.startsWith('ABD-') && !item.logType.toUpperCase().includes('ABD') && !item.logType.toUpperCase().includes('AS-BUILT')) {
        workflowMismatches.push({
          docNo: item.docNo,
          logType: item.logType,
          expected: 'ABD (As-Built Drawings)',
          issue: `Document ref starts with ABD, but sheet name is "${item.logType}"`
        });
      }
    });

    return {
      statusConflicts,
      revisionConflicts,
      workflowMismatches,
      totalConflicts: statusConflicts.length + revisionConflicts.length + workflowMismatches.length
    };
  }, [auditDataset]);

  // KPI Source Dataset
  const kpiSourceRecords = useMemo(() => {
    return auditDataset.filter(item => {
      if (selectedKpiWf !== 'ALL' && item.logType !== selectedKpiWf) return false;

      const code = item.approvalCode.toUpperCase();
      const status = item.currentStatus.toUpperCase();

      if (selectedKpiMetric === 'approved') {
        return code.includes('A') || code.includes('APP') || status.includes('APPROVED');
      }
      if (selectedKpiMetric === 'approved_comments') {
        return code.includes('B') || status.includes('COMMENTS') || status.includes('APPROVED WITH COMMENTS');
      }
      if (selectedKpiMetric === 'rejected') {
        return code.includes('C') || code.includes('D') || status.includes('REJECTED');
      }
      if (selectedKpiMetric === 'pending') {
        return code.includes('PENDING') || status.includes('UNDER REVIEW') || status.includes('AWAITING');
      }
      if (selectedKpiMetric === 'rev0') {
        return item.isRev0;
      }
      if (selectedKpiMetric === 'further_rev') {
        return !item.isRev0;
      }
      return true;
    });
  }, [auditDataset, selectedKpiMetric, selectedKpiWf]);

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-emerald-950 text-white p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                Auditable Decision Engine (مركز تدقيق الحسابات والمطابقة)
              </span>
              <h1 className="text-2xl font-black text-white font-sans tracking-tight">
                StructuSight Calculation Audit Center
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Eliminates black-box analytics by establishing 100% document-level traceability, rule execution verification, decision tree visualizers, and zero-variance KPI source audits across every engineering log.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-right shrink-0">
          <div>
            <span className="text-[10px] text-slate-400 font-mono block uppercase tracking-wider">Unique Docs In Audit Scope</span>
            <span className="text-2xl font-black font-mono text-emerald-400">{auditDataset.length}</span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-400 font-mono block uppercase tracking-wider">Detected Conflicts</span>
            <span className={`text-2xl font-black font-mono ${conflictsData.totalConflicts > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {conflictsData.totalConflicts}
            </span>
          </div>
        </div>
      </div>

      {/* TOP LEVEL MODULE TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button 
          onClick={() => setActiveTab('governance')}
          className={`px-5 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeTab === 'governance' ? 'bg-slate-900 text-emerald-400 shadow-sm border border-emerald-500/30' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Audit & Integrity Center (مركز الحوكمة والنزاهة والشهادات)
        </button>

        <button 
          onClick={() => setActiveTab('revision')}
          className={`px-5 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeTab === 'revision' ? 'bg-slate-900 text-emerald-400 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <History className="w-4 h-4 text-emerald-500" />
          Revision & Timeline Audit (تدقيق المراجعات والجدول الزمني)
        </button>

        <button 
          onClick={() => setActiveTab('decisionTree')}
          className={`px-5 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeTab === 'decisionTree' ? 'bg-slate-900 text-emerald-400 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <FolderTree className="w-4 h-4 text-emerald-500" />
          Classification Decision Tree (شجرة قرارات التصنيف)
        </button>

        <button 
          onClick={() => setActiveTab('kpiSource')}
          className={`px-5 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeTab === 'kpiSource' ? 'bg-slate-900 text-emerald-400 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <Database className="w-4 h-4 text-emerald-500" />
          KPI Source Drilldown (مصدر الحسابات ومؤشرات الأداء)
        </button>

        <button 
          onClick={() => setActiveTab('duplicates')}
          className={`px-5 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeTab === 'duplicates' ? 'bg-slate-900 text-emerald-400 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <AlertOctagon className="w-4 h-4 text-amber-500" />
          Conflict & Duplicate Detector (كاشف التكرارات والتعارضات)
        </button>

        <button 
          onClick={() => setActiveTab('rules')}
          className={`px-5 py-3 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shrink-0 ${activeTab === 'rules' ? 'bg-slate-900 text-emerald-400 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          <Code className="w-4 h-4 text-emerald-500" />
          System Rules Trace (سجل القواعد البرمجية)
        </button>
      </div>

      {/* TAB 0: AUDIT & INTEGRITY CENTER */}
      {activeTab === 'governance' && (
        <AuditIntegrityCenter projectInfo={projectInfo} />
      )}

      {/* TAB 1: REVISION & TIMELINE AUDIT */}
      {activeTab === 'revision' && (
        <div className="space-y-6">
          {/* STATS HIGHLIGHT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">Total Unique Documents</span>
              <p className="text-2xl font-black text-slate-900 font-mono">{auditDataset.length}</p>
              <p className="text-[11px] text-slate-500">Deduped across all history rows</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block">Rev0 Initial Releases</span>
              <p className="text-2xl font-black text-emerald-600 font-mono">
                {auditDataset.filter(d => d.isRev0).length}
              </p>
              <p className="text-[11px] text-emerald-600">Latest resolved revision = Rev 0</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] text-purple-700 font-bold uppercase tracking-wider block">Further Rev Classifications</span>
              <p className="text-2xl font-black text-purple-600 font-mono">
                {auditDataset.filter(d => !d.isRev0).length}
              </p>
              <p className="text-[11px] text-purple-600">Latest resolved revision &gt; 0</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block">Multi-Transmittal Lifecycle</span>
              <p className="text-2xl font-black text-amber-600 font-mono">
                {auditDataset.filter(d => d.history.length > 1).length}
              </p>
              <p className="text-[11px] text-amber-600">Re-submitted across &gt;1 transmittal</p>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search document no, discipline, contractor..."
                value={revSearchTerm}
                onChange={(e) => setRevSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 font-bold">Workflow:</span>
                <select 
                  value={revFilterWorkflow} 
                  onChange={(e) => setRevFilterWorkflow(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none bg-slate-50 font-sans font-semibold text-slate-700"
                >
                  <option value="ALL">All Workflows</option>
                  {uniqueWorkflows.map((lt, idx) => (
                    <option key={idx} value={lt}>{lt}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 font-bold">Discipline:</span>
                <select 
                  value={revFilterDisc} 
                  onChange={(e) => setRevFilterDisc(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none bg-slate-50 font-sans font-semibold text-slate-700"
                >
                  <option value="ALL">All Disciplines</option>
                  {uniqueDisciplines.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 font-bold">Classification:</span>
                <select 
                  value={revFilterClass} 
                  onChange={(e) => setRevFilterClass(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none bg-slate-50 font-sans font-semibold text-slate-700"
                >
                  <option value="ALL">All Classifications</option>
                  <option value="Rev0">Rev0 Only</option>
                  <option value="Further Rev">Further Rev Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900">Document Revision Calculation Audit Records</h4>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Showing {
                  auditDataset.filter(item => {
                    const matchesSearch = !revSearchTerm || item.docNo.toLowerCase().includes(revSearchTerm.toLowerCase()) || item.discipline.toLowerCase().includes(revSearchTerm.toLowerCase());
                    const matchesWf = revFilterWorkflow === 'ALL' || item.logType === revFilterWorkflow;
                    const matchesDisc = revFilterDisc === 'ALL' || item.discipline === revFilterDisc;
                    const matchesCl = revFilterClass === 'ALL' || item.classification === revFilterClass;
                    return matchesSearch && matchesWf && matchesDisc && matchesCl;
                  }).length
                } of {auditDataset.length} documents
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="p-3">Document Number</th>
                    <th className="p-3">Revision History</th>
                    <th className="p-3 text-center">Latest Revision</th>
                    <th className="p-3 text-center">Invalid Revision Values</th>
                    <th className="p-3 text-center">Classification</th>
                    <th className="p-3">Log / Workflow</th>
                    <th className="p-3">Discipline</th>
                    <th className="p-3 text-center">Transmittals</th>
                    <th className="p-3">Rule Applied</th>
                    <th className="p-3 text-right font-mono">Timeline & Trace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditDataset
                    .filter(item => {
                      const matchesSearch = !revSearchTerm || item.docNo.toLowerCase().includes(revSearchTerm.toLowerCase()) || item.discipline.toLowerCase().includes(revSearchTerm.toLowerCase());
                      const matchesWf = revFilterWorkflow === 'ALL' || item.logType === revFilterWorkflow;
                      const matchesDisc = revFilterDisc === 'ALL' || item.discipline === revFilterDisc;
                      const matchesCl = revFilterClass === 'ALL' || item.classification === revFilterClass;
                      return matchesSearch && matchesWf && matchesDisc && matchesCl;
                    })
                    .slice(0, 100)
                    .map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">{item.docNo}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold font-mono text-[11px]">
                            {item.revHistoryChain || item.latestRevStr}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900">
                          {item.latestRevStr}
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${item.invalidRevCount > 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-500'}`}>
                            {item.invalidRevCount}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                            item.classification === 'Rev0' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            item.classification === 'Further Rev' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {item.classification}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {item.logType}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">{item.discipline}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {item.history.length}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-600">
                          {item.ruleApplied}
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => setSelectedAuditDoc(selectedAuditDoc === item.docNo ? null : item.docNo)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3 text-emerald-600" />
                            {selectedAuditDoc === item.docNo ? 'Hide' : 'Inspect Timeline'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* EXPANDED INTERACTIVE TIMELINE MODAL */}
            {selectedAuditDoc && (
              <div className="p-6 bg-slate-950 text-white border-t border-slate-800 space-y-6">
                {(() => {
                  const targetDoc = auditDataset.find(d => d.docNo === selectedAuditDoc);
                  if (!targetDoc) return null;
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <div>
                          <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-wider">
                            Interactive Transmittal Lifecycle Timeline
                          </span>
                          <h3 className="text-lg font-bold text-white font-mono mt-0.5">{targetDoc.docNo}</h3>
                        </div>
                        <button 
                          onClick={() => setSelectedAuditDoc(null)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                        >
                          Close Timeline Inspector
                        </button>
                      </div>

                      {/* TIMELINE STEPS VISUALIZER */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chronological Transmittal Journey:</h4>
                        <div className="flex flex-col md:flex-row items-stretch gap-3 overflow-x-auto py-2">
                          {targetDoc.history.map((step, sIdx) => {
                            const isLatest = step === targetDoc.latestRow;
                            return (
                              <div key={sIdx} className={`p-4 rounded-2xl border flex-1 min-w-[220px] flex flex-col justify-between space-y-3 ${isLatest ? 'bg-emerald-950/60 border-emerald-500/50 shadow-lg ring-1 ring-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono text-slate-400 font-bold">Transmittal Cycle #{sIdx + 1}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isLatest ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                                    {isLatest ? 'LATEST RESOLVED' : 'PREVIOUS'}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-xs text-slate-400 font-mono block">REVISION</span>
                                  <span className="text-xl font-black text-white font-mono">{step.rev || '0'}</span>
                                </div>

                                <div className="text-[11px] space-y-1 font-mono text-slate-300 border-t border-slate-800/80 pt-2">
                                  <p><span className="text-slate-500">Submitted:</span> {step.submissionDate || 'N/A'}</p>
                                  <p><span className="text-slate-500">Status:</span> <strong className="text-white">{step.status || 'Pending'}</strong></p>
                                  <p><span className="text-slate-500">Approval Code:</span> <strong className="text-emerald-400">{(step as any).code || step.status || 'N/A'}</strong></p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* DECISION SUMMARY CARD */}
                      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                        <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-wider">Calculation Audit Conclusion</span>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                          {targetDoc.reason}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CLASSIFICATION DECISION TREE */}
      {activeTab === 'decisionTree' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-emerald-600" />
                  Classification Decision Tree Architecture
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualizes the exact multi-node logic executed by StructuSight Analytics to classify every uploaded row.
                </p>
              </div>
            </div>

            {/* DECISION TREE FLOW DIAGRAM */}
            <div className="bg-slate-950 p-6 rounded-2xl text-white space-y-6 overflow-x-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center font-mono text-xs">
                {/* NODE 1 */}
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 w-full md:w-48 space-y-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold">1. Raw Input</div>
                  <p className="text-[11px] text-slate-400 font-sans">Transmittal Row Ingested</p>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-600 hidden md:block" />

                {/* NODE 2 */}
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 w-full md:w-48 space-y-2">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl font-bold">2. Doc Grouping</div>
                  <p className="text-[11px] text-slate-400 font-sans">Deduped by Doc Number</p>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-600 hidden md:block" />

                {/* NODE 3 */}
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 w-full md:w-48 space-y-2">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl font-bold">3. Rev Resolution</div>
                  <p className="text-[11px] text-slate-400 font-sans">Isolate Max Date / Rev</p>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-600 hidden md:block" />

                {/* NODE 4 */}
                <div className="p-4 bg-slate-900 rounded-2xl border border-emerald-500/40 w-full md:w-56 space-y-2 bg-emerald-950/30">
                  <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl font-bold">4. Final Decision</div>
                  <p className="text-[11px] text-emerald-300 font-sans">Rev0 vs Further Rev</p>
                </div>
              </div>

              {/* LIVE EXAMPLES FROM CURRENT DATASET */}
              <div className="border-t border-slate-800 pt-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
                  Sample Decision Traces Executed on Uploaded Dataset:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {auditDataset.slice(0, 4).map((sample, idx) => (
                    <div key={idx} className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-400">{sample.docNo}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sample.isRev0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300'}`}>
                          {sample.classification}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-sans text-slate-300">
                        <p><strong className="text-slate-400">Workflow:</strong> {sample.logType}</p>
                        <p><strong className="text-slate-400">Transmittal History:</strong> {sample.history.length} cycle(s)</p>
                        <p><strong className="text-slate-400">Resolved Revision:</strong> <span className="font-mono text-white font-bold">{sample.latestRevStr}</span></p>
                        <p><strong className="text-slate-400">Applied Rule:</strong> <span className="font-mono text-emerald-400 text-[11px]">{sample.ruleApplied}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KPI SOURCE DRILLDOWN */}
      {activeTab === 'kpiSource' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  Zero-Variance KPI Source Inspector
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select any KPI metric to inspect the exact underlying document keys with guaranteed zero variance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Filter Workflow:</span>
                <select 
                  value={selectedKpiWf} 
                  onChange={(e) => setSelectedKpiWf(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none bg-slate-50 font-sans font-semibold text-slate-700"
                >
                  <option value="ALL">All Workflows</option>
                  {uniqueWorkflows.map((lt, idx) => (
                    <option key={idx} value={lt}>{lt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* METRIC SELECTOR CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { id: 'approved', label: 'Approved (Code A)', color: 'emerald' },
                { id: 'approved_comments', label: 'App. w/ Comments', color: 'blue' },
                { id: 'rejected', label: 'Rejected (Code C/D)', color: 'red' },
                { id: 'pending', label: 'Pending Review', color: 'amber' },
                { id: 'rev0', label: 'Rev0 Clean Release', color: 'teal' },
                { id: 'further_rev', label: 'Further Revision', color: 'purple' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedKpiMetric(m.id)}
                  className={`p-3 rounded-2xl border text-center transition-all ${selectedKpiMetric === m.id ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">{m.label}</span>
                  <span className="text-lg font-black font-mono">
                    {
                      auditDataset.filter(item => {
                        if (selectedKpiWf !== 'ALL' && item.logType !== selectedKpiWf) return false;
                        const code = item.approvalCode.toUpperCase();
                        const status = item.currentStatus.toUpperCase();
                        if (m.id === 'approved') return code.includes('A') || code.includes('APP') || status.includes('APPROVED');
                        if (m.id === 'approved_comments') return code.includes('B') || status.includes('COMMENTS') || status.includes('APPROVED WITH COMMENTS');
                        if (m.id === 'rejected') return code.includes('C') || code.includes('D') || status.includes('REJECTED');
                        if (m.id === 'pending') return code.includes('PENDING') || status.includes('UNDER REVIEW') || status.includes('AWAITING');
                        if (m.id === 'rev0') return item.isRev0;
                        if (m.id === 'further_rev') return !item.isRev0;
                        return true;
                      }).length
                    }
                  </span>
                </button>
              ))}
            </div>

            {/* KPI RECORD DRILLDOWN TABLE */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Document Source Records for Metric "{selectedKpiMetric.toUpperCase()}"
                </span>
                <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Count = {kpiSourceRecords.length} (Variance = 0)
                </span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-200 text-slate-700 font-bold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="p-2.5">Document No</th>
                      <th className="p-2.5">Workflow Sheet</th>
                      <th className="p-2.5">Discipline</th>
                      <th className="p-2.5">Approval Code</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Latest Rev</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {kpiSourceRecords.slice(0, 100).map((r, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-slate-900">{r.docNo}</td>
                        <td className="p-2.5 text-slate-700">{r.logType}</td>
                        <td className="p-2.5 text-slate-600">{r.discipline}</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-600">{r.approvalCode}</td>
                        <td className="p-2.5 text-slate-800">{r.currentStatus}</td>
                        <td className="p-2.5 font-mono text-slate-900 font-bold">{r.latestRevStr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONFLICT & DUPLICATE DETECTOR */}
      {activeTab === 'duplicates' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-amber-600" />
                  Dataset Integrity & Conflict Detector
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scans all records for status discrepancies, non-sequential revisions, and workflow family mismatches.
                </p>
              </div>

              <div className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold font-mono">
                Total Flagged Conflicts: {conflictsData.totalConflicts}
              </div>
            </div>

            {conflictsData.totalConflicts === 0 ? (
              <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-emerald-900">0 Data Integrity Conflicts Detected!</h4>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  Every document key in your uploaded dataset follows clean, sequential revision tracking and matching workflow classifications.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* STATUS CONFLICTS */}
                {conflictsData.statusConflicts.length > 0 && (
                  <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Status Discrepancies Across Transmittals ({conflictsData.statusConflicts.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs bg-white rounded-xl border border-amber-200">
                        <thead className="bg-amber-100/60 text-amber-900 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2.5">Document No</th>
                            <th className="p-2.5">Sheet</th>
                            <th className="p-2.5">Transmittal Cycles</th>
                            <th className="p-2.5">Historical Statuses Recorded</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {conflictsData.statusConflicts.map((sc, idx) => (
                            <tr key={idx}>
                              <td className="p-2.5 font-mono font-bold text-slate-900">{sc.docNo}</td>
                              <td className="p-2.5">{sc.logType}</td>
                              <td className="p-2.5 font-mono">{sc.count}</td>
                              <td className="p-2.5 font-mono text-amber-800">{sc.statuses.join(' ➔ ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM RULES TRACE */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Code className="w-5 h-5 text-emerald-600" />
                  StructuSight Specification Rules Reference
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formal specification standards governing calculation, revision resolution, and workflow classification.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-mono font-bold text-emerald-700 text-xs block">ER-REV-001: Initial Clean Release</span>
                <p className="text-slate-600 leading-relaxed">
                  Documents with revision equal to "0", "00", or blank on their initial submission are classified strictly as Rev0 (Initial Release).
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-mono font-bold text-purple-700 text-xs block">ER-REV-002: Subsequent Revision Increment</span>
                <p className="text-slate-600 leading-relaxed">
                  Documents with resolved revision numbers greater than 0 are classified as Further Rev (Revision &gt; 0).
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-mono font-bold text-blue-700 text-xs block">ER-REV-003: Latest Transmittal Override</span>
                <p className="text-slate-600 leading-relaxed">
                  When multiple transmittals exist for the same Document Number, the latest resolved revision and status override all historical transmittals.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-mono font-bold text-amber-700 text-xs block">ER-WF-004: Workflow Family Precedence</span>
                <p className="text-slate-600 leading-relaxed">
                  Workflow family detection prioritizes explicit prefixes (e.g. ABD-*, SDW-*, MAR-*) over ambient worksheet tab names.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
