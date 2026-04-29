import { Request, Response } from 'express';
import { AsaasService } from '../services/asaas.service';
import { prisma } from '../lib/prisma';
import { CouponService } from '../services/coupon.service';

export class SubscriptionController {
  static async createCheckout(req: Request, res: Response) {
    const { planId, cycle, method, cpfCnpj, couponCode } = req.body;
    const userId = req.headers['x-user-id'] as string | undefined;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const user = await prisma.user.findUnique({ where: { logtoId: userId } });
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

      if (user.asaasCustomerId !== customerId) {
        await prisma.user.update({ where: { id: user.id }, data: { asaasCustomerId: customerId } }).catch(() => {});
      }

      const effectiveCycle = (cycle || 'MONTHLY') as 'MONTHLY' | 'YEARLY';
      const originalValue = effectiveCycle === 'YEARLY' ? Number(plan.priceAnnual) : Number(plan.priceMonthly);

      // Validar cupom (se enviado) e calcular valor final
      let finalValue = originalValue;
      let couponMeta: { id: string; code: string; discount: number } | null = null;
      if (couponCode) {
        const v = await CouponService.validate({
          code: String(couponCode),
          planId: plan.id,
          cycle: effectiveCycle,
          userId,
          originalValue,
        });
        if (!v.valid) {
          return res.status(400).json({ error: 'COUPON_INVALID', reason: v.reason });
        }
        finalValue = v.finalValue;
        couponMeta = { id: v.couponId, code: v.code, discount: v.discountValue };
      }

      const encoded = `sz|uid:${userId}|plan:${plan.id}|cycle:${effectiveCycle}${couponMeta ? `|coupon:${couponMeta.code}` : ''}`;
      const planLabel = couponMeta
        ? `SimplesZap ${plan.name} (cupom ${couponMeta.code}) [${encoded}]`
        : `SimplesZap ${plan.name} [${encoded}]`;

      const subscription = await AsaasService.createSubscription(
        customerId,
        finalValue,
        effectiveCycle,
        planLabel,
        (method as 'PIX' | 'BOLETO' | 'CREDIT_CARD') || 'PIX'
      );

      // Cupom: registrar resgate (best-effort, não bloqueia checkout)
      if (couponMeta) {
        await CouponService.redeem({
          couponId: couponMeta.id,
          userId,
          userEmail: user.email,
          planId: plan.id,
          cycle: effectiveCycle,
          originalValue,
          discountValue: couponMeta.discount,
          finalValue,
          asaasSubscriptionId: subscription?.id ?? null,
        }).catch((err) => console.error('coupon.redeem failed:', err));
      }

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
