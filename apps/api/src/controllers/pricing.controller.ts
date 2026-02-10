import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class PricingController {
  static async getPlans(req: Request, res: Response) {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' }
      });

      const formattedPlans = plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        pricing: {
          monthly: Number(plan.priceMonthly),
          annual: Number(plan.priceAnnual),
          currency: 'BRL',
          annualDiscount: Number(plan.priceMonthly) > 0 
            ? Math.round((1 - Number(plan.priceAnnual) / Number(plan.priceMonthly)) * 100)
            : 0
        },
        limits: {
          messagesPerDay: plan.messagesPerDay,
          instancesLimit: plan.instancesLimit,
        },
        features: {
          hasWebhooks: plan.hasWebhooks,
          hasTemplates: plan.hasTemplates,
          hasSmsIncluded: plan.hasSmsIncluded
        }
      }));

      res.json({
        plans: formattedPlans,
        updatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
