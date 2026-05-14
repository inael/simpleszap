import { Request, Response } from 'express';
import { EmailQueueService } from '../services/email-queue.service';

export class CronController {
  // POST /api/cron/process-emails — protegido por CRON_SECRET (Vercel envia
  // automaticamente como Authorization: Bearer <secret>).
  static async processEmails(req: Request, res: Response) {
    const auth = req.headers.authorization || '';
    const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
    if (!process.env.CRON_SECRET || auth !== expected) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    try {
      const result = await EmailQueueService.processBatch();
      res.json({ ok: true, ...result, ranAt: new Date().toISOString() });
    } catch (e: any) {
      console.error('cron.processEmails error:', e);
      res.status(500).json({ error: e?.message || 'internal' });
    }
  }
}
