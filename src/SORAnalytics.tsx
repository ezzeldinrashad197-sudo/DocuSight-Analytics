import React, { useMemo } from 'react';
import { SubmittalRow, ProjectSettings } from './types';
import { processSORData } from './analytics/sor/sorEngine';
import { KpiCard, DataTable } from './components/dashboard/ReusableComponents';
import { useLanguage, parseMixedText } from './utils/i18n';

interface Props {
  data: SubmittalRow[];
  monthlyStart?: string;
  monthlyEnd?: string;
  projectInfo?: ProjectSettings | null;
}

export default function SORAnalytics({ data, monthlyStart }: Props) {
  const { language } = useLanguage();
  const safeData = Array.isArray(data) ? data : [];

  const parse = (text: string) => parseMixedText(text, language);

  const { cumulative, monthly, monthlySubmissions, monthlyKPIs, cumulativeKPIs } = useMemo(() => {
    return processSORData(safeData, monthlyStart);
  }, [safeData, monthlyStart]);

  const appRateStr = monthlyKPIs.totalSubs > 0 ? ((monthlyKPIs.approved / monthlyKPIs.totalSubs) * 100).toFixed(1) + '%' : '0.0%';

  const cumulativeCols = useMemo(() => [
    { key: 'discipline', label: parse('Discipline | التخصص') },
    { key: 'totalUnique', label: parse('Total Unique SORs | إجمالي تقارير ملاحظات الموقع الفريدة'), rightAlign: true },
    { key: 'open', label: parse('Open | مفتوح'), rightAlign: true },
    { key: 'closed', label: parse('Closed | مغلق'), rightAlign: true },
    { key: 'underReview', label: parse('Under Review | قيد المراجعة'), rightAlign: true },
    { key: 'approved', label: parse('Approved (Latest) | معتمد (الأحدث)'), rightAlign: true, render: (val: Record<string, any>) => <span className="text-emerald-600 font-medium">{val.approved}</span> },
    { key: 'rejected', label: parse('Rejected (Latest) | مرفوض (الأحدث)'), rightAlign: true, render: (val: Record<string, any>) => <span className="text-rose-600 font-medium">{val.rejected}</span> }
  ], [language]);

  const monthlyCols = useMemo(() => [
    { key: 'classification', label: parse('Classification | التصنيف') },
    { key: 'rev0', label: parse('Items (Rev.0) | مراجعة 0'), rightAlign: true },
    { key: 'revHigh', label: parse('Items (>Rev.0) | مراجعة 1+'), rightAlign: true },
    { key: 'totalSubs', label: parse('Total Sub. | إجمالي التقديمات'), rightAlign: true, render: (val: Record<string, any>) => <span className="font-bold">{val.totalSubs}</span> },
    { key: 'approved', label: parse('Approved | معتمد'), rightAlign: true, render: (val: Record<string, any>) => <span className="text-emerald-600 font-medium">{val.approved}</span> },
    { key: 'rejectedOpen', label: parse('Rejected Open | مرفوض مفتوح'), rightAlign: true, render: (val: Record<string, any>) => <span className="text-rose-600 font-medium">{val.rejectedOpen}</span> },
    { key: 'rejectedClosed', label: parse('Rejected Closed | مرفوض مغلق'), rightAlign: true, render: (val: Record<string, any>) => <span className="text-slate-600 font-medium">{val.rejectedClosed}</span> },
    { key: 'pending', label: parse('Pending | معلق'), rightAlign: true },
    { key: 'overdue', label: parse('Overdue | متجاوز'), rightAlign: true }
  ], [language]);

  const detailCols = useMemo(() => [
    { key: 'ref', label: parse('SOR Ref | رقم التقرير'), render: (val: Record<string, any>) => <span className="font-mono text-xs font-bold text-slate-900">{val.ref}</span> },
    { key: 'trade', label: parse('Trade | التخصص'), render: (val: Record<string, any>) => <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">{val.trade}</span> },
    { key: 'rev', label: parse('Rev. | مراجعة'), render: (val: Record<string, any>) => <span className="font-medium">{val.rev || '0'}</span> },
    { key: 'sentDate', label: parse('Sent Date | تاريخ الإرسال'), render: (val: Record<string, any>) => <span className="text-slate-600">{val.sentDate || '-'}</span> },
    { key: 'action', label: parse('Action (Latest) | الإجراء (الأحدث)') },
    { key: 'status', label: parse('Status (Latest) | الحالة (الأحدث)') },
    { key: 'classification', label: parse('Correct Classification | التصنيف السليم'), render: (val: Record<string, any>) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        val.classification === 'Approved Closed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
        val.classification === 'Rejected Open' ? 'bg-rose-50 border-rose-200 text-rose-700' : 
        'bg-slate-50 border-slate-200 text-slate-700'
      }`}>{val.classification}</span>
    )}
  ], [language]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <h2 className="text-xl font-bold text-slate-900 border-b pb-2">{parse('Monthly SOR KPIs | مؤشرات الأداء لتقارير ملاحظات الموقع')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title={parse('Total Submissions | التقديمات')} value={monthlyKPIs.totalSubs} />
        <KpiCard title={parse('Approval Rate | نسبة الاعتماد')} value={appRateStr} highlightClass="text-emerald-600" />
        <KpiCard title={parse('Rejected Open | مرفوض مفتوح')} value={monthlyKPIs.rejectedOpen} highlightClass="text-rose-600" />
        <KpiCard title={parse('Pending Items | معلق')} value={monthlyKPIs.pending} />
        <KpiCard title={parse('Critical Delays (Overdue) | المتجاوز الحرج')} value={monthlyKPIs.criticalDelays} highlightClass={monthlyKPIs.criticalDelays > 0 ? "text-rose-600 font-bold" : "text-slate-900"} />
      </div>

      <DataTable 
        title={parse('Cumulative SOR Summary (Project to date) | ملخص تقارير ملاحظات الموقع التراكمي')} 
        description={parse('Counts each SOR Ref once, using the latest revision overall. | يحتسب مراجعة فريدة لكل رقم ملاحظة موقع بناء على الحالة الأخيرة.')} 
        columns={cumulativeCols} 
        data={cumulative} 
        footerData={{
          discipline: parse('TOTAL | الإجمالي'),
          totalUnique: cumulativeKPIs.totalUnique,
          open: cumulativeKPIs.open,
          closed: cumulativeKPIs.closed,
          underReview: cumulativeKPIs.underReview,
          approved: <span className="text-emerald-600 font-bold">{cumulativeKPIs.approved}</span>,
          rejected: <span className="text-rose-600 font-bold">{cumulativeKPIs.rejected}</span>,
        }}
      />

      <DataTable 
        title={parse('Monthly SOR Summary | ملخص تقارير ملاحظات الموقع الشهري')} 
        description={parse('Based on Sent Date Corrective Action within reporting month. | بناءً على تقديمات الإجراء التصحيحي للشهر المحدد.')} 
        columns={monthlyCols} 
        data={monthly} 
        footerData={{
          classification: parse('GRAND TOTAL | الإجمالي العام'),
          rev0: monthlyKPIs.rev0,
          revHigh: monthlyKPIs.revHigh,
          totalSubs: <span className="font-bold">{monthlyKPIs.totalSubs}</span>,
          approved: <span className="text-emerald-600 font-bold">{monthlyKPIs.approved}</span>,
          rejectedOpen: <span className="text-rose-600 font-bold">{monthlyKPIs.rejectedOpen}</span>,
          rejectedClosed: <span className="text-slate-600 font-bold">{monthlyKPIs.rejectedClosed}</span>,
          pending: monthlyKPIs.pending,
          overdue: monthlyKPIs.criticalDelays,
        }}
      />

      <DataTable 
        title={parse('Monthly Submissions Detail | تفاصيل تقديمات الشهر التوضيحية')} 
        description={parse('Details of SOR responses processed within the month. | تفاصيل حركة تقارير ملاحظات الموقع المستلمة خلال الشهر.')} 
        columns={detailCols} 
        data={monthlySubmissions} 
      />
    </div>
  );
}
