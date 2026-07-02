-- Cortesia VIP para Editora Sorian (piloto). Bypassa limite Free e gate de
-- assinatura por 12 meses. enforcement.service: vip = manualSubscriptionUntil > now.
UPDATE "User"
SET
  "manualSubscriptionUntil" = NOW() + INTERVAL '12 months',
  "manualPlanReason" = 'Cortesia piloto Editora Sorian (1a integracao real)'
WHERE email = 'agenda@consultoriasorian.com';
