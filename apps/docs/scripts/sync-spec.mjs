#!/usr/bin/env node
/**
 * Copia docs/api/openapi.yaml (raiz do monorepo) pra apps/docs/public/openapi.yaml
 * Rodado automaticamente em predev e prebuild.
 *
 * Por que copiar em vez de symlink: Windows não cria symlinks sem admin
 * e o Vercel build não preserva symlinks confiavelmente.
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..', '..');
const src = join(root, 'docs', 'api', 'openapi.yaml');
const dest = join(__dirname, '..', 'public', 'openapi.yaml');

if (!existsSync(src)) {
  console.error(`[sync-spec] FATAL: ${src} not found`);
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`[sync-spec] ${src} → ${dest}`);
