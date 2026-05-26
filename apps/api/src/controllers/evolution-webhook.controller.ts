import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';

/**
 * Recebe webhooks da Evolution API e traduz pro modelo SimplesZap.
 *
 * Pipeline:
 *  1. Evolution dispara POST /webhooks/evolution/:instanceName com body padrão Evolution v2
 *  2. Aqui: lookup da Instance no DB via evolutionInstanceName ou id
 *  3. Parser específico do tipo do evento Evolution → 1+ eventos SimplesZap
 *  4. Persiste msgs entrantes em prisma.message (direction='received')
 *  5. Dispara WebhookDeliveryService.trigger(orgId, eventName, payload)
 *     → filtra contra os events assinados em WebhookConfig do cliente
 *
 * Sem auth: Evolution chama direto. Em produção, considerar token compartilhado
 * via header (env EVOLUTION_WEBHOOK_TOKEN) — pulado por hora pra agilizar.
 */

type EvolutionPayload = {
  event?: string;
  instance?: string;
  data?: any;
  destination?: string;
  server_url?: string;
  date_time?: string;
  sender?: string;
  apikey?: string;
};

function normalizeJidNumber(jid: string | undefined): string {
  if (!jid) return '';
  // jid formato "5511999999999@s.whatsapp.net" ou "...@g.us" (grupo)
  return jid.split('@')[0];
}

function pickMediaInfo(message: any) {
  // Evolution v2 com base64=true: media vem como base64 string em mediaMessage,
  // mas também tem urls de upload. Aqui retornamos o que conseguimos extrair.
  if (message?.audioMessage) {
    return {
      kind: 'audio' as const,
      eventName: 'message.audio.received',
      mediaUrl: message.audioMessage.url || null,
      mimetype: message.audioMessage.mimetype,
      durationSeconds: message.audioMessage.seconds,
    };
  }
  if (message?.imageMessage) {
    return {
      kind: 'image' as const,
      eventName: 'message.image.received',
      mediaUrl: message.imageMessage.url || null,
      mimetype: message.imageMessage.mimetype,
      caption: message.imageMessage.caption,
    };
  }
  if (message?.videoMessage) {
    return {
      kind: 'video' as const,
      eventName: 'message.video.received',
      mediaUrl: message.videoMessage.url || null,
      mimetype: message.videoMessage.mimetype,
      caption: message.videoMessage.caption,
    };
  }
  if (message?.documentMessage) {
    return {
      kind: 'document' as const,
      eventName: 'message.document.received',
      mediaUrl: message.documentMessage.url || null,
      mimetype: message.documentMessage.mimetype,
      fileName: message.documentMessage.fileName,
    };
  }
  if (message?.locationMessage) {
    return {
      kind: 'location' as const,
      eventName: 'message.location.received',
      mediaUrl: null,
      latitude: message.locationMessage.degreesLatitude,
      longitude: message.locationMessage.degreesLongitude,
      name: message.locationMessage.name,
      address: message.locationMessage.address,
    };
  }
  return null;
}

export class EvolutionWebhookController {
  static async handle(req: Request, res: Response) {
    const instanceName = req.params.instanceName;
    const body = (req.body || {}) as EvolutionPayload;

    // Evolution pode chamar várias vezes; respondemos rápido pra não dar timeout.
    // Processamento assíncrono via try/catch silencioso — Evolution não suporta retry granular.
    setImmediate(() => {
      void EvolutionWebhookController.process(instanceName, body).catch((e) => {
        console.error('evolution-webhook process error:', e?.message || e);
      });
    });
    return res.status(200).json({ ok: true });
  }

