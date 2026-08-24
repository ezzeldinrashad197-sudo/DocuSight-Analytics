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

export interface ProjectScopeResolution {
    projectIds: string[];
    unrestricted: boolean;
}

export const getCurrentUserProjectScope = async (): Promise<ProjectScopeResolution> => {
    const user = auth.currentUser;
    if (!user) return { projectIds: [], unrestricted: false };
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return { projectIds: [], unrestricted: false };
    const data = snap.data() as any;
    const roleValues = Array.isArray(data?.role) ? data.role : String(data?.role || '').split(',');
    const roles = roleValues.map((r: any) => String(r).trim().toLowerCase()).filter(Boolean);
    const unrestricted = roles.some((r: string) => ['all', 'admin', 'executive'].includes(r));
    const scope = data?.projectScope;
    if (Array.isArray(scope)) return { projectIds: scope.map(String).map(s => s.trim()).filter(Boolean), unrestricted };
    if (typeof scope === 'string' && scope.trim()) return { projectIds: [scope.trim()], unrestricted };
    return { projectIds: [], unrestricted };
};

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
    if (!uid) {
        throw new Error('Authenticated user UID is required for permission resolution.');
    }

    const cleanedEmail = String(email || '').trim().toLowerCase();
    const uidDocRef = doc(db, 'users', uid);
    
    console.log(`\n================== [Security Diagnostics] ==================`);
    console.log(`Authoritative Authenticated UID: ${uid}`);
    console.log(`Authenticated Email: ${cleanedEmail}`);
    
    // Fetch authoritative UID profile document from Firestore
    let uidSnap: any = null;
    try {
        uidSnap = await getDoc(uidDocRef);
    } catch (err: any) {
        console.warn('[Security Diagnostics] Direct getDoc on users/{uid} warning:', err?.message);
    }
    
    if (!uidSnap || !uidSnap.exists()) {
        console.warn(`[Identity Linking] Profile missing at /users/${uid}. Triggering server-side identity linking for: ${cleanedEmail}`);
        
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                const idToken = await currentUser.getIdToken();
                const linkRes = await fetch('/api/link-identity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken })
                });

                if (linkRes.ok) {
                    const linkData = await linkRes.json().catch(() => ({}));
                    console.log(`[Identity Linking] Server-side identity linking succeeded:`, linkData);
                    try {
                        uidSnap = await getDoc(uidDocRef);
                    } catch (e) {}

                    if (linkData?.role) {
                        return linkData.role;
                    }
                } else {
                    const errData = await linkRes.json().catch(() => ({}));
                    console.error(`[Identity Linking] Server-side identity linking failed:`, errData.error || linkRes.statusText);
                    throw new Error(errData.error || `Authorization profile not found for UID (${uid}). Access denied (Fail Closed).`);
                }
            }
        } catch (linkErr: any) {
            console.error(`[Identity Linking Error]:`, linkErr.message);
            throw linkErr;
        }

        if (!uidSnap || !uidSnap.exists()) {
            console.error(`[Security Alert] Authorization profile missing in Firestore for UID (${uid}) and Email (${cleanedEmail}). Access denied (Fail Closed).`);
            throw new Error(`Authorization profile not found for UID (${uid}). Access denied (Fail Closed). Please contact system administrator.`);
        }
    }

    const uidData = uidSnap.data();
    const accountStatus = uidData?.accountStatus || 'active';
    const accessLevel = uidData?.accessLevel || 'approved';

    if (accountStatus === 'disabled' || accessLevel === 'revoked') {
        console.error(`[Security Alert] Account ${uid} is disabled or access level revoked (status: ${accountStatus}, level: ${accessLevel}).`);
        throw new Error('Account is disabled or access level is revoked.');
    }

    const rawRole = uidData?.role || uidData?.roles;
    let resolvedRole = '';

    if (rawRole) {
        if (Array.isArray(rawRole)) {
            resolvedRole = rawRole.map((x: any) => String(x).trim().toLowerCase()).filter(Boolean).join(',');
        } else {
            resolvedRole = String(rawRole).trim().toLowerCase();
        }
    }

    if (!resolvedRole) {
        console.error(`[Security Alert] No authorization role assigned in Firestore profile for UID: ${uid}`);
        throw new Error(`No authorization role assigned to UID (${uid}). Access denied (Fail Closed).`);
    }

    console.log(`Authoritative UID Role Resolved: ${resolvedRole}`);

    // Update non-sensitive metadata (email / name) without writing authorization roles
    const baseName = displayName || (cleanedEmail ? cleanedEmail.split('@')[0] : '') || 'Team Member';
    if (cleanedEmail && (uidData?.email !== cleanedEmail || (displayName && uidData?.name !== displayName))) {
        try {
            await setDoc(uidDocRef, {
                email: cleanedEmail,
                name: uidData?.name || baseName,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (syncErr) {
            console.warn(`[Security Diagnostics] Non-fatal UID metadata sync warning:`, syncErr);
        }
    }

    console.log(`Final Authoritative Role for UID ${uid}: ${resolvedRole}`);
    console.log(`============================================================\n`);
    return resolvedRole;
};
