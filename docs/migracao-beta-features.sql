-- ============================================================
-- Migração: tabela beta_feature_acceptances
-- ============================================================
-- DB: prod simpleszap (Supabase self-hosted, supabase.toolpad.cloud)
-- Como aplicar: cole no SQL Editor do Supabase, conecte no DB "simpleszap"
-- (não no "postgres" compartilhado) e rode.
-- Data: 2026-05-22
--
-- Cria registro de aceitação de termos de uso por feature beta. Cada user
-- pode aceitar/revogar features individualmente. termsVersion vincula a
-- aceitação a uma versão específica do termo (mudanças invalidam a anterior).
-- ============================================================

BEGIN;

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

-- Verificação
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'beta_feature_acceptances'
ORDER BY ordinal_position;

COMMIT;
