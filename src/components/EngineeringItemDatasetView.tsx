import React, { useMemo, useState } from 'react';
import { SubmittalRow } from '../types';
import { evaluateEngineeringItemClassification } from '../analytics/calculationFoundation';
import { FileText, Search, ShieldCheck, Download } from 'lucide-react';

interface EngineeringItemDatasetViewProps {
  data: SubmittalRow[];
}

export default function EngineeringItemDatasetView({ data }: EngineeringItemDatasetViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'str' | 'all'>('str');

  const engineeringItems = useMemo(() => {
    const rawItems = evaluateEngineeringItemClassification(data);
    return rawItems
      .filter(item => item.businessEntityKey.toUpperCase().includes('STR'))
      .map(item => ({
        businessEntityKey: item.businessEntityKey,
        drawingNo: item.drawingNo,
        sheetNo: item.sheetNo,
        submissionRef: item.submissionRef,
        firstSubmissionDate: item.firstSubmissionDate,
        firstHistoricalRevision: item.firstRevision,
        historicalClassification: item.classification,
        latestRevision: item.latestRevision,
        latestStatus: item.latestStatus,
        includedInPerformance: item.includeInPerformance ? 'Yes' : 'No',
        trade: item.trade,
        ruleApplied: item.ruleApplied,
        explanation: item.explanation
      }));
  }, [data]);

  const filteredItems = useMemo(() => {
    return engineeringItems.filter(item => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.businessEntityKey.toLowerCase().includes(term) ||
        item.drawingNo.toLowerCase().includes(term) ||
        item.submissionRef.toLowerCase().includes(term) ||
        item.sheetNo.toLowerCase().includes(term)
      );
    });
  }, [engineeringItems, searchTerm]);

  const totalRev00 = engineeringItems.filter(i => i.historicalClassification === 'Rev00').length;
  const totalFurther = engineeringItems.filter(i => i.historicalClassification === 'Further Revision').length;
  const totalUniqueItems = engineeringItems.length;

  const exportCSV = () => {
    const headers = ['BusinessEntityKey', 'Drawing Number', 'First Historical Revision Ever Found', 'First Historical Submission Date', 'Historical Classification', 'Why this Classification was selected'];
    const rows = filteredItems.map(i => [
      i.businessEntityKey,
      i.drawingNo,
      i.firstHistoricalRevision,
      i.firstSubmissionDate,
      i.historicalClassification,
      `"${i.ruleApplied} - ${i.explanation}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `engineering_item_dataset_str_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
              Engineering Item Classification Dataset (STR Register)
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Complete raw evidence and rule justifications for all {totalUniqueItems} unique STR drawings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg text-emerald-800 text-sm font-medium">
              Rev00: <span className="font-bold">{totalRev00}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg text-amber-800 text-sm font-medium">
              Further Revision: <span className="font-bold">{totalFurther}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg text-blue-800 text-sm font-medium">
              Total Unique Items: <span className="font-bold">{totalUniqueItems}</span>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export STR Dataset CSV
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search STR drawings..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-mono whitespace-nowrap">
              Showing {filteredItems.length} of {engineeringItems.length} STR items
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3">BusinessEntityKey</th>
                  <th className="px-4 py-3">Drawing Number</th>
                  <th className="px-4 py-3 text-center">First Historical Revision Ever Found</th>
                  <th className="px-4 py-3">First Historical Submission Date</th>
                  <th className="px-4 py-3 text-center">Historical Classification</th>
                  <th className="px-4 py-3">Why this Classification was selected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-800 font-mono">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 font-sans">
                      No STR engineering items found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{item.businessEntityKey}</td>
                      <td className="px-4 py-3 text-slate-600">{item.drawingNo}</td>
                      <td className="px-4 py-3 text-center text-slate-700 font-bold">{item.firstHistoricalRevision}</td>
                      <td className="px-4 py-3 text-slate-600">{item.firstSubmissionDate}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-sans font-semibold ${
                          item.historicalClassification === 'Rev00'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.historicalClassification}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 font-sans max-w-md">
                        <span className="font-semibold text-slate-900 block mb-0.5">{item.ruleApplied}</span>
                        <span className="text-slate-600">{item.explanation}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
