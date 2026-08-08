import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, ExternalLink, Globe } from 'lucide-react';
import Logo from './Logo';
import { auth, googleAuthProvider, resolveUserPermissions } from './firebase';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { useLanguage } from './utils/i18n';

interface LoginScreenProps {
  onLogin: (role: 'all' | 'executive' | 'pd' | 'pm' | 'em' | 'qaqc' | 'dc' | 'viewer') => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (isMounted) setLoading(true);
        
        // --- Instantaneous Fast-Boot Check for Google Authenticated User ---
        const userEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
        const currentCachedRole = localStorage.getItem('docuCtrl_activeRole');
        const currentCachedEmail = localStorage.getItem('docuCtrl_activeEmail');
        
        if (currentCachedRole && currentCachedEmail && currentCachedEmail === userEmail) {
          console.info("[Fast Boot Engine] Restoring session instantly via cached role:", currentCachedRole);
          onLogin(currentCachedRole as any);
          
          // Refresh credentials in the background silently
          resolveUserPermissions(user.uid, userEmail, user.displayName)
            .then((refreshedRole) => {
              localStorage.setItem('docuCtrl_activeRole', refreshedRole);
              localStorage.setItem('docuCtrl_activeEmail', userEmail);
            })
            .catch((err) => console.warn("[Fast Boot Engine] Background refresh deferred:", err));
        } else {
          await processLoginResult(user);
        }
      } else {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
        isMounted = false;
        unsubscribe();
    };
  }, []);

  const processLoginResult = async (user: any) => {
    let assignedRole: 'all' | 'executive' | 'pd' | 'pm' | 'em' | 'qaqc' | 'dc' | 'viewer' = 'viewer';
    
    try {
      let userEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
      
      const resolved = await resolveUserPermissions(user.uid, userEmail, user.displayName);
      assignedRole = resolved as any;
      
      // Persist credentials locally to accelerate opening speed on next loads
      if (userEmail) {
        localStorage.setItem('docuCtrl_activeRole', assignedRole);
        localStorage.setItem('docuCtrl_activeEmail', userEmail);
      }
    } catch (firestoreError: any) {
      console.warn('Firestore user fetch or write failed:', firestoreError);
      let userEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
      console.warn('Defaulting to viewer role due to exception resolving permissions.');
      assignedRole = 'viewer';
      if (userEmail) {
        localStorage.setItem('docuCtrl_activeRole', assignedRole);
        localStorage.setItem('docuCtrl_activeEmail', userEmail);
      }
    }

    onLogin(assignedRole);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.warn('POPUP AUTH ERROR:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please add the current URL to your Firebase Console -> Authentication -> Settings -> Authorized domains.');
      } else {
        setError(err.message || 'Authentication failed. If you are inside an iframe or popups are blocked, please open the application in a new tab.');
      }
      setLoading(false);
    }
  };

  const { t, language, setLanguage, isRtl } = useLanguage();

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-300 flex flex-col items-center justify-center font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} z-20`}>
                <button
                  type="button"
                  onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 transition"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {language === 'en' ? 'العربية' : 'English'}
                </button>
            </div>

            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Shield className="w-32 h-32" />
            </div>

            <div className="flex flex-col items-center mb-8 relative z-10">
                <Logo className="h-16 mb-4" />
                <h1 className="text-2xl font-bold tracking-tight text-white mb-2">{t('enterprise_access')}</h1>
                <p className="text-sm text-slate-400 text-center px-4">
                    {t('docusight_platform')}
                    <br/>
                    {t('sso_required_message')}
                </p>
            </div>

            {error && (
              <div className="mb-6">
                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm mb-3">
                  <div className="flex items-center gap-2 mb-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {t('auth_error')}
                  </div>
                  <div>
                    {error.includes('authorized') ? t('unauthorized_domain_msg') : error}
                  </div>
                </div>
                {(error.includes('popup') || error.includes('iframe') || error.includes('blocked')) && (
                   <div className="p-4 bg-slate-800/80 rounded border border-slate-700 text-center">
                      <p className="text-sm font-medium text-slate-300 mb-3">
                        {t('login_popup_iframe_warning')}
                      </p>
                      <a 
                        href={window.location.href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded transition-colors text-sm font-medium shadow-lg"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t('open_new_tab_login')}
                      </a>
                   </div>
                )}
              </div>
            )}

            <div className="pt-2 relative z-10 space-y-4">
                <button 
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-[#0A192F] font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                >
                    <Shield className="w-5 h-5" />
                    {loading ? t('authenticating') : t('sign_in_with_sso')}
                </button>

                {typeof window !== 'undefined' && window.self !== window.top && (
                  <div className="text-center pt-2">
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline transition-colors inline-flex items-center gap-1 font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t('open_new_tab_login')}
                    </a>
                  </div>
                )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-700/50 text-center text-xs text-slate-500">
                {t('authorized_personnel_only')}
            </div>
        </div>
    </div>
  );
}

