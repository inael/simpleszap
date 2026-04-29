import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CouponService } from '../services/coupon.service';

export class CouponController {
  /** POST /coupons/validate — autenticado. Body: { code, planId, cycle } */
  static async validate(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { code, planId, cycle } = req.body || {};
      if (!code || !planId) return res.status(400).json({ error: 'code e planId obrigatórios' });

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });

      const effectiveCycle = (cycle || 'MONTHLY') as 'MONTHLY' | 'YEARLY';
      const originalValue = effectiveCycle === 'YEARLY'
        ? Number(plan.priceAnnual)
        : Number(plan.priceMonthly);

      const result = await CouponService.validate({
        code: String(code),
        planId,
        cycle: effectiveCycle,
        userId,
        originalValue,
      });

      if (!result.valid) {
        return res.status(400).json({ valid: false, reason: result.reason });
      }
      return res.json(result);
    } catch (e: any) {
      console.error('coupon.validate error:', e);
      res.status(500).json({ error: e.message || 'Internal error' });
    }
  }
}
