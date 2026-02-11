import { Request, Response } from 'express';
import { AsaasService } from '../services/asaas.service';
import { prisma } from '../lib/prisma';

export class SubscriptionController {
  static async createCheckout(req: Request, res: Response) {
    const { planId, cycle } = req.body;
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

      // Create Customer in Asaas if not exists
      // We need to store asaasCustomerId in User model ideally, but it's not in the schema I saw.
      // Assuming we search by email or update schema.
      // For now, let's just create/get customer.
      const customer = await AsaasService.createCustomer({
        name: user.name || user.email,
        email: user.email
      });

      // Create Payment/Subscription
      const value = cycle === 'YEARLY' ? Number(plan.priceAnnual) : Number(plan.priceMonthly);
      
      // If simple payment (for testing) or subscription
      const subscription = await AsaasService.createSubscription(
        customer.id,
        value,
        cycle || 'MONTHLY',
        `Assinatura Plano ${plan.name}`
      );

      res.json({ 
        subscriptionId: subscription.id,
        paymentLink: subscription.bankSlipUrl || subscription.invoiceUrl, // Asaas returns invoiceUrl
        qrCode: subscription.pixQrCode // if available directly
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
