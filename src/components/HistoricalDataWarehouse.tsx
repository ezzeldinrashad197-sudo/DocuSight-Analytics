import React, { useMemo, useState } from 'react';
import { SubmittalRow, ProjectSettings } from '../types';
import { calculateStats } from '../utils/calculations';
import { Database, GitCompare, Building2, HardHat, Scale, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface Props {
  data: SubmittalRow[];
  projects: ProjectSettings[];
}

export default function HistoricalDataWarehouse({ data, projects }: Props) {
    const [compareBy, setCompareBy] = useState<'discipline'|'contractor'|'consultant'>('discipline');

    const comparisonData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const groups: Record<string, SubmittalRow[]> = {};
        
        data.forEach(d => {
            let key = 'Unknown';
            if (compareBy === 'discipline') key = d.discipline || d.trade || 'GENERAL';
            if (compareBy === 'contractor') key = d.contractor || 'GENERAL';
            if (compareBy === 'consultant') key = d.consultant || 'GENERAL';

            key = key.toUpperCase().trim();
            if (!groups[key]) groups[key] = [];
            groups[key].push(d);
        });

        const arr = Object.entries(groups).map(([entityName, rows]) => {
            const stats = calculateStats(rows);
            return {
                entityName,
                submitted: stats.totalSubmittedSheets,
                approved: stats.approved,
                rejected: stats.rejectedOpen + stats.rejectedClosed,
                pending: stats.pending,
                overdue: stats.overdue,
                approvalRate: stats.approvalRate
            };
        }).filter(x => x.submitted > 0);

        arr.sort((a,b) => b.submitted - a.submitted);
        return arr;
    }, [data, compareBy]);

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen space-y-6 animate-in fade-in duration-300">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-light text-slate-900 tracking-tight flex items-center gap-3">
                        Data Warehouse
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest border border-indigo-200">Historical Comparison</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-medium">Cross-entity performance comparison and analytical archiving</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white border border-slate-200 rounded-lg p-1 flex shadow-sm">
                        <button 
                            onClick={() => setCompareBy('discipline')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-colors ${compareBy === 'discipline' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Discipline
                        </button>
                        <button 
                            onClick={() => setCompareBy('contractor')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-colors ${compareBy === 'contractor' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Contractor
                        </button>
                        <button 
                            onClick={() => setCompareBy('consultant')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-colors ${compareBy === 'consultant' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Consultant
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="md:col-span-1 border border-slate-200 bg-white rounded-xl shadow-sm p-6 overflow-y-auto max-h-[600px] custom-scrollbar">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Scale className="w-4 h-4 text-indigo-500" /> Entity Leaderboard
                     </h3>
                     <div className="space-y-4">
                        {comparisonData.map((d, i) => (
                           <div key={d.entityName} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                               <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i===0 ? 'bg-amber-100 text-amber-700' : i===1 ? 'bg-slate-100 text-slate-700' : i===2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'}`}>
                                      {i+1}
                                  </span>
                                  <div>
                                      <p className="text-sm font-bold text-slate-800">{d.entityName}</p>
                                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{d.submitted} Records</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-sm font-bold text-emerald-600">{d.approvalRate.toFixed(1)}%</p>
                                  <p className="text-[10px] text-red-500 font-bold uppercase">{d.overdue} Delay</p>
                               </div>
                           </div>
                        ))}
                     </div>
                 </div>

                 <div className="md:col-span-3 border border-slate-200 bg-white rounded-xl shadow-sm p-6">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <BarChart className="w-4 h-4 text-emerald-500" /> Comparative Quality Analysis
                     </h3>
                     <div className="h-[500px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData.slice(0, 15)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="entityName" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 'bold'}} width={100} />
                                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                <Bar dataKey="approved" name="Approved" stackId="a" fill="#10b981" radius={[0,0,0,0]} barSize={24} />
                                <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                                <Bar dataKey="pending" name="Pending" stackId="a" fill="#f59e0b" radius={[0,4,4,0]} />
                            </BarChart>
                         </ResponsiveContainer>
                     </div>
                 </div>
            </div>
        </div>
    );
}
