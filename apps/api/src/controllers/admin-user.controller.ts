import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuditService } from '../services/audit.service';

export class AdminUserController {
  static async list(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || '';

      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            subscriptionPlan: true,
            _count: { select: { instances: true } },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({ users, total, page, pages: Math.ceil(total / limit) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Concede plano cortesia (VIP, bypass Asaas) por N meses ao usuário.
  // Body: { planId, months, reason }. Estende manualSubscriptionUntil cumulativamente
  // se já houver cortesia ativa, senão soma a partir de agora.
  static async grantPlan(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const { planId, months, reason } = req.body || {};
      const actorId = req.headers['x-user-id'] as string | undefined;

      if (!planId || typeof planId !== 'string') return res.status(400).json({ error: 'planId é obrigatório' });
      const m = Number(months);
      if (!Number.isFinite(m) || m <= 0 || m > 60) return res.status(400).json({ error: 'months deve ser 1..60' });
      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        return res.status(400).json({ error: 'reason é obrigatório (descreva motivo)' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });

      const now = new Date();
      const base = user.manualSubscriptionUntil && user.manualSubscriptionUntil > now
        ? user.manualSubscriptionUntil
        : now;
      const newUntil = new Date(base.getTime() + m * 30 * 24 * 60 * 60 * 1000);

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionPlanId: plan.id,
          manualSubscriptionUntil: newUntil,
          manualPlanReason: reason.trim(),
          // Cortesia substitui trial; trial vira ruído nos cálculos posteriores.
          trialEndsAt: null,
        },
        include: { subscriptionPlan: true },
      });

      await AuditService.log(user.logtoId, 'admin.grant_plan', actorId, {
        targetUserId: user.id, targetEmail: user.email, planId: plan.id, months: m,
        manualSubscriptionUntil: newUntil.toISOString(), reason: reason.trim(),
      });

      res.json({ ok: true, user: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async revokeGrant(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const actorId = req.headers['x-user-id'] as string | undefined;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          manualSubscriptionUntil: null,
          manualPlanReason: null,
          // Sem cortesia + sem Asaas customer = sem plano pago. Cai pra Free defaults
          // via enforcement quando hasPaid=false. Não mexe em subscriptionPlanId
          // pra preservar histórico de qual plano foi concedido.
        },
        include: { subscriptionPlan: true },
      });

      await AuditService.log(user.logtoId, 'admin.revoke_grant', actorId, {
        targetUserId: user.id, targetEmail: user.email,
      });

      res.json({ ok: true, user: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