  static async process(instanceName: string, body: EvolutionPayload) {
    const instance = await prisma.instance.findFirst({
      where: {
        OR: [{ evolutionInstanceName: instanceName }, { id: instanceName }],
      },
    });
    if (!instance) {
      console.warn(`evolution-webhook: instance not found "${instanceName}"`);
      return;
    }
    const orgId = instance.orgId || '';
    if (!orgId) return;

    const evt = String(body.event || '').toUpperCase().replace(/\./g, '_');
    const data = body.data || {};
    const occurredAt = body.date_time ? new Date(body.date_time) : new Date();

    // ====== MESSAGES_UPSERT — mensagem nova ======
    if (evt === 'MESSAGES_UPSERT') {
      const msgs = Array.isArray(data.messages) ? data.messages : [data];
      for (const raw of msgs) {
        const key = raw?.key || {};
        const fromMe = !!key.fromMe;
        const messageId = key.id as string | undefined;
        const remoteJid = key.remoteJid as string | undefined;
        const remoteJidAlt = key.remoteJidAlt as string | undefined;
        // Evolution v2 dispara MESSAGES_UPSERT duas vezes pra mesma msg:
        // uma com remoteJid em formato @lid (Linked Identifier baileys, ex:
        // "201154877239484@lid") e outra com @s.whatsapp.net (número phone real).
        // Se a versão LID chegar primeiro, o dedup por messageId bloqueia a
        // versão phone — resultado: `to` fica com LID-string (não-numérico) e o
        // lead some do funil. Solução: quando o jid principal é @lid, preferir
        // remoteJidAlt (que costuma trazer o phone real).
        const effectiveJid = remoteJid?.includes('@lid') && remoteJidAlt?.includes('@s.whatsapp.net')
          ? remoteJidAlt
          : remoteJid;
        const number = normalizeJidNumber(effectiveJid);
        const fromName = raw?.pushName || null;
        const message = raw?.message || {};

        // Reaction vem como reactionMessage dentro de MESSAGES_UPSERT
        // (Evolution v2 não tem evento MESSAGES_REACTION separado)
        if (message?.reactionMessage) {
          const reactedKey = message.reactionMessage.key || {};
          await WebhookDeliveryService.trigger(orgId, 'message.reaction', {
            instanceId: instance.id,
            messageId: reactedKey.id,
            from: normalizeJidNumber(reactedKey.remoteJid || remoteJid),
            emoji: message.reactionMessage.text || '',
            fromMe,
            occurredAt,
          }).catch(() => null);
          continue;
        }

        if (fromMe) continue; // já temos message.sent ao enfileirar/processar

        const quotedMessageId = message.extendedTextMessage?.contextInfo?.stanzaId
          || raw?.contextInfo?.stanzaId
          || null;

        const text = message.conversation || message.extendedTextMessage?.text || null;
        const media = pickMediaInfo(message);

        // Dedup via whatsappMessageId
        if (messageId) {
          const existing = await prisma.message.findUnique({ where: { whatsappMessageId: messageId } }).catch(() => null);
          if (existing) continue;
        }

        if (text) {
          await prisma.message.create({
            data: {
              orgId,
              instanceId: instance.id,
              to: number,
              body: text,
              type: 'text',
              status: 'received',
              direction: 'received',
              whatsappMessageId: messageId,
              fromName,
              quotedMessageId,
            },
          }).catch(() => null);

          await WebhookDeliveryService.trigger(orgId, 'message.received', {
            instanceId: instance.id,
            messageId,
            from: number,
            fromName,
            fromMe: false,
            type: 'text',
            text,
            quotedMessageId,
            occurredAt,
          }).catch(() => null);
        } else if (media) {
          await prisma.message.create({
            data: {
              orgId,
              instanceId: instance.id,
              to: number,
              body: (media as any).caption || (media as any).fileName || '',
              type: media.kind,
              status: 'received',
              direction: 'received',
              whatsappMessageId: messageId,
              mediaUrl: media.mediaUrl,
              fromName,
              quotedMessageId,
            },
          }).catch(() => null);

          await WebhookDeliveryService.trigger(orgId, media.eventName, {
            instanceId: instance.id,
            messageId,
            from: number,
            fromName,
            type: media.kind,
            ...media,
            quotedMessageId,
            occurredAt,
          }).catch(() => null);
        }
      }
      return;
    }

    // ====== MESSAGES_UPDATE — delivered / read ======
    if (evt === 'MESSAGES_UPDATE') {
      const updates = Array.isArray(data.updates) ? data.updates : Array.isArray(data) ? data : [data];
      for (const upd of updates) {
        const key = upd?.key || upd?.messageKey || {};
        const status = String(upd?.status || upd?.update?.status || '').toUpperCase();
        const messageId = key.id || upd?.messageId;
        const remoteJid = key.remoteJid || upd?.remoteJid;
        const to = normalizeJidNumber(remoteJid);
        if (!messageId) continue;

        if (status.includes('READ')) {
          await WebhookDeliveryService.trigger(orgId, 'message.read', {
            instanceId: instance.id,
            messageId,
            to,
            readAt: occurredAt,
          }).catch(() => null);
          await prisma.message.updateMany({
            where: { whatsappMessageId: messageId },
            data: { status: 'read' },
          }).catch(() => null);
        } else if (status.includes('DELIVERY') || status.includes('DELIVERED')) {
          await WebhookDeliveryService.trigger(orgId, 'message.delivered', {
            instanceId: instance.id,
            messageId,
            to,
            deliveredAt: occurredAt,
          }).catch(() => null);
          await prisma.message.updateMany({
            where: { whatsappMessageId: messageId },
            data: { status: 'delivered' },
          }).catch(() => null);
        }
      }
      return;
    }

    // ====== MESSAGES_REACTION ======
    if (evt === 'MESSAGES_REACTION') {
      const reactions = Array.isArray(data.reactions) ? data.reactions : [data];
      for (const r of reactions) {
        const reactedKey = r?.reaction?.key || r?.key || {};
        const from = normalizeJidNumber(reactedKey.remoteJid || r?.from);
        await WebhookDeliveryService.trigger(orgId, 'message.reaction', {
          instanceId: instance.id,
          messageId: reactedKey.id || r?.messageId,
          from,
          emoji: r?.reaction?.text || r?.text || '',
          occurredAt,
        }).catch(() => null);
      }
      return;
    }

    // ====== CONNECTION_UPDATE ======
    if (evt === 'CONNECTION_UPDATE') {
      const state = String(data.state || data.connection || '').toLowerCase();
      if (state === 'open') {
        await prisma.instance.update({
          where: { id: instance.id },
          data: { status: 'connected', publicConnectToken: null, publicConnectTokenExpiresAt: null },
        }).catch(() => null);
        await WebhookDeliveryService.trigger(orgId, 'instance.connected', {
          instanceId: instance.id,
          phoneNumber: data.profile?.number || data.wuid || null,
          profileName: data.profile?.name || null,
          profilePictureUrl: data.profile?.picture || null,
          occurredAt,
        }).catch(() => null);
      } else if (state === 'close' || state === 'closed') {
        await prisma.instance.update({
          where: { id: instance.id },
          data: { status: 'disconnected' },
        }).catch(() => null);
        await WebhookDeliveryService.trigger(orgId, 'instance.disconnected', {
          instanceId: instance.id,
          reason: data.reason || data.statusReason || null,
          lastSeenAt: occurredAt,
        }).catch(() => null);
      }
      return;
    }

    // ====== QRCODE_UPDATED ======
    if (evt === 'QRCODE_UPDATED') {
      const qrcodeBase64 = data.qrcode?.base64 || data.base64 || null;
      await WebhookDeliveryService.trigger(orgId, 'instance.qrcode.generated', {
        instanceId: instance.id,
        qrcodeBase64,
        expiresInSeconds: 60,
        occurredAt,
      }).catch(() => null);
      return;
    }

    // ====== CONTACTS_UPDATE ======
    if (evt === 'CONTACTS_UPDATE') {
      const contacts = Array.isArray(data.contacts) ? data.contacts : Array.isArray(data) ? data : [data];
      for (const c of contacts) {
        await WebhookDeliveryService.trigger(orgId, 'contact.added', {
          instanceId: instance.id,
          number: normalizeJidNumber(c?.id || c?.remoteJid),
          name: c?.pushName || c?.name || c?.notify || null,
          profilePictureUrl: c?.profilePicUrl || null,
          occurredAt,
        }).catch(() => null);
      }
      return;
    }

    // ====== PRESENCE_UPDATE ======
    if (evt === 'PRESENCE_UPDATE') {
      const presences = data.presences || {};
      for (const [jid, pres] of Object.entries(presences as Record<string, any>)) {
        await WebhookDeliveryService.trigger(orgId, 'chat.presence', {
          instanceId: instance.id,
          from: normalizeJidNumber(jid),
          presence: pres?.lastKnownPresence || 'available',
          occurredAt,
        }).catch(() => null);
      }
      return;
    }

    // ====== SEND_MESSAGE — confirmação da Evolution que a msg foi aceita ======
    // (não disparamos webhook duplicado — message.sent já saiu no enqueue/process do cron)
    if (evt === 'SEND_MESSAGE') return;

    // Outros eventos: ignora silenciosamente (não dispara webhook)
  }
}
