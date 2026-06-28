import React, { useMemo } from 'react';
import { SubmittalRow, ProjectSettings, KPIStats } from './types';
import { calculateStats } from './utils/calculations';

interface ReportTableProps {
  data: SubmittalRow[];
  filterFn?: (row: SubmittalRow) => boolean;
  title: string;
  projectInfo: ProjectSettings | null;
}

export default function ReportTable({ data, filterFn, title, projectInfo }: ReportTableProps) {
  const isMonthly = title.toLowerCase().includes('monthly');
  
  const filteredData = useMemo(() => {
     return filterFn ? data.filter(filterFn) : data;
  }, [data, filterFn]);

  const rowToLabel = (d: SubmittalRow) => {
      return (d.documentType || 'DOC').trim();
  };

  const byDocType = useMemo(() => {
     const docTypes = Array.from(new Set(filteredData.map(d => rowToLabel(d))));
     return docTypes
         .filter(typeLabel => {
            const sample = filteredData.find(d => rowToLabel(d) === typeLabel);
            const docType = sample?.documentType || 'DOC';
            return !docType.startsWith('NCR-') && docType !== 'NCR';
         }) // Exclude NCRs from generic table based on actual documentType
         .map(typeLabel => {
             return {
                 documentType: typeLabel,
                 stats: calculateStats(filteredData.filter(d => rowToLabel(d) === typeLabel))
             };
         })
         .sort((a,b) => {
             const getSortKey = (typeStr: any) => {
                 const safeStr = typeof typeStr === 'string' ? typeStr : '';
                 const parts = safeStr.split('-');
                 const base = parts[0] ? parts[0].trim().toUpperCase() : '';
                 const disc = parts.slice(1).join('-').trim().toUpperCase() || '';
                 return { base, disc };
             };
             const keyA = getSortKey(a.documentType);
             const keyB = getSortKey(b.documentType);
             
             const baseOrder = ['SDW', 'SHD', 'MAR', 'QS', 'DOC', 'WIR', 'MIR', 'RFI', 'NCR', 'SOR', 'LTR', 'PQ', 'PRQ', 'TRS'];
             const idxA = baseOrder.indexOf(keyA.base);
             const idxB = baseOrder.indexOf(keyB.base);
             
             if (idxA !== -1 && idxB !== -1) {
                 if (idxA !== idxB) return idxA - idxB;
             } else if (idxA !== -1) {
                 return -1;
             } else if (idxB !== -1) {
                 return 1;
             } else {
                 const baseCompare = keyA.base.localeCompare(keyB.base);
                 if (baseCompare !== 0) return baseCompare;
             }
             
             const discOrder = ['STR', 'ARC', 'ARCH', 'ELE', 'MEC', 'MECH', 'LND', 'LAND', 'INFRA', 'SURVEY', 'SUR', 'GEN', 'GENERAL'];
             const discIdxA = discOrder.indexOf(keyA.disc);
             const discIdxB = discOrder.indexOf(keyB.disc);
             
             if (discIdxA !== -1 && discIdxB !== -1) {
                 if (discIdxA !== discIdxB) return discIdxA - discIdxB;
             } else if (discIdxA !== -1) {
                 return -1;
             } else if (discIdxB !== -1) {
                 return 1;
             }
             
             return keyA.disc.localeCompare(keyB.disc);
         });
  }, [filteredData]);

  const globalStats = useMemo(() => {
      const stats = calculateStats(filteredData.filter(d => !(d.documentType || 'DOC').startsWith('NCR-') && (d.documentType || 'DOC') !== 'NCR'));
      return stats;
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
               <p className="text-2xl font-light text-[#0A192F]">{globalStats.totalUniqueDrawings || (globalStats.totalDrawingsRev0 + globalStats.totalDrawingsFurtherRev)}</p>
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
            <div className="px-3 py-1 bg-white opacity-20 rounded font-medium text-sm">
               Records: {globalStats.totalSubmittedSheets}
            </div>
          </div>

       {/* FIX: إضافة حاويات لمنع قطع الحواف */}
       <div className="overflow-x-auto overflow-y-visible" style={{ padding: '8px' }}>
         <div style={{ minWidth: 'max-content', padding: '4px' }}>
         <table className="w-full text-left border-collapse" style={{ margin: 0 }}>
           <thead>
             <tr>
               <th className={thClass}>Log Type (Tab)</th>
               <th className={thClass}>Total Unique Items</th>
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
                 <td className={tdClass}>{row.stats.totalUniqueDrawings || (row.stats.totalDrawingsRev0 + row.stats.totalDrawingsFurtherRev)}</td>
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
               <td className={`${tdClass} font-bold`}>{globalStats.totalUniqueDrawings || (globalStats.totalDrawingsRev0 + globalStats.totalDrawingsFurtherRev)}</td>
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
         </div>  {/* إغلاق div الداخلي (min-width) */}
       </div>    {/* إغلاق div الخارجي (overflow) */}
     </div>      {/* إغلاق div البطاقة */}

  </div>
  );
}
