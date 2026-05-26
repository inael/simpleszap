import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AsaasService } from '../services/asaas.service';
import { EnforcementService } from '../services/enforcement.service';

/**
 * Billing controller — modelo elástico 2026-05:
 * - Cada Instance tem assinatura Asaas própria (R$59/mês, 300 msgs/dia incluídas).
 *   externalReference = `instance:<UUID>` pro webhook mapear.
 * - Add-ons (R$15/mês, +100 msgs/dia globais) também são subscriptions Asaas.
 *   externalReference = `addon:<UUID>`.
 * - Webhook Asaas (asaas-webhook.controller) processa pagamento aprovado/cancelado
 *   e atualiza subscriptionStatus + paidUntil.
 */

const INSTANCE_PRICE_CENTS = parseInt(process.env.INSTANCE_PRICE_CENTS || '5900', 10);
const INSTANCE_MESSAGES_INCLUDED = parseInt(process.env.INSTANCE_MESSAGES_INCLUDED || '300', 10);
const ADDON_PRICE_CENTS = parseInt(process.env.ADDON_PRICE_CENTS || '1500', 10);
const ADDON_MESSAGES_PER_DAY = parseInt(process.env.ADDON_MESSAGES_PER_DAY || '100', 10);

async function ensureAsaasCustomer(user: any) {
  if (user.asaasCustomerId) return user.asaasCustomerId;
  const customer = await AsaasService.createCustomer({
    name: user.name || user.email,
    email: user.email,
    cpfCnpj: user.cpfCnpj || undefined,
  });
  const customerId = customer?.id as string | undefined;
  if (!customerId) throw new Error('Falha ao criar customer no Asaas. Cadastre seu CPF/CNPJ em Perfil.');
  await prisma.user.update({ where: { id: user.id }, data: { asaasCustomerId: customerId } });
  return customerId;
}

export class BillingController {
  /** GET /me/billing — resumo pra UI subscription */
  static async summary(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const data = await EnforcementService.getBillingForUser(userId);
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json({
      ...data,
      defaults: {
        instancePriceCents: INSTANCE_PRICE_CENTS,
        instanceMessagesIncluded: INSTANCE_MESSAGES_INCLUDED,
        addonPriceCents: ADDON_PRICE_CENTS,
        addonMessagesPerDay: ADDON_MESSAGES_PER_DAY,
      },
    });
  }

