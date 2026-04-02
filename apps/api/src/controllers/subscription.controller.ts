import { Request, Response } from 'express';
import { AsaasService } from '../services/asaas.service';
import { prisma } from '../lib/prisma';

export class SubscriptionController {
  static async createCheckout(req: Request, res: Response) {
    const { planId, cycle, method } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const customer = await AsaasService.createCustomer({
        name: user.name || user.email,
        email: user.email
      });

      const value = cycle === 'YEARLY' ? Number(plan.priceAnnual) : Number(plan.priceMonthly);
      
      const effectiveCycle = (cycle || 'MONTHLY') as 'MONTHLY' | 'YEARLY';
      const encoded = `sz|uid:${user.id}|plan:${plan.id}|cycle:${effectiveCycle}`;

      const subscription = await AsaasService.createSubscription(
        customer.id,
        value,
        effectiveCycle,
        `SimplesZap ${plan.name} [${encoded}]`,
        (method as 'PIX' | 'BOLETO' | 'CREDIT_CARD') || 'PIX'
      );

      let firstPayment: any | undefined;
      for (let attempt = 0; attempt < 10; attempt++) {
        const payments = await AsaasService.listSubscriptionPayments(subscription.id);
        if (payments.length > 0) {
          firstPayment = payments[0];
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      res.json({ 
        subscriptionId: subscription.id,
        paymentId: firstPayment?.id,
        paymentLink: firstPayment?.invoiceUrl || firstPayment?.bankSlipUrl,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
