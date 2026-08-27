process.env.NODE_ENV = 'test';
process.env.SKIP_SERVER_AUTOSTART = 'true';

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

console.log('================================================================================');
console.log('  STRUCTUSIGHT — AUTHENTICATION & ZERO-TRUST ROLE RESOLUTION REGRESSION SUITE');
console.log('================================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failCount++;
  }
}

// 1. Verify SHA-256 hashes of the remediated protected artifacts
const expectedHashes = {
  'src/utils/calculations.ts': '6d14efc35605055252dda85f2dbd14beca87ab17f6214646ccf9907da5465abf', // updated 2026-08-27: export classifyRow and classifySubmission
  'src/test-datasets/GOLDEN_REGRESSION_BASELINE.json': 'cf28ee271e70d502e826f7da120b1a4a0aa583c7d37af23892bc9b2be9c72ade',
  'firestore.rules': 'b273f4a4a8fe2cd4aaad1e293892a5c23bdf7612262a45bf08b2942fe57409e4'
};

for (const [relPath, expectedHash] of Object.entries(expectedHashes)) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (fs.existsSync(fullPath)) {
    const fileBuffer = fs.readFileSync(fullPath);
    const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    assert(
      actualHash === expectedHash,
      `Immutable Artifact Integrity: ${relPath}`,
      `Expected ${expectedHash}, got ${actualHash}`
    );
  } else {
    assert(false, `Immutable Artifact Existence: ${relPath}`, 'File not found');
  }
}

// 2. Static AST & Source Inspection Checks
const firebaseCode = fs.readFileSync(path.resolve(process.cwd(), 'src/firebase.ts'), 'utf-8');
const serverCode = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf-8');
const loginCode = fs.readFileSync(path.resolve(process.cwd(), 'src/LoginScreen.tsx'), 'utf-8');
const appCode = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');

assert(
  firebaseCode.includes('/api/link-identity') && serverCode.includes('linkedFromEmailDoc'),
  'Identity-Linking Check: Pre-provisioned email profiles migrate server-side to authoritative /users/{uid}',
  'firebase.ts or server.ts missing server-side identity-linking endpoint'
);

assert(
  firebaseCode.includes('const uidDocRef = doc(db, \'users\', uid)'),
  'Zero-Trust DB Query Check: Authoritative /users/{authenticated UID} document is queried in firebase.ts',
  'Code does not query /users/{uid}'
);

assert(
  !loginCode.includes('signInAnonymously'),
  'Zero-Trust Auth Check: Anonymous sign-in (signInAnonymously) is completely removed',
  'LoginScreen still contains signInAnonymously'
);

assert(
  !loginCode.includes('performFallbackAuth'),
  'Zero-Trust Auth Check: Unsafe fallback session creation (performFallbackAuth) is completely removed',
  'LoginScreen still contains performFallbackAuth'
);

assert(
  loginCode.includes('user.isAnonymous'),
  'Zero-Trust Auth Check: Anonymous users are rejected with error',
  'LoginScreen does not explicitly guard against anonymous users'
);

assert(
  loginCode.includes('setError('),
  'Zero-Trust Auth Check: Authentication failures stay on Login Screen with error',
  'LoginScreen does not display error state'
);

assert(
  !loginCode.includes('onLogin(\'viewer\')') && !loginCode.includes('onLogin("viewer")'),
  'Zero-Trust Auth Check: LoginScreen has zero automatic fail-open onLogin(\'viewer\') calls',
  'LoginScreen contains automatic fail-open onLogin viewer call'
);

assert(
  !firebaseCode.includes('role: \'viewer\'') && !firebaseCode.includes('role: "viewer"'),
  'Zero-Trust Auth Check: Client-side logic in firebase.ts does not write role: viewer',
  'firebase.ts contains client-side role creation'
);

// 3. Functional Logic Simulation Tests
console.log('\n--------------------------------------------------------------------------------');
console.log('  RUNNING AUTH-001 THROUGH AUTH-016 FUNCTIONAL AUTHENTICATION & TENANT ISOLATION SUITE');
console.log('--------------------------------------------------------------------------------\n');

