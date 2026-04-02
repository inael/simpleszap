import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const storageStatePath = '.auth/member.json';
test.skip(!fs.existsSync(storageStatePath), '.auth/member.json requerido para demo');
test.use({ storageState: storageStatePath });

test('Demo (História PERM-MEM-001): Member não acessa Admin', async ({ page }) => {
  await test.step('Acessar dashboard como Member', async () => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);
    await page.waitForTimeout(600);
  });

  await test.step('Verificar que a seção Administração não aparece', async () => {
    await expect(page.locator('text=Administração')).toHaveCount(0);
    await expect(page.locator('text=Painel Admin')).toHaveCount(0);
    await page.waitForTimeout(600);
  });

  await test.step('Tentar acessar /dashboard/admin e validar bloqueio', async () => {
    await page.goto('/dashboard/admin');
    await expect(page).not.toHaveURL(/\/dashboard\/admin(\/.*)?$/);
    await page.waitForTimeout(600);
  });
});
