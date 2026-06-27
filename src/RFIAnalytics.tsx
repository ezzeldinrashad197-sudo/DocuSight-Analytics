import React, { useMemo } from 'react';
import { SubmittalRow, ProjectSettings } from './types';
import { getNormalizedStatusCore, compareRevisions, getLatestRevision } from './analytics/analyticsCore';

const isYes = (v: unknown) => typeof v === 'string' ? v.toUpperCase() === 'YES' || v.toUpperCase() === 'Y' : !!v;

const getLatestRev = (rows: SubmittalRow[], upToDate?: Date): SubmittalRow | undefined => {
   if (!rows.length) return undefined;
   let validRows = [...rows];
   if (upToDate) {
     const endOfMonth = new Date(upToDate.getFullYear(), upToDate.getMonth() + 1, 0, 23, 59, 59);
     validRows = validRows.filter(r => {
        const dStr = r.submissionDate || r.responseDate;
        if (!dStr) return true;
        const d = new Date(dStr);
        return d <= endOfMonth;
     });
   }
   if (!validRows.length) return undefined;

   const explicitLatest = validRows.find(r => isYes(r.isLatestRev));
   if (explicitLatest && !upToDate) return explicitLatest;

   validRows.sort((a, b) => compareRevisions(a.rev, b.rev));
   return validRows[validRows.length - 1];
};

