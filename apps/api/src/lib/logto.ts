import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URI = process.env.LOGTO_JWKS_URI || 'https://auth.toolpad.cloud/oidc/jwks';
const ISSUER = process.env.LOGTO_ISSUER || 'https://auth.toolpad.cloud/oidc';
const AUDIENCE = process.env.LOGTO_API_RESOURCE || 'https://back.simpleszap.com/api';

const jwks = createRemoteJWKSet(new URL(JWKS_URI));

export interface LogtoAuth {
  sub: string;        // Logto user ID
  scope?: string;
  roles?: string[];
  email?: string;
}

export async function verifyLogtoToken(token: string): Promise<LogtoAuth | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
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
