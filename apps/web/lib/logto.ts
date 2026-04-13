import type { LogtoNextConfig } from '@logto/next';

export const logtoConfig: LogtoNextConfig = {
  endpoint: process.env.LOGTO_ENDPOINT!,
  appId: process.env.LOGTO_APP_ID!,
  appSecret: process.env.LOGTO_APP_SECRET!,
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  cookieSecret: process.env.LOGTO_COOKIE_SECRET!,
  cookieSecure: process.env.NODE_ENV === 'production',
  resources: [process.env.LOGTO_API_RESOURCE || 'https://back.simpleszap.com/api'],
  scopes: ['openid', 'profile', 'email', 'roles'],
};
