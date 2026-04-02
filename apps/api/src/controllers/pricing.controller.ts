import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class PricingController {
  static async getPlans(req: Request, res: Response) {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' }
      });

      const formattedPlans = plans.map((plan: any) => ({
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
      const fallbackPlans = [
        {
          id: 'starter',
          name: 'Starter',
          description: 'Para começar',
          pricing: { monthly: 0, annual: 0, currency: 'BRL', annualDiscount: 0 },
          limits: { messagesPerDay: 100, instancesLimit: 1 },
          features: { hasWebhooks: false, hasTemplates: false, hasSmsIncluded: false },
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'Para empresas em crescimento',
          pricing: { monthly: 89, annual: 89 * 12, currency: 'BRL', annualDiscount: 0 },
          limits: { messagesPerDay: 1000, instancesLimit: 3 },
          features: { hasWebhooks: true, hasTemplates: true, hasSmsIncluded: false },
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'Para alto volume',
          pricing: { monthly: 0, annual: 0, currency: 'BRL', annualDiscount: 0 },
          limits: { messagesPerDay: -1, instancesLimit: 10 },
          features: { hasWebhooks: true, hasTemplates: true, hasSmsIncluded: false },
        },
      ];

      res.status(200).json({
        plans: fallbackPlans,
        updatedAt: new Date().toISOString(),
        degraded: true,
      });
    }
  }
}
