import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const storageStatePath = (() => {
  const envPath = process.env.ADMIN_STORAGE_STATE;
  const defaultPath = '.auth/admin.json';
  const candidate = envPath && fs.existsSync(envPath) ? envPath : (fs.existsSync(defaultPath) ? defaultPath : undefined);
  if (!candidate) return undefined;
  try {
    const json = JSON.parse(fs.readFileSync(candidate, 'utf8'));
    const cookies = Array.isArray(json?.cookies) ? json.cookies : [];
    const hasSession = cookies.some((c: any) => c?.name === '__session');
    return hasSession ? candidate : undefined;
  } catch {
    return undefined;
  }
})();

test.describe('Navegação Admin (histórias UI + permissão)', () => {
  test.skip(!storageStatePath, 'ADMIN_STORAGE_STATE válido requerido (.auth/admin.json com __session)');
  test.use({ storageState: storageStatePath! });

  test('Painel Admin — visitar seção principal', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/dashboard\/admin(\/.*)?$/);
    await expect(page.locator('text=Painel Administrativo')).toBeVisible();
  });

  test('Admin — visitar subseções (Planos, Usuários, Logs, Config. Sistema)', async ({ page }) => {
    const routes = [
      { label: 'Planos', href: '/dashboard/admin/plans', expectText: 'Planos' },
      { label: 'Usuários', href: '/dashboard/admin/users', expectText: 'Usuários' },
      { label: 'Logs de Auditoria', href: '/dashboard/admin/audit-logs', expectText: 'Logs' },
      { label: 'Config. Sistema', href: '/dashboard/admin/settings', expectText: 'Config' },
    ];

    for (const r of routes) {
      await test.step(`Abrir ${r.label}`, async () => {
        await page.getByRole('link', { name: r.label }).click();
        await expect(page).toHaveURL(new RegExp(`${r.href}(/.*)?$`));
      });
    }
  });
});

