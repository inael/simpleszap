import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuditService } from '../services/audit.service';

export class ContactsController {
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });
      const contacts = await prisma.contact.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
      res.json(contacts);
    } catch (error: any) {
      console.error('contacts.list error:', error);
      res.status(500).json({ error: error.message || 'Failed to list contacts' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      const { name, phone, tags } = req.body;
      if (!orgId || !phone) return res.status(400).json({ error: 'orgId and phone required' });
      const contact = await prisma.contact.create({ data: { orgId, name, phone, tags } });
      await AuditService.log(orgId, 'contact.create', undefined, { id: contact.id, phone });
      res.json(contact);
    } catch (error: any) {
      console.error('contacts.create error:', error);
      if (error?.code === 'P2002') {
        return res.status(409).json({ error: 'Contato com este telefone já existe' });
      }
      res.status(500).json({ error: error.message || 'Failed to create contact' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, phone, tags } = req.body;
      const contact = await prisma.contact.update({ where: { id }, data: { name, phone, tags } });
      res.json(contact);
    } catch (error: any) {
      console.error('contacts.update error:', error);
      res.status(500).json({ error: error.message || 'Failed to update contact' });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.contact.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error('contacts.remove error:', error);
      res.status(500).json({ error: error.message || 'Failed to remove contact' });
    }
  }
}
