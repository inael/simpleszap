import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URI = process.env.LOGTO_JWKS_URI || 'https://auth.toolpad.cloud/oidc/jwks';
const ISSUER = process.env.LOGTO_ISSUER || 'https://auth.toolpad.cloud/oidc';
const AUDIENCE = process.env.LOGTO_API_RESOURCE || 'https://back.simpleszap.com/api';
const ADMIN_ENDPOINT = process.env.LOGTO_ADMIN_ENDPOINT || '';
const MAIN_ENDPOINT = process.env.LOGTO_ENDPOINT || 'https://auth.toolpad.cloud';
const M2M_ID = process.env.LOGTO_M2M_ID || '';
const M2M_SECRET = process.env.LOGTO_M2M_SECRET || '';
const MANAGEMENT_RESOURCE = process.env.LOGTO_MANAGEMENT_RESOURCE || 'https://default.logto.app/api';

const jwks = createRemoteJWKSet(new URL(JWKS_URI));

export interface LogtoAuth {
  sub: string;
  scope?: string;
  roles?: string[];
  email?: string;
}

export interface LogtoUser {
  id: string;
  name: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
}

export async function verifyLogtoToken(token: string): Promise<LogtoAuth | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: ISSUER, audience: AUDIENCE });
    return {
      sub: payload.sub as string,
      scope: payload.scope as string,
      roles: (payload.roles as string[]) || [],
      email: payload.email as string,
    };
  } catch (error) {
    console.error('Logto token verification failed:', error);
    return null;
  }
}

let cachedM2mToken: { token: string; expiresAt: number } | null = null;
async function getManagementToken(): Promise<string | null> {
  if (!ADMIN_ENDPOINT || !M2M_ID || !M2M_SECRET) return null;
  const now = Date.now();
  if (cachedM2mToken && cachedM2mToken.expiresAt > now + 30_000) return cachedM2mToken.token;
  try {
    const auth = Buffer.from(`${M2M_ID}:${M2M_SECRET}`).toString('base64');
    const r = await fetch(`${ADMIN_ENDPOINT}/oidc/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&resource=${encodeURIComponent(MANAGEMENT_RESOURCE)}&scope=all`,
    });
    if (!r.ok) return null;
    const j = await r.json() as { access_token?: string; expires_in?: number };
    if (!j.access_token) return null;
    cachedM2mToken = { token: j.access_token, expiresAt: now + (j.expires_in || 3600) * 1000 };
    return j.access_token;
  } catch (e) {
    console.error('getManagementToken failed:', e);
    return null;
  }
}

export async function fetchLogtoUser(sub: string): Promise<LogtoUser | null> {
  const tok = await getManagementToken();
  if (!tok) return null;
  try {
    const r = await fetch(`${MAIN_ENDPOINT}/api/users/${sub}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (!r.ok) return null;
    return await r.json() as LogtoUser;
  } catch (e) {
    console.error('fetchLogtoUser failed:', e);
    return null;
  }
}
