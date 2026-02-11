import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class MessagesController {
  static async list(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string;
    if (!orgId) return res.status(400).json({ error: 'orgId required' });

    const { limit = '100' } = req.query;
    const messages = await prisma.message.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
    });
    res.json(messages);
  }
}
