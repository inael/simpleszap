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

/**
 * Sorteia entre as 3 variantes do template (A/B/C) — anti-banimento WhatsApp.
 * Variantes são obrigatórias no cadastro do template e validadas como
 * diferentes entre si pelo backend.
 */
function pickVariantBody(template: { variantA: string; variantB: string; variantC: string } | null): string | null {
  if (!template) return null;
  const opts = [template.variantA, template.variantB, template.variantC].filter(
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
      const { name, instanceId, templateId, segmentTags, scheduledAt, contactIds } = req.body;
      if (!name || !instanceId || !templateId) {
        return res.status(400).json({ error: 'name, instanceId e templateId são obrigatórios. Toda campanha precisa de template com 3 variantes (anti-banimento).' });
      }
      // contactIds tem precedência sobre segmentTags. Se ambos vierem null/vazio, run usa "todos os contatos da org".
      const contactIdsJson = Array.isArray(contactIds) && contactIds.length > 0 ? JSON.stringify(contactIds) : null;
      const item = await prisma.campaign.create({
        data: {
          orgId, name, instanceId, templateId,
          segmentTags: segmentTags ? JSON.stringify(segmentTags) : null,
          contactIds: contactIdsJson,
          scheduledAt, status: 'draft',
        },
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
      if (!campaign.templateId) {
        return res.status(400).json({
          error: 'template_required',
          message: 'Toda campanha precisa de template com 3 variantes (anti-banimento). Edite a campanha e selecione um.',
        });
      }
      const template = await prisma.template.findUnique({ where: { id: campaign.templateId } });
      if (!template) {
        return res.status(400).json({
          error: 'template_not_found',
          message: 'Template vinculado não existe mais. Edite a campanha e selecione outro.',
        });
      }
      // Prioridade: contactIds (seleção manual) > segmentTags (filtro por tag) > todos
      type ContactRow = Awaited<ReturnType<typeof prisma.contact.findMany>>[number];
      let contacts: ContactRow[];
      if (campaign.contactIds) {
        try {
          const ids = JSON.parse(campaign.contactIds) as string[];
          contacts = ids.length
            ? await prisma.contact.findMany({ where: { orgId, id: { in: ids } } })
            : [];
        } catch {
          contacts = [];
        }
      } else {
        const tags = campaign.segmentTags ? (JSON.parse(campaign.segmentTags) as string[]) : [];
        contacts = tags.length
          ? await prisma.contact.findMany({ where: { orgId, tags: { contains: tags[0] } } })
          : await prisma.contact.findMany({ where: { orgId } });
      }
      if (contacts.length === 0) {
        return res.status(400).json({
          error: 'no_contacts',
          message: 'Nenhum destinatário selecionado. Edite a campanha e escolha contatos antes de executar.',
        });
      }

      // Lookup do nome Evolution (campaign.instanceId é UUID do DB; Evolution precisa do nome registrado nela)
      const inst = await prisma.instance.findUnique({ where: { id: campaign.instanceId } });
      const evoName = inst?.evolutionInstanceName || campaign.instanceId;

      await prisma.campaign.update({ where: { id }, data: { status: 'running' } });

      let sent = 0;
      let failed = 0;
      let blockedByLimit = 0;

      const minMs = settings.campaignJitterMinMs;
      const maxMs = settings.campaignJitterMaxMs;

      for (const c of contacts) {
        const check = await EnforcementService.canSendMessage(orgId, campaign.instanceId);
        if (!check.allowed) {
          blockedByLimit += 1;
          await prisma.campaign.update({ where: { id }, data: { status: 'rate_limited' } }).catch(() => {});
          break;
        }

        const variant = pickVariantBody(template);
        const raw = variant !== null ? variant : template.body;
        const body = renderTemplate(raw, {
          name: c.name || '',
          phone: c.phone,
        });

        try {
          await EvolutionService.sendText(evoName, c.phone, body);
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
