import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

export class WebhookDeliveryService {
  static async trigger(orgId: string, event: string, payload: any) {
    const configs = await prisma.webhookConfig.findMany({ where: { orgId } });
    for (const cfg of configs) {
      if (!cfg.events) continue;
      const events = JSON.parse(cfg.events) as string[];
      if (!events.includes(event)) continue;
      const body = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', cfg.secret).update(body).digest('hex');
      try {
        const res = await axios.post(cfg.url, payload, { headers: { 'x-webhook-signature': signature, 'content-type': 'application/json' } });
        await prisma.webhookLog.create({ data: { orgId, webhookId: cfg.id, event, payload: body, success: true, statusCode: res.status } });
      } catch (e: any) {
        await prisma.webhookLog.create({ data: { orgId, webhookId: cfg.id, event, payload: body, success: false, error: e.message, statusCode: e.response?.status } });
      }
    }
  }
}
