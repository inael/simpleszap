import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { SettingsService, SETTING_KEYS } from '../services/settings.service';

export class AsaasWebhookController {
  static async handle(req: Request, res: Response) {
    const expectedToken = await SettingsService.get(SETTING_KEYS.ASAAS_WEBHOOK_TOKEN);
    if (expectedToken) {
      const receivedToken = req.header('asaas-access-token');
      if (!receivedToken || receivedToken !== expectedToken) {
        return res.status(401).json({ ok: false });
      }
    }

    const payload = req.body as any;
    try {
      await prisma.auditLog.create({ data: { orgId: 'global', actorId: 'asaas', action: 'WEBHOOK_RECEIVED', data: payload ? JSON.stringify(payload).slice(0, 8000) : '{}' } }).catch(() => {});

      // Best-effort processing: update subscription status and user's plan on payment confirmation
      try {
        const paymentStatus = payload?.payment?.status || payload?.status;
        const confirmed = String(paymentStatus || '').toUpperCase().includes('CONFIRMED') || String(paymentStatus || '').toUpperCase().includes('RECEIVED');
        if (confirmed) {
          const description =
            payload?.payment?.description ||
            payload?.subscription?.description ||
            payload?.subscriptionDescription ||
            payload?.paymentDescription;

          const match = typeof description === 'string'
            ? description.match(/sz\|uid:([^|]+)\|plan:([^|]+)\|cycle:(MONTHLY|YEARLY)/i)
            : null;

          if (match) {
            const [, userId, planId] = match;
            await prisma.user.update({
              where: { logtoId: userId },
              data: { subscriptionPlanId: planId }
            }).catch(() => {});
          }
        }
      } catch {}

      res.status(200).json({ ok: true });
    } catch (error: any) {
      res.status(200).json({ ok: true });
    }
  }
}
