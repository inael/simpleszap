import { Request, Response } from 'express';
import { EvolutionService } from '../services/evolution.service';
import { prisma } from '../lib/prisma';
import { EnforcementService } from '../services/enforcement.service';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';
import { AuditService } from '../services/audit.service';

export class InstanceController {
  static async list(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string;

    const instances = await prisma.instance.findMany({
      where: orgId ? { orgId } : {},
    });

    // Optionally sync status with Evolution
    try {
        const evoInstances = await EvolutionService.fetchInstances();
        // Simple sync: Update status in memory for response (or update DB)
        // For now, let's map the status if found
        const syncedInstances = instances.map(inst => {
            const evo = Array.isArray(evoInstances) ? evoInstances.find((e: any) => e.instance.instanceName === inst.id || e.instance.instanceName === inst.name) : null;
            return {
                ...inst,
                status: evo ? evo.instance.status : 'disconnected' // Fallback if not found
            };
        });
        return res.json(syncedInstances);
    } catch (e) {
        console.warn("Failed to sync with Evolution API, returning DB state");
        return res.json(instances);
    }
  }

  static async create(req: Request, res: Response) {
    const { name, orgId } = req.body;

    if (!name || !orgId) {
      return res.status(400).json({ error: 'Name and orgId are required' });
    }

    try {
      const allowed = await EnforcementService.canCreateInstance(orgId);
      if (!allowed) return res.status(403).json({ error: 'Instance limit reached for your plan' });
      // 1. Create in DB first (pending)
      const instance = await prisma.instance.create({
        data: {
          name,
          orgId,
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
