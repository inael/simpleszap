import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

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
}
