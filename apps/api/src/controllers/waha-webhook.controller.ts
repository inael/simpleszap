import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';

// Adapter do WAHA -> eventos canonicos do SimplesZap. O objetivo e produzir
// EXATAMENTE os mesmos eventos que o evolution-webhook.controller produz
// (message.received, message.audio.received, instance.connected, ...), pra os
// consumidores (n8n/SDR) funcionarem sem saber que o backend e WAHA.

function jidToNumber(jid?: string): string {
  if (!jid) return '';
  return String(jid).split('@')[0];
}

// type do whatsapp-web.js (engine WEBJS do WAHA) -> evento canonico + kind
function mapMediaEvent(type: string): { event: string; kind: string } | null {
  switch (type) {
    case 'ptt':
    case 'audio': return { event: 'message.audio.received', kind: 'audio' };
    case 'image': return { event: 'message.image.received', kind: 'image' };
    case 'video': return { event: 'message.video.received', kind: 'video' };
    case 'document': return { event: 'message.document.received', kind: 'document' };
    case 'location': return { event: 'message.location.received', kind: 'location' };
    default: return null;
  }
}

function describeUnsupported(type: string): string {
  if (type === 'sticker') return 'uma figurinha';
  if (type === 'vcard' || type === 'multi_vcard') return 'um cartão de contato';
  if (type === 'poll_creation') return 'uma enquete';
  return 'um conteúdo que não consigo ler por aqui';
}

export class WahaWebhookController {
  static async handle(req: Request, res: Response) {
    const session = req.params.session;
    const body = (req.body || {}) as any;
    // SERVERLESS: processa SINCRONO antes do 200 (garante que nao e cortado).
    try {
      await WahaWebhookController.process(session, body);
    } catch (e: any) {
      console.error('waha-webhook process error:', e?.message || e);
    }
    return res.status(200).json({ ok: true });
  }

  static async process(session: string, body: any) {
    const event = String(body?.event || '');
    const payload = body?.payload || {};

    const instance = await prisma.instance.findFirst({
      where: { evolutionInstanceName: session, provider: 'waha' },
    });
    if (!instance) {
      console.warn(`waha-webhook: instance not found for session "${session}"`);
      return;
    }
    const orgId = instance.orgId || '';
    if (!orgId) return;
    const occurredAt = new Date();

    // ===== session.status -> conexao =====
    if (event === 'session.status') {
      const status = String(payload.status || '').toUpperCase();
      if (status === 'WORKING') {
        const me = payload.me?.id ? jidToNumber(payload.me.id) : undefined;
        await prisma.instance
          .update({ where: { id: instance.id }, data: { status: 'connected', ...(me ? { phoneNumber: me } : {}) } })
          .catch(() => null);
        await WebhookDeliveryService.trigger(orgId, 'instance.connected', { instanceId: instance.id, occurredAt }).catch(() => null);
      } else if (status === 'FAILED' || status === 'STOPPED') {
        await prisma.instance.update({ where: { id: instance.id }, data: { status: 'disconnected' } }).catch(() => null);
        await WebhookDeliveryService.trigger(orgId, 'instance.disconnected', { instanceId: instance.id, occurredAt }).catch(() => null);
      }
      return;
    }

    // ===== message -> message.received / midia =====
    if (event === 'message') {
      const fromMe = !!payload.fromMe;
      if (fromMe) return; // eco do bot nao entra no funil

      const messageId = payload.id;
      const from = jidToNumber(payload.from);
      const fromName = payload.notifyName || payload._data?.notifyName || null;
      const text = payload.body || null;
      const type = payload._data?.type || (payload.hasMedia ? 'media' : 'chat');
      const media = payload.media || null;
      const quotedMessageId = payload._data?.quotedStanzaID || payload._data?.quotedMsgId || null;

      const mediaMap = mapMediaEvent(type);

      if (type === 'chat' && text) {
        await prisma.message
          .create({ data: { orgId, instanceId: instance.id, to: from, fromNumber: from, body: text, type: 'text', status: 'received', direction: 'received', whatsappMessageId: messageId, fromName, quotedMessageId } })
          .catch(() => null);
        await WebhookDeliveryService.trigger(orgId, 'message.received', {
          instanceId: instance.id, messageId, from, fromName, fromMe: false, type: 'text', text, quotedMessageId, occurredAt,
        }).catch(() => null);
      } else if (mediaMap) {
        await prisma.message
          .create({ data: { orgId, instanceId: instance.id, to: from, fromNumber: from, body: media?.filename || '', type: mediaMap.kind, status: 'received', direction: 'received', whatsappMessageId: messageId, mediaUrl: media?.url || null, fromName, quotedMessageId } })
          .catch(() => null);
        await WebhookDeliveryService.trigger(orgId, mediaMap.event, {
          instanceId: instance.id, messageId, from, fromName, type: mediaMap.kind, mediaUrl: media?.url || null, mimetype: media?.mimetype || null, quotedMessageId, occurredAt,
        }).catch(() => null);
      } else {
        // catch-all: nada some (figurinha/contato/enquete/tipo futuro)
        const synth = `[o cliente enviou ${describeUnsupported(type)}]`;
        await WebhookDeliveryService.trigger(orgId, 'message.received', {
          instanceId: instance.id, messageId, from, fromName, fromMe: false, type: 'unsupported', text: synth, quotedMessageId, occurredAt,
        }).catch(() => null);
      }
      return;
    }
  }
}
