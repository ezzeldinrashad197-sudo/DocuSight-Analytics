import React, { useMemo, useState } from 'react';
import { SubmittalRow } from '../types';
import { 
    AlertTriangle, 
    CheckCircle2, 
    XCircle, 
    Download, 
    DatabaseZap, 
    Sparkles, 
    Search, 
    ChevronLeft, 
    ChevronRight,
    SlidersHorizontal,
    RefreshCw,
    HelpCircle,
    Check
} from 'lucide-react';
import { getStatusCodeCategory } from '../utils/calculations';

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
    onUpdateData?: React.Dispatch<React.SetStateAction<SubmittalRow[]>>;
    onExportPDF?: () => void;
}

export default function DataValidationEngine({ data, onUpdateData, onExportPDF }: Props) {
    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState<'anomalies' | 'all'>('anomalies');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'info' }>({
        show: false,
        message: '',
        type: 'success'
    });

    const [isRangeExporting, setIsRangeExporting] = useState(false);
    const [exportRangeStart, setExportRangeStart] = useState(1);
    const [exportRangeEnd, setExportRangeEnd] = useState(1);

    // Run deep validation to extract scores, details, categories, and individual integrity rows
    const { score, errors, categories, rowIntegrityMap } = useMemo(() => {
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
        const rowIntegrity: Record<string, { status: 'Valid' | 'Error'; errors: any[] }> = {};

        // Initialize integrity map for all records
        data.forEach(row => {
            rowIntegrity[row.id] = { status: 'Valid', errors: [] };
        });

        data.forEach(row => {
            const rowRef = row.docNo || row.ncrRef || row.sorRef || row.normalizedRef || row.id;
            
            // Collect for doc history (to check revisions)
            if (rowRef && rowRef !== 'Unknown') {
                const sheetKey = row.sheetNo ? `_${row.sheetNo.trim().toUpperCase()}` : '';
                const docHistoryKey = `${rowRef}${sheetKey}`;
                
                if (!docHistory[docHistoryKey]) docHistory[docHistoryKey] = [];
                docHistory[docHistoryKey].push(row);
                
                const normRev = getNormalizedRevision(row.rev, row.isRev0);
                const exactKey = `${rowRef}_${normRev}${sheetKey}`;
                
                if (exactRecordMap.has(exactKey)) {
                    const existingRow = exactRecordMap.get(exactKey)!;
                    const existingStatus = (existingRow.status || existingRow.recordStatus || '').trim().toUpperCase();
                    const currentStatus = (row.status || row.recordStatus || '').trim().toUpperCase();
                    
                    if (existingStatus && currentStatus && existingStatus !== currentStatus) {
                        failedChecks++; 
                        cats.duplicates++; 
                        const err = { 
                            id: row.id,
                            ref: rowRef, 
                            type: 'Revision Conflict', 
                            desc: `Critical Conflict: Same revision (${normRev || 'N/A'}) found with conflicting statuses: "${existingRow.status || 'N/A'}" vs "${row.status || 'N/A'}"`,
                            severity: 'Error' as const,
                            row
                        };
                        errs.push(err);
                        if (rowIntegrity[row.id]) rowIntegrity[row.id].errors.push(err);
                        totalChecks++;
                    } else {
                        failedChecks++; 
                        cats.duplicates++; 
                        const err = { 
                            id: row.id,
                            ref: rowRef, 
                            type: 'Duplicate Record', 
                            desc: `Duplicate entry found for revision ${row.rev || normRev}`,
                            severity: 'Error' as const,
                            row
                        };
                        errs.push(err);
                        if (rowIntegrity[row.id]) rowIntegrity[row.id].errors.push(err);
                        totalChecks++;
                    }
                } else {
                    exactRecordMap.set(exactKey, row);
                }
            }

            // 1. Missing Fields (Only treating Missing ID/DocNo as an Error)
            totalChecks += 1;
            if (!rowRef) { 
                failedChecks++; 
                cats.missingFields++; 
                const err = { id: row.id, ref: 'Unknown', type: 'Missing ID/DocNo', desc: 'Row has no reference number', severity: 'Error' as const, row };
                errs.push(err); 
                if (rowIntegrity[row.id]) rowIntegrity[row.id].errors.push(err);
            }

            // 2. Date Logic (Only treating Response before Submission as an Error)
            totalChecks += 1;
            const subD = row.submissionDate ? new Date(row.submissionDate) : null;
            const resD = row.responseDate ? new Date(row.responseDate) : null;
            
            if (subD && resD && resD < subD) {
                failedChecks++; 
                cats.dateLogic++; 
                const err = { id: row.id, ref: rowRef || 'Unknown', type: 'Invalid Dates', desc: 'Response date is before submission date', severity: 'Error' as const, row };
                errs.push(err);
                if (rowIntegrity[row.id]) rowIntegrity[row.id].errors.push(err);
            }
        });

        // 3. Revision Logic (Regression)
        Object.entries(docHistory).forEach(([ref, rows]) => {
            if (rows.length > 1) {
                const sorted = [...rows].sort((a, b) => {
                    const dA = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
                    const dB = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
                    return dA - dB;
                });
                
                const revs = sorted.map(r => getNormalizedRevision(r.rev, r.isRev0)).filter(r => r !== 'Unknown');

                for (let i = 1; i < revs.length; i++) {
                    const prev = revs[i-1];
                    const curr = revs[i];
                    const currentRow = sorted[i];
                    
                    if (prev === curr) continue; // Duplicate caught elsewhere
                    
                    if (prev.length === 1 && curr.length === 1 && /[A-Z]/.test(prev) && /[A-Z]/.test(curr)) {
                        const dist = curr.charCodeAt(0) - prev.charCodeAt(0);
                        if (dist < 0) {
                            failedChecks++; 
                            cats.revisionLogic++; 
                            const err = { id: currentRow.id, ref, type: 'Revision Regression', desc: `Revision reverted from ${prev} to ${curr}`, severity: 'Error' as const, row: currentRow };
                            errs.push(err);
                            if (rowIntegrity[currentRow.id]) rowIntegrity[currentRow.id].errors.push(err);
                            totalChecks++;
                        }
                    } else if (/[0-9]+/.test(prev) && /[0-9]+/.test(curr)) {
                         const prevNum = parseInt(prev, 10);
                         const currNum = parseInt(curr, 10);
                         const dist = currNum - prevNum;
                         if (dist < 0) {
                            failedChecks++; 
                            cats.revisionLogic++; 
                            const err = { id: currentRow.id, ref, type: 'Revision Regression', desc: `Revision reverted from ${prev} to ${curr}`, severity: 'Error' as const, row: currentRow };
                            errs.push(err);
                            if (rowIntegrity[currentRow.id]) rowIntegrity[currentRow.id].errors.push(err);
                            totalChecks++;
                         }
                    }
                }
            }
        });

        // Compute and map final composite severity for each row
        Object.keys(rowIntegrity).forEach(rowId => {
            const integrity = rowIntegrity[rowId];
            if (integrity.errors.length > 0) {
                integrity.status = 'Error';
            } else {
                integrity.status = 'Valid';
            }
        });

        const scoreVal = totalChecks > 0 ? Math.max(0, 100 - (failedChecks / totalChecks) * 100) : 100;

        return {
            score: scoreVal,
            errors: errs,
            categories: cats,
            rowIntegrityMap: rowIntegrity
        };
    }, [data]);

    // Handle Smart Fix for formatting warnings on a single row
    const handleSmartFix = (rowId: string) => {
        if (!onUpdateData) return;
        
        let fixedCount = 0;
        let docRefStr = '';

        onUpdateData(prevData => {
            return prevData.map(row => {
                if (row.id !== rowId) return row;
                
                const updated = { ...row };
                docRefStr = updated.docNo || updated.id;

                // 1. Fix document type
                if (updated.documentType) {
                    const cleanType = updated.documentType.trim().toUpperCase();
                    if (updated.documentType !== cleanType) {
                        updated.documentType = cleanType;
                        fixedCount++;
                    }
                }

                // 2. Fix revision code
                if (updated.rev) {
                    const cleanRev = getNormalizedRevision(updated.rev, updated.isRev0);
                    if (updated.rev !== cleanRev) {
                        updated.rev = cleanRev;
                        fixedCount++;
                    }
                }

                // 3. Fix status code
                if (updated.status) {
                    const cleanStatus = updated.status.trim().toUpperCase();
                    if (updated.status !== cleanStatus) {
                        updated.status = cleanStatus;
                        fixedCount++;
                    }
                }

                return updated;
            });
        });

        setNotification({
            show: true,
            message: `Smart Fix: Corrected ${fixedCount} unstandardized formatting rule(s) for Record ${docRefStr || rowId}!`,
            type: 'success'
        });
        setTimeout(() => setNotification(n => ({ ...n, show: false })), 4000);
    };

    // Auto-fix ALL casing/formatting warnings across the current dataset
    const handleSmartFixAll = () => {
        if (!onUpdateData) return;

        let totalCorrectedRows = 0;

        onUpdateData(prevData => {
            return prevData.map(row => {
                const updated = { ...row };
                let modified = false;

                if (updated.documentType) {
                    const cleanType = updated.documentType.trim().toUpperCase();
                    if (updated.documentType !== cleanType) {
                        updated.documentType = cleanType;
                        modified = true;
                    }
                }

                if (updated.rev) {
                    const cleanRev = getNormalizedRevision(updated.rev, updated.isRev0);
                    if (updated.rev !== cleanRev) {
                        updated.rev = cleanRev;
                        modified = true;
                    }
                }

                if (updated.status) {
                    const cleanStatus = updated.status.trim().toUpperCase();
                    if (updated.status !== cleanStatus) {
                        updated.status = cleanStatus;
                        modified = true;
                    }
                }

                if (modified) {
                    totalCorrectedRows++;
                }

                return updated;
            });
        });

        if (totalCorrectedRows > 0) {
            setNotification({
                show: true,
                message: `Success: Automatically standardized formatting on ${totalCorrectedRows} records! Database health index improved.`,
                type: 'success'
            });
        } else {
            setNotification({
                show: true,
                message: 'No unstandardized formatting or casing warnings were detected in the active dataset.',
                type: 'info'
            });
        }
        setTimeout(() => setNotification(n => ({ ...n, show: false })), 5000);
    };

    // Filters and Search implementation
    const processedRows = useMemo(() => {
        let rows = data.map(row => {
            const integrity = rowIntegrityMap[row.id] || { status: 'Valid', errors: [] };
            return {
                ...row,
                integrityStatus: integrity.status,
                validationErrors: integrity.errors
            };
        });

        // Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            rows = rows.filter(r => {
                const docNoMatch = (r.docNo || '').toLowerCase().includes(query);
                const ncrMatch = (r.ncrRef || '').toLowerCase().includes(query);
                const sorMatch = (r.sorRef || '').toLowerCase().includes(query);
                const descMatch = r.validationErrors.some(e => e.desc.toLowerCase().includes(query));
                const typeMatch = (r.documentType || '').toLowerCase().includes(query);
                const disciplineMatch = (r.discipline || '').toLowerCase().includes(query);
                return docNoMatch || ncrMatch || sorMatch || descMatch || typeMatch || disciplineMatch;
            });
        }

        // View Mode Filter
        if (activeView === 'anomalies') {
            rows = rows.filter(r => r.integrityStatus !== 'Valid');
        }

        return rows;
    }, [data, rowIntegrityMap, searchQuery, activeView]);

    // Pagination
    const totalItems = processedRows.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    React.useEffect(() => {
        setExportRangeEnd(totalPages);
    }, [totalPages]);

    const handleRangeStartChange = (val: number) => {
        const clamped = Math.max(1, Math.min(val, totalPages));
        setExportRangeStart(clamped);
        if (clamped > exportRangeEnd) {
            setExportRangeEnd(clamped);
        }
    };

    const handleRangeEndChange = (val: number) => {
        const clamped = Math.max(exportRangeStart, Math.min(val, totalPages));
        setExportRangeEnd(clamped);
    };

    const handleExportRangePDF = async () => {
        if (!onExportPDF) return;
        setIsRangeExporting(true);
        setNotification({
            show: true,
            message: `Preparing range PDF export for pages ${exportRangeStart} to ${exportRangeEnd}... Please wait.`,
            type: 'info'
        });
        
        // Give 250ms delay for React to render all requested rows before we capture
        await new Promise(resolve => setTimeout(resolve, 250));
        
        try {
            await onExportPDF();
            setNotification({
                show: true,
                message: `Successfully exported pages ${exportRangeStart} to ${exportRangeEnd} to PDF.`,
                type: 'success'
            });
        } catch (err) {
            console.error("Range PDF export failed:", err);
            setNotification({
                show: true,
                message: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
                type: 'info'
            });
        } finally {
            setIsRangeExporting(false);
        }
    };

    const paginatedRows = useMemo(() => {
        if (isRangeExporting) {
            const start = Math.max(0, (exportRangeStart - 1) * itemsPerPage);
            const end = Math.min(totalItems, exportRangeEnd * itemsPerPage);
            return processedRows.slice(start, end);
        }
        const start = (currentPage - 1) * itemsPerPage;
        return processedRows.slice(start, start + itemsPerPage);
    }, [processedRows, currentPage, itemsPerPage, isRangeExporting, exportRangeStart, exportRangeEnd, totalItems]);

    // Auto reset page on filtering or searching
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeView]);

    const fixableWarningsCount = useMemo(() => {
        return errors.filter(e => e.fixable).length;
    }, [errors]);

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-slate-200 pb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-900 tracking-tight flex items-center gap-3">
                        Validation Engine
                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest border border-purple-200">Integrity Center</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-medium">Enterprise database validation and anomaly detection</p>
                </div>
                <div className="flex flex-col items-end gap-2 print:hidden">
                    <div className="flex flex-wrap items-center gap-3">
                        {onExportPDF && (
                            <button 
                                onClick={onExportPDF}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold text-sm shadow-sm cursor-pointer"
                                disabled={isRangeExporting}
                            >
                                <Download className="w-4 h-4" /> Export Verification PDF
                            </button>
                        )}
                    </div>
                    {onExportPDF && totalPages > 1 && (
                        <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 shadow-sm mt-1">
                            <span className="font-semibold text-slate-600">Export Page Range:</span>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">From</span>
                                <input 
                                    type="number" 
                                    min={1} 
                                    max={totalPages}
                                    value={exportRangeStart}
                                    onChange={(e) => handleRangeStartChange(parseInt(e.target.value) || 1)}
                                    className="w-12 text-center bg-white border border-slate-300 rounded px-1.5 py-0.5 font-bold focus:outline-none focus:border-blue-500 text-slate-800"
                                    disabled={isRangeExporting}
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">To</span>
                                <input 
                                    type="number" 
                                    min={exportRangeStart} 
                                    max={totalPages}
                                    value={exportRangeEnd}
                                    onChange={(e) => handleRangeEndChange(parseInt(e.target.value) || totalPages)}
                                    className="w-12 text-center bg-white border border-slate-300 rounded px-1.5 py-0.5 font-bold focus:outline-none focus:border-blue-500 text-slate-800"
                                    disabled={isRangeExporting}
                                />
                            </div>
                            <button
                                onClick={handleExportRangePDF}
                                disabled={isRangeExporting}
                                className={`flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-xs shadow-sm transition-colors cursor-pointer ${isRangeExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isRangeExporting ? (
                                    <>
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-3 h-3" /> Export Range PDF
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Notification Banner */}
            {notification.show && (
                <div className={`mb-6 p-4 rounded-xl flex items-center justify-between border shadow-sm transition-all animate-in slide-in-from-top-4 ${
                    notification.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                    <div className="flex items-center gap-3">
                        {notification.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                            <HelpCircle className="w-5 h-5 text-blue-500" />
                        )}
                        <span className="font-medium text-sm">{notification.message}</span>
                    </div>
                    <button 
                        onClick={() => setNotification(n => ({ ...n, show: false }))}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Scoreboard Block */}
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
                    <span className="text-[10px] font-bold text-slate-500 uppercase text-center mt-1">Total Validated</span>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Switcher */}
                <div className="flex items-center gap-2 border-b lg:border-b-0 pb-3 lg:pb-0">
                    <button
                        onClick={() => setActiveView('anomalies')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                            activeView === 'anomalies'
                                ? 'bg-purple-100 text-purple-800'
                                : 'text-slate-650 hover:bg-slate-50'
                        }`}
                    >
                        Anomalies Registry ({errors.length})
                    </button>
                    <button
                        onClick={() => setActiveView('all')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                            activeView === 'all'
                                ? 'bg-slate-100 text-slate-800'
                                : 'text-slate-650 hover:bg-slate-50'
                        }`}
                    >
                        All Database Records ({data.length})
                    </button>
                </div>

                {/* Sub-Filters: Search & Batch Action */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Search Field */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search Ref, Type, Desc..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 w-full sm:w-[240px] transition-all"
                        />
                    </div>

                    {/* Auto Fix All Format issues (Casing, Document Type naming convention) */}
                    {onUpdateData && fixableWarningsCount > 0 && (
                        <button
                            onClick={handleSmartFixAll}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg text-xs font-bold shadow-md transition-all shrink-0 hover:shadow-lg"
                            title="Automatically apply standard uppercase naming convention and remove extra Rev prefixes"
                        >
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            Smart Fix Format ({fixableWarningsCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Validation Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[500px]">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                        {activeView === 'anomalies' ? 'Registered Anomalies Registry' : 'All Validated Records'}
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Showing {paginatedRows.length} of {totalItems} items
                    </span>
                </div>
                
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-500 uppercase bg-white sticky top-0 tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold">Record Ref</th>
                                <th className="px-6 py-4 font-bold text-center">Document Type</th>
                                <th className="px-6 py-4 font-bold text-center">Integrity Status</th>
                                <th className="px-6 py-4 font-bold">Anomaly Category / Verdict</th>
                                <th className="px-6 py-4 font-bold">Validation Findings Details</th>
                                {onUpdateData && <th className="px-6 py-4 font-bold text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRows.map((row, idx) => {
                                const ref = row.docNo || row.ncrRef || row.sorRef || row.normalizedRef || row.id;
                                const isAnomalous = row.integrityStatus !== 'Valid';
                                const styleBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30';
                                
                                return (
                                    <tr key={row.id} className={`${styleBg} hover:bg-slate-50/70 transition-colors`}>
                                        {/* Record Ref */}
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900 break-all">{ref}</td>
                                        
                                        {/* Document Type Column (Required for export) */}
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                                                {row.documentType || row.logType || 'N/A'}
                                            </span>
                                        </td>
                                        
                                        {/* Integrity Status Badge */}
                                        <td className="px-2 py-4 text-center whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                                                row.integrityStatus === 'Valid'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    row.integrityStatus === 'Valid' ? 'bg-emerald-500' : 'bg-red-500'
                                                }`} />
                                                {row.integrityStatus}
                                            </span>
                                        </td>

                                        {/* Anomaly Category / Verdict */}
                                        <td className="px-6 py-4">
                                            {isAnomalous ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {row.validationErrors.map((err: any, eIdx: number) => (
                                                        <span key={eIdx} className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                                                            err.type.includes('Duplicate') || err.type.includes('Regression') || err.type.includes('Conflict')
                                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                            : err.type.includes('Date') || err.type.includes('Status') || err.type.includes('Unstandardized')
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                            : 'bg-red-50 text-red-700 border-red-200'
                                                        }`}>
                                                            {err.type}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                                    <Check className="w-3.5 h-3.5" /> PASSED OK
                                                </span>
                                            )}
                                        </td>

                                        {/* Validation Findings Details */}
                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                            {isAnomalous ? (
                                                <ul className="list-disc pl-4 space-y-1 text-xs">
                                                    {row.validationErrors.map((err: any, eIdx: number) => (
                                                        <li key={eIdx} className={err.severity === 'Error' ? 'text-slate-800' : 'text-slate-600'}>
                                                            {err.desc}
                                                            {err.fixable && (
                                                                <span className="ml-1.5 bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded inline-block">FIXABLE</span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">Field integrity checks fully validated.</span>
                                            )}
                                        </td>

                                        {/* Actions Column */}
                                        {onUpdateData && (
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                {false ? (
                                                    <button
                                                        onClick={() => handleSmartFix(row.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold shadow-sm transition-colors cursor-pointer"
                                                        title="Automatically correct casing issues and standardize revision format codes"
                                                    >
                                                        <Sparkles className="w-3 h-3" />
                                                        Smart Fix
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}

                            {paginatedRows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-slate-500 font-medium">
                                        No database records match current search or filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                        <div className="text-xs text-slate-500 font-medium">
                            Showing page <span className="font-bold text-slate-800">{currentPage}</span> of <span className="font-bold text-slate-800">{totalPages}</span> — Total records: <span className="font-bold text-slate-800">{totalItems}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
