import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class WebhookConfigController {
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });
      const items = await prisma.webhookConfig.findMany({ where: { orgId } });
      res.json(items);
    } catch (error: any) {
      console.error('webhookConfig.list error:', error);
      res.status(500).json({ error: error.message || 'Failed to list webhooks' });
    }
  }
  static async create(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });
      const { url, events, secret } = req.body;
      if (!url) return res.status(400).json({ error: 'url is required' });
      const item = await prisma.webhookConfig.create({ data: { orgId, url, events: JSON.stringify(events || []), secret: secret || '' } });
      res.json(item);
    } catch (error: any) {
      console.error('webhookConfig.create error:', error);
      res.status(500).json({ error: error.message || 'Failed to create webhook' });
    }
  }
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { url, events, secret } = req.body;
      const item = await prisma.webhookConfig.update({ where: { id }, data: { url, events: events ? JSON.stringify(events) : undefined, secret } });
      res.json(item);
    } catch (error: any) {
      console.error('webhookConfig.update error:', error);
      res.status(500).json({ error: error.message || 'Failed to update webhook' });
    }
  }
  static async remove(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.webhookConfig.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error('webhookConfig.remove error:', error);
      res.status(500).json({ error: error.message || 'Failed to remove webhook' });
    }
  }
  static async logs(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });
      const items = await prisma.webhookLog.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' }, take: 200 });
      res.json(items);
    } catch (error: any) {
      console.error('webhookConfig.logs error:', error);
      res.status(500).json({ error: error.message || 'Failed to list webhook logs' });
    }
  }
}
