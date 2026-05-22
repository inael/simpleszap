import { Response } from 'express';
import { EnforcementCheck } from '../services/enforcement.service';

const UPGRADE_URL = process.env.SIMPLESZAP_UPGRADE_URL || 'https://simpleszap.com/dashboard/subscription';
const SUPPORT_URL = process.env.SIMPLESZAP_SUPPORT_URL || 'https://simpleszap.com/contato';

type DeniedCheck = Extract<EnforcementCheck, { allowed: false }>;

const MESSAGES: Record<DeniedCheck['code'], { httpStatus: number; pt: (c: DeniedCheck) => string; en: (c: DeniedCheck) => string }> = {
  PLAN_INSTANCE_LIMIT_REACHED: {
    httpStatus: 403,
    pt: (c) => `Limite de instâncias atingido no seu plano (${c.current}/${c.limit}). Faça upgrade para conectar mais números.`,
    en: (c) => `Instance limit reached on your plan (${c.current}/${c.limit}). Upgrade to connect more numbers.`,
  },
  INSTANCE_LIMIT_REACHED: {
    httpStatus: 403,
    pt: (c) => `Limite de instâncias atingido (${c.current}/${c.limit}).`,
    en: (c) => `Instance limit reached (${c.current}/${c.limit}).`,
  },
  PLAN_DAILY_MESSAGE_LIMIT_REACHED: {
    httpStatus: 429,
    pt: (c) => `Limite diário de mensagens atingido (${c.current}/${c.limit}). Compre um lote de +100 msgs/dia (R$15/mês) ou aguarde até amanhã.`,
    en: (c) => `Daily message limit reached (${c.current}/${c.limit}). Buy a +100 msgs/day add-on (R$15/mo) or wait until tomorrow.`,
  },
  NEED_SUBSCRIPTION: {
    httpStatus: 402,
    pt: () => `Essa instância precisa de assinatura ativa pra enviar mensagens. R$59/mês por instância, com 300 msgs/dia incluídas. Configure em Assinatura.`,
    en: () => `This instance needs an active subscription to send messages. R$59/mo per instance, 300 msgs/day included. Set up in Subscription.`,
  },
};

/**
 * Responde com payload estruturado de erro de limite. Usado por controllers
 * que consomem EnforcementService — payload é o mesmo formato que o AssinaAgora
 * (e outros consumidores) podem mostrar direto pro usuário final.
 */
export function respondEnforcementDenied(res: Response, check: DeniedCheck) {
  const cfg = MESSAGES[check.code];
  return res.status(cfg.httpStatus).json({
    error: {
      code: check.code,
      message: cfg.pt(check),
      messageEn: cfg.en(check),
      limit: check.limit,
      current: check.current,
      planId: check.planId,
      upgradeUrl: UPGRADE_URL,
      supportUrl: SUPPORT_URL,
    },
  });
}
