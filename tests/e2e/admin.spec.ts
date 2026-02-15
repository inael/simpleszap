import { test, expect, Page } from '@playwright/test';

// Helper para login via Clerk
async function loginAsAdmin(page: Page) {
  await page.goto('/');

  // Clicar no botão Login
  await page.getByRole('button', { name: /login/i }).click();

  // Esperar o modal do Clerk abrir
  await page.waitForSelector('input[name="identifier"]', { timeout: 15000 });

  // Preencher email
  await page.fill('input[name="identifier"]', process.env.ADMIN_EMAIL || 'inael.rodrigues@gmail.com');
  await page.getByRole('button', { name: /continue/i }).click();

  // Esperar campo de senha
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || '');
  await page.getByRole('button', { name: /continue/i }).click();

  // Esperar redirecionamento para dashboard
  await page.waitForURL(/dashboard|create-organization/, { timeout: 20000 });
}

test.describe('Admin Dashboard', () => {
  test.skip(!process.env.ADMIN_PASSWORD, 'ADMIN_PASSWORD env var required');

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('deve acessar o painel admin', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page.locator('text=Painel Administrativo')).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir KPI cards no painel admin', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page.locator('text=Total de Usuários')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Instâncias Ativas')).toBeVisible();
    await expect(page.locator('text=Mensagens Hoje')).toBeVisible();
    await expect(page.locator('text=Planos Ativos')).toBeVisible();
  });

  test('deve acessar a página de planos', async ({ page }) => {
    await page.goto('/dashboard/admin/plans');
    await expect(page.locator('text=Gerenciar Planos')).toBeVisible({ timeout: 10000 });
  });

  test('deve acessar a página de usuários', async ({ page }) => {
    await page.goto('/dashboard/admin/users');
    await expect(page.locator('text=Usuários')).toBeVisible({ timeout: 10000 });
  });

  test('deve acessar a página de logs', async ({ page }) => {
    await page.goto('/dashboard/admin/audit-logs');
    await expect(page.locator('text=Logs de Auditoria')).toBeVisible({ timeout: 10000 });
  });

  test('deve acessar as configurações do sistema', async ({ page }) => {
    await page.goto('/dashboard/admin/settings');
    await expect(page.locator('text=Configurações do Sistema')).toBeVisible({ timeout: 10000 });
  });

  test('sidebar deve mostrar seção Administração', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Administração')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Painel Admin')).toBeVisible();
  });
});
