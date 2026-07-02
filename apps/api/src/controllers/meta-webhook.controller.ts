import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';
import { MetaCloudService } from '../services/meta-cloud.service';

// Adapter do WhatsApp Cloud API (Meta) -> eventos canônicos do SimplesZap.
// Meta entrega TODOS os números do app numa ÚNICA URL (app-level). Resolvemos
// a instância pelo phone_number_id que vem em value.metadata.phone_number_id
// (guardado em Instance.providerConfig.phoneNumberId). Produz os MESMOS eventos
// que evolution/waha (message.received, message.audio.received, ...) — SDR não muda.

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v21.0'}`;

function mapMediaEvent(type: string): { event: string; kind: string } | null {
  switch (type) {
    case 'audio':
    case 'voice': return { event: 'message.audio.received', kind: 'audio' };
    case 'image': return { event: 'message.image.received', kind: 'image' };
    case 'video': return { event: 'message.video.received', kind: 'video' };
    case 'document': return { event: 'message.document.received', kind: 'document' };
    case 'location': return { event: 'message.location.received', kind: 'location' };
    default: return null;
  }
}

// Cloud API manda só o media id — resolve a URL temporária (precisa do token).
async function resolveMediaUrl(accessToken: string, mediaId: string): Promise<string | null> {
  try {
    const r = await fetch(`${GRAPH}/${mediaId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) return null;
    const j: any = await r.json();
    return j?.url || null;
  } catch { return null; }
}

export class MetaWebhookController {
  // GET — verificação do webhook (Meta chama uma vez ao configurar).
  static verify(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN || '';
    if (mode === 'subscribe' && expected && token === expected) {
      return res.status(200).send(String(challenge || ''));
    }
    return res.status(403).send('Forbidden');
  }

  // POST — eventos. Processa SÍNCRONO antes do 200 (serverless).
  static async handle(req: Request, res: Response) {
    try {
      await MetaWebhookController.process(req.body || {});
    } catch (e: any) {
      console.error('meta-webhook process error:', e?.message || e);
    }
    return res.status(200).json({ ok: true });
  }

  static async process(body: any) {
    if (body?.object !== 'whatsapp_business_account') return;
    const occurredAt = new Date();

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change?.value || {};
        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        // Resolve a instância pelo phone_number_id guardado no providerConfig.
        const instance = await prisma.instance.findFirst({
          where: { provider: 'meta_cloud', providerConfig: { path: ['phoneNumberId'], equals: phoneNumberId } },
        }).catch(() => null);
        if (!instance) {
          console.warn(`meta-webhook: instância não encontrada p/ phone_number_id ${phoneNumberId}`);
          continue;
        }
        const orgId = instance.orgId || '';
        if (!orgId) continue;
        const accessToken = (instance.providerConfig as any)?.accessToken || '';

        // ---- mensagens recebidas ----
        const contacts = value.contacts || [];
        for (const m of value.messages || []) {
          const from = String(m.from || '');
          const fromName = contacts.find((c: any) => c.wa_id === m.from)?.profile?.name || null;
          const messageId = m.id;
          const type = String(m.type || '');
          const quotedMessageId = m.context?.id || null;

          if (type === 'text') {
            await prisma.message.create({ data: { orgId, instanceId: instance.id, to: from, fromNumber: from, body: m.text?.body || '', type: 'text', status: 'received', direction: 'received', whatsappMessageId: messageId, fromName, quotedMessageId } }).catch(() => null);
            await WebhookDeliveryService.trigger(orgId, 'message.received', {
              instanceId: instance.id, messageId, from, fromName, fromMe: false, type: 'text', text: m.text?.body || '', quotedMessageId, occurredAt,
            }).catch(() => null);
            continue;
          }

          const mediaMap = mapMediaEvent(type);
          if (mediaMap) {
            const mediaId = m[type]?.id;
            const mimetype = m[type]?.mime_type || null;
            const mediaUrl = mediaId && accessToken ? await resolveMediaUrl(accessToken, mediaId) : null;
            await prisma.message.create({ data: { orgId, instanceId: instance.id, to: from, fromNumber: from, body: m[type]?.caption || '', type: mediaMap.kind, status: 'received', direction: 'received', whatsappMessageId: messageId, mediaUrl, fromName, quotedMessageId } }).catch(() => null);
            await WebhookDeliveryService.trigger(orgId, mediaMap.event, {
              instanceId: instance.id, messageId, from, fromName, type: mediaMap.kind, mediaUrl, mediaId, mimetype, accessToken: accessToken ? '***' : null, quotedMessageId, occurredAt,
            }).catch(() => null);
            continue;
          }

          // catch-all — nada some
          await WebhookDeliveryService.trigger(orgId, 'message.received', {
            instanceId: instance.id, messageId, from, fromName, fromMe: false, type: 'unsupported', text: '[o cliente enviou um conteúdo que não consigo ler por aqui]', quotedMessageId, occurredAt,
          }).catch(() => null);
        }

        // ---- status de entrega (delivered/read/failed) ----
        for (const st of value.statuses || []) {
          const map: Record<string, string> = { delivered: 'message.delivered', read: 'message.read', failed: 'message.failed' };
          const ev = map[String(st.status)];
          if (ev) {
            await WebhookDeliveryService.trigger(orgId, ev, {
              instanceId: instance.id, messageId: st.id, to: st.recipient_id, occurredAt,
            }).catch(() => null);
          }
        }
      }
    }
  }
}
