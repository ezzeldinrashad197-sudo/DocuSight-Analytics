import React, { useMemo } from 'react';
import { SubmittalRow, ProjectSettings } from './types';
import { calculateStats } from './utils/calculations';

interface ReportTableProps {
  data: SubmittalRow[];
  filterFn?: (row: SubmittalRow) => boolean;
  title: string;
  projectInfo: ProjectSettings | null;
}

export default function ReportTable({ data, filterFn, title, projectInfo }: ReportTableProps) {
  
  const filteredData = useMemo(() => {
     return filterFn ? data.filter(filterFn) : data;
  }, [data, filterFn]);

  const globalStats = useMemo(() => calculateStats(filteredData), [filteredData]);

  const byDocType = useMemo(() => {
     const docTypes = Array.from(new Set(filteredData.map(d => d.documentType || 'DOC')));
     return docTypes.map(type => {
         const tData = filteredData.filter(d => (d.documentType || 'DOC') === type);
         return {
             documentType: type,
             stats: calculateStats(tData)
         };
     }).sort((a,b) => b.stats.totalSubmittedSheets - a.stats.totalSubmittedSheets);
  }, [filteredData]);

  const thClass = "px-3 py-3 border-b border-[#e2e8f0] bg-[#f8fafc] text-[#334155] font-semibold text-sm text-left uppercase tracking-wider";
  const tdClass = "px-3 py-3 border-b border-[#f1f5f9] text-sm font-medium text-[#0f172a]";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
       {projectInfo && (
        <div className="bg-[#ffffff] p-6 rounded-xl shadow-sm border border-[#0A192F] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
             <h2 className="text-2xl font-bold text-[#0A192F]">{projectInfo.projectName}</h2>
             <p className="text-sm text-[#64748b] font-medium tracking-wide mt-1">Project Code: {projectInfo.projectCode}</p>
           </div>
           <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
             <div><span className="block text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Client</span><span className="font-bold text-[#334155]">{projectInfo.clientName}</span></div>
             <div><span className="block text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Contractor</span><span className="font-bold text-[#334155]">{projectInfo.contractorName}</span></div>
             <div><span className="block text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Consultant</span><span className="font-bold text-[#334155]">{projectInfo.consultantName}</span></div>
           </div>
        </div>
       )}

       <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e2e8f0]">
               <h4 className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1">Total Submissions</h4>
               <p className="text-2xl font-light text-[#0A192F]">{globalStats.totalDrawingsRev0 + globalStats.totalDrawingsFurtherRev}</p>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e2e8f0]">
               <h4 className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1">Total Sheets</h4>
               <p className="text-2xl font-light text-[#0A192F]">{globalStats.totalSubmittedSheets}</p>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e2e8f0]">
               <h4 className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1">Revisions {'>'}0</h4>
               <p className="text-2xl font-light text-[#0A192F]">{globalStats.totalSheetsFurtherRev}</p>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e2e8f0]">
               <h4 className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1">Approval Rate</h4>
               <p className="text-2xl font-light text-[#10b981]">{globalStats.approvalRate.toFixed(1)}%</p>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e2e8f0]">
               <h4 className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1">Pending Items</h4>
               <p className="text-2xl font-light text-[#f59e0b]">{globalStats.pending}</p>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e2e8f0]">
               <h4 className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1">Critical Delays</h4>
               <p className="text-2xl font-light text-[#ef4444]">{globalStats.overdue}</p>
           </div>
       </div>

       <div className="bg-[#ffffff] rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden">
          <div className="p-4 bg-[#0f172a] text-[#ffffff] flex justify-between items-center">
            <h2 className="text-lg font-bold">{title}</h2>
            <div className="px-3 py-1 bg-white/20 rounded font-medium text-sm">
               Records: {globalStats.totalSubmittedSheets}
            </div>
          </div>

       <div className="overflow-x-auto">
         <table className="w-full text-left border-collapse">
           <thead>
             <tr>
               <th className={thClass}>Classification</th>
               <th className={thClass}>Unique Items (Rev0)</th>
               <th className={thClass}>Unique Items (&gt;Rev0)</th>
               <th className={thClass}>Total Items Submitted</th>
               <th className={thClass}>Items (Rev0)</th>
               <th className={thClass}>Further Rev Items</th>
               <th className={thClass}>Approved</th>
               <th className={thClass}>Rejected Open</th>
               <th className={thClass}>Rejected Closed</th>
               <th className={thClass}>Pending</th>
               <th className={thClass}>Overdue</th>
             </tr>
           </thead>
           <tbody>
             {byDocType.map(row => (
               <tr key={row.documentType} className="hover:bg-[#f8fafc] transition-colors">
                 <td className={`${tdClass} text-[#4f46e5] font-bold`}>{row.documentType}</td>
                 <td className={tdClass}>{row.stats.totalDrawingsRev0}</td>
                 <td className={tdClass}>{row.stats.totalDrawingsFurtherRev}</td>
                 <td className={`${tdClass} bg-[#f1f5f9] font-bold`}>{row.stats.totalSubmittedSheets}</td>
                 <td className={tdClass}>{row.stats.totalSheetsRev0}</td>
                 <td className={tdClass}>{row.stats.totalSheetsFurtherRev}</td>
                 <td className={`${tdClass} text-[#059669]`}>{row.stats.approved}</td>
                 <td className={`${tdClass} text-[#dc2626]`}>{row.stats.rejectedOpen}</td>
                 <td className={`${tdClass} text-[#991b1b]`}>{row.stats.rejectedClosed}</td>
                 <td className={`${tdClass} text-[#d97706]`}>{row.stats.pending}</td>
                 <td className={`${tdClass} ${row.stats.overdue > 0 ? 'text-[#ef4444] font-bold' : ''}`}>{row.stats.overdue}</td>
               </tr>
             ))}
             {/* Total Row */}
             <tr className="bg-[#f1f5f9] border-t-2 border-[#cbd5e1]">
               <td className={`${tdClass} font-bold text-[#0f172a]`}>GRAND TOTAL</td>
               <td className={`${tdClass} font-bold`}>{globalStats.totalDrawingsRev0}</td>
               <td className={`${tdClass} font-bold`}>{globalStats.totalDrawingsFurtherRev}</td>
               <td className={`${tdClass} font-bold text-lg bg-[#e2e8f0]`}>{globalStats.totalSubmittedSheets}</td>
               <td className={`${tdClass} font-bold`}>{globalStats.totalSheetsRev0}</td>
               <td className={`${tdClass} font-bold`}>{globalStats.totalSheetsFurtherRev}</td>
               <td className={`${tdClass} font-bold text-[#059669]`}>{globalStats.approved}</td>
               <td className={`${tdClass} font-bold text-[#dc2626]`}>{globalStats.rejectedOpen}</td>
               <td className={`${tdClass} font-bold text-[#991b1b]`}>{globalStats.rejectedClosed}</td>
               <td className={`${tdClass} font-bold text-[#d97706]`}>{globalStats.pending}</td>
               <td className={`${tdClass} font-bold text-[#dc2626]`}>{globalStats.overdue}</td>
             </tr>
           </tbody>
         </table>
       </div>
    </div>
  </div>
  );
}
