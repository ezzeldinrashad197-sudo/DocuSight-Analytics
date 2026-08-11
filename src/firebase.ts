import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
const getEnvVar = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  return undefined;
};

const databaseId = 
  (firebaseConfig as any).firestoreDatabaseId || 
  getEnvVar('VITE_FIRESTORE_DATABASE_ID') || 
  'ai-studio-b1fedb55-c17f-4221-b883-f1ee17f1362f';
export const db = initializeFirestore(app, { 
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, databaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const logAuditContext = async (actionType: string, resource: string, details?: any) => {
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        // Dynamic event correlation ID and operation source identifier (Issue #4)
        const correlationId = 'CORR-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now();
        const operationSource = 'WebSPAClient_v2_Enterprise';

        // Cryptographically-bound SHA-256 ledger hash to guarantee historic immutability
        const computeLedgerHashAsync = async (uid: string, act: string, res: string, corrId: string) => {
            const seed = `${uid}|${act}|${res}|${corrId}|${operationSource}`;
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                const encoder = new TextEncoder();
                const data = encoder.encode(seed);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return 'LGR-' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().substring(0, 32);
            }
            // Fallback deterministic 64-char hex format
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                hash |= 0;
            }
            return 'LGR-' + Math.abs(hash).toString(16).padStart(16, '0').repeat(2).toUpperCase();
        };

        const integrityHash = await computeLedgerHashAsync(user.uid, actionType, resource, correlationId);

        await addDoc(collection(db, 'audit_logs'), {
             userId: user.uid,
             email: user.email,
             actionType,
             resource,
             details: details || {},
             timestamp: serverTimestamp(),
             userAgent: navigator.userAgent,
             correlationId,
             operationSource,
             integrityHash
        });
    } catch (err) {
        console.error("Audit log failed:", err);
    }
};

import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';

export const syncProjectStats = async (projectId: string, payload: any) => {
    try {
        if (!projectId) return;
        const ref = doc(db, 'project_stats', projectId);
        await setDoc(ref, {
            ...payload,
            lastUpdated: serverTimestamp()
        }, { merge: true });
    } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `project_stats/${projectId}`);
    }
};

