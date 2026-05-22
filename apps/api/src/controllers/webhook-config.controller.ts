import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class WebhookConfigController {
  /**
   * Lista webhooks. Query params:
   * - sem filtro: retorna TODOS da org (globais + overrides) — usado em /dashboard/webhooks
   * - ?instanceId=<id>: só os daquela instância (override) — usado na aba Webhooks da instância
   * - ?global=true: só os globais (instanceId IS NULL)
   */
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });
      const { instanceId, global } = req.query as { instanceId?: string; global?: string };
      const where: any = { orgId };
      if (instanceId) where.instanceId = instanceId;
      else if (global === 'true') where.instanceId = null;
      const items = await prisma.webhookConfig.findMany({ where, orderBy: { createdAt: 'desc' } });
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
      const { url, events, secret, instanceId } = req.body;
      if (!url) return res.status(400).json({ error: 'url is required' });
      // Segurança: se passou instanceId, garante que pertence à org
      if (instanceId) {
        const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!inst || inst.orgId !== orgId) return res.status(404).json({ error: 'Instance not found' });
      }
      const item = await prisma.webhookConfig.create({
        data: {
          orgId,
          instanceId: instanceId || null,
          url,
          events: JSON.stringify(events || []),
          secret: secret || '',
        },
      });
      res.json(item);
    } catch (error: any) {
      console.error('webhookConfig.create error:', error);
      res.status(500).json({ error: error.message || 'Failed to create webhook' });
    }
  }
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.headers['x-org-id'] as string;
      const { url, events, secret, instanceId } = req.body;
      // Segurança: valida instância se vier
      if (instanceId) {
        const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!inst || inst.orgId !== orgId) return res.status(404).json({ error: 'Instance not found' });
      }
      const data: any = {
        url,
        events: events ? JSON.stringify(events) : undefined,
        secret,
      };
      // instanceId só atualiza se enviado explicitamente (null limpa, undefined preserva)
      if (instanceId !== undefined) data.instanceId = instanceId || null;
      const item = await prisma.webhookConfig.update({ where: { id }, data });
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
