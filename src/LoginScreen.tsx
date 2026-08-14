import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertCircle, ExternalLink, Globe, Mail, ArrowRight, Lock } from 'lucide-react';
import Logo from './Logo';
import { auth, googleAuthProvider, resolveUserPermissions } from './firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { useLanguage } from './utils/i18n';

interface LoginScreenProps {
  onLogin: (role: 'all' | 'executive' | 'pd' | 'pm' | 'em' | 'qaqc' | 'dc' | 'viewer') => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isIframe, setIsIframe] = useState(false);
  const [userEmailInput, setUserEmailInput] = useState('');
  const [showEmailAccess, setShowEmailAccess] = useState(false);

  // Guards against processLoginResult firing twice when both
  // getRedirectResult() and onAuthStateChanged() resolve for the same sign-in.
  const processedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.self !== window.top) {
      setIsIframe(true);
    }
    const savedEmail = localStorage.getItem('docuCtrl_activeEmail');
    if (savedEmail) {
      setUserEmailInput(savedEmail);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Check for redirect result from signInWithRedirect
    getRedirectResult(auth).then(async (result) => {
      if (result && result.user && isMounted) {
        setLoading(true);
        await processLoginResult(result.user);
      } else if (isMounted && auth.currentUser) {
        setLoading(true);
        await processLoginResult(auth.currentUser);
      } else if (isMounted) {
        setLoading(false);
      }
    }).catch((redirectErr: any) => {
      console.warn('[Auth Protocol] Redirect Auth Error:', redirectErr);
      if (isMounted) {
        setLoading(false);
        setError(redirectErr?.message || 'Redirect authentication failed. Please try signing in again.');
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (isMounted) setLoading(true);
        await processLoginResult(user);
      } else {
        processedRef.current = false;
        if (isMounted) setLoading(false);
      }
    });

    return () => {
        isMounted = false;
        unsubscribe();
    };
  }, []);

  const processLoginResult = async (user: any) => {
    if (!user || !user.uid || user.isAnonymous) {
      setLoading(false);
      setError('Authenticated user account required. Anonymous sessions are prohibited.');
      return;
    }

    if (processedRef.current) return;
    processedRef.current = true;

    try {
      const userEmail = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
      const resolvedRole = await resolveUserPermissions(user.uid, userEmail, user.displayName);

      // Persist UI cache non-authoritatively
      if (userEmail) {
        localStorage.setItem('docuCtrl_activeEmail', userEmail);
      }
      localStorage.setItem('docuCtrl_activeRole', resolvedRole);

      onLogin(resolvedRole as any);
    } catch (firestoreError: any) {
      console.warn('[Auth Protocol] Authorization permission resolution failed:', firestoreError);
      processedRef.current = false;
      setLoading(false);
      setError(firestoreError?.message || 'Authentication failed: Unable to resolve authoritative user permissions.');
    }
  };

  const handleEmailAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmailInput || !userEmailInput.includes('@')) {
      setError(language === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid enterprise email address.');
      return;
    }
    setLoading(true);
    setError(null);
    processedRef.current = false;

    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      await processLoginResult(auth.currentUser);
    } else {
      await handleLogin(e, false);
    }
  };

  const handleLogin = async (e?: React.FormEvent, forceRedirect = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    processedRef.current = false;

    if (userEmailInput && userEmailInput.includes('@')) {
      googleAuthProvider.setCustomParameters({ login_hint: userEmailInput.trim() });
    }

    // If running inside an iframe, open in new tab for standard OAuth flow
    if (isIframe) {
      window.open(window.location.href, '_blank');
      setLoading(false);
      return;
    }

    if (forceRedirect) {
      try {
        await signInWithRedirect(auth, googleAuthProvider);
      } catch (redirectErr: any) {
        console.warn('[Auth Protocol] REDIRECT AUTH ERROR:', redirectErr);
        setLoading(false);
        setError(redirectErr?.message || 'Redirect authentication failed. Please try again.');
      }
      return;
    }

    try {
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      if (userCredential?.user) {
        await processLoginResult(userCredential.user);
      } else {
        setLoading(false);
        setError('Authentication failed. No user credentials returned.');
      }
    } catch (err: any) {
      console.warn('[Auth Protocol] POPUP AUTH WARNING:', err);
      if (err.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleAuthProvider);
          return;
        } catch (redirectErr: any) {
          console.warn('[Auth Protocol] FALLBACK REDIRECT AUTH ERROR:', redirectErr);
          setLoading(false);
          setError(redirectErr?.message || 'Redirect authentication failed. Please try again.');
          return;
        }
      }
      setLoading(false);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`This domain (${window.location.host}) requires authorization in Firebase Console or use Full Window Redirect below.`);
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
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
                <Logo variant="on-dark" className="h-12 mb-4" showSubtitle={true} showTagline={true} />
                <h1 className="text-xl font-bold tracking-tight text-white mb-2">{t('enterprise_access')}</h1>
                <p className="text-xs text-slate-400 text-center px-4">
                    {t('docusight_platform')}
                    <br/>
                    {t('sso_required_message')}
                </p>
            </div>

            {isIframe && !error && (
              <div className="mb-6 p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-200/90 text-xs text-center space-y-2">
                <p className="font-medium">
                  {t('login_popup_iframe_warning')}
                </p>
                <div>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t('open_new_tab_login')}
                  </a>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6">
                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm mb-3">
                  <div className="flex items-center gap-2 mb-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {t('auth_error')}
                  </div>
                  <div>
                    {error.includes('authorized') ? t('unauthorized_domain_msg') : error}
                  </div>
                </div>
                {(error.includes('popup') || error.includes('iframe') || error.includes('blocked') || error.includes('closed')) && (
                   <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-center">
                      <p className="text-sm font-medium text-slate-300 mb-3">
                        {t('login_popup_iframe_warning')}
                      </p>
                      <a 
                        href={window.location.href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium shadow-lg"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t('open_new_tab_login')}
                      </a>
                   </div>
                )}
              </div>
            )}

            <div className="pt-2 relative z-10 space-y-3">
                <button 
                  onClick={(e) => handleLogin(e, false)}
                  disabled={loading}
                  className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-[#0A192F] font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg cursor-pointer"
                >
                    <Shield className="w-5 h-5" />
                    {loading ? t('authenticating') : t('sign_in_with_sso')}
                </button>

                {!isIframe && (
                  <button
                    type="button"
                    onClick={(e) => handleLogin(e, true)}
                    disabled={loading}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-indigo-400" />
                    {language === 'ar' ? 'تسجيل الدخول عبر توجيه الشاشة الكاملة (Redirect)' : 'Sign In via Full Window Redirect'}
                  </button>
                )}

                <div className="pt-3 border-t border-slate-800 text-center">
                  {!showEmailAccess ? (
                    <button
                      type="button"
                      onClick={() => setShowEmailAccess(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 underline transition-colors font-medium flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'الدخول المباشر بالبريد الإلكتروني المؤسسي (Enterprise Email SSO)' : 'Enterprise Email SSO Access'}
                    </button>
                  ) : (
                    <form onSubmit={handleEmailAccessSubmit} className="p-4 bg-slate-800/90 border border-slate-700 rounded-xl space-y-3 text-left" dir={isRtl ? 'rtl' : 'ltr'}>
                      <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                          {language === 'ar' ? 'تسجيل الدخول الإلكتروني المؤسسي' : 'Enterprise Email Access'}
                        </span>
                        <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                          {language === 'ar' ? 'مصرّح' : 'Verified SSO'}
                        </span>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {t('email_address')}
                        </label>
                        <input
                          type="email"
                          value={userEmailInput}
                          onChange={(e) => setUserEmailInput(e.target.value)}
                          required
                          placeholder="user@company.com"
                          className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-3 text-xs rounded-lg transition-colors shadow flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {loading ? t('authenticating') : (language === 'ar' ? 'دخول مركز التحكم' : 'Access Command Center')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEmailAccess(false)}
                          className="px-3 py-2.5 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {isIframe && (
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

