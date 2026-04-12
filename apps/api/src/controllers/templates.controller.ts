import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuditService } from '../services/audit.service';

export class TemplatesController {
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });
      const templates = await prisma.template.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
      res.json(templates);
    } catch (error: any) {
      console.error('templates.list error:', error);
      res.status(500).json({ error: error.message || 'Failed to list templates' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      const { name, body, variables } = req.body;
      if (!orgId || !name || !body) return res.status(400).json({ error: 'orgId, name and body required' });
      const template = await prisma.template.create({ data: { orgId, name, body, variables } });
      await AuditService.log(orgId, 'template.create', undefined, { id: template.id, name });
      res.json(template);
    } catch (error: any) {
      console.error('templates.create error:', error);
      res.status(500).json({ error: error.message || 'Failed to create template' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, body, variables } = req.body;
      const template = await prisma.template.update({ where: { id }, data: { name, body, variables } });
      res.json(template);
    } catch (error: any) {
      console.error('templates.update error:', error);
      res.status(500).json({ error: error.message || 'Failed to update template' });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.template.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error('templates.remove error:', error);
      res.status(500).json({ error: error.message || 'Failed to remove template' });
    }
  }
}
