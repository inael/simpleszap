import crypto from 'crypto';
import { Request, Response } from 'express';
import { EvolutionService } from '../services/evolution.service';
import { ProviderService, providerOf } from '../services/provider.service';
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
    const rawPhone = req.body?.phoneNumber as string | undefined;
    // Provider escolhido no toggle da UI (default: evolution, comportamento atual).
    const provider = providerOf({ provider: req.body?.provider });
    // Meta oficial precisa de { phoneNumberId, wabaId?, accessToken, verifyToken? }.
    const providerConfig = provider === 'meta_cloud' ? (req.body?.providerConfig || null) : null;

    if (!name || !orgId) {
      return res.status(400).json({ error: 'Name and orgId are required' });
    }
    if (!ProviderService.supported(provider)) {
      return res.status(400).json({ error: `Provider inválido: ${provider}` });
    }

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Numero WhatsApp obrigatorio. Normaliza pra E.164 BR (sem +) e bloqueia
    // duplicata cross-tenant antes de criar inst no DB/Evolution.
    const phoneNumber = normalizePhoneBR(String(rawPhone || ''));
    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Número do WhatsApp é obrigatório. Informe o número que vai parear (com DDD).',
        code: 'PHONE_REQUIRED',
      });
    }

    try {
      const user = await prisma.user.findUnique({ where: { logtoId: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const check = await EnforcementService.canCreateInstance(orgId);
      if (!check.allowed) return respondEnforcementDenied(res, check);

      // Bloqueia duplicata por nome dentro da mesma org. Sem isso,
      // double-click no botão "Criar" gerava 2 instâncias com mesmo nome.
      const trimmedName = name.trim();
      const existing = await prisma.instance.findFirst({
        where: { orgId, name: trimmedName },
      });
      if (existing) {
        return res.status(409).json({
          error: `Já existe uma instância chamada "${trimmedName}" nesta conta. Escolha outro nome.`,
        });
      }

      // Bloqueia duplicata na MESMA org. User nao pode ter 2 instancias com
      // o mesmo numero — gera confusao de qual inst usar pra enviar/receber.
      // Sugere reutilizar ou deletar a existente.
      const sameOrgDup = await prisma.instance.findFirst({
        where: { phoneNumber, orgId },
        select: { id: true, name: true, status: true },
      });
      if (sameOrgDup) {
        return res.status(409).json({
          error: `Você já tem uma instância (${sameOrgDup.name}) usando esse número. Conecte ela ou exclua antes de criar uma nova.`,
          code: 'PHONE_ALREADY_IN_YOUR_ACCOUNT',
          existingInstanceId: sameOrgDup.id,
        });
      }

      // Bloqueia duplicata em OUTRA org SimplesZap (qualquer status — inclusive
      // 'disconnected' que e o default pos-create antes do pareamento). Sem
      // o filtro de status, instancias recem-criadas mas nao pareadas tambem
      // disparam o bloqueio — que e o comportamento correto.
      const phoneInUse = await prisma.instance.findFirst({
        where: {
          phoneNumber,
          NOT: { orgId },
        },
        select: { id: true, orgId: true },
      });
      if (phoneInUse) {
        await AuditService.log(orgId, 'instance.create.blocked_phone_dup', undefined, {
          phoneNumber,
          conflictInstanceId: phoneInUse.id,
          conflictOrgId: phoneInUse.orgId,
        });
        return res.status(409).json({
          error: 'Este número WhatsApp já está sendo usado por outra conta no SimplesZap. Se acredita que isso é um engano, entre em contato com o suporte.',
          code: 'PHONE_ALREADY_IN_USE',
          supportUrl: 'https://simpleszap.com/contato',
        });
      }

      // Check #2: instancia ORFA na Evolution com mesmo numero (criada fora do
      // SimplesZap, sem registro no nosso DB). Sem isso, user consegue criar
      // mesmo havendo conflito real no gateway. Best-effort: se Evolution
      // estiver fora do ar, ignora e segue (degrada UX, nao bloqueia o create).
      // Só faz sentido pra provider Evolution — WAHA/Meta têm outro backend.
      if (provider === 'evolution') try {
        const evoInstances = await EvolutionService.fetchInstances();
        const list = Array.isArray(evoInstances) ? evoInstances : [];
        const conflictEvo = list.find((i: any) => {
          const jid = String(i?.ownerJid || '');
          return jid.startsWith(phoneNumber + '@');
        });
        if (conflictEvo) {
          // Pertence a alguma org do SimplesZap? Se sim, e for OUTRA org, ja foi
          // pego no phoneInUse acima. Se nao for de nenhuma org SimplesZap, é
          // orfa de uso direto na Evolution -> bloqueia tambem.
          const ownedHere = await prisma.instance.findFirst({
            where: { evolutionInstanceName: conflictEvo.name },
            select: { orgId: true },
          });
          if (!ownedHere || ownedHere.orgId !== orgId) {
            await AuditService.log(orgId, 'instance.create.blocked_evo_dup', undefined, {
              phoneNumber,
              evoInstanceName: conflictEvo.name,
              ownedByOrgId: ownedHere?.orgId || null,
            });
            return res.status(409).json({
              error: 'Este número WhatsApp já está pareado em outro local. Desconecte primeiro ou entre em contato com o suporte.',
              code: 'PHONE_ALREADY_IN_USE',
              supportUrl: 'https://simpleszap.com/contato',
            });
          }
        }
      } catch (err: any) {
        console.warn('[instance.create] Evolution check fail (degrade gracefully):', err?.message);
      }

      // 1. Create in DB first (pending), já com o provider escolhido
      const instance = await prisma.instance.create({
        data: {
          name: trimmedName,
          phoneNumber,
          orgId,
          userId: user.id,
          status: 'created',
          provider,
          ...(providerConfig ? { providerConfig } : {}),
        }
      });
      await AuditService.log(orgId, 'instance.create', undefined, { id: instance.id, name, provider });

      // 2. Provisiona no backend do provider escolhido.
      // Nome enviado ao backend: simpleszap_<slug>_<8chars>. Identifica origem
      // (backends são compartilhados entre produtos IT Booster) + preserva nome
      // do cliente. Persistido em evolutionInstanceName (serve pros 3 providers).
      const backendName = EvolutionService.buildInstanceName(instance.id, name);

      const created = await ProviderService.createBackend(provider, backendName);

      // 3. Update DB. Meta oficial já vem conectado (número provisionado, sem QR).
      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          evolutionInstanceName: backendName,
          token: created.token,
          status: provider === 'meta_cloud' ? 'connected' : 'disconnected'
        }
      });

      res.json({ instance: { ...instance, evolutionInstanceName: backendName, provider }, provider, backend: created.raw });
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
      // Roteia pelo provider — WAHA devolve QR via WahaService, Evolution via connect.
      const result = await ProviderService.getQr(instance);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
      const { id } = req.params;

      try {
          const instance = await prisma.instance.findUnique({ where: { id } });
          // Deleta no backend do provider (WAHA para+deleta sessão, Evolution deleta instância).
          if (instance) await ProviderService.deleteBackend(instance);
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
      const result = await ProviderService.getQr(instance);
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
    const { number: rawNumber, presence, delayMs, delay } = req.body;
    const effectiveDelay = typeof delayMs === 'number' ? delayMs : typeof delay === 'number' ? delay : undefined;
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
      const result = await ProviderService.sendPresence(instance, number, presence, effectiveDelay);
      res.status(200).json({ ok: true, presence, result });
    } catch (error: any) {
      console.error('instance.sendPresence error:', error);
      res.status(500).json({ error: error.message || 'Failed to send presence' });
    }
  }
}
