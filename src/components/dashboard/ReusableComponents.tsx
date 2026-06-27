import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  highlightClass?: string;
  subtitle?: string;
}

export function KpiCard({ title, value, highlightClass = "text-slate-900", subtitle }: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</h3>
      <p className={`mt-2 text-2xl font-bold ${highlightClass}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

interface DataTableProps<T> {
  title: string;
  description?: string;
  columns: { key: string; label: string; rightAlign?: boolean; render?: (val: T) => React.ReactNode }[];
  data: T[];
  footerData?: Record<string, React.ReactNode>;
}

export function DataTable<T extends Record<string, unknown>>({ title, description, columns, data, footerData }: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </div>
      <div className="overflow-x-auto overflow-y-visible" style={{ padding: '4px' }}>
        <div style={{ minWidth: 'max-content', padding: '4px' }}>
          <table className="w-full text-sm text-left" style={{ margin: 0 }}>
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
               <tr>
                 {columns.map(col => (
                   <th key={col.key} className={`px-4 py-3 ${col.rightAlign ? 'text-right' : ''}`}>
                     {col.label}
                   </th>
                 ))}
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {data.map((row, i) => (
                 <tr key={i} className="hover:bg-slate-50 transition-colors">
                   {columns.map(col => (
                     <td key={col.key} className={`px-4 py-3 ${col.rightAlign ? 'text-right' : ''}`}>
                       {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                     </td>
                   ))}
                 </tr>
               ))}
             </tbody>
             {footerData && (
                <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
                  <tr>
                    {columns.map((col, i) => (
                       <td key={`footer-${col.key}`} className={`px-4 py-3 ${col.rightAlign ? 'text-right' : ''}`}>
                         {i === 0 && !footerData[col.key] ? 'TOTAL' : footerData[col.key]}
                       </td>
                    ))}
                  </tr>
                </tfoot>
             )}
          </table>
        </div>
      </div>
    </div>
  );
}
