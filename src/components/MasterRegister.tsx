import React, { useMemo, useState } from 'react';
import { SubmittalRow, ProjectSettings } from '../types';
import { calculateStats, getStatusCodeCategory } from '../utils/calculations';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  Activity, AlertTriangle, FileBox, CheckCircle2, XCircle, Clock, 
  Search, Filter, List, Grid, Download, ChevronRight, TrendingUp, TrendingDown
} from 'lucide-react';

interface Props {
  data: SubmittalRow[];
  projectInfo: ProjectSettings | null;
}

const CONSTANTS = {
    GREEN: '#10B981',
    AMBER: '#F59E0B',
    RED: '#EF4444',
    BLUE: '#3B82F6',
    PURPLE: '#8B5CF6'
};

export default function MasterRegister({ data, projectInfo }: Props) {
    const stats = useMemo(() => calculateStats(data), [data]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'kpi' | 'grid'>('kpi');
    const [filterDiscipline, setFilterDiscipline] = useState('All');

    // Advanced derived metrics
    const openRecords = useMemo(() => data.filter(d => getStatusCodeCategory(d.status) === 'PENDING').length, [data]);
    const closedRecords = data.length - openRecords;

    const filteredData = useMemo(() => {
        return data.filter(d => {
            if (filterDiscipline !== 'All' && d.discipline !== filterDiscipline) return false;
            if (searchTerm) {
                const s = searchTerm.toLowerCase();
                return (d.docNo || '').toLowerCase().includes(s) || 
                       (d.subject || '').toLowerCase().includes(s) || 
                       (d.status || '').toLowerCase().includes(s);
            }
            return true;
        });
    }, [data, searchTerm, filterDiscipline]);

    const disciplines = Array.from(new Set(data.map(d => d.discipline).filter(Boolean)));

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-900 tracking-tight flex items-center gap-3">
                        Master Register
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest border border-blue-200">Unified Database</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-medium">Consolidated view of all project documentation</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setViewMode('kpi')} className={`p-2 rounded-lg transition-colors ${viewMode === 'kpi' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:bg-slate-100'}`}><Activity className="w-5 h-5"/></button>
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:bg-slate-100'}`}><Grid className="w-5 h-5"/></button>
                </div>
            </div>

            {viewMode === 'kpi' && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard title="Total Records" value={data.length} icon={<FileBox className="text-blue-500"/>} />
                        <KPICard title="Open Records" value={openRecords} icon={<Clock className="text-amber-500"/>} />
                        <KPICard title="Closed Records" value={closedRecords} icon={<CheckCircle2 className="text-emerald-500"/>} />
                        <KPICard title="Overdue Actions" value={stats.overdue} icon={<AlertTriangle className="text-red-500"/>} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                        <div className="bg-white border md:col-span-2 border-slate-200 rounded-xl shadow-sm p-6 overflow-hidden flex flex-col">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Recent Activity Log</h3>
                            <div className="overflow-auto flex-1">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase text-slate-500 bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 border-b">Ref / Doc No</th>
                                            <th className="px-4 py-3 border-b">Type</th>
                                            <th className="px-4 py-3 border-b">Status</th>
                                            <th className="px-4 py-3 border-b">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredData.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-mono font-medium">{row.docNo || row.ncrRef || row.sorRef || row.normalizedRef || row.id}</td>
                                                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold text-slate-600 border border-slate-200">{row.documentType || row.logType}</span></td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm ${getStatusCodeCategory(row.status) === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : getStatusCodeCategory(row.status) === 'REJECTED_OPEN' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>{row.status}</span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">{row.responseDate || row.submissionDate || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button onClick={() => setViewMode('grid')} className="mt-4 w-full py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">View All {filteredData.length} Records</button>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 overflow-hidden flex flex-col">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Status Distribution</h3>
                            <div className="flex-1 flex items-center justify-center -ml-4">
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie data={[
                                            { name: 'Approved', value: stats.approved },
                                            { name: 'Pending', value: stats.pending },
                                            { name: 'Rejected', value: stats.rejectedOpen + stats.rejectedClosed }
                                        ]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            <Cell fill={CONSTANTS.GREEN} />
                                            <Cell fill={CONSTANTS.AMBER} />
                                            <Cell fill={CONSTANTS.RED} />
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-600 mt-2">
                                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-500"></div> App</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-500"></div> Pen</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-500"></div> Rej</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {viewMode === 'grid' && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[600px]">
                     <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-4 justify-between items-center">
                         <div className="flex gap-4 items-center">
                             <div className="relative">
                                 <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                 <input type="text" placeholder="Search reference..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 w-64 focus:ring-1 focus:ring-blue-500"/>
                             </div>
                             <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500" value={filterDiscipline} onChange={e=>setFilterDiscipline(e.target.value)}>
                                 <option value="All">All Disciplines</option>
                                 {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                             </select>
                         </div>
                         <button 
                             onClick={() => {
                                 // Sort data exactly as requested: SDW STR, SDW ARCH, etc...
                                 const sorted = [...filteredData].sort((a,b) => {
                                     const kA = (a.documentType || a.logType || '').split('-');
                                     const kB = (b.documentType || b.logType || '').split('-');
                                     const bA = kA[0] || ''; const bB = kB[0] || '';
                                     const dA = kA[1] || a.discipline || ''; const dB = kB[1] || b.discipline || '';
                                     
                                     const bOrd = ['SDW', 'SHD', 'MAR', 'QS', 'DOC', 'WIR', 'MIR', 'RFI', 'NCR', 'SOR', 'LTR'];
                                     let idxA = bOrd.indexOf(bA); let idxB = bOrd.indexOf(bB);
                                     if(idxA!==-1 && idxB!==-1 && idxA!==idxB) return idxA - idxB;
                                     if(idxA===-1 && idxB!==-1) return 1; if(idxA!==-1 && idxB===-1) return -1;
                                     
                                     const dOrd = ['STR','ARC','ARCH','ELE','MEC','MECH','LND','LAND','INFRA','SUR','GEN'];
                                     let dixA = dOrd.indexOf(dA); let dixB = dOrd.indexOf(dB);
                                     if(dixA!==-1 && dixB!==-1 && dixA!==dixB) return dixA - dixB;
                                     if(dixA===-1 && dixB!==-1) return 1; if(dixA!==-1 && dixB===-1) return -1;
                                     return 0;
                                 });
                                 let csv = 'Doc No,Rev,Type,Discipline,Submit Date,Status\n';
                                 sorted.forEach(row => {
                                     csv += `"${row.docNo||row.id}","${row.rev}","${row.documentType||row.logType}","${row.discipline}","${row.submissionDate}","${row.status}"\n`;
                                 });
                                 const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
                                 const link = document.createElement("a");
                                 link.href = URL.createObjectURL(blob);
                                 link.download = `Master_Register_Export_${new Date().getTime()}.csv`;
                                 link.click();
                             }}
                             className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-bold"
                         >
                             <Download className="w-4 h-4" /> Export CSV
                         </button>
                     </div>
                     <div className="overflow-auto flex-1">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-[10px] uppercase tracking-widest text-slate-500 bg-white sticky top-0 border-b border-slate-200 shadow-sm z-10">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Doc No / Ref</th>
                                    <th className="px-6 py-4 font-bold">Rev</th>
                                    <th className="px-6 py-4 font-bold">Type</th>
                                    <th className="px-6 py-4 font-bold">Discipline</th>
                                    <th className="px-6 py-4 font-bold">Submit Date</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.map((row, i) => {
                                    const isMissingDocNo = !row.docNo && !row.ncrRef && !row.sorRef && !row.normalizedRef && !row.id;
                                    const isMissingRev = row.rev === undefined || row.rev === null || String(row.rev).trim() === '';
                                    const isMissingDate = !row.submissionDate;
                                    const isMissingStatus = !row.status;
                                    return (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className={`px-6 py-3 font-mono font-medium text-slate-900 ${isMissingDocNo ? 'bg-red-100 border-l border-red-500' : ''}`}>
                                            {row.docNo || row.ncrRef || row.sorRef || row.normalizedRef || row.id || <span className="text-red-500 font-bold uppercase text-[10px]">MISSING</span>}
                                        </td>
                                        <td className={`px-6 py-3 text-slate-600 ${isMissingRev ? 'bg-red-100' : ''}`}>
                                            {isMissingRev ? <span className="text-red-500 font-bold uppercase text-[10px]">MISSING</span> : row.rev}
                                        </td>
                                        <td className="px-6 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600 border border-slate-200">{row.documentType || row.logType}</span></td>
                                        <td className="px-6 py-3 text-slate-700">{row.discipline || '-'}</td>
                                        <td className={`px-6 py-3 text-slate-500 ${isMissingDate ? 'bg-red-100' : ''}`}>
                                            {isMissingDate ? <span className="text-red-500 font-bold uppercase text-[10px]">MISSING</span> : row.submissionDate}
                                        </td>
                                        <td className={`px-6 py-3 ${isMissingStatus ? 'bg-red-100' : ''}`}>
                                            {isMissingStatus ? <span className="text-red-500 font-bold uppercase text-[10px]">MISSING</span> : (
                                                <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm ${getStatusCodeCategory(row.status) === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : getStatusCodeCategory(row.status) === 'REJECTED_OPEN' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>{row.status}</span>
                                            )}
                                        </td>
                                    </tr>
                                )})}
                                {filteredData.length === 0 && (
                                    <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">No records match the current filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                     </div>
                </div>
            )}
        </div>
    );
}

function KPICard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col shadow-sm relative group overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">{icon}</div>
                <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase truncate">{title}</h3>
            </div>
            <div className="mt-auto">
                <span className="text-3xl font-light text-slate-900 truncate block">{value}</span>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-50 transition-colors"></div>
        </div>
    )
}