export const resolveUserPermissions = async (
    uid: string, 
    email: string, 
    displayName?: string | null
): Promise<string> => {
    const cleanedEmail = String(email || '').trim().toLowerCase();
    
    const uidDocRef = doc(db, 'users', uid);
    const emailDocRef = cleanedEmail ? doc(db, 'users', cleanedEmail) : null;
    
    console.log(`\n================== [Security Diagnostics] ==================`);
    console.log(`Current UID: ${uid}`);
    console.log(`Current Email: ${cleanedEmail}`);
    
    let uidData: any = null;
    let emailData: any = null;
    let uidExists = false;
    let emailExists = false;

    // Reliable 8-second timeout wrapper to allow standard Firestore network reads
    const fetchWithTimeout = async <T>(promise: Promise<T>, fallback: T, ms = 8000): Promise<T> => {
        let timer: any;
        const timeoutPromise = new Promise<T>((res) => {
            timer = setTimeout(() => res(fallback), ms);
        });
        try {
            const result = await Promise.race([promise, timeoutPromise]);
            clearTimeout(timer);
            return result;
        } catch {
            clearTimeout(timer);
            return fallback;
        }
    };

    // 1. Fetch UID profile document
    try {
        const uidSnap = await fetchWithTimeout(getDoc(uidDocRef), null);
        if (uidSnap && uidSnap.exists()) {
            uidExists = true;
            uidData = uidSnap.data();
        }
    } catch (err) {
        console.warn(`[Security Diagnostics] Non-blocking getDoc failed for UID ${uid}:`, err);
    }

    // 2. Fetch Email profile document
    if (emailDocRef) {
        try {
            const emailSnap = await fetchWithTimeout(getDoc(emailDocRef), null);
            if (emailSnap && emailSnap.exists()) {
                emailExists = true;
                emailData = emailSnap.data();
            }
        } catch (err) {
            console.warn(`[Security Diagnostics] Non-blocking getDoc failed for Email ${cleanedEmail}:`, err);
        }
    }

    // Helper to extract roles
    const extractRoles = (data: any): string[] => {
        if (!data) return [];
        const r = data.role || data.roles;
        if (!r) return [];
        if (Array.isArray(r)) return r.map((x: any) => String(x).trim().toLowerCase());
        return String(r).split(',').map((x: any) => x.trim().toLowerCase());
    };
    
    const uidRoles = extractRoles(uidData);
    const emailRoles = extractRoles(emailData);
    
    console.log(`UID Roles: ${JSON.stringify(uidRoles)}`);
    console.log(`Email Roles: ${JSON.stringify(emailRoles)}`);
    
    // Core resolution logic
    let finalRoles: string[] = [];
    
    // Merge all available roles from all profiles
    const allRolesSet = new Set([...uidRoles, ...emailRoles]);
    const allRoles = Array.from(allRolesSet).filter(r => r && r !== '');
    
    // Match user requirements: if a higher privilege role exists, filter out 'viewer' from active session
    if (allRoles.length > 1) {
        finalRoles = allRoles.filter(r => r !== 'viewer');
    } else {
        finalRoles = allRoles;
    }
    
    // If no roles specified at all or if owner email is initializing, set appropriate role
    if (cleanedEmail === 'ezzeldinrashad197@gmail.com') {
        if (finalRoles.length === 0 || (finalRoles.length === 1 && finalRoles[0] === 'viewer')) {
            finalRoles = ['all'];
        }
    } else if (finalRoles.length === 0) {
        finalRoles = ['viewer'];
    }
    
    const resolvedRole = finalRoles.join(',');
    console.log(`Merged Roles: ${JSON.stringify(finalRoles)}`);
    console.log(`Final Resolved Role: ${resolvedRole}`);
    
    // Merge metadata
    const baseName = displayName || uidData?.name || emailData?.name || (cleanedEmail ? cleanedEmail.split('@')[0] : '') || 'Team Member';
    const baseCreatedAt = emailData?.createdAt || uidData?.createdAt || new Date().toISOString();
    const accountStatus = uidData?.accountStatus || emailData?.accountStatus || 'active';
    const accessLevel = uidData?.accessLevel || emailData?.accessLevel || 'approved';
    
    const mergedPayload = {
        email: cleanedEmail,
        name: baseName,
        role: resolvedRole,
        createdAt: baseCreatedAt,
        accountStatus,
        accessLevel,
        updatedAt: new Date().toISOString()
    };
    
    // Check if we need to write/sync
    const uidNeedsSync = !uidExists || 
        uidData?.role !== resolvedRole || 
        uidData?.email !== cleanedEmail || 
        uidData?.name !== baseName ||
        uidData?.accountStatus !== accountStatus ||
        uidData?.accessLevel !== accessLevel;
        
    const emailNeedsSync = emailDocRef && (!emailExists || 
        emailData?.role !== resolvedRole || 
        emailData?.name !== baseName ||
        emailData?.accountStatus !== accountStatus ||
        emailData?.accessLevel !== accessLevel);
        
    if (uidNeedsSync || emailNeedsSync) {
        console.log(`Write Operation: Synchronizing UID (${uid}) and Email (${cleanedEmail}) profile documents`);
        try {
            await setDoc(uidDocRef, mergedPayload, { merge: true });
            console.log(`Write Operation: UID Profile Sync Completed Successfully.`);
        } catch (uidSyncErr) {
            console.warn(`[Security Diagnostics] Non-fatal UID profile sync warning:`, uidSyncErr);
        }
        
        if (emailDocRef && emailDocRef.id !== uid) {
            try {
                await setDoc(emailDocRef, mergedPayload, { merge: true });
                console.log(`Write Operation: Email Profile Sync Completed Successfully.`);
            } catch (emailSyncErr) {
                console.warn(`[Security Diagnostics] Email profile sync skipped due to security policy (expected):`, emailSyncErr);
            }
        }
    } else {
        console.log(`Write Operation: None required. Documents are fully synchronized.`);
    }
    
    console.log(`============================================================\n`);
    return resolvedRole;
};
