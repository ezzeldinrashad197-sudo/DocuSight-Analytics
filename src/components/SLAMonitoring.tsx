import React, { useMemo } from 'react';
import { SubmittalRow, ProjectSettings } from '../types';
import { getStatusCodeCategory } from '../utils/calculations';
import { Settings2, Clock, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: SubmittalRow[];
  projectInfo: ProjectSettings | null;
}

export default function SLAMonitoring({ data, projectInfo }: Props) {
    const slas = useMemo(() => {
        return projectInfo?.slaDays || {
            shopDrawings: 14,
            materialSubmittals: 14,
            rfi: 7,
            ncr: 7,
            sor: 7,
            letters: 3,
            default: 14
        };
    }, [projectInfo]);

    const { summary, registerStats } = useMemo(() => {
        let totalClosed = 0;
        let totalBreaches = 0;
        let cumulativeDelay = 0;

        const regMap: Record<string, { name: string, total: number, breaches: number, avgDelay: number, sumDelay: number, compliance: number }> = {
            'Shop Drawings': { name: 'Shop Drawings', total: 0, breaches: 0, avgDelay: 0, sumDelay: 0, compliance: 0 },
            'Material Submittals': { name: 'Material Submittals', total: 0, breaches: 0, avgDelay: 0, sumDelay: 0, compliance: 0 },
            'RFI': { name: 'RFI', total: 0, breaches: 0, avgDelay: 0, sumDelay: 0, compliance: 0 },
            'NCR': { name: 'NCR', total: 0, breaches: 0, avgDelay: 0, sumDelay: 0, compliance: 0 },
            'SOR': { name: 'SOR', total: 0, breaches: 0, avgDelay: 0, sumDelay: 0, compliance: 0 },
            'Letters/Corr.': { name: 'Letters/Corr.', total: 0, breaches: 0, avgDelay: 0, sumDelay: 0, compliance: 0 },
            'Other': { name: 'Other', total: 0, breaches: 0, avgDelay: 0, sumDelay: 0, compliance: 0 }
        };

        const respondedData = data.filter(d => d.submissionDate && d.responseDate && getStatusCodeCategory(d.status) !== 'PENDING');

        respondedData.forEach(d => {
            if (!d.submissionDate || !d.responseDate) return;
            const subMs = new Date(d.submissionDate).getTime();
            const resMs = new Date(d.responseDate).getTime();
            const responseDays = (resMs - subMs) / (1000 * 3600 * 24);
            
            if (responseDays < 0) return;

            let cat = 'Other';
            let slaLimit = slas.default;

            const dtype = (d.documentType || d.logType || '').toUpperCase();
            if (dtype.includes('SHD') || dtype.includes('SHOP')) { cat = 'Shop Drawings'; slaLimit = slas.shopDrawings; }
            else if (dtype.includes('MAR') || dtype.includes('MAT')) { cat = 'Material Submittals'; slaLimit = slas.materialSubmittals; }
            else if (dtype.includes('RFI')) { cat = 'RFI'; slaLimit = slas.rfi; }
            else if (dtype.includes('NCR')) { cat = 'NCR'; slaLimit = slas.ncr; }
            else if (dtype.includes('SOR')) { cat = 'SOR'; slaLimit = slas.sor; }
            else if (dtype.includes('LTR') || dtype.includes('LET')) { cat = 'Letters/Corr.'; slaLimit = slas.letters; }

            totalClosed++;
            regMap[cat].total++;

            if (responseDays > slaLimit) {
                totalBreaches++;
                const delay = responseDays - slaLimit;
                cumulativeDelay += delay;
                regMap[cat].breaches++;
                regMap[cat].sumDelay += delay;
            }
        });

        const arr = Object.values(regMap).filter(r => r.total > 0).map(r => {
            r.avgDelay = r.breaches > 0 ? (r.sumDelay / r.breaches) : 0;
            r.compliance = ((r.total - r.breaches) / r.total) * 100;
            return r;
        });

        const onTimeRate = totalClosed > 0 ? ((totalClosed - totalBreaches) / totalClosed) * 100 : 100;

        return { 
            summary: { totalClosed, totalBreaches, onTimeRate, avgDelayAll: totalBreaches > 0 ? (cumulativeDelay / totalBreaches) : 0 },
            registerStats: arr
        };
    }, [data, slas]);

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 min-h-screen">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-light text-slate-900 tracking-tight flex items-center gap-3">
                        SLA Compliance
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest border border-indigo-200">Governance Engine</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-medium">Service level agreement monitoring and breach detection</p>
                </div>
                <button onClick={()=>{}} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                    <Settings2 className="w-4 h-4" /> Configure SLAs
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm text-center">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Compliance Rate</h3>
                    <div className={`text-4xl font-light ${summary.onTimeRate >= 90 ? 'text-emerald-500' : summary.onTimeRate >= 75 ? 'text-amber-500' : 'text-red-500'}`}>
                        {summary.onTimeRate.toFixed(1)}%
                    </div>
                </div>
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                    <span className="text-3xl font-bold text-slate-900">{summary.totalClosed - summary.totalBreaches}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase">On-Time Responses</span>
                </div>
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center">
                    <ShieldAlert className="w-8 h-8 text-red-500 mb-2" />
                    <span className="text-3xl font-bold text-slate-900">{summary.totalBreaches}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase">SLA Breaches</span>
                </div>
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center">
                    <Clock className="w-8 h-8 text-amber-500 mb-2" />
                    <span className="text-3xl font-bold text-slate-900">{summary.avgDelayAll.toFixed(1)}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase">Avg Delay (Days)</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-200 bg-slate-50">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">SLA Performance by Tier</h3>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] uppercase tracking-widest text-slate-500 bg-white">
                                <tr>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200">Register Type</th>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200 text-right">Target SLA (Days)</th>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200 text-right">Compliance Rate</th>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200 text-right">Total Breaches</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {registerStats.map((r, i) => {
                                    let target = slas.default;
                                    if(r.name === 'Shop Drawings') target = slas.shopDrawings;
                                    if(r.name === 'Material Submittals') target = slas.materialSubmittals;
                                    if(r.name === 'RFI') target = slas.rfi;
                                    if(r.name === 'NCR') target = slas.ncr;
                                    if(r.name === 'SOR') target = slas.sor;
                                    if(r.name === 'Letters/Corr.') target = slas.letters;

                                    return (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-semibold text-slate-800">{r.name}</td>
                                            <td className="px-6 py-4 text-right text-slate-600 font-mono">{target} Days</td>
                                            <td className="px-6 py-4 text-right font-bold" style={{ color: r.compliance >= 90 ? '#10B981' : r.compliance >= 75 ? '#F59E0B' : '#EF4444' }}>
                                                {r.compliance.toFixed(1)}%
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-600">
                                                {r.breaches > 0 ? <span className="bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded">{r.breaches}</span> : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                     <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Breach Volume Distribution</h3>
                     <div className="h-72">
                         <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={registerStats} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                 <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                 <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 600}} width={100} />
                                 <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                 <Bar dataKey="breaches" fill="#EF4444" radius={[0, 4, 4, 0]} maxBarSize={30} />
                             </BarChart>
                         </ResponsiveContainer>
                     </div>
                </div>
            </div>
        </div>
    );
}
