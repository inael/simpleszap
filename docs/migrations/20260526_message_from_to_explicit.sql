-- Adiciona colunas explícitas pra evitar ambiguidade do `to` legado.
-- to: legado, continua sendo "o outro lado" (compat).
-- toNumber: destinatário (preenchido só em direction=sent).
-- fromNumber: remetente (preenchido só em direction=received).
ALTER TABLE "Message" ADD COLUMN "toNumber" TEXT;
ALTER TABLE "Message" ADD COLUMN "fromNumber" TEXT;

-- Backfill: pra registros existentes, copiar `to` pro campo apropriado.
UPDATE "Message" SET "toNumber" = "to" WHERE "direction" = 'sent';
UPDATE "Message" SET "fromNumber" = "to" WHERE "direction" = 'received';

-- Como aplicar em produção:
-- 1. Conectar via psql no DB Postgres de produção SimplesZap (DATABASE_URL)
-- 2. Executar este arquivo SQL
-- 3. Após aplicar, redeploy do Vercel pra Prisma client gerar com toNumber/fromNumber
