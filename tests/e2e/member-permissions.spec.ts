import { test, expect, Page } from '@playwright/test';

async function loginAsMember(page: Page) {
  await page.goto('/');

  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForSelector('input[name="identifier"]', { timeout: 15000 });

  await page.fill('input[name="identifier"]', process.env.MEMBER_EMAIL || '');
  await page.getByRole('button', { name: /continue/i }).click();

  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', process.env.MEMBER_PASSWORD || '');
  await page.getByRole('button', { name: /continue/i }).click();

  await page.waitForURL(/dashboard|create-organization/, { timeout: 20000 });
}

test.describe('Permissões Member', () => {
  const storageStatePath = process.env.MEMBER_STORAGE_STATE;
  test.skip(!storageStatePath && !process.env.MEMBER_PASSWORD, 'MEMBER_STORAGE_STATE or MEMBER_PASSWORD env var required');

  if (storageStatePath) {
    test.use({ storageState: storageStatePath });
  }

  test.beforeEach(async ({ page }) => {
    if (!storageStatePath) {
      await loginAsMember(page);
    }
  });

  test('não deve ver seção Administração na sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Administração')).toHaveCount(0);
    await expect(page.locator('text=Painel Admin')).toHaveCount(0);
  });

  test('não deve acessar /dashboard/admin', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);
  });
});

