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
import { MessageQueueController } from './message-queue.controller';
import { normalizePhoneBR } from '../lib/phone';
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
    const { number: rawNumber, text } = req.body;
    const number = normalizePhoneBR(String(rawNumber || ''));
    const orgId = req.headers['x-org-id'] as string;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });
    if (!number || !text) return res.status(400).json({ error: 'number e text são obrigatórios' });

    // Valida ownership da instância ANTES (precisa do instanceId pro enforcement)
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.orgId !== orgId) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    // Valida limite ANTES de enfileirar (evita encher fila quando já estourou)
    const check = await EnforcementService.canSendMessage(orgId, instanceId);
    if (!check.allowed) return respondEnforcementDenied(res, check);

    // Enfileira — o cron processa em FIFO por instância com jitter aleatório.
    // Resposta imediata (202 Accepted) com queueId pro cliente acompanhar.
    const queued = await MessageQueueController.enqueue({
      orgId,
      instanceId,
      type: 'text',
      number,
      body: text,
    });
    res.status(202).json({
      queued: true,
      queueId: queued.queueId,
      scheduledAt: queued.scheduledAt,
      position: queued.position,
    });
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

    // 2. Ownership da instância
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.orgId !== orgId) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    // 3. Enforcement de limite de mensagens (precisa do instanceId)
    const check = await EnforcementService.canSendMessage(orgId, instanceId);
    if (!check.allowed) return respondEnforcementDenied(res, check);
    const number = normalizePhoneBR(String(req.body?.number || ''));
    if (!number) return res.status(400).json({ error: 'number é obrigatório' });
    const payload = { ...req.body, number };

    // Enfileira (mesma lógica do sendText). Cron envia via Evolution depois.
    const queued = await MessageQueueController.enqueue({
      orgId,
      instanceId,
      type: 'buttons',
      number,
      payload,
    });
    res.status(202).json({
      queued: true,
      queueId: queued.queueId,
      scheduledAt: queued.scheduledAt,
      position: queued.position,
    });
  }

  /**
   * Envia mídia (imagem, vídeo, áudio, documento) via Evolution.
   * Body:
   *   {
   *     number: "5511999999999",          // E.164 BR (sem +)
   *     mediatype: "image|video|audio|document",
   *     media:    "https://... | data:..." // URL pública OU base64 data URI
   *     caption?: "legenda opcional",       // ignorado pra audio
   *     fileName?: "arquivo.pdf",           // usado pra document
   *     ptt?: true                          // só pra audio: push-to-talk
   *   }
   * Enfileira igual ao sendText — cron processa via Evolution depois.
   */
  static async sendMedia(req: Request, res: Response) {
    const { instanceId } = req.params;
    const { number: rawNumber, mediatype, media, caption, fileName, ptt } = req.body || {};
    const number = normalizePhoneBR(String(rawNumber || ''));
    const orgId = req.headers['x-org-id'] as string;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });
    if (!number || !media || !mediatype) {
      return res.status(400).json({ error: 'number, mediatype e media são obrigatórios' });
    }
    if (!['image', 'video', 'audio', 'document'].includes(mediatype)) {
      return res.status(400).json({ error: 'mediatype deve ser image, video, audio ou document' });
    }

    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.orgId !== orgId) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    const check = await EnforcementService.canSendMessage(orgId, instanceId);
    if (!check.allowed) return respondEnforcementDenied(res, check);

    const queued = await MessageQueueController.enqueue({
      orgId,
      instanceId,
      type: mediatype as 'image' | 'video' | 'audio' | 'document',
      number,
      body: caption || undefined,
      payload: { media, mediatype, caption, fileName, ptt: !!ptt },
    });
    res.status(202).json({
      queued: true,
      queueId: queued.queueId,
      scheduledAt: queued.scheduledAt,
      position: queued.position,
    });
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

  /**
   * Admin: itera todas as instâncias do DB e (re)configura o webhook na
   * Evolution. Útil pra subir instâncias antigas pro novo modelo de webhook
   * centralizado (PR7). Continua processando mesmo se uma falhar.
   */
  static async syncAllWebhooks(req: Request, res: Response) {
    try {
      const instances = await prisma.instance.findMany();
      const results = await Promise.all(
        instances.map(async (inst) => {
          const evoName = inst.evolutionInstanceName || inst.id;
          const ok = await EvolutionService.setInstanceWebhook(evoName);
          return { id: inst.id, name: inst.name, ok };
        })
      );
      const succeeded = results.filter((r) => r.ok).length;
      const failed = results.length - succeeded;
      res.json({ total: results.length, succeeded, failed, results });
    } catch (error: any) {
      console.error('instance.syncAllWebhooks error:', error);
      res.status(500).json({ error: error.message || 'Failed to sync webhooks' });
    }
  }

  /**
   * Dispara indicador de presença ("composing"/"recording"/"available") direto
   * pra Evolution, sem passar pela fila. Usado por agentes IA pra mostrar
   * "digitando..."/"gravando áudio..." enquanto o LLM processa a resposta.
   * Não conta no limite diário de mensagens.
   */
  static async sendPresence(req: Request, res: Response) {
    const { instanceId } = req.params;
    const { number: rawNumber, presence, delayMs } = req.body;
    const number = normalizePhoneBR(String(rawNumber || ''));
    const orgId = req.headers['x-org-id'] as string;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });
    if (!number || !presence) {
      return res.status(400).json({ error: 'number e presence são obrigatórios' });
    }
    const allowedStates = ['composing', 'recording', 'paused', 'available', 'unavailable'];
    if (!allowedStates.includes(presence)) {
      return res.status(400).json({ error: `presence deve ser um de: ${allowedStates.join(', ')}` });
    }

    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.orgId !== orgId) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    try {
      const evoName = instance.evolutionInstanceName || instance.id;
      const result = await EvolutionService.sendPresence(evoName, number, presence, delayMs);
      res.status(200).json({ ok: true, presence, result });
    } catch (error: any) {
      console.error('instance.sendPresence error:', error);
      res.status(500).json({ error: error.message || 'Failed to send presence' });
    }
  }
}
