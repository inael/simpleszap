import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

function normalizeCode(s: string) {
  return String(s || '').trim().toUpperCase();
}

export class AdminCouponController {
  static async list(req: Request, res: Response) {
    try {
      const coupons = await prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json(coupons.map((c) => ({
        ...c,
        amountOff: c.amountOff ? Number(c.amountOff) : null,
      })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const {
        code,
        description,
        percentOff,
        amountOff,
        validFrom,
        validUntil,
        maxUses,
        appliesToPlans,
        appliesToCycles,
        isActive,
      } = req.body;

      if (!code) return res.status(400).json({ error: 'code é obrigatório' });
      if ((percentOff == null) === (amountOff == null)) {
        return res.status(400).json({ error: 'Informe percentOff OU amountOff (apenas um)' });
      }
      if (percentOff != null && (percentOff < 1 || percentOff > 100)) {
        return res.status(400).json({ error: 'percentOff deve estar entre 1 e 100' });
      }

      const data: Prisma.CouponCreateInput = {
        code: normalizeCode(code),
        description: description || null,
        percentOff: percentOff != null ? Number(percentOff) : null,
        amountOff: amountOff != null ? new Prisma.Decimal(amountOff) : null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        maxUses: maxUses != null ? Number(maxUses) : null,
        appliesToPlans: Array.isArray(appliesToPlans) ? appliesToPlans : [],
        appliesToCycles: Array.isArray(appliesToCycles) ? appliesToCycles : [],
        isActive: isActive !== false,
      };

      const coupon = await prisma.coupon.create({ data });
      res.json({ ...coupon, amountOff: coupon.amountOff ? Number(coupon.amountOff) : null });
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(409).json({ error: 'Código já existe' });
      res.status(500).json({ error: e.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        description,
        percentOff,
        amountOff,
        validFrom,
        validUntil,
        maxUses,
        appliesToPlans,
        appliesToCycles,
        isActive,
      } = req.body;

      const data: Prisma.CouponUpdateInput = {};
      if (description !== undefined) data.description = description || null;
      if (percentOff !== undefined) data.percentOff = percentOff != null ? Number(percentOff) : null;
      if (amountOff !== undefined) data.amountOff = amountOff != null ? new Prisma.Decimal(amountOff) : null;
      if (validFrom !== undefined) data.validFrom = validFrom ? new Date(validFrom) : new Date();
      if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null;
      if (maxUses !== undefined) data.maxUses = maxUses != null ? Number(maxUses) : null;
      if (appliesToPlans !== undefined) data.appliesToPlans = Array.isArray(appliesToPlans) ? appliesToPlans : [];
      if (appliesToCycles !== undefined) data.appliesToCycles = Array.isArray(appliesToCycles) ? appliesToCycles : [];
      if (isActive !== undefined) data.isActive = !!isActive;

      const coupon = await prisma.coupon.update({ where: { id }, data });
      res.json({ ...coupon, amountOff: coupon.amountOff ? Number(coupon.amountOff) : null });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const used = await prisma.couponRedemption.count({ where: { couponId: id } });
      if (used > 0) {
        // Soft-delete: desativa em vez de apagar para manter histórico
        await prisma.coupon.update({ where: { id }, data: { isActive: false } });
        return res.json({ ok: true, deactivated: true });
      }
      await prisma.coupon.delete({ where: { id } });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async redemptions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const list = await prisma.couponRedemption.findMany({
        where: { couponId: id },
        orderBy: { redeemedAt: 'desc' },
      });
      res.json(list.map((r) => ({
        ...r,
        originalValue: Number(r.originalValue),
        discountValue: Number(r.discountValue),
        finalValue: Number(r.finalValue),
      })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
