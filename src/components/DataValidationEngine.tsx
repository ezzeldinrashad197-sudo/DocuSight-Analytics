import React, { useMemo, useState } from 'react';
import { SubmittalRow } from '../types';
import { AlertTriangle, CheckCircle2, XCircle, Download, DatabaseZap, FileText, CheckSquare } from 'lucide-react';
import { getStatusCodeCategory, parseDateTimestamp } from '../utils/calculations';
import { getPerformanceValidationRows } from '../analytics/calculationFoundation';
import { compareRevisions } from '../analytics/analyticsCore';
import { getRevisionWeight } from '../utils/enterpriseUpgradeEngine';

const getNormalizedRevision = (rev?: string | number, isRev0?: boolean): string => {
    if (rev === undefined || rev === null) {
        return isRev0 ? '0' : 'Unknown';
    }
    const r = String(rev).trim().toUpperCase();
    if (r === '00' || r === '0' || r === 'REV0' || r === 'REV00' || r === 'REV.0' || r === 'REV.00' || r === '') {
        return '0';
    }
    let cleaned = r.replace(/^REV\.?\s*/, '');
    if (cleaned === '00' || cleaned === '0' || cleaned === '') {
        return '0';
    }
    if (/^0+[1-9]\d*$/.test(cleaned)) {
        cleaned = cleaned.replace(/^0+/, '');
    }
    return cleaned;
};

interface Props {
    data: SubmittalRow[];
}

