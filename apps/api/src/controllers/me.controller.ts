import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EnforcementService } from '../services/enforcement.service';

function digitsOnly(s: string) {
  return String(s || '').replace(/\D/g, '');
}

function isValidCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += Number(cpf[i]) * (10 - i);
  let d1 = 11 - (s % 11); if (d1 >= 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += Number(cpf[i]) * (11 - i);
  let d2 = 11 - (s % 11); if (d2 >= 10) d2 = 0;
  return d2 === Number(cpf[10]);
}

function isValidCnpj(cnpj: string) {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (slice: string, weights: number[]) => {
    let s = 0;
    for (let i = 0; i < weights.length; i++) s += Number(slice[i]) * weights[i];
    const d = 11 - (s % 11);
    return d >= 10 ? 0 : d;
  };
  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  return calc(cnpj.slice(0, 12), w1) === Number(cnpj[12]) &&
         calc(cnpj.slice(0, 13), w2) === Number(cnpj[13]);
}

export class MeController {
  static async profile(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const user = await prisma.user.findUnique({ where: { logtoId: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({
        id: user.id,
        logtoId: user.logtoId,
        email: user.email,
        name: user.name,
        cpfCnpj: user.cpfCnpj,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { cpfCnpj } = req.body || {};
      const data: { cpfCnpj?: string | null } = {};

      if (cpfCnpj !== undefined) {
        if (cpfCnpj === null || cpfCnpj === '') {
          data.cpfCnpj = null;
        } else {
          const d = digitsOnly(cpfCnpj);
          if (d.length === 11 && !isValidCpf(d)) {
            return res.status(400).json({ error: 'CPF inválido' });
          }
          if (d.length === 14 && !isValidCnpj(d)) {
            return res.status(400).json({ error: 'CNPJ inválido' });
          }
          if (d.length !== 11 && d.length !== 14) {
            return res.status(400).json({ error: 'CPF/CNPJ deve ter 11 ou 14 dígitos' });
          }
          data.cpfCnpj = d;
        }
      }

      const user = await prisma.user.update({
        where: { logtoId: userId },
        data,
      });
      res.json({ id: user.id, email: user.email, name: user.name, cpfCnpj: user.cpfCnpj });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async subscription(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await prisma.user.findUnique({
        where: { logtoId: userId },
        include: { subscriptionPlan: true },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const now = new Date();
      const trialActive = !!(user.trialEndsAt && user.trialEndsAt > now);
      const trialExpired = !!(user.trialEndsAt && user.trialEndsAt <= now);
      const hasPaid = !!user.asaasCustomerId;
      const effectiveStatus =
        hasPaid && !trialActive ? 'paid'
        : trialActive ? 'trial'
        : trialExpired ? 'free_after_trial'
        : 'free';

      const limits = await EnforcementService.getLimitsForOrg(userId);

      return res.json({
        plan: user.subscriptionPlan
          ? {
              id: user.subscriptionPlan.id,
              name: user.subscriptionPlan.name,
              priceMonthly: Number(user.subscriptionPlan.priceMonthly),
              priceAnnual: Number(user.subscriptionPlan.priceAnnual),
              instancesLimit: user.subscriptionPlan.instancesLimit,
              messagesPerDay: user.subscriptionPlan.messagesPerDay,
            }
          : null,
        trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
        trialActive,
        status: effectiveStatus,
        limits,
        hasPaid,
        cpfCnpj: user.cpfCnpj,
      });
    } catch (e: any) {
      console.error('me.subscription error:', e);
      res.status(500).json({ error: e?.message || 'Internal error' });
    }
  }
}
