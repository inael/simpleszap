import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('deve carregar a página principal', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SimplesZap/);
  });

  test('deve exibir o hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=SimplesZap')).toBeVisible();
  });

  test('deve exibir botão de login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('deve exibir seção de preços', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Starter')).toBeVisible();
  });
});
