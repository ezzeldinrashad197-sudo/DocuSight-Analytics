import React, { useMemo, useState } from 'react';
import { SubmittalRow, ProjectSettings } from '../types';
import { getStatusCodeCategory } from '../utils/calculations';
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, ListTodo, Search, Filter } from 'lucide-react';

interface Props {
  data: SubmittalRow[];
  projectInfo: ProjectSettings | null;
}

export default function ActionTracker({ data }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    const actions = useMemo(() => {
        const list: any[] = [];
        data.forEach(d => {
            const dtype = (d.documentType || d.logType || '').toUpperCase();
            const sourceRef = d.docNo || d.ncrRef || d.sorRef || d.normalizedRef || d.id;
            
            // Extract actions dynamically based on open/rejected workflows requiring response, or NCR/SOR/RFI explicit actions.
            if (dtype.includes('NCR') || dtype.includes('SOR') || dtype.includes('RFI')) {
                const cat = getStatusCodeCategory(d.status);
                if (cat === 'PENDING' || d.recordStatus === 'Open' || (d.ncrStatus && d.ncrStatus !== 'Closed') || (d.sorStatus && d.sorStatus !== 'Closed')) {
                    list.push({
                        id: `ACT-${list.length + 1}`,
                        source: dtype,
                        ref: sourceRef,
                        desc: d.subject || d.remarks || 'Response required',
                        owner: d.consultant || d.contractor || 'Unknown',
                        priority: dtype.includes('NCR') ? 'High' : 'Medium',
                        status: 'Open',
                        dueDate: d.dueDate || '-'
                    });
                }
            } else if (d.actionRequired) {
                list.push({
                    id: `ACT-${list.length + 1}`,
                    source: 'Correspondence',
                    ref: sourceRef,
                    desc: d.subject || 'Action Required',
                    owner: d.stakeholder || 'Unknown',
                    priority: 'Medium',
                    status: 'Open',
                    dueDate: d.dueDate || '-'
                });
            } else if (getStatusCodeCategory(d.status) === 'REJECTED_OPEN') {
                 list.push({
                    id: `ACT-${list.length + 1}`,
                    source: dtype || 'Submittal',
                    ref: sourceRef,
                    desc: 'Resubmission required due to rejection',
                    owner: d.contractor || 'Unknown',
                    priority: 'High',
                    status: 'Open',
                    dueDate: d.dueDate || '-'
                });
            }
        });
        return list;
    }, [data]);

    const filtered = actions.filter(a => {
        if (filterStatus !== 'All' && a.status !== filterStatus) return false;
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            return a.ref.toLowerCase().includes(s) || a.desc.toLowerCase().includes(s) || a.owner.toLowerCase().includes(s);
        }
        return true;
    });

    const openCount = actions.filter(a => a.status === 'Open').length;
    const highPriority = actions.filter(a => a.status === 'Open' && a.priority === 'High').length;

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 min-h-screen">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-900 tracking-tight flex items-center gap-3">
                        Action Tracker
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest border border-amber-200">Execution Hub</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-medium">Centralized issue and action lifecycle management</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input type="text" placeholder="Search actions..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-9 pr-4 py-1.5 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 w-56 focus:ring-1 focus:ring-blue-500"/>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm text-center flex flex-col items-center">
                    <ListTodo className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-3xl font-light text-slate-900">{actions.length}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total Tracked Actions</span>
                </div>
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm text-center flex flex-col items-center">
                    <Clock className="w-8 h-8 text-amber-500 mb-2" />
                    <span className="text-3xl font-bold text-slate-900">{openCount}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Open & Pending</span>
                </div>
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm text-center flex flex-col items-center">
                    <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                    <span className="text-3xl font-bold text-slate-900">{highPriority}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">High Priority Actions</span>
                </div>
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm text-center flex flex-col items-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                    <span className="text-3xl font-light text-slate-900">{actions.length - openCount}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Resolved Actions</span>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm min-h-[500px] flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Active Action Registry</h3>
                    <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-blue-500" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                        <option value="All">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] uppercase tracking-widest text-slate-500 bg-white border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold">Action ID</th>
                                <th className="px-6 py-4 font-bold">Source Ref</th>
                                <th className="px-6 py-4 font-bold">Description</th>
                                <th className="px-6 py-4 font-bold">Owner</th>
                                <th className="px-6 py-4 font-bold text-center">Priority</th>
                                <th className="px-6 py-4 font-bold">Due Date</th>
                                <th className="px-6 py-4 font-bold text-center">Action Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((r, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{r.id}</td>
                                    <td className="px-6 py-4 text-xs">
                                        <span className="block font-bold text-blue-600">{r.source}</span>
                                        <span className="text-slate-500 font-mono">{r.ref}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 max-w-sm truncate" title={r.desc}>{r.desc}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{r.owner}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.priority}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{r.dueDate}</td>
                                    <td className="px-6 py-4 text-center">
                                         <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${r.status === 'Open' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{r.status}</span>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No actions required based on current configuration.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