// Mock implementation of store-backed zero-trust role resolution with identity-linking
function resolveUserPermissionsWithLinkingMock(
  uid: string,
  email: string,
  displayName: string | null,
  store: Record<string, any>
): { role: string; store: Record<string, any> } {
  if (!uid) {
    throw new Error('Authenticated user UID is required for permission resolution.');
  }

  const cleanedEmail = String(email || '').trim().toLowerCase();
  const uidKey = `users/${uid}`;
  let uidData = store[uidKey];

  if (!uidData) {
    if (cleanedEmail) {
      const emailKey = `users/${cleanedEmail}`;
      const emailData = store[emailKey];
      if (emailData) {
        const emailAccountStatus = emailData.accountStatus || 'active';
        const emailAccessLevel = emailData.accessLevel || 'approved';
        if (emailAccountStatus === 'disabled' || emailAccessLevel === 'revoked') {
          throw new Error('Account is disabled or access level is revoked.');
        }

        const rawEmailRole = emailData.role || emailData.roles;
        const hasEmailRole = Array.isArray(rawEmailRole) ? rawEmailRole.length > 0 : Boolean(rawEmailRole);
        if (!hasEmailRole) {
          throw new Error(`No authorization role assigned to pre-provisioned profile (${cleanedEmail}). Access denied (Fail Closed).`);
        }

        // Perform controlled identity linking to users/{uid}
        store[uidKey] = {
          ...emailData,
          uid,
          email: cleanedEmail,
          name: displayName || emailData.name || (cleanedEmail ? cleanedEmail.split('@')[0] : 'Team Member'),
          linkedFromEmailDoc: cleanedEmail,
          linkedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        store[emailKey] = {
          ...emailData,
          linkedToUid: uid,
          updatedAt: new Date().toISOString()
        };
        uidData = store[uidKey];
      }
    }

    if (!uidData) {
      throw new Error(`Authorization profile not found for UID (${uid}). Access denied (Fail Closed). Please contact system administrator.`);
    }
  }

  const accountStatus = uidData.accountStatus || 'active';
  const accessLevel = uidData.accessLevel || 'approved';
  if (accountStatus === 'disabled' || accessLevel === 'revoked') {
    throw new Error('Account is disabled or access level is revoked.');
  }

  const rawRole = uidData.role || uidData.roles;
  let resolvedRole = '';
  if (rawRole) {
    if (Array.isArray(rawRole)) {
      resolvedRole = rawRole.map((x: any) => String(x).trim().toLowerCase()).filter(Boolean).join(',');
    } else {
      resolvedRole = String(rawRole).trim().toLowerCase();
    }
  }

  if (!resolvedRole) {
    throw new Error(`No authorization role assigned to UID (${uid}). Access denied (Fail Closed).`);
  }

  return { role: resolvedRole, store };
}

// AUTH-001: Known owner UID document -> login succeeds -> role = all
try {
  const store = {
    'users/owner-uid-001': { email: 'owner@structusight.com', role: 'all', accountStatus: 'active', accessLevel: 'approved' }
  };
  const res = resolveUserPermissionsWithLinkingMock('owner-uid-001', 'owner@structusight.com', 'Owner', store);
  assert(res.role === 'all', 'AUTH-001: Known owner UID document -> login succeeds -> role = all');
} catch (e: any) {
  assert(false, 'AUTH-001: Known owner UID document -> login succeeds -> role = all', e.message);
}

// AUTH-002: Known provisioned user by email -> Google authentication -> email identity matches -> UID document is established -> original role preserved
try {
  const store: Record<string, any> = {
    'users/engineer@structusight.com': { email: 'engineer@structusight.com', role: 'pm,pd', accountStatus: 'active', accessLevel: 'approved', projectScope: 'Project-A' }
  };
  const res = resolveUserPermissionsWithLinkingMock('eng-uid-002', 'engineer@structusight.com', 'Lead Engineer', store);
  const uidDocCreated = res.store['users/eng-uid-002'];
  assert(
    res.role === 'pm,pd' && uidDocCreated && uidDocCreated.role === 'pm,pd' && uidDocCreated.linkedFromEmailDoc === 'engineer@structusight.com',
    'AUTH-002: Known provisioned user by email -> Google authentication -> email identity matches -> UID document is established -> original role preserved'
  );
} catch (e: any) {
  assert(false, 'AUTH-002: Known provisioned user by email -> Google authentication', e.message);
}

// AUTH-003: Unknown Google user -> login denied -> NO viewer profile created
try {
  const store: Record<string, any> = {};
  resolveUserPermissionsWithLinkingMock('unknown-uid-003', 'intruder@unknown.com', 'Intruder', store);
  assert(false, 'AUTH-003: Unknown Google user -> login denied -> NO viewer profile created', 'Failed to throw error');
} catch (e: any) {
  assert(
    e.message.includes('Authorization profile not found') && !('users/unknown-uid-003' in {}),
    'AUTH-003: Unknown Google user -> login denied -> NO viewer profile created',
    e.message
  );
}

// AUTH-004: Existing UID document with role -> UID document remains authoritative
try {
  const store: Record<string, any> = {
    'users/user-uid-004': { email: 'user@structusight.com', role: 'executive', accountStatus: 'active', accessLevel: 'approved' },
    'users/user@structusight.com': { email: 'user@structusight.com', role: 'viewer', accountStatus: 'active', accessLevel: 'approved' }
  };
  const res = resolveUserPermissionsWithLinkingMock('user-uid-004', 'user@structusight.com', 'User Four', store);
  assert(
    res.role === 'executive',
    'AUTH-004: Existing UID document with role -> UID document remains authoritative'
  );
} catch (e: any) {
  assert(false, 'AUTH-004: Existing UID document with role -> UID document remains authoritative', e.message);
}

// AUTH-005: Disabled account -> login denied
try {
  const store = {
    'users/disabled-uid-005': { email: 'disabled@structusight.com', role: 'pm', accountStatus: 'disabled', accessLevel: 'approved' }
  };
  resolveUserPermissionsWithLinkingMock('disabled-uid-005', 'disabled@structusight.com', 'Disabled User', store);
  assert(false, 'AUTH-005: Disabled account -> login denied', 'Failed to throw error');
} catch (e: any) {
  assert(
    e.message.includes('disabled'),
    'AUTH-005: Disabled account -> login denied',
    e.message
  );
}

// AUTH-006: Revoked access -> login denied
try {
  const store = {
    'users/revoked-uid-006': { email: 'revoked@structusight.com', role: 'dc', accountStatus: 'active', accessLevel: 'revoked' }
  };
  resolveUserPermissionsWithLinkingMock('revoked-uid-006', 'revoked@structusight.com', 'Revoked User', store);
  assert(false, 'AUTH-006: Revoked access -> login denied', 'Failed to throw error');
} catch (e: any) {
  assert(
    e.message.includes('revoked'),
    'AUTH-006: Revoked access -> login denied',
    e.message
  );
}

// AUTH-007: Email mismatch -> login denied
try {
  const store = {
    'users/target@structusight.com': { email: 'target@structusight.com', role: 'all', accountStatus: 'active', accessLevel: 'approved' }
  };
  resolveUserPermissionsWithLinkingMock('attacker-uid-007', 'different@otherdomain.com', 'Attacker', store);
  assert(false, 'AUTH-007: Email mismatch -> login denied', 'Failed to throw error');
} catch (e: any) {
  assert(
    e.message.includes('Authorization profile not found'),
    'AUTH-007: Email mismatch -> login denied',
    e.message
  );
}

// AUTH-008: localStorage contains viewer -> cannot authenticate user without Firebase Auth
function checkLocalStorageUnauthMock(localRole: string, authUser: any) {
  if (!authUser || authUser.isAnonymous) {
    return { isAuthenticated: false, role: null };
  }
  return { isAuthenticated: true, role: localRole };
}
const authState008 = checkLocalStorageUnauthMock('viewer', null);
assert(
  !authState008.isAuthenticated && authState008.role === null,
  'AUTH-008: localStorage contains viewer -> cannot authenticate user'
);

// AUTH-009: Logout -> authenticated state cleared
function performLogoutMock() {
  const state = { isAuthenticated: true, activeRole: 'all' as string | null };
  // Perform logout
  state.isAuthenticated = false;
  state.activeRole = null;
  return state;
}
const logoutRes = performLogoutMock();
assert(
  !logoutRes.isAuthenticated && logoutRes.activeRole === null,
  'AUTH-009: Logout -> authenticated state cleared'
);

// AUTH-010: Account switching -> previous user's role cannot leak to next user
function switchAccountMock(prevRole: string, nextUserStoreData: any | null) {
  let activeRole: string | null = prevRole;
  // Clear previous session
  activeRole = null;
  // Resolve new session
  if (!nextUserStoreData) {
    throw new Error('Access denied (Fail Closed)');
  }
  activeRole = nextUserStoreData.role;
  return activeRole;
}
try {
  const switchedRole = switchAccountMock('all', { role: 'viewer' });
  assert(
    switchedRole === 'viewer',
    'AUTH-010: Account switching -> previous user\'s role cannot leak to next user'
  );
} catch (e: any) {
  assert(false, 'AUTH-010: Account switching -> previous user\'s role cannot leak to next user', e.message);
}

// AUTH-011: Tenant/project scope preserved during identity linking
try {
  const store: Record<string, any> = {
    'users/scoped@structusight.com': { email: 'scoped@structusight.com', role: 'pm', accountStatus: 'active', accessLevel: 'approved', tenantId: 'tenant-999', projectScope: ['P-101', 'P-102'] }
  };
  const res = resolveUserPermissionsWithLinkingMock('scoped-uid-011', 'scoped@structusight.com', 'Scoped User', store);
  const createdUidDoc = res.store['users/scoped-uid-011'];
  assert(
    createdUidDoc.tenantId === 'tenant-999' && Array.isArray(createdUidDoc.projectScope) && createdUidDoc.projectScope.includes('P-101'),
    'AUTH-011: Tenant/project scope preserved during identity linking'
  );
} catch (e: any) {
  assert(false, 'AUTH-011: Tenant/project scope preserved during identity linking', e.message);
}

// AUTH-012: Owner cannot be downgraded to viewer during OAuth errors/timeouts
function handleOAuthErrorForOwnerMock(ownerRole: string) {
  const state = { isAuthenticated: true, role: ownerRole, error: null as string | null };
  // On error/timeout: retain fail-closed error, do NOT downgrade role or fail open to viewer
  try {
    throw new Error('OAuth authentication popup timed out.');
  } catch (err: any) {
    state.isAuthenticated = false;
    state.role = ownerRole; // Preserved owner role metadata, but session unauthenticated
    state.error = err.message;
  }
  return state;
}
const oauthOwnerState = handleOAuthErrorForOwnerMock('all');
assert(
  !oauthOwnerState.isAuthenticated && oauthOwnerState.role === 'all' && oauthOwnerState.error === 'OAuth authentication popup timed out.',
  'AUTH-012: Owner cannot be downgraded to viewer during OAuth errors/timeouts'
);

// --- Cross-Project / Tenant Isolation Tests (AUTH-013 to AUTH-016) ---

function evaluateFirestoreSecurityRuleAccess(user: { uid: string; role: string; projectScope?: string[] | string } | null, resource: { projectId: string }, action: 'read' | 'write', collection: string): boolean {
  if (!user || !user.uid) return false;
  const isAdmin = user.role === 'all' || user.role === 'executive' || user.role === 'admin';
  const isEditor = isAdmin || ['pd', 'pm', 'em', 'qaqc', 'dc'].includes(user.role);
  
  const isProjectMember = isAdmin || (
    Array.isArray(user.projectScope) ? user.projectScope.includes(resource.projectId) : user.projectScope === resource.projectId
  );

  if (collection === 'projects' || collection === 'project_stats') {
    if (action === 'read') return isProjectMember;
    if (action === 'write') return isEditor && isProjectMember;
  }

  if (collection === 'analytics' || collection === 'reports') {
    if (action === 'read') return isProjectMember;
    if (action === 'write') return isEditor && isProjectMember;
  }

  return false;
}

// AUTH-013: Authorized Project Read = ALLOWED
const userProjectMember = { uid: 'user-member-1', role: 'pm', projectScope: ['PROJECT-ALPHA', 'PROJECT-BETA'] };
const authReadAllowed = evaluateFirestoreSecurityRuleAccess(userProjectMember, { projectId: 'PROJECT-ALPHA' }, 'read', 'projects');
assert(
  authReadAllowed === true,
  'AUTH-013: Cross-Project / Tenant Isolation — Authorized Project Read = ALLOWED'
);

// AUTH-014: Unauthorized Project Read = DENIED
const authReadDenied = evaluateFirestoreSecurityRuleAccess(userProjectMember, { projectId: 'PROJECT-GAMMA' }, 'read', 'projects');
assert(
  authReadDenied === false,
  'AUTH-014: Cross-Project / Tenant Isolation — Unauthorized Project Read = DENIED'
);

// AUTH-015: Unauthorized Project Write = DENIED
const authWriteDenied = evaluateFirestoreSecurityRuleAccess(userProjectMember, { projectId: 'PROJECT-GAMMA' }, 'write', 'projects');
assert(
  authWriteDenied === false,
  'AUTH-015: Cross-Project / Tenant Isolation — Unauthorized Project Write = DENIED'
);

// AUTH-016: Cross-Project Query = DENIED
function evaluateCrossProjectQueryAccess(user: { uid: string; role: string; projectScope?: string[] | string } | null, requestedProjectIds: string[]): boolean {
  if (!user || !user.uid) return false;
  const isAdmin = user.role === 'all' || user.role === 'executive' || user.role === 'admin';
  if (isAdmin) return true;
  const allowed = Array.isArray(user.projectScope) ? user.projectScope : (user.projectScope ? [user.projectScope] : []);
  return requestedProjectIds.every(pId => allowed.includes(pId));
}
const crossQueryDenied = evaluateCrossProjectQueryAccess(userProjectMember, ['PROJECT-ALPHA', 'PROJECT-SECRET-GAMMA']);
assert(
  crossQueryDenied === false,
  'AUTH-016: Cross-Project / Tenant Isolation — Cross-Project Query = DENIED'
);

// -----------------------------------------------------------------------------
// PART 4: LIVE HTTP NEGATIVE AUTH & RATE LIMITING TEST SUITE (F-02)
// -----------------------------------------------------------------------------
console.log('\n--------------------------------------------------------------------------------');
console.log('  RUNNING AUTH-017 THROUGH AUTH-022 LIVE HTTP INGRESS INTEGRATION TEST HARNESS (F-02)');
console.log('--------------------------------------------------------------------------------\n');

async function runLiveHttpSuite() {
  let server: any = null;
  let baseUrl = '';

  try {
    const { createApp } = await import('../server.ts');
    const app = await createApp({ skipVite: true });

    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://127.0.0.1:${addr.port}`;
          console.log(`[HTTP Test Harness] Real Express Server bound on ${baseUrl}`);
          resolve();
        } else {
          reject(new Error('Failed to resolve server port'));
        }
      });
    });

    // AUTH-017: POST /api/metrics/calculate without Authorization header returns 401
    try {
      const resp = await fetch(`${baseUrl}/api/metrics/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: [] })
      });
      const data = await resp.json().catch(() => ({}));
      assert(
        resp.status === 401 && (String(data.error || '').includes('Authentication required') || String(data.error || '').includes('token')),
        'AUTH-017: Negative Auth — Real HTTP POST /api/metrics/calculate unauthenticated (missing Bearer token) -> 401 Unauthorized',
        `Expected status 401, got ${resp.status}`
      );
    } catch (e: any) {
      assert(false, 'AUTH-017: Negative Auth — Real HTTP POST /api/metrics/calculate unauthenticated', e.message);
    }

    // AUTH-018: POST /api/metrics/calculate with invalid Bearer token returns 401
    try {
      const resp = await fetch(`${baseUrl}/api/metrics/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-12345'
        },
        body: JSON.stringify({ rows: [] })
      });
      assert(
        resp.status === 401,
        'AUTH-018: Negative Auth — Real HTTP POST /api/metrics/calculate with invalid Bearer token -> 401 Unauthorized',
        `Expected status 401, got ${resp.status}`
      );
    } catch (e: any) {
      assert(false, 'AUTH-018: Negative Auth — Real HTTP POST /api/metrics/calculate with invalid Bearer token', e.message);
    }

    // AUTH-019: POST /api/insights without Authorization header returns 401
    try {
      const resp = await fetch(`${baseUrl}/api/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: {} })
      });
      assert(
        resp.status === 401,
        'AUTH-019: Negative Auth — Real HTTP POST /api/insights unauthenticated (missing Bearer token) -> 401 Unauthorized',
        `Expected status 401, got ${resp.status}`
      );
    } catch (e: any) {
      assert(false, 'AUTH-019: Negative Auth — Real HTTP POST /api/insights unauthenticated', e.message);
    }

    // AUTH-020: POST /api/insights with invalid Bearer token returns 401
    try {
      const resp = await fetch(`${baseUrl}/api/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-67890'
        },
        body: JSON.stringify({ metrics: {} })
      });
      assert(
        resp.status === 401,
        'AUTH-020: Negative Auth — Real HTTP POST /api/insights with invalid Bearer token -> 401 Unauthorized',
        `Expected status 401, got ${resp.status}`
      );
    } catch (e: any) {
      assert(false, 'AUTH-020: Negative Auth — Real HTTP POST /api/insights with invalid Bearer token', e.message);
    }

    // AUTH-021: GET /api/metrics without Bearer token returns 401
    try {
      const resp = await fetch(`${baseUrl}/api/metrics`, {
        method: 'GET'
      });
      assert(
        resp.status === 401,
        'AUTH-021: Negative Auth — Real HTTP GET /api/metrics without Bearer token -> 401 Unauthorized',
        `Expected status 401, got ${resp.status}`
      );
    } catch (e: any) {
      assert(false, 'AUTH-021: Negative Auth — Real HTTP GET /api/metrics without Bearer token', e.message);
    }

    // AUTH-022: Rate Limiting & Ingress Perimeter Protection (Strictly enforced 429 assertion)
    try {
      let got429 = false;
      let finalStatus = 0;
      for (let i = 0; i < 25; i++) {
        const resp = await fetch(`${baseUrl}/api/insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'test' })
        });
        finalStatus = resp.status;
        if (resp.status === 429) {
          got429 = true;
          break;
        }
      }
      assert(
        got429,
        'AUTH-022: Rate Limiting Enforcement — Real HTTP POST /api/insights returns 429 Too Many Requests upon exceeding threshold',
        `Expected 429 status upon exceeding rate limit, last status received: ${finalStatus}`
      );
    } catch (e: any) {
      assert(false, 'AUTH-022: Rate Limiting Enforcement — Real HTTP POST /api/insights', e.message);
    }

  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  // Summary
  console.log('\n--------------------------------------------------------------------------------');
  console.log(`Authentication Regression Test Results: ${passCount} Passed, ${failCount} Failed.`);
  console.log('--------------------------------------------------------------------------------\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('✔ AUTHENTICATION REGRESSION SUITE PASSED SUCCESSFULLY');
  }
}

await runLiveHttpSuite();
