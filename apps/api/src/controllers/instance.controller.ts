import crypto from 'crypto';
import { Request, Response } from 'express';
import { EvolutionService } from '../services/evolution.service';
import { prisma } from '../lib/prisma';
import { Instance as PrismaInstance } from '@prisma/client';
import { EnforcementService } from '../services/enforcement.service';
import { respondEnforcementDenied } from '../lib/enforcement-error';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';
import { AuditService } from '../services/audit.service';
import { BetaFeaturesController } from './beta-features.controller';
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

  /**
   * Envia mensagem com botões interativos. Requer aceitação da feature beta
   * "buttons" (POST /me/beta-features). Entrega não é garantida — depende da
   * Meta. Body: passa direto pro Evolution (number + buttons no formato dele).
   */
  static async sendButtons(req: Request, res: Response) {
    const { instanceId } = req.params;
    const orgId = req.headers['x-org-id'] as string;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Aceitação dos termos
    const accepted = await BetaFeaturesController.requireAccepted(orgId, 'buttons', res);
    if (!accepted) return;

    // 2. Enforcement de limite de mensagens
    const check = await EnforcementService.canSendMessage(orgId);
    if (!check.allowed) return respondEnforcementDenied(res, check);

    // 3. Ownership da instância
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.orgId !== orgId) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    const evoName = instance.evolutionInstanceName || instanceId;
    const number = (req.body?.number as string | undefined) || '';

    try {
      const result = await EvolutionService.sendButtons(evoName, req.body);
      await prisma.message.create({
        data: {
          orgId,
          instanceId,
          to: number,
          body: JSON.stringify(req.body),
          type: 'buttons',
          status: 'sent',
        },
      });
      await EnforcementService.incrementMessageCount(orgId);
      await WebhookDeliveryService.trigger(orgId, 'message.sent', { instanceId, number, type: 'buttons' });
      res.json(result);
    } catch (error: any) {
      await prisma.message.create({
        data: {
          orgId,
          instanceId,
          to: number,
          body: JSON.stringify(req.body),
          type: 'buttons',
          status: 'failed',
          error: error.message,
        },
      });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Gera (ou regenera) link público temporário pra escanear o QR sem login.
   * Útil pra enviar pra um terceiro conectar à distância (cliente, assistente).
   * Token expira em PUBLIC_CONNECT_LINK_TTL_MIN (padrão 30min) e é apagado
   * automaticamente quando a instância conecta (no sync de list).
   */
  static async createConnectLink(req: Request, res: Response) {
    const { id } = req.params;
    const orgId = req.headers['x-org-id'] as string | undefined;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });

    const instance = await prisma.instance.findUnique({ where: { id } });
    if (!instance || instance.orgId !== orgId) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const ttlMin = parseInt(process.env.PUBLIC_CONNECT_LINK_TTL_MIN || '30', 10);
    const token = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

    await prisma.instance.update({
      where: { id },
      data: { publicConnectToken: token, publicConnectTokenExpiresAt: expiresAt },
    });
    await AuditService.log(orgId, 'instance.public_link.created', undefined, { id, expiresAt });

    const baseUrl = process.env.PUBLIC_WEB_URL || 'https://simpleszap.com';
    res.json({
      token,
      url: `${baseUrl}/connect/${token}`,
      expiresAt,
      ttlMinutes: ttlMin,
    });
  }

  /** Revoga link público manualmente (sem esperar expiração). */
  static async revokeConnectLink(req: Request, res: Response) {
    const { id } = req.params;
    const orgId = req.headers['x-org-id'] as string | undefined;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });

    const instance = await prisma.instance.findUnique({ where: { id } });
    if (!instance || instance.orgId !== orgId) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    await prisma.instance.update({
      where: { id },
      data: { publicConnectToken: null, publicConnectTokenExpiresAt: null },
    });
    res.json({ revoked: true });
  }

  /**
   * Endpoint PÚBLICO (sem auth). Recebe o token gerado por createConnectLink
   * e retorna QR + status. Quando a instância conecta, o token é apagado pelo
   * sync no /instances — chamadas subsequentes retornam 410 Gone.
   */
  static async getPublicConnect(req: Request, res: Response) {
    const { token } = req.params;
    if (!token || token.length < 16) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const instance = await prisma.instance.findUnique({
      where: { publicConnectToken: token },
    });
    if (!instance) {
      return res.status(404).json({ error: 'Link inválido ou já utilizado.' });
    }
    if (instance.publicConnectTokenExpiresAt && instance.publicConnectTokenExpiresAt < new Date()) {
      // Expirado — limpa e responde 410
      await prisma.instance.update({
        where: { id: instance.id },
        data: { publicConnectToken: null, publicConnectTokenExpiresAt: null },
      });
      return res.status(410).json({ error: 'Link expirado. Peça outro ao remetente.' });
    }

    // Se já conectado, sinaliza pra UI fechar
    if (instance.status === 'connected' || instance.status === 'open') {
      await prisma.instance.update({
        where: { id: instance.id },
        data: { publicConnectToken: null, publicConnectTokenExpiresAt: null },
      });
      return res.json({ state: 'open', message: 'Já conectado.' });
    }

    try {
      const evoName = instance.evolutionInstanceName || instance.id;
      const result = await EvolutionService.connectInstance(evoName);
      const base64 = result?.base64 || result?.qrcode?.base64 || null;
      const state = result?.instance?.state || 'connecting';

      // Se o Evolution já reporta open, limpa o token agora.
      if (state === 'open') {
        await prisma.instance.update({
          where: { id: instance.id },
          data: { status: 'connected', publicConnectToken: null, publicConnectTokenExpiresAt: null },
        });
      }

      res.json({
        state,
        base64,
        instanceName: instance.name,
        expiresAt: instance.publicConnectTokenExpiresAt,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao gerar QR.' });
    }
  }
}
