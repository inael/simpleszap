import { defineConfig } from '@playwright/test';

const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || process.env.VERCEL_PROTECTION_BYPASS;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 1,
  timeout: 60000,
  use: {
    baseURL: process.env.BASE_URL || 'https://www.simpleszap.com',
    extraHTTPHeaders: protectionBypass
      ? {
          'x-vercel-protection-bypass': protectionBypass,
          'x-vercel-set-bypass-cookie': 'true',
        }
      : undefined,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
});
