import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class TemplatesController {
  static async list(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string;
    if (!orgId) return res.status(400).json({ error: 'orgId required' });
    const templates = await prisma.template.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
    res.json(templates);
  }

  static async create(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string;
    const { name, body, variables } = req.body;
    if (!orgId || !name || !body) return res.status(400).json({ error: 'orgId, name and body required' });
    const template = await prisma.template.create({ data: { orgId, name, body, variables } });
    res.json(template);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { name, body, variables } = req.body;
    const template = await prisma.template.update({ where: { id }, data: { name, body, variables } });
    res.json(template);
  }

  static async remove(req: Request, res: Response) {
    const { id } = req.params;
    await prisma.template.delete({ where: { id } });
    res.json({ success: true });
  }
}
