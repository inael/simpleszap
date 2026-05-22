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

      // Best-effort processing: update subscription status
      try {
        const evt = String(payload?.event || '').toUpperCase();
        const paymentStatus = payload?.payment?.status || payload?.status;
        const confirmed = String(paymentStatus || '').toUpperCase().includes('CONFIRMED') || String(paymentStatus || '').toUpperCase().includes('RECEIVED');
        const cancelled = evt.includes('CANCEL') || evt.includes('REFUND') || String(paymentStatus || '').toUpperCase().includes('REFUND');

        const externalReference =
          payload?.payment?.externalReference ||
          payload?.subscription?.externalReference ||
          payload?.externalReference;
        const nextDueDate = payload?.subscription?.nextDueDate || payload?.payment?.nextDueDate || payload?.payment?.dueDate;
        const paidUntil = nextDueDate ? new Date(nextDueDate) : null;

        // === Modelo elástico novo: externalReference = "instance:UUID" ou "addon:UUID" ===
        if (typeof externalReference === 'string') {
          const m = externalReference.match(/^(instance|addon):([0-9a-f-]+)$/i);
          if (m) {
            const [, kind, id] = m;
            if (kind === 'instance') {
              if (confirmed) {
                await prisma.instance.update({
                  where: { id },
                  data: { subscriptionStatus: 'active', paidUntil },
                }).catch(() => {});
              } else if (cancelled) {
                await prisma.instance.update({
                  where: { id },
                  data: { subscriptionStatus: 'canceled' },
                }).catch(() => {});
              }
            } else if (kind === 'addon') {
              if (confirmed) {
                await prisma.messageAddon.update({
                  where: { id },
                  data: { status: 'active', paidUntil },
                }).catch(() => {});
              } else if (cancelled) {
                await prisma.messageAddon.update({
                  where: { id },
                  data: { status: 'canceled', cancelledAt: new Date() },
                }).catch(() => {});
              }
            }
          }
        }

        // === Legacy: description com "sz|uid:X|plan:Y" — mantém pra subs antigas ===
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
              data: { subscriptionPlanId: planId, trialEndsAt: null }
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
