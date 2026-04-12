import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EvolutionService } from '../services/evolution.service';
import { EnforcementService } from '../services/enforcement.service';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';

function renderTemplate(body: string, data: Record<string, string>) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const v = data[key];
    return typeof v === 'string' ? v : '';
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitterDelayMs() {
  const min = 900;
  const max = 2200;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class CampaignsController {
  static async list(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string;
    const items = await prisma.campaign.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
    res.json(items);
  }

  static async create(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string;
    const { name, instanceId, templateId, segmentTags, scheduledAt } = req.body;
    const item = await prisma.campaign.create({ data: { orgId, name, instanceId, templateId, segmentTags: segmentTags ? JSON.stringify(segmentTags) : null, scheduledAt, status: 'draft' } });
    res.json(item);
  }

  static async run(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string;
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    const tags = campaign.segmentTags ? JSON.parse(campaign.segmentTags) as string[] : [];
    const contacts = tags.length ? await prisma.contact.findMany({ where: { orgId, tags: { contains: tags[0] } } }) : await prisma.contact.findMany({ where: { orgId } });
    const template = campaign.templateId ? await prisma.template.findUnique({ where: { id: campaign.templateId } }) : null;

    await prisma.campaign.update({ where: { id }, data: { status: 'running' } });

    let sent = 0;
    let failed = 0;
    let blockedByLimit = 0;

    for (const c of contacts) {
      const allowed = await EnforcementService.canSendMessage(orgId);
      if (!allowed) {
        blockedByLimit += 1;
        await prisma.campaign.update({ where: { id }, data: { status: 'rate_limited' } }).catch(() => {});
        break;
      }

      const raw = template ? template.body : 'Olá';
      const body = renderTemplate(raw, {
        name: c.name || '',
        phone: c.phone,
      });

      try {
        await EvolutionService.sendText(campaign.instanceId, c.phone, body);
        await prisma.message.create({ data: { orgId, instanceId: campaign.instanceId, to: c.phone, body, type: 'text', status: 'sent' } });
        await EnforcementService.incrementMessageCount(orgId);
        await WebhookDeliveryService.trigger(orgId, 'message.sent', { instanceId: campaign.instanceId, number: c.phone, text: body });
        sent += 1;
      } catch (e: any) {
        await prisma.message.create({
          data: { orgId, instanceId: campaign.instanceId, to: c.phone, body, type: 'text', status: 'failed', error: e?.message || 'Failed' },
        });
        await WebhookDeliveryService.trigger(orgId, 'message.failed', { instanceId: campaign.instanceId, number: c.phone, text: body, error: e?.message || 'Failed' });
        failed += 1;
      }

      await sleep(jitterDelayMs());
    }

    const finalStatus = blockedByLimit > 0 ? 'rate_limited' : 'done';
    await prisma.campaign.update({ where: { id }, data: { status: finalStatus } });
    res.json({ success: true, total: contacts.length, sent, failed, blockedByLimit, status: finalStatus });
  }
}
