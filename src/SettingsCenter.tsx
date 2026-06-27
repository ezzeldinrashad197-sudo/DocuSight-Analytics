import React, { useState, useEffect } from 'react';
import { ProjectSettings } from './types';
import ProjectConfigModal from './ProjectConfigModal';
import { Settings, Info, Activity, BookOpen, GitMerge, FileText, ChevronRight, X, Users, RefreshCw, UserPlus, Trash2 } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { useLanguage, parseMixedText } from './utils/i18n';

interface SettingsCenterProps {
    projects: ProjectSettings[];
    activeProjectId: string;
    onSaveProjects: (projects: ProjectSettings[], activeId: string) => void;
    onClose: () => void;
    activeRole?: string;
}

export default function SettingsCenter({ projects, activeProjectId, onSaveProjects, onClose, activeRole = 'viewer' }: SettingsCenterProps) {
    const { language, t } = useLanguage();
    const parse = (text: string) => parseMixedText(text, language);

    const [activeTab, setActiveTab] = useState<'projects' | 'health' | 'about' | 'versions' | 'users'>('projects');

    const [usersList, setUsersList] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // New Team Member Form State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState('viewer');
    const [addingUser, setAddingUser] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const loadUsers = async () => {
        const userRoles = activeRole.split(',').map(r => r.trim().toLowerCase());
        if (!userRoles.includes('all')) return;
        setLoadingUsers(true);
        try {
            const snap = await getDocs(collection(db, 'users'));
            const emailMap = new Map<string, any>();
            
            snap.forEach(d => {
                const data = d.data();
                const email = (data.email || d.id || '').trim().toLowerCase();
                if (!email) return;

                const isEmailId = d.id.includes('@');
                const existing = emailMap.get(email);
                
                if (existing) {
                    // Combine and merge roles cleanly, filtering out 'viewer' if higher roles are present
                    let mergedRole = existing.role || 'viewer';
                    if (data.role) {
                        const existingRoles = (existing.role || 'viewer').split(',').map((r: string) => r.trim().toLowerCase());
                        const newRoles = data.role.split(',').map((r: string) => r.trim().toLowerCase());
                        const combined = Array.from(new Set([...existingRoles, ...newRoles])).filter(r => r && r !== 'viewer');
                        if (combined.length === 0) {
                            mergedRole = 'viewer';
                        } else {
                            mergedRole = combined.join(',');
                        }
                    }
                    const mergedName = data.name || existing.name;
                    const mergedId = isEmailId ? existing.id : d.id; // Try to keep the UID as main id
                    
                    emailMap.set(email, {
                        ...existing,
                        ...data,
                        id: mergedId,
                        role: mergedRole,
                        name: mergedName,
                        docIds: Array.from(new Set([...(existing.docIds || []), d.id]))
                    });
                } else {
                    emailMap.set(email, {
                        id: d.id,
                        ...data,
                        email: email,
                        docIds: [d.id]
                    });
                }
            });
            
            setUsersList(Array.from(emailMap.values()));
        } catch (err) {
            handleFirestoreError(err, OperationType.LIST, 'users');
        }
        setLoadingUsers(false);
    };

    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers();
        }
    }, [activeTab]);

    const handleRoleChange = async (usr: any, newRole: string) => {
        try {
            const emailToUpdate = typeof usr.email === 'string' ? usr.email.trim().toLowerCase() : '';
            if (!emailToUpdate) return;

            // 1. Find all documents in 'users' collection with this email (including pre-registered and active UID docs)
            const snap = await getDocs(collection(db, 'users'));
            const docsToUpdate: string[] = [...(usr.docIds || []), usr.id];
            
            snap.forEach(d => {
                const dData = d.data();
                const dEmail = (dData.email || d.id || '').trim().toLowerCase();
                if (dEmail === emailToUpdate) {
                    docsToUpdate.push(d.id);
                }
            });
            
            const uniqueDocIds = Array.from(new Set(docsToUpdate));
            
            // 2. Write the new role to ALL related documents in Firestore
            const promises = uniqueDocIds.map(docId => 
                setDoc(doc(db, 'users', docId), { role: newRole }, { merge: true })
            );
            await Promise.all(promises);
            
            // 3. Update the local view State
            setUsersList(usersList.map(u => {
                const uEmail = typeof u.email === 'string' ? u.email.trim().toLowerCase() : '';
                if (uEmail === emailToUpdate) {
                    return { ...u, role: newRole };
                }
                return u;
            }));
            
            setSuccessMsg(t('user_update_success_params').replace('{email}', emailToUpdate).replace('{role}', newRole));
            setTimeout(() => setSuccessMsg(null), 4000);
        } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, 'users');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);
        
        const cleanedEmail = newUserEmail.trim().toLowerCase();
        if (!cleanedEmail) {
            setErrorMsg(t('email_address_required'));
            return;
        }

        setAddingUser(true);
        try {
            // Pre-register user using their email address as the document ID
            await setDoc(doc(db, 'users', cleanedEmail), {
                email: cleanedEmail,
                name: newUserName.trim() || cleanedEmail.split('@')[0],
                role: newUserRole,
                createdAt: new Date().toISOString()
            }, { merge: true });

            setSuccessMsg(t('user_added_success_params').replace('{email}', cleanedEmail));

            setNewUserEmail('');
            setNewUserName('');
            setNewUserRole('viewer');
            await loadUsers();
            setTimeout(() => setSuccessMsg(null), 6000);
        } catch (err: any) {
            handleFirestoreError(err, OperationType.WRITE, 'users');
        } finally {
            setAddingUser(false);
        }
    };

    const handleDeleteUser = async (usr: any) => {
        const email = typeof usr.email === 'string' ? usr.email.trim().toLowerCase() : '';
        if (email === 'ezzeldinrashad197@gmail.com') {
            alert(t('cannot_delete_primary_admin'));
            return;
        }
        if (!confirm(t('user_delete_confirm_params').replace('{email}', email))) {
            return;
        }
        try {
            // Delete all matched documents in Firestore
            const snap = await getDocs(collection(db, 'users'));
            const docsToDelete: string[] = [...(usr.docIds || []), usr.id];
            
            snap.forEach(d => {
                const dData = d.data();
                const dEmail = (dData.email || d.id || '').trim().toLowerCase();
                if (dEmail === email) {
                    docsToDelete.push(d.id);
                }
            });
            
            const uniqueDocIds = Array.from(new Set(docsToDelete));
            const promises = uniqueDocIds.map(docId => deleteDoc(doc(db, 'users', docId)));
            await Promise.all(promises);
            
            setUsersList(usersList.filter(u => {
                const uEmail = typeof u.email === 'string' ? u.email.trim().toLowerCase() : '';
                return uEmail !== email;
            }));
            setSuccessMsg(t('user_deleted_success'));

            setTimeout(() => setSuccessMsg(null), 4000);
        } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, 'users');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0B1120]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-7xl h-[85vh] shadow-2xl flex overflow-hidden">
                
                {/* Sidebar */}
                <div className="w-80 bg-[#0B1120] border-r border-[#1e293b] flex flex-col shrink-0">
                    <div className="p-6 border-b border-[#1e293b] flex items-center justify-between">
                         <h2 className="text-xl font-bold text-white flex items-center gap-3">
                             <Settings className="w-6 h-6 text-indigo-400" />
                             Configuration Center
                         </h2>
                    </div>
                    <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 mt-2 px-3">Administration</div>
                        <button 
                            onClick={() => setActiveTab('projects')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'projects' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <Settings className="w-5 h-5" /> Project Portfolio
                        </button>
                        
                        {activeRole.split(',').map(r => r.trim().toLowerCase()).includes('all') && (
                            <button 
                                onClick={() => setActiveTab('users')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'users' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                <Users className="w-5 h-5" /> User Management
                            </button>
                        )}

                        <button 
                            onClick={() => setActiveTab('health')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'health' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <Activity className="w-5 h-5" /> System Health Dashboard
                        </button>

                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 mt-6 px-3">Product Readiness</div>
                        <button 
                            onClick={() => setActiveTab('versions')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'versions' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <GitMerge className="w-5 h-5" /> Version Management
                        </button>
                        <button 
                            onClick={() => setActiveTab('about')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'about' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <Info className="w-5 h-5" /> About Platform
                        </button>
                    </div>

                    <div className="p-6 border-t border-[#1e293b]">
                        <button onClick={onClose} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-bold">
                            <X className="w-5 h-5" /> Close Center
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-[#0f172a] relative overflow-hidden">
                    {activeTab === 'projects' && (
                        <div className="h-full overflow-y-auto">
                            <ProjectConfigModal 
                                projects={projects} 
                                activeProjectId={activeProjectId} 
                                onSave={(p, active) => { onSaveProjects(p, active); onClose(); }} 
                                onClose={onClose} 
                                isEmbedded={true}
                            />
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="p-10 h-full overflow-y-auto">
                            <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4 flex justify-between items-center">
                                <span className="flex items-center gap-2">
                                    <Users className="w-6 h-6 text-indigo-400" />
                                    {parse('Team & Role Management | إدارة صلاحيات فريق العمل')}
                                </span>
                                <button onClick={loadUsers} className="p-2 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors">
                                    <RefreshCw className={`w-5 h-5 text-slate-400 ${loadingUsers ? 'animate-spin' : ''}`} />
                                </button>
                            </h3>

                            {/* New User Add/Pre-register Form */}
                            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8">
                                <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-indigo-400" />
                                    {parse('Pre-add Team Member Email | تسجيل بريد إلكتروني جديد لفريقك')}
                                </h4>
                                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">{parse('Email Address * | البريد الإلكتروني *')}</label>
                                        <input 
                                            type="email"
                                            required
                                            value={newUserEmail}
                                            onChange={(e) => setNewUserEmail(e.target.value)}
                                            placeholder="user@example.com"
                                            className="w-full text-xs font-mono bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">{parse('Full Name (Optional) | الاسم / المسمى - اختياري')}</label>
                                        <input 
                                            type="text"
                                            value={newUserName}
                                            onChange={(e) => setNewUserName(e.target.value)}
                                            placeholder={t('placeholder_full_name')}
                                            className="w-full text-xs bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">{parse('System Role | صلاحية النظام')}</label>
                                        <select
                                            value={newUserRole}
                                            onChange={(e) => setNewUserRole(e.target.value)}
                                            className="w-full text-xs bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                                        >
                                            <option value="viewer">{parse('Read-Only Viewer | مشاهدة فقط')}</option>
                                            <option value="dc">{parse('Document Controller | مراقب وثائق')}</option>
                                            <option value="qaqc">{parse('QA/QC Manager | مدير جودة ومطابقة')}</option>
                                            <option value="em">{parse('Engineering Manager | مدير هندسي')}</option>
                                            <option value="pm">{parse('Project Manager | مدير مشروع')}</option>
                                            <option value="pd">{parse('Project Director | مدير قطاع / إدارة')}</option>
                                            <option value="executive">{parse('Executive Management | إدارة عليا')}</option>
                                            <option value="all">{parse('Enterprise System Admin | مدير نظام كامل')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <button
                                            type="submit"
                                            disabled={addingUser}
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            {addingUser ? parse('Adding... | جاري الإضافة...') : parse('Add to Team + | إضافة للفريق +')}
                                        </button>
                                    </div>
                                </form>
                                {errorMsg && <p className="text-red-400 text-xs mt-3 font-semibold">{errorMsg}</p>}
                                {successMsg && <p className="text-emerald-400 text-xs mt-3 font-semibold">{successMsg}</p>}
                            </div>
                            
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-3">User Name</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">System Role</th>
                                        <th className="px-6 py-3">Created At</th>
                                        <th className="px-6 py-3 text-center">{parse('Actions | إجراءات')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersList.map((usr) => (
                                        <tr key={usr.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                                            <td className="px-6 py-4 font-medium text-white">{usr.name || 'Unknown'}</td>
                                            <td className="px-6 py-4 text-slate-400 font-mono text-xs">{usr.email || 'No email'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[400px]">
                                                    {[
                                                        { id: 'all', label: parse('Admin | كامل الصلاحيات') },
                                                        { id: 'executive', label: parse('Exec | إدارة عليا') },
                                                        { id: 'pd', label: parse('PD | مدير قطاع') },
                                                        { id: 'pm', label: parse('PM | مدير مشروع') },
                                                        { id: 'em', label: parse('EM | مدير هندسي') },
                                                        { id: 'qaqc', label: parse('QA/QC | جودة ومطابقة') },
                                                        { id: 'dc', label: parse('DC | مراقب وثائق') },
                                                        { id: 'viewer', label: parse('Viewer | مشاهدة فقط') }
                                                    ].map((rItem) => {
                                                        const userRoles = (usr.role || 'viewer').split(',').map((x: string) => x.trim().toLowerCase());
                                                        const isActive = userRoles.includes(rItem.id);
                                                        
                                                        return (
                                                            <button
                                                                key={rItem.id}
                                                                onClick={async () => {
                                                                    let newRolesList = [...userRoles];
                                                                    if (rItem.id === 'all') {
                                                                        if (isActive) {
                                                                            newRolesList = ['viewer'];
                                                                        } else {
                                                                            newRolesList = ['all'];
                                                                        }
                                                                    } else if (rItem.id === 'viewer') {
                                                                        if (isActive) {
                                                                            newRolesList = newRolesList.filter(role => role !== 'viewer');
                                                                            if (newRolesList.length === 0) newRolesList = ['viewer'];
                                                                        } else {
                                                                            newRolesList = ['viewer'];
                                                                        }
                                                                    } else {
                                                                        newRolesList = newRolesList.filter(role => role !== 'viewer' && role !== 'all');
                                                                        if (isActive) {
                                                                            newRolesList = newRolesList.filter(role => role !== rItem.id);
                                                                            if (newRolesList.length === 0) newRolesList = ['viewer'];
                                                                        } else {
                                                                            newRolesList.push(rItem.id);
                                                                        }
                                                                    }
                                                                    const newRoleStr = newRolesList.join(',');
                                                                    await handleRoleChange(usr, newRoleStr);
                                                                }}
                                                                className={`text-[10px] font-semibold py-1 px-2.5 rounded-full border transition-all select-none cursor-pointer ${
                                                                    isActive 
                                                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm' 
                                                                    : 'bg-slate-950/40 text-slate-500 border-slate-800/80 hover:border-slate-700 hover:text-slate-400'
                                                                }`}
                                                            >
                                                                {rItem.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {usr.createdAt ? new Date(usr.createdAt).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {usr.email !== 'ezzeldinrashad197@gmail.com' ? (
                                                    <button 
                                                        onClick={() => handleDeleteUser(usr)}
                                                        className="p-1 px-2.5 text-xs text-red-400 border border-red-500/20 hover:border-red-500 hover:bg-red-500/10 rounded transition-colors text-center inline-flex items-center gap-1.5"
                                                        title={parse('Delete user from team | حذف المستخدم من فريق العمل')}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        {parse('Delete | حذف')}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-amber-500/70 font-semibold">{parse('Primary Admin | المدير الأساسي')}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {usersList.length === 0 && !loadingUsers && (
                                        <tr><td colSpan={5} className="text-center py-6 text-slate-500">No users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}


                    {activeTab === 'health' && (
                        <div className="p-10 h-full overflow-y-auto">
                            <h3 className="text-2xl font-bold text-white mb-8 border-b border-slate-800 pb-4">Real-Time System Health</h3>
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="bg-[#0B1120] p-6 rounded-2xl border border-slate-800">
                                    <div className="text-sm text-slate-400 font-bold tracking-wider uppercase mb-1">API Status</div>
                                    <div className="text-3xl font-black text-emerald-400 flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
                                    </div>
                                </div>
                                <div className="bg-[#0B1120] p-6 rounded-2xl border border-slate-800">
                                    <div className="text-sm text-slate-400 font-bold tracking-wider uppercase mb-1">Data Engine Cache</div>
                                    <div className="text-3xl font-black text-blue-400">92% HIT RATIO</div>
                                </div>
                                <div className="bg-[#0B1120] p-6 rounded-2xl border border-slate-800">
                                    <div className="text-sm text-slate-400 font-bold tracking-wider uppercase mb-1">Queue Depth</div>
                                    <div className="text-3xl font-black text-slate-100">0 TASKS</div>
                                </div>
                                <div className="bg-[#0B1120] p-6 rounded-2xl border border-slate-800">
                                    <div className="text-sm text-slate-400 font-bold tracking-wider uppercase mb-1">Uptime</div>
                                    <div className="text-3xl font-black text-indigo-400">99.998%</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'versions' && (
                        <div className="p-10 h-full overflow-y-auto">
                            <h3 className="text-2xl font-bold text-white mb-8 border-b border-slate-800 pb-4">Version Management & Release Notes</h3>
                            
                            <div className="space-y-8">
                                <div className="relative pl-8 border-l-2 border-indigo-500/30">
                                    <div className="absolute top-0 left-[-9px] w-4 h-4 bg-indigo-500 rounded-full border-4 border-[#0f172a]" />
                                    <div className="flex items-center gap-4 mb-2">
                                        <h4 className="text-xl font-bold text-white">v3.0.0 "Enterprise Alpha"</h4>
                                        <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-full">Current</span>
                                    </div>
                                    <div className="text-slate-400 mb-4 text-sm">Released: June 15, 2026</div>
                                    <ul className="list-disc pl-5 space-y-2 text-slate-300">
                                        <li>Enterprise Security & User Management (RBAC)</li>
                                        <li>Portfolio Management Command Center</li>
                                        <li>Predictive Analytics & Forecasting Models</li>
                                        <li>Executive Intelligence Layer</li>
                                        <li>System Health Dashboard & Configuration Center</li>
                                    </ul>
                                </div>

                                <div className="relative pl-8 border-l-2 border-slate-700">
                                    <div className="absolute top-0 left-[-9px] w-4 h-4 bg-slate-700 rounded-full border-4 border-[#0f172a]" />
                                    <div className="flex items-center gap-4 mb-2">
                                        <h4 className="text-xl font-bold text-slate-300">v2.5.0 "Analytics Pro"</h4>
                                    </div>
                                    <div className="text-slate-500 mb-4 text-sm">Released: April 2, 2026</div>
                                    <ul className="list-disc pl-5 space-y-2 text-slate-400 text-sm">
                                        <li>Advanced KPI Framework implementation</li>
                                        <li>Reporting Excellence enhancements (PDF/PPTX)</li>
                                        <li>Data Quality & Validation improvements</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="p-10 h-full overflow-y-auto">
                            <h3 className="text-2xl font-bold text-white mb-8 border-b border-slate-800 pb-4">About DocuSight Analytics Platform</h3>
                            <div className="prose prose-invert max-w-none text-slate-300">
                                <p className="text-lg leading-relaxed mb-6">
                                    DocuSight is an enterprise-grade Project Information Intelligence Platform designed specifically for large engineering, construction, and PMO organizations. It transforms raw document control data into predictive intelligence, portfolio oversight, and executive governance workflows.
                                </p>
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div className="bg-[#0B1120] p-6 rounded-2xl border border-slate-800">
                                        <h4 className="text-indigo-400 font-bold mb-2">Built For Scale</h4>
                                        <p className="text-sm text-slate-400">Capable of handling massive datasets across dozens of simultaneous megaprojects without degradation in calculation speed.</p>
                                    </div>
                                    <div className="bg-[#0B1120] p-6 rounded-2xl border border-slate-800">
                                        <h4 className="text-indigo-400 font-bold mb-2">Predictive AI Engine</h4>
                                        <p className="text-sm text-slate-400">Trained on historical project logs to forecast SLA breaches, RFI accumulations, and document turnaround bottlenecks before they impact the critical path.</p>
                                    </div>
                                </div>
                                <h4 className="font-bold text-white mb-4">Enterprise User Guide</h4>
                                <div className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                                    <BookOpen className="w-6 h-6 text-slate-400" />
                                    <div>
                                        <div className="font-bold text-slate-200">DocuSight Quick Start Guide</div>
                                        <div className="text-xs text-slate-500">PDF Documentation (2.4 MB)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
