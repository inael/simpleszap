import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EnforcementService } from '../services/enforcement.service';

export class MeController {
  static async subscription(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await prisma.user.findUnique({
        where: { logtoId: userId },
        include: { subscriptionPlan: true },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const now = new Date();
      const trialActive = !!(user.trialEndsAt && user.trialEndsAt > now);
      const trialExpired = !!(user.trialEndsAt && user.trialEndsAt <= now);
      const hasPaid = !!user.asaasCustomerId;
      const effectiveStatus =
        hasPaid && !trialActive ? 'paid'
        : trialActive ? 'trial'
        : trialExpired ? 'free_after_trial'
        : 'free';

      const limits = await EnforcementService.getLimitsForOrg(userId);

      return res.json({
        plan: user.subscriptionPlan
          ? {
              id: user.subscriptionPlan.id,
              name: user.subscriptionPlan.name,
              priceMonthly: Number(user.subscriptionPlan.priceMonthly),
              priceAnnual: Number(user.subscriptionPlan.priceAnnual),
              instancesLimit: user.subscriptionPlan.instancesLimit,
              messagesPerDay: user.subscriptionPlan.messagesPerDay,
            }
          : null,
        trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
        trialActive,
        status: effectiveStatus,
        limits,
        hasPaid,
      });
    } catch (e: any) {
      console.error('me.subscription error:', e);
      res.status(500).json({ error: e?.message || 'Internal error' });
    }
  }
}
