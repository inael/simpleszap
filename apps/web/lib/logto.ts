import type { LogtoNextConfig } from '@logto/next';
import { headers } from 'next/headers';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function buildLogtoConfig(baseUrl: string): LogtoNextConfig {
  return {
    endpoint: process.env.LOGTO_ENDPOINT!,
    appId: process.env.LOGTO_APP_ID!,
    appSecret: process.env.LOGTO_APP_SECRET!,
    baseUrl: normalizeBaseUrl(baseUrl),
    cookieSecret: process.env.LOGTO_COOKIE_SECRET!,
    cookieSecure: process.env.NODE_ENV === 'production',
    resources: [process.env.LOGTO_API_RESOURCE || 'https://back.simpleszap.com/api'],
    scopes: ['openid', 'profile', 'email', 'roles'],
  };
}

const fallbackBaseUrl = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
);

/** Config com URL base só da env — use `createLogtoConfig` / `getLogtoConfigFromHeaders` no fluxo OIDC. */
export const logtoConfig: LogtoNextConfig = buildLogtoConfig(fallbackBaseUrl);

/** URL base da requisição atual (evita mismatch www/apex vs `NEXT_PUBLIC_APP_URL` no `redirect_uri`). */
export function createLogtoConfig(baseUrl: string): LogtoNextConfig {
  return buildLogtoConfig(baseUrl);
}

/** Para Server Components: mesma origem que o browser usou (cookies + OIDC). */
export async function getLogtoConfigFromHeaders(): Promise<LogtoNextConfig> {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL) {
    return buildLogtoConfig(fallbackBaseUrl);
  }

  const h = await headers();
  const hostRaw = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const host = hostRaw.split(',')[0].trim();

  if (!host) {
    return logtoConfig;
  }

  const protoRaw = h.get('x-forwarded-proto') ?? '';
  const protoFirst = protoRaw.split(',')[0].trim().toLowerCase();
  const isLocalhost =
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('0.0.0.0');
  const proto =
    protoFirst === 'http' || protoFirst === 'https'
      ? protoFirst
      : isLocalhost
        ? 'http'
        : 'https';

  return buildLogtoConfig(`${proto}://${host}`);
}
