import React, { useMemo } from 'react';
import { SubmittalRow, ProjectSettings } from './types';

export default function CorrespondenceAnalytics(props: { data: SubmittalRow[], monthlyStart?: string, monthlyEnd?: string, projectInfo?: ProjectSettings | null }) {
  const { data, monthlyStart } = props;
  const safeData = Array.isArray(data) ? data : [];

  const { cumulative, monthly } = useMemo(() => {
    // Filter only Letters
    const ltrData = safeData.filter((d: SubmittalRow) => {
        const docT = (d.documentType || '').toUpperCase();
        const logT = (d.logType || '').toUpperCase();
        return docT.includes('LTR') || docT.includes('LETTERS') || logT.includes('LTR') || logT.includes('LETTERS');
    });

    const targetMonth = monthlyStart ? new Date(monthlyStart) : new Date(2026, 4, 1);
    const tMonthStr = `${targetMonth.getFullYear()}-${targetMonth.getMonth()}`;

    // Processing variables
    const stakeholderKeys = new Set(ltrData.map(d => d.stakeholder || 'GENERAL'));

    // Cumulative Processing
    const cumMap = new Map<string, Record<string, any>>();
    const mMap = new Map<string, Record<string, any>>();

    ltrData.forEach(row => {
        const sh = row.stakeholder || 'GENERAL';
        if (!cumMap.has(sh)) cumMap.set(sh, { stakeholder: sh, lettersIn: 0, lettersOut: 0, total: 0 });
        if (!mMap.has(sh)) mMap.set(sh, { stakeholder: sh, lettersIn: 0, lettersOut: 0, total: 0 });

        const dC = cumMap.get(sh);
        const dM = mMap.get(sh);

        dC.total++;
        if (row.direction === 'IN') dC.lettersIn++;
        else dC.lettersOut++;

        const dSent = row.submissionDate ? new Date(row.submissionDate) : null;
        let isSentInMonth = false;
        if (dSent && !isNaN(dSent.getTime())) {
            isSentInMonth = `${dSent.getFullYear()}-${dSent.getMonth()}` === tMonthStr;
        }

        if (isSentInMonth) {
            dM.total++;
            if (row.direction === 'IN') dM.lettersIn++;
            else dM.lettersOut++;
        }
    });

    const cumArr = Array.from(cumMap.values()).sort((a,b) => b.total - a.total);
    const monArr = Array.from(mMap.values()).filter(s => s.total > 0).sort((a,b) => b.total - a.total);

    return {
        cumulative: cumArr,
        monthly: monArr
    };
  }, [safeData, monthlyStart]);


  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <h2 className="text-xl font-bold text-slate-900 border-b pb-2">Correspondence Analytics</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Monthly Comm.</h3>
          <p className="mt-2 text-2xl font-bold text-slate-900">{monthly.reduce((a,c) => a + c.total, 0)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Monthly Letters IN</h3>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{monthly.reduce((a,c) => a + c.lettersIn, 0)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Monthly Letters OUT</h3>
          <p className="mt-2 text-2xl font-bold text-blue-600">{monthly.reduce((a,c) => a + c.lettersOut, 0)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Cumulative Total</h3>
          <p className="mt-2 text-2xl font-bold text-slate-900">{cumulative.reduce((a,c) => a + c.total, 0)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Monthly Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">Monthly Correspondence Detail</h2>
            <p className="text-xs text-slate-500 mt-1">Letters IN/OUT by stakeholder within the reporting month.</p>
          </div>
          <div className="overflow-x-auto overflow-y-visible" style={{ padding: '4px' }}>
            <div style={{ minWidth: 'max-content', padding: '4px' }}>
            <table className="w-full text-sm text-left" style={{ margin: 0 }}>
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Stakeholder</th>
                  <th className="px-4 py-3 text-right">Letters IN</th>
                  <th className="px-4 py-3 text-right">Letters OUT</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthly.map((row) => (
                  <tr key={row.stakeholder} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.stakeholder}</td>
                    <td className="px-4 py-3 text-right">{row.lettersIn}</td>
                    <td className="px-4 py-3 text-right">{row.lettersOut}</td>
                    <td className="px-4 py-3 text-right font-bold">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* Cumulative Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">Cumulative Correspondence Summary</h2>
          </div>
          <div className="overflow-x-auto overflow-y-visible" style={{ padding: '4px' }}>
            <div style={{ minWidth: 'max-content', padding: '4px' }}>
            <table className="w-full text-sm text-left" style={{ margin: 0 }}>
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Stakeholder</th>
                  <th className="px-4 py-3 text-right">Letters IN</th>
                  <th className="px-4 py-3 text-right">Letters OUT</th>
                  <th className="px-4 py-3 text-right">Total unique records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cumulative.map((row) => (
                  <tr key={row.stakeholder} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.stakeholder}</td>
                    <td className="px-4 py-3 text-right">{row.lettersIn}</td>
                    <td className="px-4 py-3 text-right">{row.lettersOut}</td>
                    <td className="px-4 py-3 text-right font-bold">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
