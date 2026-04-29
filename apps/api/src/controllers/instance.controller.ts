import { Request, Response } from 'express';
import { EvolutionService } from '../services/evolution.service';
import { prisma } from '../lib/prisma';
import { Instance as PrismaInstance } from '@prisma/client';
import { EnforcementService } from '../services/enforcement.service';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';
import { AuditService } from '../services/audit.service';
export class InstanceController {
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });

      const instances = await prisma.instance.findMany({
        where: { orgId },
      });

      try {
          const evoInstances = await EvolutionService.fetchInstances();
          const list = Array.isArray(evoInstances) ? evoInstances : [];
          const syncedInstances = await Promise.all(instances.map(async (inst: PrismaInstance) => {
              const evo = list.find((e: any) => e.name === inst.id || e.name === inst.name);
              const evoStatus = evo?.connectionStatus;
              const status = evoStatus === 'open' ? 'connected' : evoStatus === 'connecting' ? 'connecting' : 'disconnected';
              if (status !== inst.status) {
                  await prisma.instance.update({ where: { id: inst.id }, data: { status } }).catch(() => null);
              }
              return { ...inst, status };
          }));
          return res.json(syncedInstances);
      } catch (e) {
          console.warn("Failed to sync with Evolution API, returning DB state");
          return res.json(instances);
      }
    } catch (error: any) {
      console.error('instance.list error:', error);
      res.status(500).json({ error: error.message || 'Failed to list instances' });
    }
  }

  static async create(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string | undefined;
    const orgId = (req.body?.orgId as string | undefined) || (req.headers['x-org-id'] as string | undefined);
    const name = req.body?.name as string | undefined;

    if (!name || !orgId) {
      return res.status(400).json({ error: 'Name and orgId are required' });
    }

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const user = await prisma.user.findUnique({ where: { logtoId: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const allowed = await EnforcementService.canCreateInstance(orgId);
      if (!allowed) return res.status(403).json({ error: 'Instance limit reached for your plan' });
      // 1. Create in DB first (pending)
      const instance = await prisma.instance.create({
        data: {
          name,
          orgId,
          userId: user.id,
          status: 'created'
        }
      });
      await AuditService.log(orgId, 'instance.create', undefined, { id: instance.id, name });

      // 2. Create in Evolution API
      // Use DB ID or Name as instance name in Evolution to ensure uniqueness? 
      // Plan says "ID, status...". Using ID is safer.
      const evoName = instance.id; 
      
      const evoResult = await EvolutionService.createInstance(evoName);
      
      // 3. Update DB
      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          token: evoResult.hash?.apikey || evoResult.token, // Adjust based on actual Evolution response
          status: 'disconnected'
        }
      });

      res.json({ instance, evolution: evoResult });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getQr(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const result = await EvolutionService.connectInstance(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
  
  static async delete(req: Request, res: Response) {
      const { id } = req.params;
      
      try {
          await EvolutionService.deleteInstance(id);
          await prisma.instance.delete({ where: { id } });
          res.json({ success: true });
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  }

  static async sendText(req: Request, res: Response) {
    const { instanceId } = req.params;
    const { number, text } = req.body;
    const orgId = req.headers['x-org-id'] as string;

    try {
      const allowed = await EnforcementService.canSendMessage(orgId);
      if (!allowed) return res.status(429).json({ error: 'Daily message limit reached' });
      const result = await EvolutionService.sendText(instanceId, number, text);
      // Log message in DB
      await prisma.message.create({
        data: {
          orgId,
          instanceId,
          to: number,
          body: text,
          type: 'text',
          status: 'sent'
        }
      });
      await EnforcementService.incrementMessageCount(orgId);
      await WebhookDeliveryService.trigger(orgId, 'message.sent', { instanceId, number, text });
      res.json(result);
    } catch (error: any) {
      await prisma.message.create({
        data: {
          orgId,
          instanceId,
          to: number,
          body: text,
          type: 'text',
          status: 'failed',
          error: error.message
        }
      });
      await WebhookDeliveryService.trigger(orgId, 'message.failed', { instanceId, number, text, error: error.message });
      res.status(500).json({ error: error.message });
    }
  }
}
