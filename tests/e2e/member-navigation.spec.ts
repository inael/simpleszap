import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const storageStatePath = (() => {
  const envPath = process.env.MEMBER_STORAGE_STATE;
  const defaultPath = '.auth/member.json';
  const candidate = envPath && fs.existsSync(envPath) ? envPath : (fs.existsSync(defaultPath) ? defaultPath : undefined);
  return candidate;
})();

test.describe('Navegação Member (histórias UI + permissão)', () => {
  test.skip(!storageStatePath, 'MEMBER_STORAGE_STATE requerido (.auth/member.json)');
  test.use({ storageState: storageStatePath! });

  test('Sidebar operacional — visitar todas as seções não-admin', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);

    const routes = [
      { label: 'Instâncias', href: '/dashboard/instances' },
      { label: 'Mensagens', href: '/dashboard/messages' },
      { label: 'Contatos', href: '/dashboard/contacts' },
      { label: 'Templates', href: '/dashboard/templates' },
      { label: 'Webhooks', href: '/dashboard/webhooks' },
      { label: 'Campanhas', href: '/dashboard/campaigns' },
      { label: 'Chaves de API', href: '/dashboard/api-keys' },
      { label: 'Assinatura', href: '/dashboard/subscription' },
      { label: 'Configurações', href: '/dashboard/settings' },
    ];

    for (const r of routes) {
      await test.step(`Abrir ${r.label}`, async () => {
        await page.getByRole('link', { name: r.label }).click();
        await expect(page).toHaveURL(new RegExp(`${r.href}(/.*)?$`));
      });
    }
  });

  test('Permissão — não ver seção Administração e bloquear /dashboard/admin', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Administração')).toHaveCount(0);
    await expect(page.locator('text=Painel Admin')).toHaveCount(0);

    await page.goto('/dashboard/admin');
    await expect(page).not.toHaveURL(/\/dashboard\/admin(\/.*)?$/);
  });
});

