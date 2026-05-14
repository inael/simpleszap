import { Request, Response } from 'express';
import { AsaasService } from '../services/asaas.service';
import { prisma } from '../lib/prisma';
import { CouponService } from '../services/coupon.service';
import { EmailQueueService } from '../services/email-queue.service';

export class SubscriptionController {
  static async createCheckout(req: Request, res: Response) {
    const { planId, cycle, method, couponCode } = req.body;
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

      // CPF/CNPJ vem do cadastro do user (não do body), garantindo consistência
      if (!user.cpfCnpj) {
        return res.status(400).json({ error: 'CPF_CNPJ_REQUIRED' });
      }

      const customer = await AsaasService.createCustomer({
        name: user.name || user.email,
        email: user.email,
        cpfCnpj: user.cpfCnpj,
      });

      const customerId = customer?.id as string | undefined;
      if (!customerId) {
        return res.status(500).json({ error: 'Failed to create customer' });
      }

      if (user.asaasCustomerId !== customerId) {
        await prisma.user.update({ where: { id: user.id }, data: { asaasCustomerId: customerId } }).catch(() => {});
      }

      // Cancela subscriptions anteriores ativas — evita cobranças duplicadas em
      // troca de plano (upgrade/downgrade/re-assinatura).
      const cancelled = await AsaasService.cancelActiveSubscriptionsFor(customerId);
      if (cancelled.length > 0) {
        console.log(`Cancelled ${cancelled.length} prior subscriptions for customer ${customerId}`);
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

      // Asaas exige cobrança mínima de R$ 5,00. Bloqueia antes de chamar Asaas pra dar erro claro.
      const ASAAS_MIN = 5;
      if (finalValue > 0 && finalValue < ASAAS_MIN) {
        return res.status(400).json({
          error: 'VALUE_BELOW_ASAAS_MINIMUM',
          reason: `Valor final (R$ ${finalValue.toFixed(2)}) está abaixo do mínimo do Asaas (R$ ${ASAAS_MIN.toFixed(2)}). Reduza o desconto do cupom.`,
        });
      }

      const encoded = `sz|uid:${userId}|plan:${plan.id}|cycle:${effectiveCycle}${couponMeta ? `|coupon:${couponMeta.code}` : ''}`;
      const planLabel = couponMeta
        ? `SimplesZap ${plan.name} (cupom ${couponMeta.code}) [${encoded}]`
        : `SimplesZap ${plan.name} [${encoded}]`;

      // billingType UNDEFINED = checkout aberto no Asaas (cliente escolhe PIX, boleto ou cartão)
      const subscription = await AsaasService.createSubscription(
        customerId,
        finalValue,
        effectiveCycle,
        planLabel,
        (method as 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED') || 'UNDEFINED'
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

  // Cancela assinatura do usuário ou aplica desconto win-back de 50% no próximo pagamento.
  // Body: { acceptDiscount: boolean }.
  static async cancel(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { acceptDiscount } = (req.body || {}) as { acceptDiscount?: boolean };

    try {
      const user = await prisma.user.findUnique({
        where: { logtoId: userId },
        include: { subscriptionPlan: true },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!user.asaasCustomerId) return res.status(400).json({ error: 'NO_PAID_SUBSCRIPTION' });

      const subs = await AsaasService.listActiveSubscriptionsFor(user.asaasCustomerId);
      if (subs.length === 0) return res.status(400).json({ error: 'NO_ACTIVE_SUBSCRIPTION' });

      // Win-back: aplica 50% no próximo pagamento pendente, mantém subscription ativa.
      if (acceptDiscount) {
        let appliedTo: { paymentId: string; oldValue: number; newValue: number } | null = null;
        for (const sub of subs) {
          const payments = await AsaasService.listSubscriptionPayments(sub.id);
          const next = payments.find((p: any) => p.status === 'PENDING');
          if (next) {
            const oldValue = Number(next.value);
            const newValue = Math.max(5, +(oldValue * 0.5).toFixed(2));
            await AsaasService.updatePaymentValue(next.id, newValue);
            appliedTo = { paymentId: next.id, oldValue, newValue };
            break;
          }
        }

        // Email de confirmação
        EmailQueueService.enqueue({
          userId: user.id,
          userEmail: user.email,
          template: 'winback_accepted' as any,
          sendAt: new Date(),
          payload: {
            couponCode: 'WINBACK50',
            planName: user.subscriptionPlan?.name || 'pago',
          },
        }).catch((e) => console.error('enqueue winback_accepted failed:', e));

        return res.json({
          ok: true,
          action: 'discount_applied',
          appliedTo,
          message: appliedTo
            ? `Desconto de 50% aplicado. Próxima fatura: R$ ${appliedTo.newValue.toFixed(2)}`
            : 'Desconto registrado. Será aplicado quando próxima fatura for emitida.',
        });
      }

      // Cancela de fato: cancela todas subs ativas no Asaas, limpa plano, enfileira win-back.
      await AsaasService.cancelActiveSubscriptionsFor(user.asaasCustomerId);
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionPlanId: null },
      });

      EmailQueueService.enqueueWinbackSequence({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
      }).catch((e) => console.error('enqueueWinbackSequence failed:', e));

      return res.json({ ok: true, action: 'cancelled' });
    } catch (e: any) {
      console.error('subscription.cancel error:', e);
      return res.status(500).json({ error: e?.message || 'Internal error' });
    }
  }
}
