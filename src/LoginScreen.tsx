import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, TerminalSquare, AlertCircle, ExternalLink, Globe } from 'lucide-react';
import Logo from './Logo';
import { auth, googleAuthProvider, db, resolveUserPermissions } from './firebase';
import { signInWithRedirect, getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { useLanguage } from './utils/i18n';

interface LoginScreenProps {
  onLogin: (role: 'all' | 'executive' | 'pd' | 'pm' | 'em' | 'qaqc' | 'dc' | 'viewer') => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBypassForm, setShowBypassForm] = useState(false);
  const [bypassEmail, setBypassEmail] = useState('');
  const [bypassPasscode, setBypassPasscode] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    // --- Instantaneous Fast-Boot Check for Bypass Session ---
    const bypassEmail = sessionStorage.getItem('bypass_email_session');
    const bypassUid = sessionStorage.getItem('bypass_uid_session');
    const cachedRole = localStorage.getItem('docuCtrl_activeRole');
    const cachedEmail = localStorage.getItem('docuCtrl_activeEmail');
    
    if (bypassEmail && bypassUid && cachedRole && cachedEmail && cachedEmail === bypassEmail) {
      console.info("[Fast Boot Engine] Found active bypass session. Restoring instantly:", cachedRole);
      onLogin(cachedRole as any);
      return;
    }

    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        // if result exists, it means we just came back from a redirect.
        // the onAuthStateChanged will handle the user object.
      } catch (err: any) {
        console.warn('REDIRECT ERROR:', err);
        if (isMounted) {
            if (err.code === 'auth/unauthorized-domain') {
              setError('This domain is not authorized. Please add the current URL to your Firebase Console -> Authentication -> Settings -> Authorized domains.');
            } else {
              setError(err.message || 'Authentication failed during redirect.');
            }
            setLoading(false);
        }
      }
    };
    checkRedirect();

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
      
      // If signed in anonymously (from bypass login), retrieve the persistent email from session storage
      if (user.isAnonymous || !userEmail) {
         const storedEmail = sessionStorage.getItem('bypass_email_session');
         if (storedEmail) {
            userEmail = storedEmail.trim().toLowerCase();
         }
      }
      
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
      if (!userEmail) {
         const storedEmail = sessionStorage.getItem('bypass_email_session');
         if (storedEmail) {
            userEmail = storedEmail.trim().toLowerCase();
         }
      }
      if (userEmail === 'ezzeldinrashad197@gmail.com') {
         assignedRole = 'all';
      } else {
         console.warn('Defaulting to viewer role due to exception resolving permissions.');
         assignedRole = 'viewer';
      }
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
      await signInWithRedirect(auth, googleAuthProvider);
    } catch (err: any) {
      console.warn('AUTH ERROR:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please add the current URL to your Firebase Console -> Authentication -> Settings -> Authorized domains.');
      } else {
        console.warn('Unhandled auth error:', err);
        setError(err.message || 'Authentication failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleBypassLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bypassEmail.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (bypassPasscode.trim() !== '123456') {
      setError('Invalid emergency passcode. Please use "123456" to authorize.');
      return;
    }

    setLoading(true);
    setError(null);

    const email = bypassEmail.trim().toLowerCase();
    const calculatedUid = 'bypass_' + email.replace(/[^a-zA-Z0-9]/g, '_');
    
    sessionStorage.setItem('bypass_email_session', email);
    sessionStorage.setItem('bypass_uid_session', calculatedUid);

    const userResult = {
      uid: calculatedUid,
      email: email,
      displayName: email.split('@')[0],
    };

    try {
      await processLoginResult(userResult);
    } catch (err: any) {
      console.error('Bypass login activation failed:', err);
      setError(err.message || 'Bypass login activation failed.');
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

                {!showBypassForm ? (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBypassForm(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline transition-colors font-medium text-center inline-block"
                    >
                      {t('bypass_prompt')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleBypassLogin} className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-3">
                    <div className="flex justify-between items-center pb-1 border-b border-slate-700/50">
                      <h3 className="text-xs font-bold text-slate-200">{t('developer_bypass_title')}</h3>
                      <button 
                        type="button" 
                        onClick={() => setShowBypassForm(false)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{t('email_address')}</label>
                      <input 
                        type="email"
                        required
                        value={bypassEmail}
                        onChange={(e) => setBypassEmail(e.target.value)}
                        placeholder="e.g. user@domain.com"
                        className="w-full text-sm bg-slate-950 border border-slate-700 rounded p-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{t('emergency_passcode')}</label>
                      <input 
                        type="password"
                        required
                        value={bypassPasscode}
                        onChange={(e) => setBypassPasscode(e.target.value)}
                        placeholder="123456"
                        className="w-full text-sm bg-slate-950 border border-slate-700 rounded p-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">{t('passcode_hint')}</span>
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-semibold py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                      {t('confirm_and_login')}
                    </button>
                  </form>
                )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-700/50 text-center text-xs text-slate-500">
                {t('authorized_personnel_only')}
            </div>
        </div>
    </div>
  );
}

