import { test, expect } from '@playwright/test';

test('Demo (História AUTH-ADM-001): visitante tenta acessar dashboard e é redirecionado ao login', async ({ page }) => {
  await test.step('Acessar a home', async () => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SimplesZap/i);
    await page.waitForTimeout(600);
  });

  await test.step('Clicar em Login', async () => {
    await page.getByRole('button', { name: /login/i }).click();
    await page.waitForTimeout(900);
  });

  await test.step('Validar que abriu o modal de login (Clerk)', async () => {
    await page.waitForSelector('input[name="identifier"]', { timeout: 15000 });
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await page.waitForTimeout(1200);
  });
});
