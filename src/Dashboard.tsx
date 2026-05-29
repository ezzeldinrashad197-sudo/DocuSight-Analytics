import React, { useMemo } from 'react';
import { SubmittalRow, ProjectSettings } from './types';
import { calculateStats, getStatusCodeCategory } from './utils/calculations';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { AlertCircle, FileText, CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, FileBox, Building2, HardHat, FileSpreadsheet, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface DashboardProps {
  data: SubmittalRow[];
  projectInfo: ProjectSettings | null;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#7F1D1D'];

export default function Dashboard({ data, projectInfo }: DashboardProps) {
  const stats = useMemo(() => calculateStats(data), [data]);

  const statusData = [
    { name: 'Approved', value: stats.approved },
    { name: 'Pending', value: stats.pending },
    { name: 'Rejected Open', value: stats.rejectedOpen },
    { name: 'Rejected Closed', value: stats.rejectedClosed }
  ];

  const getPerformanceData = (key: keyof SubmittalRow, limit = 5) => {
     const agg: Record<string, any> = {};
     data.forEach(d => {
         const k = (d[key] || 'General').toString();
         if (!agg[k]) agg[k] = { name: k, Approved: 0, RejectedOpen: 0, RejectedClosed: 0, Pending: 0, Total: 0, DelayDays: 0, Overdue: 0 };
         
         const cat = getStatusCodeCategory(d.status);
         if (cat === 'APPROVED') agg[k].Approved++;
         else if (cat === 'REJECTED_OPEN') agg[k].RejectedOpen++;
         else if (cat === 'REJECTED_CLOSED') agg[k].RejectedClosed++;
         else if (cat === 'PENDING') agg[k].Pending++;
         
         agg[k].Total++;
         if (d.overdue) {
             agg[k].Overdue++;
             agg[k].DelayDays += d.delayDays;
         }
     });
     return Object.values(agg)
        .sort((a, b) => b.Total - a.Total)
        .slice(0, limit)
        .map(item => ({
            ...item,
            AppRate: item.Total > 0 ? ((item.Approved / (item.Approved + item.RejectedOpen + item.RejectedClosed)) * 100 || 0).toFixed(1) : 0,
            AvgDelay: item.Overdue > 0 ? Math.round(item.DelayDays / item.Overdue) : 0
        }));
  };

  const tradeData = useMemo(() => getPerformanceData('trade', 8), [data]);
  
  const execSummary = useMemo(() => {
     const discSorted = [...tradeData].filter(d => d.Total > 5);
     const bestAppRate = [...discSorted].sort((a, b) => Number(b.AppRate) - Number(a.AppRate))[0];
     const worstAppRate = [...discSorted].sort((a, b) => Number(a.AppRate) - Number(b.AppRate))[0];
     const mostDelayed = [...discSorted].sort((a, b) => b.Overdue - a.Overdue)[0];

     return {
         criticalIssues: stats.overdue,
         bestDiscipline: bestAppRate ? bestAppRate : null,
         worstDiscipline: worstAppRate ? worstAppRate : null,
         mostDelayed: mostDelayed ? mostDelayed : null
     }
  }, [stats, tradeData]);

  // Trend Analysis Data
  const trendData = useMemo(() => {
    const agg: Record<string, any> = {};
    data.forEach(d => {
        if (!d.submissionDate) return;
        const monthYear = d.submissionDate.substring(0, 7); // YYYY-MM
        if (!agg[monthYear]) agg[monthYear] = { name: monthYear, Submitted: 0, Approved: 0, Rejected: 0, Pending: 0 };
        
        agg[monthYear].Submitted++;
        const cat = getStatusCodeCategory(d.status);
        if (cat === 'APPROVED') agg[monthYear].Approved++;
        else if (cat === 'REJECTED_OPEN' || cat === 'REJECTED_CLOSED') agg[monthYear].Rejected++;
        else if (cat === 'PENDING') agg[monthYear].Pending++;
    });
    return Object.values(agg).sort((a, b) => a.name.localeCompare(b.name)).slice(-6); // Last 6 months for clear view
  }, [data]);

  const latestMonth = trendData.length > 0 ? trendData[trendData.length - 1] : null;
  const previousMonth = trendData.length > 1 ? trendData[trendData.length - 2] : null;

  const monthTrend = latestMonth && previousMonth ? {
      submittedDiff: latestMonth.Submitted - previousMonth.Submitted,
      approvedDiff: latestMonth.Approved - previousMonth.Approved,
      rejectedDiff: latestMonth.Rejected - previousMonth.Rejected
  } : null;

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 max-w-7xl mx-auto py-4">
       
       {projectInfo && (
        <div className="mb-8">
            <h1 className="text-3xl font-light text-[#0A192F] mb-2">{projectInfo.projectName}</h1>
            <p className="text-sm font-bold text-[#64748b] tracking-widest uppercase">Executive Reporting Intelligence</p>
        </div>
       )}

       {/* STORYTELLING INSIGHTS */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <StoryCard 
             title="What Requires Action?"
             icon={<AlertTriangle className="text-[#ef4444]" />}
             accentColor="border-[#ef4444]"
             content={
                 <div className="space-y-4">
                     <div>
                        <p className="text-3xl font-light text-[#0A192F]">{stats.overdue}</p>
                        <p className="text-sm font-medium text-[#64748b] uppercase tracking-wider">Critical Overdue Items</p>
                     </div>
                     {execSummary.mostDelayed && execSummary.mostDelayed.Overdue > 0 && (
                         <div className="bg-[#fef2f2] p-3 rounded-md">
                             <p className="text-sm text-[#991b1b]"><span className="font-bold">{execSummary.mostDelayed.name}</span> trade has the highest backlog with {execSummary.mostDelayed.Overdue} overdue submissions (Avg {execSummary.mostDelayed.AvgDelay} days delayed).</p>
                         </div>
                     )}
                 </div>
             }
           />
           <StoryCard 
             title="What Declined?"
             icon={<TrendingDown className="text-[#f59e0b]" />}
             accentColor="border-[#f59e0b]"
             content={
                 <div className="space-y-4">
                     <div>
                        <p className="text-3xl font-light text-[#0A192F]">{stats.rejectionOpenRate.toFixed(1)}%</p>
                        <p className="text-sm font-medium text-[#64748b] uppercase tracking-wider">Current Rejection Rate</p>
                     </div>
                     {execSummary.worstDiscipline && (
                         <div className="bg-[#fffbeb] p-3 rounded-md">
                             <p className="text-sm text-[#b45309]"><span className="font-bold">{execSummary.worstDiscipline.name}</span> trade shows the highest rejection rate at {100 - Number(execSummary.worstDiscipline.AppRate)}%.</p>
                         </div>
                     )}
                 </div>
             }
           />
           <StoryCard 
             title="What Improved?"
             icon={<TrendingUp className="text-[#10b981]" />}
             accentColor="border-[#10b981]"
             content={
                 <div className="space-y-4">
                     <div>
                        <p className="text-3xl font-light text-[#0A192F]">{stats.approvalRate.toFixed(1)}%</p>
                        <p className="text-sm font-medium text-[#64748b] uppercase tracking-wider">Overall Approval Rate</p>
                     </div>
                     {execSummary.bestDiscipline && (
                         <div className="bg-[#ecfdf5] p-3 rounded-md">
                             <p className="text-sm text-[#065f46]"><span className="font-bold">{execSummary.bestDiscipline.name}</span> trade leads performance with a {execSummary.bestDiscipline.AppRate}% approval success rate.</p>
                         </div>
                     )}
                 </div>
             }
           />
       </div>

       <div className="border-t border-[#e2e8f0] my-8"></div>

       {/* PRIMARY ANALYTICS: TRADE PERFORMANCE */}
       <div className="mb-4 flex items-center justify-between">
           <h2 className="text-xl font-light text-[#0A192F]">Trade Performance Intelligence</h2>
       </div>
       <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div>
                   <h3 className="text-sm font-bold text-[#64748b] uppercase tracking-widest mb-6">Trade Submission Volume vs Approvals</h3>
                   <div className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={tradeData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                         <XAxis type="number" axisLine={false} tickLine={false} />
                         <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontWeight: 'bold', fill: '#475569'}} />
                         <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                         <Legend iconType="circle" />
                         <Bar dataKey="Approved" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} barSize={20} />
                         <Bar dataKey="Pending" stackId="a" fill="#F59E0B" />
                         <Bar dataKey="RejectedOpen" name="Rejected" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
               </div>
               
               <div>
                   <h3 className="text-sm font-bold text-[#64748b] uppercase tracking-widest mb-6">Trade Bottleneck Analysis</h3>
                   <div className="space-y-4">
                       {tradeData.map((d) => (
                           <div key={d.name} className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 last:border-0 last:pb-0">
                               <div className="font-medium text-[#334155]">{d.name}</div>
                               <div className="flex items-center gap-6">
                                   <div className="text-right">
                                       <span className="block text-[10px] text-[#94a3b8] uppercase">Approval</span>
                                       <span className={`font-bold ${Number(d.AppRate) >= 70 ? 'text-[#10b981]' : Number(d.AppRate) >= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>{d.AppRate}%</span>
                                   </div>
                                   <div className="text-right w-16">
                                       <span className="block text-[10px] text-[#94a3b8] uppercase">Delayed</span>
                                       <span className={`font-bold ${d.Overdue > 0 ? 'text-[#ef4444]' : 'text-[#64748b]'}`}>{d.Overdue}</span>
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
            </div>
       </div>

       {/* SECONDARY ANALYTICS: TRENDS */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
           {/* TRENDS */}
           <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-6 lg:p-8">
               <div className="flex items-center justify-between mb-8">
                   <h3 className="text-sm font-bold text-[#64748b] uppercase tracking-widest">Monthly Quality Trend</h3>
                   {monthTrend && (
                       <div className="flex gap-4">
                           {monthTrend.approvedDiff !== 0 && (
                               <div className={`flex items-center text-xs font-bold ${monthTrend.approvedDiff > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                                   {monthTrend.approvedDiff > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                   {Math.abs(monthTrend.approvedDiff)} Approvals
                               </div>
                           )}
                           {monthTrend.rejectedDiff !== 0 && (
                               <div className={`flex items-center text-xs font-bold ${monthTrend.rejectedDiff < 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                                   {monthTrend.rejectedDiff > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                   {Math.abs(monthTrend.rejectedDiff)} Rejections
                               </div>
                           )}
                       </div>
                   )}
               </div>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={trendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                     <defs>
                       <linearGradient id="colorApp" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorRej" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                     <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                     <Legend iconType="circle" />
                     <Area type="monotone" dataKey="Approved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorApp)" />
                     <Area type="monotone" dataKey="Rejected" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRej)" />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
           </div>

           {/* OVERALL PORTFOLIO STATUS */}
           <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-6 lg:p-8">
               <h3 className="text-sm font-bold text-[#64748b] uppercase tracking-widest mb-6">Cumulative Document Health</h3>
               <div className="flex flex-col md:flex-row items-center gap-8">
                   <div className="w-48 h-48 flex-shrink-0 relative">
                       <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                               <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={2} dataKey="value" stroke="none">
                                   {statusData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                   ))}
                               </Pie>
                               <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                           </PieChart>
                       </ResponsiveContainer>
                       <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                           <span className="text-2xl font-light text-[#0A192F]">{stats.totalSubmittedSheets}</span>
                           <span className="text-[10px] uppercase font-bold text-[#94a3b8]">Items</span>
                       </div>
                   </div>
                   <div className="flex-1 space-y-4 w-full">
                       {statusData.map((s, idx) => (
                           <div key={s.name} className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                   <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                                   <span className="text-sm font-medium text-[#334155]">{s.name}</span>
                               </div>
                               <div className="text-sm font-bold">{s.value}</div>
                           </div>
                       ))}
                   </div>
               </div>
           </div>
       </div>

    </div>
  );
}

function StoryCard({ title, icon, content, accentColor }: { title: string, icon: React.ReactNode, content: React.ReactNode, accentColor: string }) {
    return (
        <div className={`bg-white rounded-xl shadow-sm border-t-4 ${accentColor} border-x border-b border-x-[#e2e8f0] border-b-[#e2e8f0] p-6 lg:p-8`}>
            <div className="flex items-center gap-3 mb-6">
                {icon}
                <h3 className="font-bold text-[#0A192F] tracking-wide">{title}</h3>
            </div>
            {content}
        </div>
    )
}

