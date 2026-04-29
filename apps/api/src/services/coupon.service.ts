import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export type CouponValidation =
  | { valid: false; reason: string }
  | {
      valid: true;
      couponId: string;
      code: string;
      originalValue: number;
      discountValue: number;
      finalValue: number;
      percentOff: number | null;
      amountOff: number | null;
    };

export class CouponService {
  /**
   * Valida cupom para um (planId, cycle, userId, originalValue) específicos.
   * Não consome o uso — apenas calcula. Use redeem() para registrar.
   */
  static async validate(params: {
    code: string;
    planId: string;
    cycle: 'MONTHLY' | 'YEARLY';
    userId: string;
    originalValue: number;
  }): Promise<CouponValidation> {
    const { code, planId, cycle, userId, originalValue } = params;

    if (!code) return { valid: false, reason: 'Código vazio' };

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!coupon) return { valid: false, reason: 'Cupom não encontrado' };
    if (!coupon.isActive) return { valid: false, reason: 'Cupom inativo' };

    const now = new Date();
    if (coupon.validFrom > now) return { valid: false, reason: 'Cupom ainda não vigente' };
    if (coupon.validUntil && coupon.validUntil < now) return { valid: false, reason: 'Cupom expirado' };

    if (coupon.maxUses != null && coupon.timesUsed >= coupon.maxUses) {
      return { valid: false, reason: 'Cupom esgotado' };
    }

    if (coupon.appliesToPlans.length > 0 && !coupon.appliesToPlans.includes(planId)) {
      return { valid: false, reason: 'Cupom não aplicável a este plano' };
    }
    if (coupon.appliesToCycles.length > 0 && !coupon.appliesToCycles.includes(cycle)) {
      return { valid: false, reason: 'Cupom não aplicável a este ciclo' };
    }

    // Per-user limit: cada user só pode usar o cupom 1x
    const alreadyUsed = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (alreadyUsed > 0) return { valid: false, reason: 'Você já usou este cupom' };

    const percentOff = coupon.percentOff ?? null;
    const amountOff = coupon.amountOff ? Number(coupon.amountOff) : null;

    let discount = 0;
    if (percentOff != null) discount = (originalValue * percentOff) / 100;
    else if (amountOff != null) discount = amountOff;

    discount = Math.min(discount, originalValue);
    discount = Math.round(discount * 100) / 100;
    const finalValue = Math.max(0, Math.round((originalValue - discount) * 100) / 100);

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      originalValue,
      discountValue: discount,
      finalValue,
      percentOff,
      amountOff,
    };
  }

  /**
   * Marca redemption: incrementa timesUsed e cria CouponRedemption.
   * Use depois do checkout no Asaas dar certo, passando o subId.
   */
  static async redeem(params: {
    couponId: string;
    userId: string;
    userEmail?: string | null;
    planId: string;
    cycle: 'MONTHLY' | 'YEARLY';
    originalValue: number;
    discountValue: number;
    finalValue: number;
    asaasSubscriptionId?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.coupon.update({
        where: { id: params.couponId },
        data: { timesUsed: { increment: 1 } },
      });
      return tx.couponRedemption.create({
        data: {
          couponId: params.couponId,
          userId: params.userId,
          userEmail: params.userEmail ?? null,
          planId: params.planId,
          cycle: params.cycle,
          originalValue: new Prisma.Decimal(params.originalValue),
          discountValue: new Prisma.Decimal(params.discountValue),
          finalValue: new Prisma.Decimal(params.finalValue),
          asaasSubscriptionId: params.asaasSubscriptionId ?? null,
        },
      });
    });
  }
}
