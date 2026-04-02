import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const storageStatePath = (() => {
  const envPath = process.env.MEMBER_STORAGE_STATE;
  const defaultPath = '.auth/member.json';
  const candidate =
    (envPath && fs.existsSync(envPath) && envPath) ||
    (fs.existsSync(defaultPath) && defaultPath) ||
    undefined;
  return candidate;
})();

test.describe('Assinatura (funcional)', () => {
  test.skip(!storageStatePath, 'MEMBER_STORAGE_STATE requerido (.auth/member.json)');
  test.use({ storageState: storageStatePath! });

  test('deve carregar planos e exibir limites (instâncias e msgs/dia)', async ({ page }) => {
    await page.goto('/dashboard/subscription');
    await expect(page).toHaveURL(/\/dashboard\/subscription(\/.*)?$/);

    await expect(page.locator('text=Carregando planos...')).toHaveCount(0, { timeout: 20000 });

    await expect(page.getByRole('heading', { name: /planos/i })).toBeVisible();
    await expect(page.locator('text=msgs/dia')).toHaveCount(1, { timeout: 20000 });
    await expect(page.locator('text=Instância(s)')).toHaveCount(1);

    await expect(page.getByRole('button', { name: /assinar|plano gratuito|processando/i })).toHaveCount(1);
  });
});

