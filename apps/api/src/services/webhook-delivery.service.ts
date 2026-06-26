import crypto from 'crypto';
import { prisma } from '../lib/prisma';

export class WebhookDeliveryService {
  /**
   * Dispara um evento pros webhooks configurados.
   * Modelo híbrido (estilo Stripe/Twilio): se houver override pra `payload.instanceId`,
   * usa ele e ignora o global. Sem override, cai pro global (instanceId IS NULL).
   * Eventos sem instanceId no payload disparam apenas pros globais.
   */
  static async trigger(orgId: string, event: string, payload: any) {
    const instanceId = (payload && typeof payload === 'object' ? payload.instanceId : undefined) as string | undefined;

    let configs: Array<{ id: string; url: string; events: string; secret: string }> = [];
    if (instanceId) {
      const overrides = await prisma.webhookConfig.findMany({ where: { orgId, instanceId } });
      configs = overrides.length > 0
        ? overrides
        : await prisma.webhookConfig.findMany({ where: { orgId, instanceId: null } });
    } else {
      configs = await prisma.webhookConfig.findMany({ where: { orgId, instanceId: null } });
    }

    for (const cfg of configs) {
      if (!cfg.events) continue;
      const events = JSON.parse(cfg.events) as string[];
      if (!events.includes(event)) continue;
      const body = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', cfg.secret).update(body).digest('hex');
      // Headers: signature, event type, timestamp (Stripe-style). Consumidor
      // externo identifica o tipo de evento pelo header x-webhook-event sem
      // precisar parsear o body (que pode variar de shape entre eventos).
      const ts = Math.floor(Date.now() / 1000).toString();
      const headers = {
        'x-webhook-signature': signature,
        'x-webhook-event': event,
        'x-webhook-timestamp': ts,
        'x-webhook-id': cfg.id,
        'content-type': 'application/json',
      };
      // Timeout curto (8s): a entrega é síncrona (antes do 200 da Evolution), então
      // não pode estourar o maxDuration da função serverless. Uma tentativa só, sem
      // retry — n8n responde via onReceived em ~100ms, então 8s é folga de sobra.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        // fetch nativo envia bytes verbatim (axios mexe encoding). HMAC do consumidor
        // calcula sha256(rawBody) com a mesma string que assinamos aqui.
        const res = await fetch(cfg.url, { method: 'POST', headers, body, signal: ctrl.signal });
        await prisma.webhookLog.create({ data: { orgId, webhookId: cfg.id, instanceId: instanceId ?? null, event, payload: body, success: res.ok, statusCode: res.status } });
      } catch (e: any) {
        await prisma.webhookLog.create({ data: { orgId, webhookId: cfg.id, instanceId: instanceId ?? null, event, payload: body, success: false, error: e.message } });
      } finally {
        clearTimeout(timer);
      }
    }
  }
}
