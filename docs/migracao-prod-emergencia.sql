-- Adiciona colunas faltantes em User (DB simpleszap, prod)
-- + cria tabela beta_feature_acceptances (preventivo, evita próximo deploy quebrar)
-- Aplicar via: docker exec supabase-db psql -U postgres -d simpleszap -f /tmp/migracao.sql

BEGIN;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "trialEndsAt"             TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "asaasCustomerId"         TEXT,
  ADD COLUMN IF NOT EXISTS "cpfCnpj"                 TEXT,
  ADD COLUMN IF NOT EXISTS "manualSubscriptionUntil" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "manualPlanReason"        TEXT;

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

UPDATE "User"
SET "subscriptionPlanId"      = 'interno',
    "manualSubscriptionUntil" = '2099-12-31 23:59:59',
    "manualPlanReason"        = 'Conta interna IT Booster — gerar API keys para integrações sem cobrança',
    "updatedAt"               = NOW()
WHERE email = 'itbooster.global@gmail.com';

CREATE TABLE IF NOT EXISTS "beta_feature_acceptances" (
  "id"           TEXT      PRIMARY KEY,
  "userId"       TEXT      NOT NULL,
  "featureKey"   TEXT      NOT NULL,
  "termsVersion" TEXT      NOT NULL,
  "acceptedAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "revokedAt"    TIMESTAMP,
  CONSTRAINT "beta_feature_acceptances_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "beta_feature_acceptances_userId_featureKey_unique"
    UNIQUE ("userId", "featureKey")
);

CREATE INDEX IF NOT EXISTS "beta_feature_acceptances_userId_idx"
  ON "beta_feature_acceptances" ("userId");

COMMIT;
