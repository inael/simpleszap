import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EvolutionService } from '../services/evolution.service';
import { EnforcementService } from '../services/enforcement.service';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';
import { getOrCreateSettings } from '../services/user-settings.service';

function renderTemplate(body: string, data: Record<string, string>) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const v = data[key];
    return typeof v === 'string' ? v : '';
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitterDelayMs(min: number, max: number) {
  const lo = Math.max(200, Math.min(min, max));
  const hi = Math.max(lo, Math.min(max, 120_000));
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function pickVariantBody(settings: {
  useMessageVariants: boolean;
  messageVariantA: string | null;
  messageVariantB: string | null;
  messageVariantC: string | null;
}): string | null {
  if (!settings.useMessageVariants) return null;
  const opts = [settings.messageVariantA, settings.messageVariantB, settings.messageVariantC].filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0
  );
  if (opts.length === 0) return null;
  return opts[Math.floor(Math.random() * opts.length)]!;
}

export class CampaignsController {
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });
      const items = await prisma.campaign.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
      res.json(items);
    } catch (error: any) {
      console.error('campaigns.list error:', error);
      res.status(500).json({ error: error.message || 'Failed to list campaigns' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });
      const { name, instanceId, templateId, segmentTags, scheduledAt } = req.body;
      if (!name || !instanceId) return res.status(400).json({ error: 'name and instanceId are required' });
      const item = await prisma.campaign.create({
        data: { orgId, name, instanceId, templateId, segmentTags: segmentTags ? JSON.stringify(segmentTags) : null, scheduledAt, status: 'draft' },
      });
      res.json(item);
    } catch (error: any) {
      console.error('campaigns.create error:', error);
      res.status(500).json({ error: error.message || 'Failed to create campaign' });
    }
  }

  static async run(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });
      const { id } = req.params;

      const settings = await getOrCreateSettings(orgId);
      if (!settings.bulkMessagingTermsAcceptedAt) {
        return res.status(403).json({
          error: 'terms_required',
          message: 'Aceite os termos de uso de funcionalidades de risco antes de executar campanhas.',
        });
      }

      const campaign = await prisma.campaign.findUnique({ where: { id } });
      if (!campaign) return res.status(404).json({ error: 'Not found' });
      const tags = campaign.segmentTags ? (JSON.parse(campaign.segmentTags) as string[]) : [];
      const contacts = tags.length
        ? await prisma.contact.findMany({ where: { orgId, tags: { contains: tags[0] } } })
        : await prisma.contact.findMany({ where: { orgId } });
      const template = campaign.templateId ? await prisma.template.findUnique({ where: { id: campaign.templateId } }) : null;

      await prisma.campaign.update({ where: { id }, data: { status: 'running' } });

      let sent = 0;
      let failed = 0;
      let blockedByLimit = 0;

      const minMs = settings.campaignJitterMinMs;
      const maxMs = settings.campaignJitterMaxMs;

      for (const c of contacts) {
        const allowed = await EnforcementService.canSendMessage(orgId);
        if (!allowed) {
          blockedByLimit += 1;
          await prisma.campaign.update({ where: { id }, data: { status: 'rate_limited' } }).catch(() => {});
          break;
        }

        const variant = pickVariantBody(settings);
        const raw =
          variant !== null ? variant : template ? template.body : 'Olá';
        const body = renderTemplate(raw, {
          name: c.name || '',
          phone: c.phone,
        });

        try {
          await EvolutionService.sendText(campaign.instanceId, c.phone, body);
          await prisma.message.create({
            data: { orgId, instanceId: campaign.instanceId, to: c.phone, body, type: 'text', status: 'sent' },
          });
          await EnforcementService.incrementMessageCount(orgId);
          await WebhookDeliveryService.trigger(orgId, 'message.sent', { instanceId: campaign.instanceId, number: c.phone, text: body });
          sent += 1;
        } catch (e: any) {
          await prisma.message.create({
            data: {
              orgId,
              instanceId: campaign.instanceId,
              to: c.phone,
              body,
              type: 'text',
              status: 'failed',
              error: e?.message || 'Failed',
            },
          });
          await WebhookDeliveryService.trigger(orgId, 'message.failed', {
            instanceId: campaign.instanceId,
            number: c.phone,
            text: body,
            error: e?.message || 'Failed',
          });
          failed += 1;
        }

        await sleep(jitterDelayMs(minMs, maxMs));
      }

      const finalStatus = blockedByLimit > 0 ? 'rate_limited' : 'done';
      await prisma.campaign.update({ where: { id }, data: { status: finalStatus } });
      res.json({ success: true, total: contacts.length, sent, failed, blockedByLimit, status: finalStatus });
    } catch (error: any) {
      console.error('campaigns.run error:', error);
      res.status(500).json({ error: error.message || 'Failed to run campaign' });
    }
  }
}
