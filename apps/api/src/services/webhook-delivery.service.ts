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
      // Entrega com timeout + retry (resiliência). Só retenta em falha de rede ou 5xx
      // (nunca em 2xx/4xx) pra NÃO duplicar entregas que o consumidor já processou.
      // fetch nativo envia bytes verbatim (axios mexe encoding). HMAC do consumidor
      // calcula sha256(rawBody) com a mesma string que assinamos aqui.
      let ok = false, statusCode: number | undefined, lastErr: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        try {
          const res = await fetch(cfg.url, { method: 'POST', headers, body, signal: ctrl.signal });
          statusCode = res.status; ok = res.ok;
          if (res.ok || (res.status >= 400 && res.status < 500)) break; // sucesso ou erro do cliente: não retenta
          lastErr = new Error('HTTP ' + res.status);
        } catch (e: any) {
          lastErr = e;
        } finally {
          clearTimeout(timer);
        }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); // backoff 1s, 2s
      }
      await prisma.webhookLog.create({ data: { orgId, webhookId: cfg.id, instanceId: instanceId ?? null, event, payload: body, success: ok, statusCode, error: ok ? undefined : lastErr?.message } });
    }
  }
}
