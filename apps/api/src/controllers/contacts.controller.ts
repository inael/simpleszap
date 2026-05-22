import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuditService } from '../services/audit.service';
import { EvolutionService } from '../services/evolution.service';

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

  /**
   * POST /contacts/import/:instanceId — importa todos os contatos sincronizados
   * pela Evolution naquela instância. Exige instância conectada (`open`/`connected`).
   * Phone global-único: duplicados são ignorados (skipDuplicates).
   */
  static async importFromInstance(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      const { instanceId } = req.params;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });

      const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
      if (!instance || instance.orgId !== orgId) {
        return res.status(404).json({ error: 'Instância não encontrada' });
      }
      if (instance.status !== 'connected' && instance.status !== 'open') {
        return res.status(409).json({ error: 'Instância não está conectada. Escaneie o QR antes de importar.' });
      }

      const evoName = instance.evolutionInstanceName || instance.id;
      const raw = await EvolutionService.findContacts(evoName);

      // Filtra grupos (@g.us), broadcasts e status. Mantém só usuários (@s.whatsapp.net / @lid).
      const userContacts = (raw as Array<{ id?: string; remoteJid?: string; pushName?: string }>)
        .map((c) => {
          const jid = (c.id || c.remoteJid || '').toString();
          const phone = jid.split('@')[0];
          const isUser = jid.endsWith('@s.whatsapp.net') || jid.endsWith('@c.us');
          return { phone, name: c.pushName || null, isUser, jid };
        })
        .filter((c) => c.isUser && /^\d{10,15}$/.test(c.phone));

      if (userContacts.length === 0) {
        return res.json({ imported: 0, skipped: 0, total: 0, message: 'Nenhum contato válido encontrado na instância' });
      }

      const result = await prisma.contact.createMany({
        data: userContacts.map((c) => ({ orgId, name: c.name, phone: c.phone })),
        skipDuplicates: true,
      });

      await AuditService.log(orgId, 'contacts.import', undefined, {
        instanceId,
        total: userContacts.length,
        imported: result.count,
      });

      res.json({
        imported: result.count,
        skipped: userContacts.length - result.count,
        total: userContacts.length,
      });
    } catch (error: any) {
      console.error('contacts.import error:', error);
      res.status(500).json({ error: error.message || 'Failed to import contacts' });
    }
  }
}
