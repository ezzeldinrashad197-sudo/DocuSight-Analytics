import React, { useState, useMemo } from 'react';
import { SubmittalRow, ProjectSettings } from './types';
import { Search, Download, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DocumentRegisterProps {
  data: SubmittalRow[];
  projectInfo: ProjectSettings | null;
}

export default function DocumentRegister({ data, projectInfo }: DocumentRegisterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: keyof SubmittalRow, direction: 'asc'|'desc'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  const handleSort = (key: keyof SubmittalRow) => {
    let direction: 'asc'|'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredAndSortedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Raw Data Log");
    XLSX.writeFile(wb, `Analytics_Raw_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(row => 
        (row.docNo || '').toLowerCase().includes(lower) ||
        (row.discipline || '').toLowerCase().includes(lower) ||
        (row.logType || '').toLowerCase().includes(lower) ||
        (row.status || '').toLowerCase().includes(lower)
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const currentData = filteredAndSortedData.slice(startIdx, startIdx + rowsPerPage);

  const thClass = "sticky top-0 px-3 py-3 border-b border-[#e2e8f0] bg-[#0A192F] text-[#ffffff] font-semibold text-xs text-left uppercase tracking-wider cursor-pointer hover:bg-[#112a4d] z-10 whitespace-nowrap";
  const tdClass = "px-3 py-2 border-b border-[#f1f5f9] text-sm font-medium text-[#1e293b] whitespace-nowrap truncate max-w-[200px]";

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
    <div className="bg-[#ffffff] rounded-xl shadow-sm border border-[#e2e8f0] display-flex flex-col h-full animate-in fade-in duration-300">
       <div className="p-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#0A192F]">Raw Data Explorer</h2>
            <span className="bg-[#D4AF37] text-[#ffffff] text-xs px-2 py-0.5 rounded-full font-bold">{filteredAndSortedData.length}</span>
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
               <input 
                  type="text" 
                  placeholder="Search raw data logs..." 
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2 border border-[#cbd5e1] rounded-lg text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none"
               />
            </div>
            <button onClick={exportToExcel} className="flex items-center gap-2 px-3 py-2 bg-[#059669] hover:bg-[#10b981] text-[#ffffff] rounded-lg font-bold text-sm transition-colors">
               <Download className="w-4 h-4" /> Excel
            </button>
         </div>
       </div>

       <div className="overflow-auto max-h-[calc(100vh-380px)] min-h-[500px]">
         <table className="w-full text-left border-collapse">
           <thead>
             <tr>
               <th className={thClass} onClick={() => handleSort('logType')}>Classification <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" /></th>
               <th className={thClass} onClick={() => handleSort('docNo')}>Doc No <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" /></th>
               <th className={thClass} onClick={() => handleSort('rev')}>Rev <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" /></th>
               <th className={thClass} onClick={() => handleSort('discipline')}>Discipline <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" /></th>
               <th className={thClass} onClick={() => handleSort('contractor')}>Contractor <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" /></th>
               <th className={thClass} onClick={() => handleSort('submissionDate')}>Submission Date <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" /></th>
               <th className={thClass} onClick={() => handleSort('responseDate')}>Response Date <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" /></th>
               <th className={thClass} onClick={() => handleSort('status')}>Status <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" /></th>
             </tr>
           </thead>
           <tbody className="print:hidden">
             {currentData.length > 0 ? (
                 currentData.map((row, i) => (
                   <tr key={i} className="hover:bg-[#f8fafc] transition-colors">
                     <td className={`${tdClass} text-[#D4AF37] font-bold`}>
                        <span className="text-[#334155] bg-[#f1f5f9] px-2 py-0.5 rounded text-xs mr-2 border border-[#cbd5e1] shadow-sm">[{row.documentType}]</span>
                        {row.trade} <span className="text-[#94a3b8] font-normal mx-1">|</span> <span className="text-xs">{row.workflowStage}</span>
                     </td>
                     <td className={`${tdClass} text-[#0A192F] font-bold`}>{row.docNo}</td>
                     <td className={tdClass}>{row.rev}</td>
                     <td className={tdClass}>{row.discipline}</td>
                     <td className={tdClass}>{row.contractor}</td>
                     <td className={tdClass}>{row.submissionDate}</td>
                     <td className={tdClass}>{row.responseDate}</td>
                     <td className={tdClass}>
                         <span className={`px-2 py-1 rounded text-xs font-bold ${
                             row.status.startsWith('A') || row.status.startsWith('B') || row.status.startsWith('D') ? 'bg-[#d1fae5] text-[#047857]' :
                             row.status.startsWith('C') ? 'bg-[#fee2e2] text-[#b91c1c]' :
                             'bg-[#fef3c7] text-[#b45309]'
                         }`}>
                             {row.status || 'PENDING'}
                         </span>
                     </td>
                   </tr>
                 ))
             ) : (
                 <tr>
                     <td colSpan={8} className="text-center py-8 text-[#94a3b8] font-medium">No records found matching filters.</td>
                 </tr>
             )}
           </tbody>
           {/* Print only: show all rows */}
           <tbody className="hidden print:table-row-group">
             {filteredAndSortedData.length > 0 ? (
                 filteredAndSortedData.map((row, i) => (
                   <tr key={`print-${i}`} className="break-inside-avoid hover:bg-[#f8fafc] transition-colors">
                     <td className={`${tdClass} text-[#D4AF37] font-bold`}>
                        <span className="text-[#334155] bg-[#f1f5f9] px-2 py-0.5 rounded text-xs mr-2 border border-[#cbd5e1] shadow-sm">[{row.documentType}]</span>
                        {row.trade} <span className="text-[#94a3b8] font-normal mx-1">|</span> <span className="text-xs">{row.workflowStage}</span>
                     </td>
                     <td className={`${tdClass} text-[#0A192F] font-bold`}>{row.docNo}</td>
                     <td className={tdClass}>{row.rev}</td>
                     <td className={tdClass}>{row.discipline}</td>
                     <td className={tdClass}>{row.contractor}</td>
                     <td className={tdClass}>{row.submissionDate}</td>
                     <td className={tdClass}>{row.responseDate}</td>
                     <td className={tdClass}>
                         <span className={`px-2 py-1 rounded text-xs font-bold ${
                             row.status.startsWith('A') || row.status.startsWith('B') || row.status.startsWith('D') ? 'bg-[#d1fae5] text-[#047857]' :
                             row.status.startsWith('C') ? 'bg-[#fee2e2] text-[#b91c1c]' :
                             'bg-[#fef3c7] text-[#b45309]'
                         }`}>
                             {row.status || 'PENDING'}
                         </span>
                     </td>
                   </tr>
                 ))
             ) : null}
           </tbody>
         </table>
       </div>

       {/* Pagination */}
       {totalPages > 1 && (
           <div className="print:hidden bg-[#f8fafc] border-t border-[#e2e8f0] p-3 flex justify-between items-center text-sm">
              <span className="text-[#64748b] font-medium">Showing {startIdx + 1} to {Math.min(startIdx + rowsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length}</span>
              <div className="flex items-center gap-2">
                  <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded bg-[#ffffff] border border-[#cbd5e1] disabled:opacity-50 hover:bg-[#f1f5f9]"
                  ><ChevronLeft className="w-5 h-5"/></button>
                  <span className="font-bold text-[#0A192F]">Page {currentPage} of {totalPages}</span>
                  <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded bg-[#ffffff] border border-[#cbd5e1] disabled:opacity-50 hover:bg-[#f1f5f9]"
                  ><ChevronRight className="w-5 h-5"/></button>
              </div>
           </div>
       )}
    </div>
    </div>
  );
}
