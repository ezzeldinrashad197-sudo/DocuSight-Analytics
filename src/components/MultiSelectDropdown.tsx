import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function MultiSelectDropdown({ label, options, selected, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(x => x !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleSelectAll = () => {
    onChange([...options]);
  };

  const handleClear = () => {
    onChange([]);
  };

  // Human friendly label formatter
  const formattedLabel = label.replace(/([A-Z])/g, ' $1').trim();

  return (
    <div className="flex flex-col gap-1 relative w-full" ref={containerRef} id={`filter-dropdown-${label}`}>
      <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
        {formattedLabel}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between border rounded px-2.5 py-1.5 text-xs bg-white hover:bg-slate-50 transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none text-left w-full cursor-pointer h-9 ${selected.length > 0 ? 'border-blue-400 bg-blue-50/10' : 'border-[#cbd5e1]'}`}
      >
        <span className="truncate text-slate-700 font-medium">
          {selected.length === 0 
            ? `All ${formattedLabel}s` 
            : selected.length === 1 
              ? selected[0] 
              : `${selected.length} Selected`}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1.5 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-[100%] left-0 z-50 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-2 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            <span>Select Options</span>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={handleSelectAll} 
                className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              >
                All
              </button>
              <button 
                type="button" 
                onClick={handleClear} 
                className="text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {options.map(opt => {
              const isChecked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded text-xs text-slate-700 font-medium cursor-pointer transition-colors select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(opt)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="truncate">{opt}</span>
                </label>
              );
            })}
            {options.length === 0 && (
              <div className="text-center text-slate-400 py-4 text-xs">No options found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
