-- ============================================================
-- Migração cirúrgica: admin itbooster.global@gmail.com + plano Interno
-- ============================================================
-- DB: prod (back.simpleszap.com)
-- Como aplicar: cole no SQL Editor do Supabase de prod e rode.
-- Data: 2026-05-20
--
-- ATENÇÃO: este DB tem 80+ tabelas no schema public (outros produtos
-- IT Booster misturados). Este script só toca em "User",
-- "subscription_plans" e "ApiKey". NÃO usar prisma db push neste DB.
-- ============================================================

BEGIN;

-- ============================================================
-- PARTE 1 — Adicionar colunas faltantes em User
-- ============================================================
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "trialEndsAt"             TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "asaasCustomerId"         TEXT,
  ADD COLUMN IF NOT EXISTS "cpfCnpj"                 TEXT,
  ADD COLUMN IF NOT EXISTS "manualSubscriptionUntil" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "manualPlanReason"        TEXT;

-- ============================================================
-- PARTE 2 — Criar/atualizar plano "Interno" (ilimitado)
-- ============================================================
INSERT INTO "subscription_plans" (
  id, name, description,
  "priceMonthly", "priceAnnual",
  "messagesPerDay", "instancesLimit",
  "hasWebhooks", "hasTemplates", "hasSmsIncluded",
  "isActive", "displayOrder",
  "createdAt", "updatedAt"
) VALUES (
  'interno',
  'Interno IT Booster',
  'Plano para contas internas IT Booster — sem cobrança, sem limite. Usado por integrações via API key.',
  0, 0,
  -1, -1,
  true, true, true,
  true, 999,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "messagesPerDay"=EXCLUDED."messagesPerDay",
  "instancesLimit"=EXCLUDED."instancesLimit",
  description=EXCLUDED.description,
  "updatedAt"=NOW();

-- ============================================================
-- PARTE 3 — Linkar itbooster.global@gmail.com ao plano + cortesia perpétua
-- (filtra por email OU logtoId pra ser robusto)
-- ============================================================
UPDATE "User"
SET "subscriptionPlanId"      = 'interno',
    "manualSubscriptionUntil" = '2099-12-31 23:59:59',
    "manualPlanReason"        = 'Conta interna IT Booster — gerar API keys para integrações sem cobrança',
    "updatedAt"               = NOW()
WHERE email = 'itbooster.global@gmail.com'
   OR "logtoId" = '012oofzkh9k1';

-- ============================================================
-- PARTE 4 — Limpar API keys duplicadas (manter só "assina-agora")
-- Roda DEPOIS de você conferir o SELECT abaixo. Comente esse DELETE
-- e rode primeiro só o SELECT pra ver o que vai ser apagado.
-- ============================================================

-- PREVIEW (sempre rode antes de descomentar o DELETE):
SELECT id, name, key, "createdAt"
FROM "ApiKey"
WHERE "orgId" = '012oofzkh9k1'
  AND name IS DISTINCT FROM 'assina-agora'
ORDER BY "createdAt" DESC;

-- DELETE real (DESCOMENTE quando estiver tranquilo):
-- DELETE FROM "ApiKey"
-- WHERE "orgId" = '012oofzkh9k1'
--   AND name IS DISTINCT FROM 'assina-agora';

-- ============================================================
-- PARTE 5 — Verificação final
-- ============================================================
SELECT
  id, email, name, "logtoId",
  "subscriptionPlanId",
  "manualSubscriptionUntil",
  "manualPlanReason"
FROM "User"
WHERE email = 'itbooster.global@gmail.com'
   OR "logtoId" = '012oofzkh9k1';

SELECT id, name, key, "createdAt"
FROM "ApiKey"
WHERE "orgId" = '012oofzkh9k1'
ORDER BY "createdAt" DESC;

COMMIT;

-- ============================================================
-- ROLLBACK manual (se algo der errado, antes do COMMIT):
--   ROLLBACK;
-- ============================================================
