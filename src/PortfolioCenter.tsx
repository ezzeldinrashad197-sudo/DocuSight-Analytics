import React, { useState, useEffect, useMemo } from 'react';
import { ProjectSettings } from './types';
import { ShieldAlert, TrendingUp, AlertTriangle, Presentation, Briefcase, Activity, Hexagon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

interface PortfolioCenterProps {
  projects: ProjectSettings[];
}

export default function PortfolioCenter({ projects }: PortfolioCenterProps) {
  const [realStats, setRealStats] = useState<any[]>([]);

  useEffect(() => {
     const fetchStats = async () => {
         try {
             const snap = await getDocs(collection(db, 'project_stats'));
             const st: any[] = [];
             snap.forEach(d => st.push({ id: d.id, ...d.data() }));
             setRealStats(st);
         } catch (err) {
             handleFirestoreError(err, OperationType.LIST, 'project_stats');
         }
     };
     fetchStats();
  }, []);

  const portfolioData = useMemo(() => {
    // Generate real portfolio stats based on the configured projects combined with firestore stats
    return projects.map((p, i) => {
      const dbStat = realStats.find(s => s.id === p.id);
      const health = dbStat?.healthScore || 0;
      const docs = dbStat?.totalDocs || 0;
      const approval = dbStat?.approvalRate || 0;
      const overdue = dbStat?.overdueRate || 0;
      
      return {
        id: p.id,
        name: p.projectName,
        code: p.projectCode,
        pm: p.projectManager,
        healthScore: health,
        totalDocs: docs,
        approvalRate: approval,
        overdueRate: overdue,
        status: health >= 85 ? 'Excellent' : health >= 75 ? 'Good' : health === 0 ? 'No Data' : 'At Risk'
      };
    }).sort((a, b) => b.healthScore - a.healthScore);
  }, [projects, realStats]);

  const globalHealth = portfolioData.length ? Math.round(portfolioData.reduce((acc, curr) => acc + curr.healthScore, 0) / portfolioData.length) : 0;
  const totalVolume = portfolioData.reduce((acc, curr) => acc + curr.totalDocs, 0);

  if (projects.length === 0) {
      return (
          <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-slate-500">
             <Briefcase className="w-16 h-16 mb-4 text-slate-300" />
             <p className="text-xl font-medium text-slate-700">No projects configured</p>
             <p>Add projects in the Settings to enable Portfolio Monitoring.</p>
          </div>
      );
  }

  return (
    <div className="p-8 pb-32 bg-[#0B1120] min-h-screen text-slate-300 font-sans">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <Hexagon className="w-8 h-8 text-indigo-500" />
                    Portfolio Command Center
                </h1>
                <p className="text-slate-400 mt-2 text-sm max-w-2xl">
                    Macro-Level Portfolio Intelligence & Project Ranking Dashboard.
                </p>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium">
                <div className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Global Health: {globalHealth}/100
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
             <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-center">
                 <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Total Monitored Projects</span>
                 <div className="text-5xl font-black text-indigo-400 mt-2">{projects.length}</div>
             </div>
             
             <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-center">
                 <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Total Active Documents</span>
                 <div className="text-5xl font-black text-blue-400 mt-2">{(totalVolume / 1000).toFixed(1)}k</div>
             </div>
             
             <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col justify-center">
                 <span className="text-sm font-semibold uppercase tracking-wider text-red-400">Projects At Risk</span>
                 <div className="text-5xl font-black text-red-500 mt-2">{portfolioData.filter(p => p.status === 'At Risk').length}</div>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900">
               <h3 className="text-lg font-bold text-white mb-6">Portfolio Approval Rates (%)</h3>
               <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={portfolioData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                           <XAxis type="number" domain={[0, 100]} stroke="#475569" />
                           <YAxis dataKey="code" type="category" stroke="#94a3b8" />
                           <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                           <Bar dataKey="approvalRate" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                       </BarChart>
                   </ResponsiveContainer>
               </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900">
               <h3 className="text-lg font-bold text-white mb-6">Overdue Accumulation (%)</h3>
               <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={portfolioData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                           <XAxis dataKey="code" stroke="#94a3b8" />
                           <YAxis stroke="#475569" />
                           <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                           <Bar dataKey="overdueRate" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                       </BarChart>
                   </ResponsiveContainer>
               </div>
            </div>
        </div>

        {/* Project Rankings Table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800">
               <h3 className="text-lg font-bold text-white">Project Performance Benchmark</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-800 text-slate-300 font-semibold uppercase tracking-wider text-xs">
                        <tr>
                            <th className="px-6 py-4">Rank</th>
                            <th className="px-6 py-4">Project</th>
                            <th className="px-6 py-4">PM / Lead</th>
                            <th className="px-6 py-4">Total Docs</th>
                            <th className="px-6 py-4">Approval Rate</th>
                            <th className="px-6 py-4">Overdue Rate</th>
                            <th className="px-6 py-4">Health Score</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {portfolioData.map((proj, idx) => (
                            <tr key={proj.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-400">#{idx + 1}</td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-white">{proj.name}</div>
                                    <div className="text-xs text-slate-500">{proj.code}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-400">{proj.pm}</td>
                                <td className="px-6 py-4 text-slate-300 font-mono">{proj.totalDocs.toLocaleString()}</td>
                                <td className="px-6 py-4 font-mono text-blue-400">{proj.approvalRate.toFixed(1)}%</td>
                                <td className="px-6 py-4 font-mono text-amber-400">{proj.overdueRate.toFixed(1)}%</td>
                                <td className="px-6 py-4 font-mono font-bold text-indigo-400">{proj.healthScore}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${
                                        proj.status === 'Excellent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        proj.status === 'Good' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {proj.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}
