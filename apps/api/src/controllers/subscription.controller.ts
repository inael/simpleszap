import { Request, Response } from 'express';
import { AsaasService } from '../services/asaas.service';
import { prisma } from '../lib/prisma';
import { getAuth } from '@clerk/express';

export class SubscriptionController {
  static async createCheckout(req: Request, res: Response) {
    const { planId, cycle, method, cpfCnpj } = req.body;
    const auth = getAuth(req);
    const clerkId = auth?.userId;

    if (!clerkId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const customer = await AsaasService.createCustomer({
        name: user.name || user.email,
        email: user.email,
        cpfCnpj: cpfCnpj && typeof cpfCnpj === 'string' ? cpfCnpj.trim().replace(/[^\d]/g, '') : undefined,
      });

      const customerId = customer?.id as string | undefined;
      if (!customerId) {
        return res.status(500).json({ error: 'Failed to create customer' });
      }

      const value = cycle === 'YEARLY' ? Number(plan.priceAnnual) : Number(plan.priceMonthly);
      
      const effectiveCycle = (cycle || 'MONTHLY') as 'MONTHLY' | 'YEARLY';
      const encoded = `sz|uid:${clerkId}|plan:${plan.id}|cycle:${effectiveCycle}`;

      const subscription = await AsaasService.createSubscription(
        customerId,
        value,
        effectiveCycle,
        `SimplesZap ${plan.name} [${encoded}]`,
        (method as 'PIX' | 'BOLETO' | 'CREDIT_CARD') || 'PIX'
      );

      let firstPayment: any | undefined;
      for (let attempt = 0; attempt < 6; attempt++) {
        const payments = await AsaasService.listSubscriptionPayments(subscription.id);
        if (payments.length > 0) {
          firstPayment = payments[0];
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      res.json({ 
        subscriptionId: subscription.id,
        paymentId: firstPayment?.id,
        paymentLink: firstPayment?.invoiceUrl || firstPayment?.bankSlipUrl,
      });
    } catch (error: any) {
      const message = String(error?.message || '');
      const cpfRequired = /cpf|cnpj/i.test(message);
      if (cpfRequired) {
        return res.status(400).json({ error: 'CPF_CNPJ_REQUIRED' });
      }
      res.status(500).json({ error: message || 'Internal error' });
    }
  }
}
