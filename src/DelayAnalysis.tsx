import React, { useMemo } from 'react';
import { SubmittalRow, ProjectSettings } from './types';
import { getDelayDays, getStatusCodeCategory } from './utils/calculations';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface DelayAnalysisProps {
  data: SubmittalRow[];
  projectInfo: ProjectSettings | null;
}

export default function DelayAnalysis({ data, projectInfo }: DelayAnalysisProps) {

  const analysis = useMemo(() => {
     let delayedItems = data.map(d => {
         const delay = getDelayDays(d.submissionDate, d.responseDate, d.dueDate);
         const cat = getStatusCodeCategory(d.status || 'W');
         return {
             ...d,
             delayDays: delay,
             isOpen: cat === 'PENDING' || cat === 'REJECTED_OPEN'
         };
     }).filter(d => d.delayDays > 0 && d.isOpen);
     
     delayedItems = delayedItems.sort((a, b) => b.delayDays - a.delayDays);

     let aging = {
         '0-7 Days': 0,
         '8-14 Days': 0,
         '15-30 Days': 0,
         '+30 Days': 0
     };

     delayedItems.forEach(item => {
         if (item.delayDays <= 7) aging['0-7 Days']++;
         else if (item.delayDays <= 14) aging['8-14 Days']++;
         else if (item.delayDays <= 30) aging['15-30 Days']++;
         else aging['+30 Days']++;
     });

     const chartData = [
         { name: '0-7 Days', value: aging['0-7 Days'], color: '#FCD34D' },
         { name: '8-14 Days', value: aging['8-14 Days'], color: '#F59E0B' },
         { name: '15-30 Days', value: aging['15-30 Days'], color: '#EF4444' },
         { name: '+30 Days', value: aging['+30 Days'], color: '#991B1B' }
     ];

     return { delayedItems, aging, chartData };
  }, [data]);

  const thClass = "px-3 py-3 border-b border-[#e2e8f0] bg-[#0A192F] text-[#ffffff] font-semibold text-xs text-left uppercase tracking-wider sticky top-0 z-10 shadow-sm whitespace-nowrap";
  const tdClass = "px-3 py-3 border-b border-[#f1f5f9] text-sm font-medium text-[#0f172a]";

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
       
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

       <div className="break-inside-avoid grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="break-inside-avoid lg:col-span-1 bg-[#ffffff] rounded-xl shadow-sm border border-[#e2e8f0] p-6 flex flex-col">
               <h3 className="text-lg font-bold text-[#0A192F] mb-6 border-b pb-2">Aging Analysis</h3>
               <div className="grid grid-cols-2 gap-4 flex-1 mb-6 text-center">
                   <div className="bg-[#fefce8] border border-[#fef08a] rounded-xl p-4">
                       <p className="text-xs font-bold text-[#a16207] uppercase tracking-widest mb-2">0-7 Days</p>
                       <p className="text-3xl font-black text-[#ca8a04]">{analysis.aging['0-7 Days']}</p>
                   </div>
                   <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-4">
                       <p className="text-xs font-bold text-[#b45309] uppercase tracking-widest mb-2">8-14 Days</p>
                       <p className="text-3xl font-black text-[#d97706]">{analysis.aging['8-14 Days']}</p>
                   </div>
                   <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4">
                       <p className="text-xs font-bold text-[#b91c1c] uppercase tracking-widest mb-2">15-30 Days</p>
                       <p className="text-3xl font-black text-[#dc2626]">{analysis.aging['15-30 Days']}</p>
                   </div>
                   <div className="bg-[#881337] border border-[#9f1239] rounded-xl p-4 shadow-inner">
                       <p className="text-xs font-bold text-[#fecdd3] uppercase tracking-widest mb-2">+30 Days</p>
                       <p className="text-4xl font-black text-[#ffffff] drop-shadow-md">{analysis.aging['+30 Days']}</p>
                   </div>
               </div>
           </div>

           <div className="break-inside-avoid lg:col-span-2 bg-[#ffffff] rounded-xl shadow-sm border border-[#e2e8f0] p-6">
               <h3 className="text-lg font-bold text-[#0A192F] mb-6">Delay Trends & Buckets</h3>
               <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={analysis.chartData} barSize={60}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} />
                       <YAxis axisLine={false} tickLine={false} />
                       <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                       <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                         {analysis.chartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                       </Bar>
                     </BarChart>
                   </ResponsiveContainer>
               </div>
           </div>
       </div>

       {analysis.delayedItems.length === 0 ? (
          <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] p-8 rounded-xl flex items-center justify-center flex-col shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-[#10b981] mb-4" />
              <h2 className="text-xl font-bold">No Overdue Items</h2>
              <p>Excellent! All documentation is on track.</p>
          </div>
       ) : (
          <div className="bg-[#ffffff] rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden">
             <div className="p-4 bg-[#dc2626] text-[#ffffff] flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <AlertCircle className="w-5 h-5" />
                 <h2 className="text-lg font-bold">Critical Delay Analytics Log</h2>
               </div>
               <div className="px-3 py-1 bg-white/20 rounded font-bold text-sm">
                  {analysis.delayedItems.length} Overdue Items
               </div>
             </div>

             <div className="overflow-x-auto max-h-[600px]">
               <table className="w-full text-left border-collapse relative">
                 <thead>
                   <tr>
                     <th className={thClass}>Log Type</th>
                     <th className={thClass}>Doc No</th>
                     <th className={thClass}>Rev</th>
                     <th className={thClass}>Discipline</th>
                     <th className={thClass}>Submitted</th>
                     <th className={thClass}>Due Date</th>
                     <th className={thClass}>Delay (Days)</th>
                     <th className={thClass}>Days Category</th>
                   </tr>
                 </thead>
                 <tbody>
                   {analysis.delayedItems.map((row, i) => {
                       let cat = '+30 Days';
                       let textCol = 'text-[#be123c]';
                       let bgCol = 'bg-[#ffe4e6]';
                       if(row.delayDays <= 7) { cat = '0-7 Days'; textCol = 'text-[#a16207]'; bgCol = 'bg-[#fef9c3]'; }
                       else if(row.delayDays <= 14) { cat = '8-14 Days'; textCol = 'text-[#b45309]'; bgCol = 'bg-[#fef3c7]'; }
                       else if(row.delayDays <= 30) { cat = '15-30 Days'; textCol = 'text-[#b91c1c]'; bgCol = 'bg-[#fee2e2]'; }

                       return (
                         <tr key={i} className="hover:bg-[#f8fafc] transition-colors">
                           <td className={`${tdClass} text-[#0A192F] font-bold`}>{row.logType}</td>
                           <td className={`${tdClass} uppercase font-mono text-xs`}>{row.docNo || row.id}</td>
                           <td className={tdClass}>{row.rev}</td>
                           <td className={`${tdClass} text-[#4f46e5] font-bold`}>{row.discipline}</td>
                           <td className={tdClass}>{row.submissionDate}</td>
                           <td className={`${tdClass} text-[#64748b]`}>{row.dueDate || 'N/A'}</td>
                           <td className={`${tdClass} ${textCol} font-bold text-lg text-center`}>{row.delayDays}</td>
                           <td className={tdClass}>
                               <span className={`px-2 py-1 rounded text-xs font-bold ${bgCol} ${textCol}`}>{cat}</span>
                           </td>
                         </tr>
                       );
                   })}
                 </tbody>
               </table>
             </div>
          </div>
       )}
    </div>
  );
}
