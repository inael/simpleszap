import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

export class ApiKeyController {
  static async list(req: Request, res: Response) {
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const orgId = req.headers['x-org-id'] as string;
      if(!orgId) return res.status(400).json({error: "orgId required"});

      const keys = await prisma.apiKey.findMany({ where: { orgId }});
      res.json(keys);
  }

  static async create(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name } = req.body;
    const orgId = req.headers['x-org-id'] as string;
    if (!orgId) return res.status(400).json({error: "orgId required"});

    const user = await prisma.user.findUnique({ where: { logtoId: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const key = 'sk_' + crypto.randomBytes(24).toString('hex');

    try {
      const apiKey = await prisma.apiKey.create({
        data: {
          key,
          name: name || 'Default Key',
          userId: user.id,
          orgId
        }
      });
      res.json(apiKey);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async revoke(req: Request, res: Response) {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const orgId = req.headers['x-org-id'] as string | undefined;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });

      const key = await prisma.apiKey.findUnique({ where: { id } });
      if (!key || key.orgId !== orgId) return res.status(404).json({ error: 'Not found' });
      await prisma.apiKey.delete({ where: { id }});
      res.json({ success: true });
  }
}
