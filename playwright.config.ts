import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 1,
  timeout: 60000,
  use: {
    baseURL: process.env.BASE_URL || 'https://www.simpleszap.com',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: (() => {
    const projects = [
      {
        name: 'chromium',
        use: { browserName: 'chromium' },
      },
    ];

    if (process.env.PLAYWRIGHT_CHROME === '1') {
      projects.push({
        name: 'chrome',
        use: {
          browserName: 'chromium',
          channel: 'chrome',
          launchOptions: { slowMo: 200 },
        },
      });
    }

    return projects;
  })(),
  reporter: [['list'], ['html', { open: 'never' }]],
});
