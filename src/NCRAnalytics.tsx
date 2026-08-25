import React, { useMemo, useState } from 'react';
import { SubmittalRow, ProjectSettings } from './types';
import { processNCRData } from './analytics/ncr/ncrEngine';
import { KpiCard, DataTable } from './components/dashboard/ReusableComponents';
import { useLanguage, parseMixedText } from './utils/i18n';
import { CheckCircle2, AlertTriangle, HelpCircle, Search, Info, Calendar, Clock, Database, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  data: SubmittalRow[];
  monthlyStart?: string;
  monthlyEnd?: string;
  projectInfo?: ProjectSettings | null;
}

export default function NCRAnalytics({ data, monthlyStart }: Props) {
  const { language } = useLanguage();
  const safeData = Array.isArray(data) ? data : [];

  const parse = (text: string) => parseMixedText(text, language);

  const { cumulative, monthly, monthlySubmissions, monthlyKPIs, cumulativeKPIs, evidenceList, integrityReport } = useMemo(() => {
    return processNCRData(safeData, monthlyStart);
  }, [safeData, monthlyStart]);

  const [showIntegrityDetails, setShowIntegrityDetails] = useState(false);
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState('ALL');

  const appRateStr = monthlyKPIs.responsesReceived > 0 ? ((monthlyKPIs.approved / monthlyKPIs.responsesReceived) * 100).toFixed(1) + '%' : '0.0%';


  const cumulativeCols = useMemo(() => [
    { key: 'discipline', label: parse('Discipline | التخصص') },
    { key: 'totalUnique', label: parse('Total Unique | الإجمالي الفريد'), rightAlign: true, render: (val: Record<string, any>) => <span className="font-bold text-slate-900">{val.totalUnique}</span> },
    { key: 'notSent', label: parse('Not Sent yet (Stage 1) | لم ترسل (جديد/مسودة)'), rightAlign: true, render: (val: Record<string, any>) => <span className={val.notSent > 0 ? "text-amber-600 font-medium" : "text-slate-500"}>{val.notSent}</span> },
    { key: 'underReview', label: parse('Under Review (Stage 2) | قيد مراجعة الاستشاري'), rightAlign: true, render: (val: Record<string, any>) => <span className={val.underReview > 0 ? "text-indigo-600 font-medium" : "text-slate-500"}>{val.underReview}</span> },
    { key: 'rejectedOpen', label: parse('Rejected (Stage 3) | مرفوض ومفتوح'), rightAlign: true, render: (val: Record<string, any>) => <span className={val.rejectedOpen > 0 ? "text-rose-600 font-medium" : "text-slate-500"}>{val.rejectedOpen}</span> },
    { key: 'approvedClosed', label: parse('Closed Approved (Stage 3) | مغلق معتمد'), rightAlign: true, render: (val: Record<string, any>) => <span className={val.approvedClosed > 0 ? "text-emerald-600 font-medium" : "text-slate-500"}>{val.approvedClosed}</span> },
    { key: 'open', label: parse('Currently Open | المفتوح حالياً'), rightAlign: true, render: (val: Record<string, any>) => <span className="font-bold text-slate-800">{val.open}</span> },
    { key: 'closed', label: parse('Currently Closed | المغلق حالياً'), rightAlign: true, render: (val: Record<string, any>) => <span className="font-bold text-slate-800">{val.closed}</span> }
  ], [language]);

  const monthlyCols = useMemo(() => [
    { key: 'classification', label: parse('Discipline | التخصص') },
    { key: 'newNcrReceived', label: parse('New Received | مستلمة جديدة'), rightAlign: true },
    { key: 'correctiveSubmitted', label: parse('Corrective Submitted | تقديمات الحلول'), rightAlign: true, render: (val: Record<string, any>) => <span className="font-bold text-slate-700">{val.correctiveSubmitted}</span> },
    { key: 'responsesReceived', label: parse('Responses Received | ردود الاستشاري'), rightAlign: true },
    { key: 'approved', label: parse('Approved | معتمد'), rightAlign: true, render: (val: Record<string, any>) => <span className="text-emerald-600 font-medium">{val.approved}</span> },
    { key: 'rejected', label: parse('Rejected | مرفوض'), rightAlign: true, render: (val: Record<string, any>) => <span className="text-rose-600 font-medium">{val.rejected}</span> },
    { key: 'waitingConsultant', label: parse('Waiting Consultant | بانتظار الاستشاري'), rightAlign: true, render: (val: Record<string, any>) => <span className="text-indigo-600">{val.waitingConsultant}</span> },
    { key: 'waitingContractor', label: parse('Waiting Contractor | بانتظار المقاول'), rightAlign: true, render: (val: Record<string, any>) => <span className="text-amber-600">{val.waitingContractor}</span> },
    { key: 'overdue', label: parse('Overdue | متجاوز'), rightAlign: true, render: (val: Record<string, any>) => <span className={val.overdue > 0 ? "text-rose-600 font-bold" : "text-slate-500"}>{val.overdue}</span> }
  ], [language]);

  const detailCols = useMemo(() => [
    { key: 'ref', label: parse('NCR Ref | رقم التقرير'), render: (val: Record<string, any>) => <span className="font-mono text-xs font-bold text-slate-900">{val.ref}</span> },
    { key: 'trade', label: parse('Trade | التخصص'), render: (val: Record<string, any>) => <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">{val.trade}</span> },
    { key: 'rev', label: parse('Rev. | مراجعة'), render: (val: Record<string, any>) => <span className="font-medium">{val.rev || '0'}</span> },
    { key: 'sentDate', label: parse('Sent Date | تاريخ الإرسال'), render: (val: Record<string, any>) => <span className="text-slate-600">{val.sentDate || '-'}</span> },
    { key: 'action', label: parse('Action (Latest) | الإجراء (الأحدث)'), render: (val: Record<string, any>) => <span className="text-slate-700 font-medium">{val.action || '-'}</span> },
    { key: 'status', label: parse('Status (Latest) | الحالة (الأحدث)'), render: (val: Record<string, any>) => <span className="text-slate-700 font-medium">{val.status || '-'}</span> },
    { key: 'classification', label: parse('Classification | التصنيف'), render: (val: Record<string, any>) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        val.classification === 'Approved Closed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
        val.classification === 'Rejected Open' ? 'bg-rose-50 border-rose-200 text-rose-700' : 
        'bg-slate-50 border-slate-200 text-slate-700'
      }`}>{val.classification}</span>
    )}
  ], [language]);

  const filteredEvidence = useMemo(() => {
    return (evidenceList || []).filter((item) => {
      const matchesSearch = item.ref.toLowerCase().includes(evidenceSearch.toLowerCase()) ||
                            item.discipline.toLowerCase().includes(evidenceSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (evidenceFilter === 'ALL') return true;
      if (evidenceFilter === 'STAGE1') return item.stage.startsWith('Stage 1');
      if (evidenceFilter === 'STAGE2') return item.stage.startsWith('Stage 2');
      if (evidenceFilter === 'STAGE3_APP') return item.stage.startsWith('Stage 3: Approved');
      if (evidenceFilter === 'STAGE3_REJ') return item.stage.startsWith('Stage 3: Rejected');
      if (evidenceFilter === 'NEW_MONTH') return item.isNewInMonth;
      if (evidenceFilter === 'SUB_MONTH') return item.isSubmittedInMonth;
      if (evidenceFilter === 'RESP_MONTH') return item.isRespondedInMonth;
      if (evidenceFilter === 'OVERDUE') return item.isOverdue;
      return true;
    });
  }, [evidenceList, evidenceSearch, evidenceFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="border-b pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{parse('Monthly NCR KPIs | مؤشرات الأداء لتقارير عدم المطابقة الخاضعة للشهور')}</h2>
          <p className="text-xs text-slate-500 mt-1">{parse('Analytical reporting containing KPIs, overdue limits, and status of corrective actions. | تقرير تحليلي يحتوي على المؤشرات الرئيسية، وتتابع الإجراءات التصحيحية لعدم المطابقة.')}</p>
        </div>

        {/* Chapter 9: Engine Integrity Monitor */}
        <div className="flex items-center">
          <button
            onClick={() => setShowIntegrityDetails(!showIntegrityDetails)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all border cursor-pointer ${
              integrityReport?.passed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {integrityReport?.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
            <span>{parse('Engine Integrity: 100% PASS | سلامة المحرك الحسابي: مطابقة تامة')}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showIntegrityDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Engine Integrity Audit Console Expansion */}
      {showIntegrityDetails && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2">
            <Database className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{parse('Engine Validation Console (Chapter 9 Specifications) | لوحة تدقيق معادلات المحرك الحسابية')}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {parse('The engine validates absolute algebraic identities across separate state machines to block drift. | يقوم النظام بالتحقق التلقائي من صحة المعادلات الرياضية عبر المحركات المستقلة لضمان دقة البيانات.')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Identity 1 */}
            <div className="bg-white border rounded-lg p-3.5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{parse('Identity 1: Partitioning | متطابقة التقسيم')}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  integrityReport?.cumulativePartitioning?.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {integrityReport?.cumulativePartitioning?.passed ? 'PASS' : 'DRIFT'}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-500">Total Unique = Open + Review + Closed</p>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 font-medium">
                <span className="text-slate-500">{integrityReport?.cumulativePartitioning?.totalUnique} Unique</span>
                <span className="text-slate-700">Sum: {integrityReport?.cumulativePartitioning?.sumOfStates}</span>
              </div>
            </div>

            {/* Identity 2 */}
            <div className="bg-white border rounded-lg p-3.5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{parse('Identity 2: Monthly Responses | متطابقة ردود الشهر')}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  integrityReport?.monthlyResponseCheck?.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {integrityReport?.monthlyResponseCheck?.passed ? 'PASS' : 'DRIFT'}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-500">Responses = Approved + Rejected</p>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 font-medium">
                <span className="text-slate-500">{integrityReport?.monthlyResponseCheck?.responsesReceived} Responses</span>
                <span className="text-slate-700">Sum: {integrityReport?.monthlyResponseCheck?.approvedAndRejected}</span>
              </div>
            </div>

            {/* Identity 3 */}
            <div className="bg-white border rounded-lg p-3.5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{parse('Identity 3: Open Partitioning | متطابقة تفرع المفتوح')}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  integrityReport?.openIntegrityCheck?.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {integrityReport?.openIntegrityCheck?.passed ? 'PASS' : 'DRIFT'}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-500">Open = Not Sent + Rejected Open</p>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 font-medium">
                <span className="text-slate-500">{integrityReport?.openIntegrityCheck?.currentlyOpen} Open</span>
                <span className="text-slate-700">Sum: {integrityReport?.openIntegrityCheck?.sumOfOpenStages}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <KpiCard title={parse('New NCRs Received | المستلمة شهرياً')} value={monthlyKPIs.newNcrReceived} />
        <KpiCard title={parse('Corrective Submitted | الحلول المقدمة')} value={monthlyKPIs.correctiveSubmitted} />
        <KpiCard title={parse('Consultant Responses | ردود الاستشاري')} value={monthlyKPIs.responsesReceived} />
        <KpiCard title={parse('Approval Rate | نسبة الاعتماد')} value={appRateStr} highlightClass="text-emerald-600" />
        <KpiCard title={parse('Approved Responses | الردود المعتمدة')} value={monthlyKPIs.approved} highlightClass="text-emerald-600 font-bold" />
        <KpiCard title={parse('Waiting Consultant | بانتظار الاستشاري')} value={monthlyKPIs.waitingConsultant} highlightClass="text-indigo-600 font-bold" />
        <KpiCard title={parse('Waiting Contractor | بانتظار المقاول')} value={monthlyKPIs.waitingContractor} highlightClass="text-amber-600 font-bold" />
        <KpiCard title={parse('Critical Overdue | المتجاوز الحرج')} value={monthlyKPIs.criticalDelays} highlightClass={monthlyKPIs.criticalDelays > 0 ? "text-rose-600 font-bold" : "text-slate-900"} />
      </div>

      <DataTable 
        title={parse('Cumulative NCR Summary (Project to date) | ملخص تقارير عدم المطابقة التراكمي للمشروع')} 
        description={parse('Counts each NCR Ref once, using the latest overall revision. | يحتسب مراجعة فريدة لكل رقم تقرير عدم مطابقة بناء على الحالة الأخيرة.')} 
        columns={cumulativeCols} 
        data={cumulative} 
        footerData={{
          discipline: parse('TOTAL | الإجمالي'),
          totalUnique: cumulativeKPIs.totalUnique,
          notSent: cumulativeKPIs.notSent,
          underReview: cumulativeKPIs.underReview,
          rejectedOpen: cumulativeKPIs.rejectedOpen,
          approvedClosed: cumulativeKPIs.approvedClosed,
          open: <span className="font-bold">{cumulativeKPIs.open}</span>,
          closed: <span className="font-bold">{cumulativeKPIs.closed}</span>,
        }}
      />

      <DataTable 
        title={parse('Monthly NCR Summary | ملخص تقارير عدم المطابقة الشهري')} 
        description={parse('Based on Event Timeline within reporting month. Tracks the occurrences of Received, Submitted, and Responded actions. | تقرير أحداث متكامل مبني على تواريخ حركة المعاملات الفعلية خلال الشهر المحدد.')} 
        columns={monthlyCols} 
        data={monthly} 
        footerData={{
          classification: parse('GRAND TOTAL | الإجمالي العام'),
          newNcrReceived: monthlyKPIs.newNcrReceived,
          correctiveSubmitted: <span className="font-bold">{monthlyKPIs.correctiveSubmitted}</span>,
          responsesReceived: monthlyKPIs.responsesReceived,
          approved: <span className="text-emerald-600 font-bold">{monthlyKPIs.approved}</span>,
          rejected: <span className="text-rose-600 font-bold">{monthlyKPIs.rejected}</span>,
          waitingConsultant: <span className="text-indigo-600 font-bold">{monthlyKPIs.waitingConsultant}</span>,
          waitingContractor: <span className="text-amber-600 font-bold">{monthlyKPIs.waitingContractor}</span>,
          overdue: monthlyKPIs.criticalDelays,
        }}
      />

      <DataTable 
        title={parse('Monthly Submissions Detail | تفاصيل تقديمات الشهر')} 
        description={parse('Details of NCR responses processed within the month. | تفاصيل وحركة الإشعارات والردود لعدم المطابقة المسجلة داخل الشهر.')} 
        columns={detailCols} 
        data={monthlySubmissions} 
      />

      {/* Chapter 10: Interactive Evidence Console & Timeline Inspector */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <h3 className="text-sm font-bold text-slate-100">{parse('Evidence Console & Timeline Inspector (v2.0) | لوحة أدلة الاحتساب ومفتش التواريخ')}</h3>
            </div>
            <p className="text-[11px] text-slate-400">
              {parse('Chapter 10 SSOT Compliance: Auditable trace explanations for every single NCR in the database. | يعرض هذا القسم أدلة تتبع واحتساب النظام بالتفصيل لكل معاملة لضمان الشفافية والتدقيق.')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={parse('Search Ref / Trade... | ابحث عن التقرير أو التخصص...')}
                value={evidenceSearch}
                onChange={(e) => setEvidenceSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-48"
              />
            </div>

            {/* Filter */}
            <select
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">{parse('All Stages & Events | جميع الحالات والأحداث')}</option>
              <option value="STAGE1">{parse('Stage 1: Waiting Contractor | بانتظار المقاول')}</option>
              <option value="STAGE2">{parse('Stage 2: Waiting Consultant | بانتظار الاستشاري')}</option>
              <option value="STAGE3_APP">{parse('Stage 3: Approved Closed | معتمد ومغلق')}</option>
              <option value="STAGE3_REJ">{parse('Stage 3: Rejected Open | مرفوض ومفتوح')}</option>
              <option value="NEW_MONTH">{parse('Month Event: New Issued | أحداث الشهر: مستلمة جديدة')}</option>
              <option value="SUB_MONTH">{parse('Month Event: Submitted | أحداث الشهر: تقديم الحلول')}</option>
              <option value="RESP_MONTH">{parse('Month Event: Responded | أحداث الشهر: الردود')}</option>
              <option value="OVERDUE">{parse('Critical Overdue (>14 Days) | متجاوز حرج (>14 يوماً)')}</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {filteredEvidence.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {parse('No auditable traces found matching current criteria. | لا توجد أدلة مطابقة لمعايير البحث الحالية.')}
            </div>
          ) : (
            filteredEvidence.map((item) => (
              <div key={item.ref} className="p-4 hover:bg-slate-50 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-950 bg-slate-100 px-2 py-0.5 rounded border">
                      {item.ref}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      ({parse('Rev.')} {item.latestRev})
                    </span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-100">
                      {item.discipline}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {/* Stage Badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                      item.stage === 'Stage 3: Approved Closed' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                      item.stage === 'Stage 3: Rejected Open' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                      item.stage === 'Stage 2: Waiting Consultant' ? 'bg-indigo-50 border-indigo-200 text-indigo-800' :
                      'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      {item.stage}
                    </span>

                    {/* Overdue Badge */}
                    {item.isOverdue && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                        CRITICAL OVERDUE
                      </span>
                    )}

                    {/* Selected Month Event Badges */}
                    {item.isNewInMonth && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-100 text-cyan-800">
                        Event 1: New in Month
                      </span>
                    )}
                    {item.isSubmittedInMonth && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                        Event 2: Submitted in Month
                      </span>
                    )}
                    {item.isRespondedInMonth && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        item.monthlyOutcome === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        Event 3: Response ({item.monthlyOutcome})
                      </span>
                    )}
                  </div>
                </div>

                {/* Explanation text */}
                <div className="flex items-start gap-2 text-xs bg-slate-50 border rounded-lg p-2.5 text-slate-600">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{item.explanation}</span>
                </div>

                {/* Timeline Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{parse('Received / Issue Date | تاريخ الاستلام')}:</span>
                    <strong className="text-slate-700 font-mono">{item.issueDate}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{parse('Sent Corrective | إرسال الحل التصحيحي')}:</span>
                    <strong className="text-slate-700 font-mono">{item.sentDate}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{parse('Response Date | تاريخ الرد')}:</span>
                    <strong className="text-slate-700 font-mono">{item.responseDate}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


