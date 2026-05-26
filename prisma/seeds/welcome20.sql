-- Cupom WELCOME20 (20% off no 1º mês) usado pelo flow de upsell pós-recusa
-- de assinatura em /dashboard/instances. Idempotente.
INSERT INTO coupons (
  id, code, "percentOff", description, "validFrom", "timesUsed", "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'WELCOME20',
  20,
  'Boas-vindas — 20% off no 1º mês (oferta pós-recusa de upgrade)',
  NOW(),
  0,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  "percentOff" = 20,
  description = EXCLUDED.description,
  "updatedAt" = NOW();
