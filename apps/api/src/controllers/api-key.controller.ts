import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

export class ApiKeyController {
  static async list(req: Request, res: Response) {
      // TODO: auth
      const { userId } = req.body; // mock
      if(!userId) return res.status(400).json({error: "UserId required"});

      const keys = await prisma.apiKey.findMany({ where: { userId }});
      res.json(keys);
  }

  static async create(req: Request, res: Response) {
    const { userId, name } = req.body;
    
    if (!userId) return res.status(400).json({error: "UserId required"});

    const key = 'sk_' + crypto.randomBytes(24).toString('hex');
    
    try {
      const apiKey = await prisma.apiKey.create({
        data: {
          key,
          name: name || 'Default Key',
          userId
        }
      });
      res.json(apiKey);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async revoke(req: Request, res: Response) {
      const { id } = req.params;
      await prisma.apiKey.delete({ where: { id }});
      res.json({ success: true });
  }
}
