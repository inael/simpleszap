import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class AsaasWebhookController {
  static async handle(req: Request, res: Response) {
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN || process.env.ASAAS_WEBHOOK_ACCESS_TOKEN;
    if (expectedToken) {
      const receivedToken = req.header('asaas-access-token');
      if (!receivedToken || receivedToken !== expectedToken) {
        return res.status(401).json({ ok: false });
      }
    }

    const payload = req.body as any;
    try {
      await prisma.auditLog.create({ data: { orgId: 'global', actorId: 'asaas', action: 'WEBHOOK_RECEIVED', data: payload ? JSON.stringify(payload).slice(0, 8000) : '{}' } }).catch(() => {});
      res.status(200).json({ ok: true });
    } catch (error: any) {
      res.status(200).json({ ok: true });
    }
  }
}