export default function RFIAnalytics(props: { data: SubmittalRow[], monthlyStart?: string, monthlyEnd?: string, projectInfo?: ProjectSettings | null }) {
  const { data, monthlyStart, projectInfo } = props;
  const safeData = Array.isArray(data) ? data : [];
  const projectId = projectInfo?.id || 'default';

  const { cumulativeStats, monthlyStats, cumTotals, monTotals } = useMemo(() => {
    // Filter out only RFI objects
    const rfiData = safeData.filter((d: SubmittalRow) => {
        const docT = (d.documentType || '').toUpperCase();
        const logT = (d.logType || '').toUpperCase();
        const docNo = (d.docNo || '').toUpperCase();
        return docT.includes('RFI') || logT.includes('RFI') || docNo.includes('RFI');
    });

    const targetMonth = monthlyStart ? new Date(monthlyStart) : new Date(2026, 4, 1);
    const tMonthStr = `${targetMonth.getFullYear()}-${targetMonth.getMonth()}`;

    const buildStats = (isMonthly: boolean) => {
        const m = new Map<string, Record<string, any>>();
        rfiData.forEach(row => {
            if (isMonthly) {
               const sd = row.submissionDate || row.responseDate;
               if (!sd) return;
               const dDate = new Date(sd);
               if (`${dDate.getFullYear()}-${dDate.getMonth()}` !== tMonthStr) {
                   return; // skip if latest action was not in this month
               }
            }

            let disc = (row.discipline || row.trade || 'General').toUpperCase().trim();
            if (disc === 'MECHANICAL') disc = 'MECH';
            if (disc === 'ELECTRICAL') disc = 'ELEC';
            if (disc === 'STRUCTURAL') disc = 'STR';
            if (disc === 'ARCHITECTURAL') disc = 'ARCH';
            if (disc === 'INFRASTRUCTURE') disc = 'INFR';
            if (disc === 'LANDSCAPE') disc = 'LAND';
            
            if (!disc) disc = 'GENERAL';
            // Capitalize properly for display to match screenshot (Arch, Mech, Elec, etc.)
            let displayDisc = disc;
            if (disc === 'STR') displayDisc = 'STR';
            if (disc === 'ARCH') displayDisc = 'Arch';
            if (disc === 'MECH') displayDisc = 'Mech';
            if (disc === 'ELEC') displayDisc = 'Elec';
            if (disc === 'INFR') displayDisc = 'Infra';
            if (disc === 'LAND') displayDisc = 'Landscape';

            if (!m.has(displayDisc)) m.set(displayDisc, { items: displayDisc, rev00: 0, furtherRev: 0, total: 0, pending: 0, closed: 0 });
            const st = m.get(displayDisc)!;

            st.total++;
            const revUpper = (row.rev || '').trim().toUpperCase();
            const isRev0 = revUpper === '00' || revUpper === '0' || revUpper === '';
            if (isRev0) st.rev00++; else st.furtherRev++;

            // Use centralized StatusMatrixEngine normalization through analyticsCore
            const norm = getNormalizedStatusCore(row, projectId, projectInfo);
            const isClosed = norm === 'CLOSED';

            if (isClosed) st.closed++; else st.pending++;
        });

        const arr = Array.from(m.values()).sort((a,b) => b.total - a.total);
        // Sort explicitly by specific order if needed, but total is fine
        const totalLine = {
            items: 'Total',
            rev00: arr.reduce((a,c) => a+c.rev00, 0),
            furtherRev: arr.reduce((a,c) => a+c.furtherRev, 0),
            total: arr.reduce((a,c) => a+c.total, 0),
            pending: arr.reduce((a,c) => a+c.pending, 0),
            closed: arr.reduce((a,c) => a+c.closed, 0)
        };
        return { data: arr, total: totalLine };
    };

    return {
       cumulativeStats: buildStats(false).data,
       cumTotals: buildStats(false).total,
       monthlyStats: buildStats(true).data,
       monTotals: buildStats(true).total
    };
  }, [safeData, monthlyStart]);

  // Extract month year string for headers
  const targetDateStr = monthlyStart ? new Date(monthlyStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '30 Apr 2026';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-8">
        
        {/* Monthly Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">Monthly RFI Summary</h2>
            <p className="text-xs text-slate-500 mt-1">RFI processed and received this period.</p>
          </div>
          <div className="overflow-x-auto overflow-y-visible" style={{ padding: '4px' }}>
            <div style={{ minWidth: 'max-content', padding: '4px' }}>
            <table className="w-full text-sm text-left" style={{ margin: 0 }}>
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Total Rev.00</th>
                  <th className="px-4 py-3 text-right">Total Further Rev.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-right">Closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyStats.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.items}</td>
                    <td className="px-4 py-3 text-right">{row.rev00}</td>
                    <td className="px-4 py-3 text-right">{row.furtherRev}</td>
                    <td className="px-4 py-3 text-right">{row.total}</td>
                    <td className="px-4 py-3 text-right">{row.pending}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{row.closed}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
                <tr>
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right">{monTotals.rev00}</td>
                  <td className="px-4 py-3 text-right">{monTotals.furtherRev}</td>
                  <td className="px-4 py-3 text-right">{monTotals.total}</td>
                  <td className="px-4 py-3 text-right">{monTotals.pending}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{monTotals.closed}</td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        </div>

        {/* Cumulative Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">Cumulative RFI Summary (Project to date)</h2>
            <p className="text-xs text-slate-500 mt-1">Status of all RFIs over the project lifecycle.</p>
          </div>
          <div className="overflow-x-auto overflow-y-visible" style={{ padding: '4px' }}>
            <div style={{ minWidth: 'max-content', padding: '4px' }}>
            <table className="w-full text-sm text-left" style={{ margin: 0 }}>
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Total Rev.00</th>
                  <th className="px-4 py-3 text-right">Total Further Rev.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-right">Closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cumulativeStats.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.items}</td>
                    <td className="px-4 py-3 text-right">{row.rev00}</td>
                    <td className="px-4 py-3 text-right">{row.furtherRev}</td>
                    <td className="px-4 py-3 text-right">{row.total}</td>
                    <td className="px-4 py-3 text-right">{row.pending}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{row.closed}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
                <tr>
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right">{cumTotals.rev00}</td>
                  <td className="px-4 py-3 text-right">{cumTotals.furtherRev}</td>
                  <td className="px-4 py-3 text-right">{cumTotals.total}</td>
                  <td className="px-4 py-3 text-right">{cumTotals.pending}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{cumTotals.closed}</td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
