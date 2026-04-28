import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + delta);
  return x;
}

export class DashboardController {
  static async metrics(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });

      const today = startOfUtcDay(new Date());
      const weekStart = addUtcDays(today, -6);

      const [totalInstances, messagesToday, weekRows, recentActivity] = await Promise.all([
        prisma.instance.count({ where: { orgId } }),
        prisma.dailyUsage.aggregate({
          _sum: { count: true },
          where: { userId: orgId, date: { gte: today } },
        }),
        prisma.dailyUsage.findMany({
          where: { userId: orgId, date: { gte: weekStart } },
          orderBy: { date: 'asc' },
        }),
        prisma.auditLog.findMany({
          where: { orgId },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { id: true, action: true, createdAt: true },
        }),
      ]);

      const messagesLast7Days: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = addUtcDays(today, -i);
        const row = weekRows.find((r) => startOfUtcDay(r.date).getTime() === day.getTime());
        messagesLast7Days.push(row?.count ?? 0);
      }

      res.json({
        totalInstances,
        messagesSent: messagesToday._sum.count || 0,
        messagesLast7Days,
        recentActivity,
      });
    } catch (error: any) {
      console.error('dashboard.metrics error:', error);
      res.status(500).json({ error: error.message || 'Failed to load dashboard metrics' });
    }
  }
}
