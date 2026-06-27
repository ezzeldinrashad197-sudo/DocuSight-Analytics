import React, { useMemo, useState } from 'react';
import { SubmittalRow, ProjectSettings } from '../types';
import { getStatusCodeCategory } from '../utils/calculations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, AlertTriangle, TrendingUp, Filter } from 'lucide-react';

interface Props {
  data: SubmittalRow[];
  projectInfo: ProjectSettings | null;
}

export default function AdvancedAgingAnalysis({ data }: Props) {
    const [filterDiscipline, setFilterDiscipline] = useState('All');

    const openRecords = useMemo(() => {
        return data.filter(d => getStatusCodeCategory(d.status) === 'PENDING');
    }, [data]);

    const { buckets, stats } = useMemo(() => {
        const result = {
            '0-7': 0, '8-14': 0, '15-30': 0, '31-60': 0, '61-90': 0, '>90': 0
        };

        const contractorDelay: Record<string, number> = {};
        const disciplineDelay: Record<string, number> = {};

        const filtered = filterDiscipline === 'All' ? openRecords : openRecords.filter(d => d.discipline === filterDiscipline);

        filtered.forEach(d => {
            if (!d.submissionDate) return;
            const subDate = new Date(d.submissionDate).getTime();
            const now = Date.now();
            const days = Math.floor((now - subDate) / (1000 * 3600 * 24));
            
            if (days < 0) return;

            if (days <= 7) result['0-7']++;
            else if (days <= 14) result['8-14']++;
            else if (days <= 30) result['15-30']++;
            else if (days <= 60) result['31-60']++;
            else if (days <= 90) result['61-90']++;
            else result['>90']++;

            if (days > 14) {
                const tr = d.contractor || 'Unknown';
                const disc = d.discipline || 'Unknown';
                contractorDelay[tr] = (contractorDelay[tr] || 0) + 1;
                disciplineDelay[disc] = (disciplineDelay[disc] || 0) + 1;
            }
        });

        const chartData = [
            { name: '0-7 Days', value: result['0-7'], color: '#10B981' },
            { name: '8-14 Days', value: result['8-14'], color: '#3B82F6' },
            { name: '15-30 Days', value: result['15-30'], color: '#F59E0B' },
            { name: '31-60 Days', value: result['31-60'], color: '#EF4444' },
            { name: '61-90 Days', value: result['61-90'], color: '#B91C1C' },
            { name: '>90 Days', value: result['>90'], color: '#7F1D1D' },
        ];

        let highestContractor = 'None';
        let highestDiscipline = 'None';
        if (Object.keys(contractorDelay).length) highestContractor = Object.entries(contractorDelay).sort((a,b)=>b[1]-a[1])[0][0];
        if (Object.keys(disciplineDelay).length) highestDiscipline = Object.entries(disciplineDelay).sort((a,b)=>b[1]-a[1])[0][0];

        return { buckets: chartData, stats: { highestContractor, highestDiscipline, totalOpen: filtered.length } };
    }, [openRecords, filterDiscipline]);

    const disciplines = Array.from(new Set(openRecords.map(d => d.discipline).filter(Boolean)));

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-900 tracking-tight flex items-center gap-3">
                        Aging Analysis
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest border border-red-200">Risk Engine</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-medium">Real-time tracking of overdue and aging submittals</p>
                </div>
                <div className="flex gap-2 items-center bg-white border border-slate-200 p-1.5 rounded-lg">
                     <Filter className="w-4 h-4 text-slate-400 ml-2" />
                     <select className="bg-transparent border-none text-sm outline-none font-medium pr-4 focus:ring-0" value={filterDiscipline} onChange={e=>setFilterDiscipline(e.target.value)}>
                         <option value="All">All Disciplines</option>
                         {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm text-center">
                    <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-4xl font-light text-slate-900">{stats.totalOpen}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total Open Items</div>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm text-center">
                    <TrendingUp className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-slate-900 line-clamp-1">{stats.highestContractor}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Highest Aging Contractor</div>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-slate-900 line-clamp-1">{stats.highestDiscipline}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Highest Aging Discipline</div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-8">Aging Buckets (Days Since Submission)</h3>
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={buckets} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                            <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                {buckets.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
