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
  PLAN_DAILY_MESSAGE_LIMIT_REACHED: {
    httpStatus: 429,
    pt: (c) => `Limite diário de mensagens atingido (${c.current}/${c.limit}). Faça upgrade ou aguarde até amanhã.`,
    en: (c) => `Daily message limit reached (${c.current}/${c.limit}). Upgrade your plan or wait until tomorrow.`,
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
