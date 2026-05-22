import { Request, Response } from 'express';
import { EvolutionService } from '../services/evolution.service';
import { prisma } from '../lib/prisma';
import { Instance as PrismaInstance } from '@prisma/client';
import { EnforcementService } from '../services/enforcement.service';
import { respondEnforcementDenied } from '../lib/enforcement-error';
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
              const evo = list.find((e: any) =>
                e.name === inst.evolutionInstanceName ||
                e.name === inst.id ||
                e.name === inst.name
              );
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

      const check = await EnforcementService.canCreateInstance(orgId);
      if (!check.allowed) return respondEnforcementDenied(res, check);
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
      // Nome enviado à Evolution: simpleszap_<slug>_<8chars>. Identifica origem
      // (Evolution é compartilhada com outros produtos IT Booster) + preserva nome
      // do cliente. Persistido em evolutionInstanceName pra todas as chamadas futuras.
      const evoName = EvolutionService.buildInstanceName(instance.id, name);

      const evoResult = await EvolutionService.createInstance(evoName);

      // 3. Update DB
      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          evolutionInstanceName: evoName,
          token: evoResult.hash?.apikey || evoResult.token,
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
    const orgId = req.headers['x-org-id'] as string | undefined;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const instance = await prisma.instance.findUnique({ where: { id } });
      if (!instance || instance.orgId !== orgId) {
        return res.status(404).json({ error: 'Instance not found' });
      }
      // Fallback pra id puro pra instâncias criadas antes da coluna existir
      const evoName = instance.evolutionInstanceName || instance.id;
      const result = await EvolutionService.connectInstance(evoName);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
      const { id } = req.params;

      try {
          const instance = await prisma.instance.findUnique({ where: { id } });
          const evoName = instance?.evolutionInstanceName || id;
          await EvolutionService.deleteInstance(evoName).catch((e) => {
            // Se a Evolution já não tem essa instância (ex: limpeza manual), segue o delete no DB
            console.warn('Evolution delete failed (continuing with DB delete):', e?.message);
          });
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
      const check = await EnforcementService.canSendMessage(orgId);
      if (!check.allowed) return respondEnforcementDenied(res, check);
      // Lookup do nome Evolution: cliente passa nosso DB id na URL, mas a Evolution
      // precisa do nome registrado nela (simpleszap_<slug>_<id> ou id legacy).
      const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
      const evoName = instance?.evolutionInstanceName || instanceId;
      const result = await EvolutionService.sendText(evoName, number, text);
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
