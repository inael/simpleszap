import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class AdminAuditController {
  static async list(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const action = req.query.action as string | undefined;

      const where: any = {};
      if (action) where.action = action;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({ logs, total, page, pages: Math.ceil(total / limit) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