export default function DataValidationEngine({ data }: Props) {
    const [activeTab, setActiveTab] = useState<'anomalies' | 'audit_report'>('audit_report');

    const auditRows = useMemo(() => {
        return getPerformanceValidationRows(data);
    }, [data]);

    const auditSummary = useMemo(() => {
        let approved = 0;
        let pending = 0;
        let rejectedOpen = 0;
        let rejectedClosed = 0;
        auditRows.forEach(r => {
            if (r.resolvedStatus === 'APPROVED') approved++;
            else if (r.resolvedStatus === 'REJECTED_OPEN') rejectedOpen++;
            else if (r.resolvedStatus === 'REJECTED_CLOSED') rejectedClosed++;
            else pending++;
        });
        return { total: auditRows.length, approved, pending, rejectedOpen, rejectedClosed };
    }, [auditRows]);

    const { score, errors, categories } = useMemo(() => {
        let totalChecks = 0;
        let failedChecks = 0;
        const errs: any[] = [];
        const cats = {
            missingFields: 0,
            dateLogic: 0,
            statusLogic: 0,
            revisionLogic: 0,
            duplicates: 0,
            other: 0,
        };

        const docHistory: Record<string, SubmittalRow[]> = {};
        const exactRecordMap: Map<string, SubmittalRow> = new Map();

        data.forEach(row => {
            const rowRef = row.docNo || row.ncrRef || row.sorRef || row.normalizedRef || row.id;
            
            // Collect for doc history (to check revisions)
            if (rowRef && rowRef !== 'Unknown') {
                if (!docHistory[rowRef]) docHistory[rowRef] = [];
                docHistory[rowRef].push(row);
                
                const normRev = getNormalizedRevision(row.rev, row.isRev0);
                const exactKey = `${rowRef}_${normRev}`;
                
                if (exactRecordMap.has(exactKey)) {
                    const existingRow = exactRecordMap.get(exactKey)!;
                    const existingStatus = (existingRow.status || existingRow.recordStatus || '').trim().toUpperCase();
                    const currentStatus = (row.status || row.recordStatus || '').trim().toUpperCase();
                    
                    if (existingStatus && currentStatus && existingStatus !== currentStatus) {
                        failedChecks++; 
                        cats.duplicates++; 
                        errs.push({ 
                            ref: rowRef, 
                            type: 'Revision Conflict', 
                            desc: `Critical Conflict: Same revision (${normRev || 'N/A'}) found with conflicting statuses: "${existingRow.status || 'N/A'}" vs "${row.status || 'N/A'}"` 
                        });
                        totalChecks++;
                    } else {
                        failedChecks++; 
                        cats.duplicates++; 
                        errs.push({ 
                            ref: rowRef, 
                            type: 'Duplicate Record', 
                            desc: `Duplicate entry found for revision ${row.rev || normRev}` 
                        });
                        totalChecks++;
                    }
                } else {
                    exactRecordMap.set(exactKey, row);
                }
            }

            // 1. Missing Fields
            totalChecks += 4; // docNo, rev, status, submissionDate
            if (!rowRef) { failedChecks++; cats.missingFields++; errs.push({ ref: 'Unknown', type: 'Missing ID/DocNo', desc: 'Row has no reference number' }); }
            if (row.rev === undefined && !row.isRev0) { failedChecks++; cats.missingFields++; errs.push({ ref: rowRef || 'Unknown', type: 'Missing Revision', desc: 'No revision provided' }); }
            if (!row.status && !row.recordStatus && !row.ncrStatus && !row.sorStatus) { failedChecks++; cats.missingFields++; errs.push({ ref: rowRef || 'Unknown', type: 'Missing Status', desc: 'No status code or text provided' }); }
            if (!row.submissionDate) { failedChecks++; cats.missingFields++; errs.push({ ref: rowRef || 'Unknown', type: 'Missing Submit Date', desc: 'No submission date available' }); }

            // 2. Date Logic
            totalChecks += 2;
            const subD = row.submissionDate ? new Date(row.submissionDate) : null;
            const resD = row.responseDate ? new Date(row.responseDate) : null;
            
            if (subD && resD && resD < subD) {
                failedChecks++; cats.dateLogic++; errs.push({ ref: rowRef || 'Unknown', type: 'Invalid Dates', desc: 'Response date is before submission date' });
            }
            if (subD && subD.getTime() > Date.now()) {
                failedChecks++; cats.dateLogic++; errs.push({ ref: rowRef || 'Unknown', type: 'Future Submit Date', desc: 'Submission date is in the future' });
            }

            // 3. Status Logic
            totalChecks += 1;
            const cat = getStatusCodeCategory(row.status);
            if (cat === 'UNKNOWN' && row.status) {
                failedChecks++; cats.statusLogic++; errs.push({ ref: rowRef || 'Unknown', type: 'Invalid Status Code', desc: `Status code ${row.status} is undefined` });
            }
        });

        // 4. Revision Logic (Regression and Missing)
        Object.entries(docHistory).forEach(([ref, rows]) => {
            if (rows.length > 1) {
                // sort by date then revision comparison
                const sorted = [...rows].sort((a, b) => {
                    const dA = a.submissionDate ? parseDateTimestamp(a.submissionDate) : 0;
                    const dB = b.submissionDate ? parseDateTimestamp(b.submissionDate) : 0;
                    if (dA !== dB) return dA - dB;
                    return compareRevisions(a.rev, b.rev);
                });
                
                const revs = sorted.map(r => getNormalizedRevision(r.rev, r.isRev0)).filter(r => r !== 'Unknown');
                
                totalChecks += (revs.length - 1);

                for (let i = 1; i < revs.length; i++) {
                    const prev = revs[i-1];
                    const curr = revs[i];
                    
                    // Simple logic A, B, C or 0, 1, 2
                    if (prev === curr) continue; // Duplicate caught elsewhere
                    
                    if (prev.length === 1 && curr.length === 1 && /[A-Z]/.test(prev) && /[A-Z]/.test(curr)) {
                        const dist = curr.charCodeAt(0) - prev.charCodeAt(0);
                        if (dist > 1) {
                            failedChecks++; cats.revisionLogic++; errs.push({ ref, type: 'Missing Revision', desc: `Skipped revision from ${prev} to ${curr}` });
                        } else if (dist < 0) {
                            failedChecks++; cats.revisionLogic++; errs.push({ ref, type: 'Revision Regression', desc: `Revision reverted from ${prev} to ${curr}` });
                        }
                    } else if (/[0-9]+/.test(prev) && /[0-9]+/.test(curr)) {
                         const prevNum = parseInt(prev, 10);
                         const currNum = parseInt(curr, 10);
                         const dist = currNum - prevNum;
                         if (dist > 1) {
                            failedChecks++; cats.revisionLogic++; errs.push({ ref, type: 'Missing Revision', desc: `Skipped revision from ${prev} to ${curr}` });
                        } else if (dist < 0) {
                            failedChecks++; cats.revisionLogic++; errs.push({ ref, type: 'Revision Regression', desc: `Revision reverted from ${prev} to ${curr}` });
                        }
                    }
                }
            }
        });

        const scoreVal = totalChecks > 0 ? Math.max(0, 100 - (failedChecks / totalChecks) * 100) : 100;

        return {
            score: scoreVal,
            errors: errs,
            categories: cats
        };
    }, [data]);

    const handleExport = () => {
        if (activeTab === 'audit_report') {
            let csv = 'Submission Ref,Latest Rev,Submission Date,Latest Status,Resolved Status\n';
            auditRows.forEach(r => {
                csv += `"${r.businessEntityKey}","${r.latestRevision}","${r.latestSubmissionDate || ''}","${r.latestStatus || ''}","${r.resolvedStatus}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Submission_Workflow_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } else {
            let csv = 'Record Ref,Error Category,Description\n';
            errors.forEach(e => {
                csv += `"${e.ref}","${e.type}","${e.desc.replace(/"/g, '""')}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Data_Anomalies_Registry_${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-light text-slate-900 tracking-tight flex items-center gap-3">
                        Validation Engine
                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest border border-purple-200">Integrity Center</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-medium">Enterprise database validation and anomaly detection</p>
                </div>
                <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold text-sm shadow-sm cursor-pointer"
                >
                    <Download className="w-4 h-4" /> Export Report ({activeTab === 'audit_report' ? 'Audit CSV' : 'Anomalies CSV'})
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm text-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Quality Score</h3>
                    <div className={`text-5xl font-light ${score >= 95 ? 'text-emerald-500' : score >= 80 ? 'text-amber-500' : 'text-red-500'}`}>
                        {score.toFixed(1)}%
                    </div>
                </div>
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-500 mb-2" />
                    <span className="text-3xl font-bold text-slate-900">{errors.length}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase text-center mt-1">Total Anomalies</span>
                </div>
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                    <span className="text-3xl font-bold text-slate-900">{categories.missingFields}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase text-center mt-1">Missing Values</span>
                </div>
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center">
                    <DatabaseZap className="w-8 h-8 text-purple-500 mb-2" />
                    <span className="text-3xl font-bold text-slate-900">{categories.revisionLogic + categories.duplicates}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase text-center mt-1">Revision / Dupes</span>
                </div>
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                    <span className="text-3xl font-bold text-slate-900">{data.length}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase text-center mt-1">Valid Records</span>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-[600px]">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setActiveTab('audit_report')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                                activeTab === 'audit_report'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            Submission Workflow Audit Report ({auditRows.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('anomalies')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                                activeTab === 'anomalies'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            Anomaly Registry ({errors.length})
                        </button>
                    </div>
                    {activeTab === 'audit_report' && (
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                            <span>Approved: <strong className="text-emerald-600">{auditSummary.approved}</strong></span>
                            <span>Pending: <strong className="text-amber-600">{auditSummary.pending}</strong></span>
                            <span>Rej. Open: <strong className="text-red-600">{auditSummary.rejectedOpen}</strong></span>
                            <span>Rej. Closed: <strong className="text-purple-600">{auditSummary.rejectedClosed}</strong></span>
                            <span>Total Unique: <strong className="text-indigo-600">{auditSummary.total}</strong></span>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'audit_report' ? (
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-500 uppercase bg-white sticky top-0 tracking-widest">
                                <tr>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1)]">Submission Ref</th>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1)]">Latest Rev</th>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1)]">Submission Date</th>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1)]">Latest Status</th>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1)]">Counted As (Resolved Status)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {auditRows.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{r.businessEntityKey}</td>
                                        <td className="px-6 py-4 font-mono text-slate-700">{r.latestRevision}</td>
                                        <td className="px-6 py-4 text-slate-600">{r.latestSubmissionDate || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm bg-slate-100 text-slate-800 border border-slate-200">
                                                {r.latestStatus || 'Pending/W'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm border ${
                                                r.resolvedStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                r.resolvedStatus === 'REJECTED_OPEN' ? 'bg-red-50 text-red-700 border-red-200' :
                                                r.resolvedStatus === 'REJECTED_CLOSED' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {r.resolvedStatus}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {auditRows.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">No submission records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-500 uppercase bg-white sticky top-0 tracking-widest">
                                <tr>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1)]">Record Ref</th>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1)]">Error Category</th>
                                    <th className="px-6 py-4 font-bold border-b border-slate-200 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1)]">Description</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {errors.map((err, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{err.ref}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm border ${
                                                err.type.includes('Duplicate') || err.type.includes('Revision') 
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : err.type.includes('Date') || err.type.includes('Status')
                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                : 'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                {err.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">{err.desc}</td>
                                    </tr>
                                ))}
                                {errors.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-medium">No anomalies detected. Data passes validation.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
