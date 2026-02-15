import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {
  test('deve redirecionar /dashboard para login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard');
    // Clerk should redirect to sign-in
    await page.waitForURL(/sign-in|clerk/, { timeout: 15000 });
    expect(page.url()).toContain('sign-in');
  });

  test('deve redirecionar /create-organization para login quando não autenticado', async ({ page }) => {
    await page.goto('/create-organization');
    await page.waitForURL(/sign-in|clerk/, { timeout: 15000 });
    expect(page.url()).toContain('sign-in');
  });

  test('deve redirecionar /dashboard/admin para login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await page.waitForURL(/sign-in|clerk/, { timeout: 15000 });
    expect(page.url()).toContain('sign-in');
  });
});
