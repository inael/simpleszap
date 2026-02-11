import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EvolutionService } from '../services/evolution.service';

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
    for (const c of contacts) {
      const body = template ? template.body : 'Olá';
      await EvolutionService.sendText(campaign.instanceId, c.phone, body);
      await prisma.message.create({ data: { orgId, instanceId: campaign.instanceId, to: c.phone, body, type: 'text', status: 'sent' } });
    }
    await prisma.campaign.update({ where: { id }, data: { status: 'done' } });
    res.json({ success: true, count: contacts.length });
  }
}
