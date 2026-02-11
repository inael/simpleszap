import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class WebhookConfigController {
  static async list(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string;
    const items = await prisma.webhookConfig.findMany({ where: { orgId } });
    res.json(items);
  }
  static async create(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string;
    const { url, events, secret } = req.body;
    const item = await prisma.webhookConfig.create({ data: { orgId, url, events: JSON.stringify(events || []), secret } });
    res.json(item);
  }
  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { url, events, secret } = req.body;
    const item = await prisma.webhookConfig.update({ where: { id }, data: { url, events: events ? JSON.stringify(events) : undefined, secret } });
    res.json(item);
  }
  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    await prisma.webhookConfig.delete({ where: { id } });
    res.json({ success: true });
  }
  static async logs(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string;
    const items = await prisma.webhookLog.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' }, take: 200 });
    res.json(items);
  }
}