  /** POST /instance/:id/subscribe — cria subscription Asaas pra essa instância */
  static async subscribeInstance(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const couponCode = typeof req.body?.coupon === 'string' ? req.body.coupon.trim() : null;

    const user = await prisma.user.findUnique({ where: { logtoId: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const instance = await prisma.instance.findUnique({ where: { id } });
    if (!instance || instance.userId !== user.id) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    if (instance.subscriptionStatus === 'active' && instance.asaasSubscriptionId) {
      return res.status(409).json({ error: 'Instância já tem assinatura ativa.', subscriptionId: instance.asaasSubscriptionId });
    }
    if (!user.cpfCnpj) {
      return res.status(400).json({
        error: 'CPF/CNPJ obrigatório para assinatura. Cadastre em Configurações → Perfil.',
        code: 'MISSING_CPF_CNPJ',
      });
    }

    // Validação e aplicação do cupom (opcional). Desconto entra direto no
    // value da subscription Asaas — recorrente (todas as cobranças). Pra
    // descontos "só 1º mês" precisaria de Payment avulso + Subscription
    // começando no mês 2, que não vale a complexidade aqui.
    let finalPriceCents = INSTANCE_PRICE_CENTS;
    let coupon: { id: string; percentOff: number | null; amountOff: any } | null = null;
    if (couponCode) {
      const c = await prisma.coupon.findUnique({ where: { code: couponCode } });
      const now = new Date();
      const valid = c
        && (c.validUntil == null || c.validUntil > now)
        && (c.maxUses == null || c.timesUsed < c.maxUses);
      if (valid) {
        coupon = { id: c!.id, percentOff: c!.percentOff, amountOff: c!.amountOff };
        if (c!.percentOff) {
          finalPriceCents = Math.round(INSTANCE_PRICE_CENTS * (1 - c!.percentOff / 100));
        } else if (c!.amountOff) {
          finalPriceCents = Math.max(0, INSTANCE_PRICE_CENTS - Math.round(Number(c!.amountOff) * 100));
        }
      }
    }

    try {
      const customerId = await ensureAsaasCustomer(user);
      const sub = await AsaasService.createSubscription(
        customerId,
        finalPriceCents / 100,
        'MONTHLY',
        `SimplesZap — Instância "${instance.name}"${coupon ? ` (cupom ${couponCode})` : ''}`,
        'UNDEFINED',
        `instance:${instance.id}`,
      );

      await prisma.instance.update({
        where: { id },
        data: {
          subscriptionStatus: 'pending',
          asaasSubscriptionId: sub?.id ?? null,
          pricePerMonthCents: finalPriceCents,
          messagesIncluded: INSTANCE_MESSAGES_INCLUDED,
        },
      });

      // Registra redemption (best-effort) + incrementa timesUsed
      if (coupon) {
        await prisma.couponRedemption.create({
          data: {
            couponId: coupon.id,
            userId,
            userEmail: user.email,
            planId: 'paid',
            cycle: 'MONTHLY',
            originalValue: INSTANCE_PRICE_CENTS / 100,
            discountValue: (INSTANCE_PRICE_CENTS - finalPriceCents) / 100,
            finalValue: finalPriceCents / 100,
            asaasSubscriptionId: sub?.id ?? null,
          },
        }).catch((e) => console.error('[billing] couponRedemption create failed:', e?.message));
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { timesUsed: { increment: 1 } },
        }).catch(() => null);
      }

      res.json({
        subscriptionId: sub?.id,
        invoiceUrl: sub?.invoiceUrl,
        bankSlipUrl: sub?.bankSlipUrl,
        pricePerMonthCents: finalPriceCents,
        originalPriceCents: INSTANCE_PRICE_CENTS,
        couponApplied: coupon ? couponCode : null,
        messagesIncluded: INSTANCE_MESSAGES_INCLUDED,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Falha ao criar assinatura.' });
    }
  }

  /** DELETE /instance/:id/subscribe — cancela subscription Asaas */
  static async cancelInstanceSubscription(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { logtoId: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const instance = await prisma.instance.findUnique({ where: { id } });
    if (!instance || instance.userId !== user.id) return res.status(404).json({ error: 'Instance not found' });
    if (!instance.asaasSubscriptionId) return res.json({ cancelled: false, reason: 'sem assinatura' });

    await AsaasService.cancelSubscription(instance.asaasSubscriptionId);
    await prisma.instance.update({
      where: { id },
      data: { subscriptionStatus: 'canceled' },
    });
    res.json({ cancelled: true });
  }

  /** POST /messages/addon — cria assinatura de add-on de mensagens */
  static async createAddon(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { logtoId: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.cpfCnpj) {
      return res.status(400).json({
        error: 'CPF/CNPJ obrigatório. Cadastre em Configurações → Perfil.',
        code: 'MISSING_CPF_CNPJ',
      });
    }

    try {
      const customerId = await ensureAsaasCustomer(user);
      const addon = await prisma.messageAddon.create({
        data: {
          userId: user.id,
          status: 'pending',
          messagesPerDay: ADDON_MESSAGES_PER_DAY,
          pricePerMonthCents: ADDON_PRICE_CENTS,
        },
      });
      const sub = await AsaasService.createSubscription(
        customerId,
        ADDON_PRICE_CENTS / 100,
        'MONTHLY',
        `SimplesZap — +${ADDON_MESSAGES_PER_DAY} msgs/dia`,
        'UNDEFINED',
        `addon:${addon.id}`,
      );
      await prisma.messageAddon.update({
        where: { id: addon.id },
        data: { asaasSubscriptionId: sub?.id ?? null },
      });
      res.json({
        addonId: addon.id,
        subscriptionId: sub?.id,
        invoiceUrl: sub?.invoiceUrl,
        bankSlipUrl: sub?.bankSlipUrl,
        messagesPerDay: ADDON_MESSAGES_PER_DAY,
        pricePerMonthCents: ADDON_PRICE_CENTS,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Falha ao criar addon.' });
    }
  }

  /** DELETE /messages/addon/:id — cancela addon */
  static async cancelAddon(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { logtoId: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const addon = await prisma.messageAddon.findUnique({ where: { id } });
    if (!addon || addon.userId !== user.id) return res.status(404).json({ error: 'Addon not found' });

    if (addon.asaasSubscriptionId) {
      await AsaasService.cancelSubscription(addon.asaasSubscriptionId);
    }
    await prisma.messageAddon.update({
      where: { id },
      data: { status: 'canceled', cancelledAt: new Date() },
    });
    res.json({ cancelled: true });
  }
}
