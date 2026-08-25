import { useState, useMemo, useEffect, useCallback } from 'react';
import { SubmittalRow } from '../types';
import { auth } from '../firebase';

export interface FilterState {
  documentType: string;
  discipline: string;
  contractor: string;
  consultant: string;
  logType: string;
  status: string;
  area: string;
  tradeSystem: string;
}

export interface BackendMetricsResult {
  totalRecords: number;
  openRecords: number;
  closedRecords: number;
  approvedRecords: number;
  rejectedOpenRecords: number;
  rejectedClosedRecords: number;
  pendingRecords: number;
  qualityScore: number;
}

const defaultFilters: FilterState = {
  documentType: 'All',
  discipline: 'All',
  contractor: 'All',
  consultant: 'All',
  logType: 'All',
  status: 'All',
  area: 'All',
  tradeSystem: 'All'
};

export function useFilters(data: SubmittalRow[], startDate: string, endDate: string) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [pendingFilters, setPendingFilters] = useState<FilterState>(defaultFilters);
  const [backendMetrics, setBackendMetrics] = useState<BackendMetricsResult | null>(null);
  const [isCalculatingBackend, setIsCalculatingBackend] = useState<boolean>(false);

  const calculateBackendMetrics = useCallback(async (activeFilters: FilterState, dataset: SubmittalRow[]) => {
    if (!dataset || dataset.length === 0) {
      setBackendMetrics(null);
      return;
    }
    setIsCalculatingBackend(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/metrics/calculate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ filters: activeFilters, dataset })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.metrics) {
          setBackendMetrics(json.metrics);
        }
      }
    } catch (err) {
      console.warn('[Metrics Layer] Backend metrics delegation warning:', err);
    } finally {
      setIsCalculatingBackend(false);
    }
  }, []);

  useEffect(() => {
    calculateBackendMetrics(filters, data);
  }, [filters, data, calculateBackendMetrics]);

  const uniqueOpts = useMemo(() => {
     const getUniques = (key: keyof SubmittalRow) => {
         const s = new Set<string>();
         data.forEach(d => {
             const val = d[key];
             if (val && typeof val === 'string' && val.trim()) s.add(val.trim());
         });
         return Array.from(s).sort();
     };
     
     // Special logic for documentType (Register Type & Workflow Family)
     const getRegisterTypes = () => {
         const s = new Set<string>();
         data.forEach(d => {
             if (d.workflowFamily && d.workflowFamily !== 'UNKNOWN') {
               const wf = d.workflowFamily.toUpperCase().trim();
               s.add(wf);
             }
             let dt = d.documentType || d.logType || "GENERAL";
             const prefix = dt.split('-')[0].trim().toUpperCase();
             if (prefix) s.add(prefix);
         });
         return Array.from(s).sort();
     };

     return {
         documentType: getRegisterTypes(),
         discipline: getUniques('discipline'),
         contractor: getUniques('contractor'),
         consultant: getUniques('consultant'),
         logType: getUniques('logType'),
         status: getUniques('status'),
         area: getUniques('area'),
         tradeSystem: getUniques('tradeSystem'),
     };
  }, [data]);

  const applyFilters = () => {
     setFilters(pendingFilters);
     calculateBackendMetrics(pendingFilters, data);
  };

  const resetFilters = () => {
     setFilters(defaultFilters);
     setPendingFilters(defaultFilters);
     calculateBackendMetrics(defaultFilters, data);
  };

  const isDirty = useMemo(() => {
     return JSON.stringify(pendingFilters) !== JSON.stringify(filters);
  }, [pendingFilters, filters]);

  const matchesFilters = (row: SubmittalRow) => {
       const matchOpt = (rowVal: string | undefined | null, filterVal: string) => {
           if (filterVal === 'All') return true;
           if (!rowVal) return false;
           const rv = String(rowVal).trim();
           const fv = String(filterVal).trim();
           if (rv === fv) return true;
           if (rv.toUpperCase() === fv.toUpperCase()) return true;
           
           const rvUpper = rv.toUpperCase();
           const fvUpper = fv.toUpperCase();
           if (rvUpper.startsWith(fvUpper) || fvUpper.startsWith(rvUpper)) return true;
           if (rvUpper.includes(fvUpper) || fvUpper.includes(rvUpper)) return true;
           
           return false;
       };

       if (filters.documentType !== 'All') {
           const target = filters.documentType.toUpperCase().trim();
           const wf = (row.workflowFamily || '').toUpperCase().trim();
           let dt = (row.documentType || row.logType || "GENERAL").toUpperCase().trim();
           const docNo = (row.docNo || '').toUpperCase().trim();
           const prefix = dt.split('-')[0].trim();

           const isRowABD = wf === 'ABD' || dt.startsWith('ABD') || dt.includes('AS-BUILT') || dt.includes('AS BUILT') || docNo.startsWith('ABD-');

           if (target === 'ABD') {
               if (!isRowABD) return false;
           } else if (target === 'SDW' || target === 'SHD') {
               if (isRowABD) return false;
               const matchesWf = wf === 'SDW' || wf === 'SHD';
               const matchesPrefix = prefix === 'SDW' || prefix === 'SHD' || docNo.startsWith('SDW-') || docNo.startsWith('SHD-');
               const matchesDt = dt.includes('SDW') || dt.includes('SHD') || dt.includes('SHOP');
               if (!matchesWf && !matchesPrefix && !matchesDt) return false;
           } else {
               const matchesWf = wf === target || (target === "LTR" && wf === "LETTER");
               const matchesPrefix = prefix === target || docNo.startsWith(`${target}-`);
               const matchesDt = dt.startsWith(target) || dt.includes(target);
               const matchesKeywords = (target === 'LTR' && (dt.includes('CORRES') || dt.includes('LETTER')));

               if (!matchesWf && !matchesPrefix && !matchesDt && !matchesKeywords) return false;
           }
       }

       if (!matchOpt(row.discipline, filters.discipline)) return false;
       if (!matchOpt(row.contractor, filters.contractor)) return false;
       if (!matchOpt(row.consultant, filters.consultant)) return false;
       if (!matchOpt(row.logType, filters.logType)) return false;
       if (!matchOpt(row.status, filters.status)) return false;
       if (!matchOpt(row.area, filters.area)) return false;
       if (!matchOpt(row.tradeSystem, filters.tradeSystem)) return false;
       return true;
  };

  const filterMonthly = (row: SubmittalRow) => {
     if (!row.submissionDate) return false;
     if (!matchesFilters(row)) return false;
     return row.submissionDate >= startDate && row.submissionDate <= endDate;
  };

  const filterCumulative = (row: SubmittalRow) => {
     if (!matchesFilters(row)) return false;
     if (!row.submissionDate) return true;
     return row.submissionDate <= endDate;
  };

  return {
    filters,
    pendingFilters,
    setPendingFilters,
    applyFilters,
    resetFilters,
    isDirty,
    uniqueOpts,
    matchesFilters,
    filterMonthly,
    filterCumulative,
    backendMetrics,
    isCalculatingBackend
  };
}
