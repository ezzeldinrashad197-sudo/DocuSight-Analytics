import React, { useState, useEffect } from 'react';
import { ProjectSettings } from './types';
import { Settings, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface ProjectConfigModalProps {
  projects: ProjectSettings[];
  activeProjectId: string;
  onSave: (projects: ProjectSettings[], activeId: string) => void;
  onClose: () => void;
}

const defaultProject: ProjectSettings = {
  id: '',
  projectName: 'New Project',
  projectCode: 'PRJ-001',
  clientName: 'Client Name',
  contractorName: 'Contractor Name',
  consultantName: 'Consultant Name',
  projectManager: 'PM Name',
  documentControlManager: 'DC Name'
};

export default function ProjectConfigModal({ projects, activeProjectId, onSave, onClose }: ProjectConfigModalProps) {
  const [localProjects, setLocalProjects] = useState<ProjectSettings[]>([...projects]);
  const [localActiveId, setLocalActiveId] = useState<string>(activeProjectId);
  const [editingId, setEditingId] = useState<string | null>(null);

  // If no projects exist, add a default one immediately.
  useEffect(() => {
    if (localProjects.length === 0) {
      const newPrj = { ...defaultProject, id: Date.now().toString() };
      setLocalProjects([newPrj]);
      setLocalActiveId(newPrj.id);
      setEditingId(newPrj.id);
    }
  }, []);

  const handleAddProject = () => {
    const newPrj = { ...defaultProject, id: Date.now().toString(), projectName: `New Project ${localProjects.length + 1}` };
    setLocalProjects([...localProjects, newPrj]);
    setLocalActiveId(newPrj.id);
    setEditingId(newPrj.id);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (localProjects.length === 1) return; // don't delete the last one
    
    const nextLocal = localProjects.filter(p => p.id !== id);
    setLocalProjects(nextLocal);
    if (localActiveId === id) {
      setLocalActiveId(nextLocal[0].id);
    }
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const handleFieldChange = (id: string, field: keyof ProjectSettings, value: string) => {
    setLocalProjects(localProjects.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const saveToParent = () => {
    onSave(localProjects, localActiveId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-[#ffffff] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-[#e2e8f0]">
        
        {/* Sidebar */}
        <div className="md:w-1/3 bg-[#f8fafc] border-r border-[#e2e8f0] p-4 flex flex-col h-[500px]">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#1e293b] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#D4AF37]"/> 
                Projects
              </h2>
              <button onClick={handleAddProject} className="p-1 rounded bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#475569] transition-colors" title="New Project">
                <Plus className="w-5 h-5" />
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-2 pr-1">
             {localProjects.map(project => (
               <div 
                 key={project.id} 
                 onClick={() => { setLocalActiveId(project.id); setEditingId(project.id); }}
                 className={`p-3 rounded-lg cursor-pointer border transition-all group relative ${localActiveId === project.id ? 'bg-[#0A192F] text-[#ffffff] border-[#0A192F] shadow-md' : 'bg-[#ffffff] border-[#e2e8f0] hover:border-[#94a3b8] text-[#334155]'}`}
               >
                 <div className="font-bold truncate pr-6">{project.projectName}</div>
                 <div className={`text-xs truncate ${localActiveId === project.id ? 'text-[#94a3b8]' : 'text-[#64748b]'}`}>{project.projectCode}</div>
                 
                 {localProjects.length > 1 && (
                    <button 
                      onClick={(e) => handleDeleteProject(project.id, e)} 
                      className={`absolute right-3 top-4 hidden group-hover:block ${localActiveId === project.id ? 'text-[#94a3b8] hover:text-[#ffffff]' : 'text-[#94a3b8] hover:text-[#ef4444]'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 )}
               </div>
             ))}
           </div>
        </div>

        {/* Content area */}
        <div className="md:w-2/3 p-6 flex flex-col h-[500px]">
            {editingId ? (
                <div className="flex-1 overflow-y-auto pr-2 pb-4">
                  {localProjects.filter(p => p.id === editingId).map(project => (
                    <div key={project.id} className="space-y-4 animate-in fade-in">
                       <h3 className="text-2xl font-black text-[#1e293b] mb-6 border-b border-[#f1f5f9] pb-2">Project Configuration</h3>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         
                         <div className="flex flex-col gap-1">
                           <label className="text-xs font-bold text-[#64748b] uppercase tracking-widest">Project Name</label>
                           <input type="text" className="bg-[#f8fafc] border border-[#e2e8f0] rounded px-3 py-2 text-[#1e293b] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all" value={project.projectName} onChange={e => handleFieldChange(project.id, 'projectName', e.target.value)} />
                         </div>

                         <div className="flex flex-col gap-1">
                           <label className="text-xs font-bold text-[#64748b] uppercase tracking-widest">Project Code</label>
                           <input type="text" className="bg-[#f8fafc] border border-[#e2e8f0] rounded px-3 py-2 text-[#1e293b] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all" value={project.projectCode} onChange={e => handleFieldChange(project.id, 'projectCode', e.target.value)} />
                         </div>

                         <div className="flex flex-col gap-1 mt-2">
                           <label className="text-xs font-bold text-[#64748b] uppercase tracking-widest">Client Name</label>
                           <input type="text" className="bg-[#f8fafc] border border-[#e2e8f0] rounded px-3 py-2 text-[#1e293b] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all" value={project.clientName} onChange={e => handleFieldChange(project.id, 'clientName', e.target.value)} />
                         </div>

                         <div className="flex flex-col gap-1 mt-2">
                           <label className="text-xs font-bold text-[#64748b] uppercase tracking-widest">Consultant Name</label>
                           <input type="text" className="bg-[#f8fafc] border border-[#e2e8f0] rounded px-3 py-2 text-[#1e293b] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all" value={project.consultantName} onChange={e => handleFieldChange(project.id, 'consultantName', e.target.value)} />
                         </div>

                         <div className="flex flex-col gap-1 mt-2">
                           <label className="text-xs font-bold text-[#64748b] uppercase tracking-widest">Contractor Name</label>
                           <input type="text" className="bg-[#f8fafc] border border-[#e2e8f0] rounded px-3 py-2 text-[#1e293b] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all" value={project.contractorName} onChange={e => handleFieldChange(project.id, 'contractorName', e.target.value)} />
                         </div>
                         
                         <div className="flex flex-col gap-1 mt-2">
                           <label className="text-xs font-bold text-[#64748b] uppercase tracking-widest">Project Manager</label>
                           <input type="text" className="bg-[#f8fafc] border border-[#e2e8f0] rounded px-3 py-2 text-[#1e293b] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all" value={project.projectManager} onChange={e => handleFieldChange(project.id, 'projectManager', e.target.value)} />
                         </div>

                         <div className="flex flex-col gap-1 mt-2 md:col-span-2">
                           <label className="text-xs font-bold text-[#64748b] uppercase tracking-widest">Analytics / Data Manager</label>
                           <input type="text" className="bg-[#f8fafc] border border-[#e2e8f0] rounded px-3 py-2 text-[#1e293b] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all" value={project.documentControlManager} onChange={e => handleFieldChange(project.id, 'documentControlManager', e.target.value)} />
                         </div>

                       </div>
                    </div>
                  ))}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-[#94a3b8]">
                    <p>Select a project to configure.</p>
                </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-[#f1f5f9] flex justify-end gap-3 shrink-0">
               <button onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-[#475569] hover:bg-[#f1f5f9] flex items-center gap-2 transition-colors">
                  <X className="w-5 h-5"/> Cancel
               </button>
               <button onClick={saveToParent} className="px-4 py-2 rounded-lg font-bold bg-[#0f172a] text-[#ffffff] hover:bg-[#1e293b] flex items-center gap-2 transition-colors shadow-lg">
                  <Check className="w-5 h-5 text-[#D4AF37]"/> Apply & Save
               </button>
            </div>
        </div>
      </div>
    </div>
  );
}
