import { useState, useMemo } from 'react';
import { SubmittalRow } from '../types';

export interface FilterState {
  documentType: string[];
  discipline: string[];
  contractor: string[];
  consultant: string[];
  logType: string[];
  status: string[];
  area: string[];
  tradeSystem: string[];
}

const defaultFilters: FilterState = {
  documentType: [],
  discipline: [],
  contractor: [],
  consultant: [],
  logType: [],
  status: [],
  area: [],
  tradeSystem: []
};

export function useFilters(data: SubmittalRow[], startDate: string, endDate: string) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [pendingFilters, setPendingFilters] = useState<FilterState>(defaultFilters);

  const uniqueOpts = useMemo(() => {
     const safeData = Array.isArray(data) ? data : [];
     const getUniques = (key: keyof SubmittalRow) => {
         const s = new Set<string>();
         safeData.forEach(d => {
             if (!d) return;
             const val = d[key];
             if (val && typeof val === 'string' && val.trim()) s.add(val.trim());
         });
         return Array.from(s).sort();
     };
     
     // Special logic for documentType (Register Type)
     const getRegisterTypes = () => {
         const s = new Set<string>();
         safeData.forEach(d => {
             if (!d) return;
             let dt = d.documentType || d.logType || "GENERAL";
             s.add(dt.split('-')[0].trim().toUpperCase());
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
  };

  const resetFilters = () => {
     setFilters(defaultFilters);
     setPendingFilters(defaultFilters);
  };

  const isDirty = useMemo(() => {
     return JSON.stringify(pendingFilters) !== JSON.stringify(filters);
  }, [pendingFilters, filters]);

  const matchesFilters = (row: SubmittalRow) => {
      if (!row) return false;
       const matchOpt = (rowVal: string | undefined | null, filterArray: string[]) => {
           if (!filterArray || filterArray.length === 0) return true;
           if (!rowVal) return false;
           return filterArray.includes(String(rowVal).trim());
       };

       if (filters.documentType && filters.documentType.length > 0) {
           let dt = row.documentType || row.logType || "GENERAL";
           if (!filters.documentType.includes(dt.split('-')[0].trim().toUpperCase())) return false;
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
     if (!row || !row.submissionDate) return false;
     if (!matchesFilters(row)) return false;
     return row.submissionDate >= startDate && row.submissionDate <= endDate;
  };

  const filterCumulative = (row: SubmittalRow) => {
     if (!row) return false;
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
    filterCumulative
  };
}
