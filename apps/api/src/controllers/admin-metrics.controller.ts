import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class AdminMetricsController {
  static async get(req: Request, res: Response) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalUsers, totalInstances, messagesToday, totalPlans, recentAuditLogs] =
        await Promise.all([
          prisma.user.count(),
          prisma.instance.count(),
          prisma.dailyUsage.aggregate({
            _sum: { count: true },
            where: { date: { gte: today } },
          }),
          prisma.subscriptionPlan.count({ where: { isActive: true } }),
          prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
        ]);

      res.json({
        totalUsers,
        totalInstances,
        messagesToday: messagesToday._sum.count || 0,
        totalPlans,
        recentAuditLogs,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
