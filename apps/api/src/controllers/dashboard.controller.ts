import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class DashboardController {
  static async metrics(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalInstances, messagesToday] = await Promise.all([
        prisma.instance.count({ where: { orgId } }),
        prisma.dailyUsage.aggregate({
          _sum: { count: true },
          where: { orgId, date: { gte: today } },
        }),
      ]);

      res.json({
        totalInstances,
        messagesSent: messagesToday._sum.count || 0,
      });
    } catch (error: any) {
      console.error('dashboard.metrics error:', error);
      res.status(500).json({ error: error.message || 'Failed to load dashboard metrics' });
    }
  }
}
