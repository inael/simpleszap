import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EnforcementService } from '../services/enforcement.service';
import { respondEnforcementDenied } from '../lib/enforcement-error';
import { EvolutionService } from '../services/evolution.service';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';

const DEFAULT_JITTER_MIN_MS = 900;
const DEFAULT_JITTER_MAX_MS = 2200;

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type EnqueueParams = {
  orgId: string;
  instanceId: string;
  type: 'text' | 'buttons';
  number: string; // já normalizado (E.164 BR)
  body?: string;
  payload?: any;
  campaignId?: string;
  apiKeyId?: string;
};

export class MessageQueueController {
  /**
   * Helper interno usado por instance.controller (sendText/sendButtons) e
   * por campanhas pra enfileirar uma mensagem. Calcula scheduledAt baseado
   * na última msg pending da MESMA instância (jitter cumulativo).
   */
  static async enqueue(params: EnqueueParams) {
    const { orgId, instanceId } = params;

    // Pega jitter configurado pelo user (ou defaults)
    const settings = await prisma.userSettings.findUnique({ where: { orgId } });
    const jitterMin = settings?.campaignJitterMinMs ?? DEFAULT_JITTER_MIN_MS;
    const jitterMax = settings?.campaignJitterMaxMs ?? DEFAULT_JITTER_MAX_MS;

    // Procura última msg pending da instância pra calcular scheduledAt cumulativo
    const last = await prisma.outboundMessageQueue.findFirst({
      where: { instanceId, status: { in: ['pending', 'processing'] } },
      orderBy: { scheduledAt: 'desc' },
    });
    const baseTime = last?.scheduledAt && last.scheduledAt > new Date() ? last.scheduledAt : new Date();
    const scheduledAt = new Date(baseTime.getTime() + randomInRange(jitterMin, jitterMax));

    const row = await prisma.outboundMessageQueue.create({
      data: {
        orgId,
        instanceId,
        type: params.type,
        number: params.number,
        body: params.body,
        payload: params.payload,
        scheduledAt,
        campaignId: params.campaignId,
        apiKeyId: params.apiKeyId,
      },
    });

    // Position = qtas mensagens pending da instância ESTÃO antes dessa
    const position = await prisma.outboundMessageQueue.count({
      where: {
        instanceId,
        status: 'pending',
        scheduledAt: { lte: scheduledAt },
      },
    });

    return { queueId: row.id, scheduledAt, position };
  }

  /** GET /messages/queue?status=pending&instanceId=...&limit=50 */
  static async list(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string | undefined;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });

    const status = req.query.status as string | undefined;
    const instanceId = req.query.instanceId as string | undefined;
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);

    const where: any = { orgId };
    if (status) where.status = status;
    if (instanceId) where.instanceId = instanceId;

    const rows = await prisma.outboundMessageQueue.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });
    res.json({ items: rows });
  }

  /** GET /messages/queue/stats — agregado pra header e badges */
  static async stats(req: Request, res: Response) {
    const orgId = req.headers['x-org-id'] as string | undefined;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });

    const todayUtc = new Date();
    const todayDate = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate()));

    // DailyUsage.userId é FK pra User.id (PK), não logtoId — precisa converter
    const user = await prisma.user.findUnique({ where: { logtoId: orgId } });

    const [pending, sentToday, failedToday, dailyUsage, limits, perInstance] = await Promise.all([
      prisma.outboundMessageQueue.count({ where: { orgId, status: 'pending' } }),
      prisma.outboundMessageQueue.count({
        where: { orgId, status: 'sent', sentAt: { gte: todayDate } },
      }),
      prisma.outboundMessageQueue.count({
        where: { orgId, status: 'failed', updatedAt: { gte: todayDate } },
      }),
      user
        ? prisma.dailyUsage.findUnique({ where: { userId_date: { userId: user.id, date: todayDate } } })
        : Promise.resolve(null),
      EnforcementService.getLimitsForOrg(orgId),
      prisma.outboundMessageQueue.groupBy({
        by: ['instanceId'],
        where: { orgId, status: 'pending' },
        _count: { _all: true },
      }),
    ]);

    res.json({
      pending,
      sentToday,
      failedToday,
      dailyUsage: dailyUsage?.count || 0,
      dailyLimit: limits.messagesPerDay, // -1 = ilimitado
      perInstance: perInstance.map((p) => ({ instanceId: p.instanceId, pending: p._count._all })),
    });
  }

  /** DELETE /messages/queue/:id — cancela uma mensagem pendente */
  static async cancel(req: Request, res: Response) {
    const { id } = req.params;
    const orgId = req.headers['x-org-id'] as string | undefined;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });

    const row = await prisma.outboundMessageQueue.findUnique({ where: { id } });
    if (!row || row.orgId !== orgId) return res.status(404).json({ error: 'Mensagem não encontrada.' });
    if (row.status !== 'pending') {
      return res.status(409).json({ error: 'Só dá pra cancelar mensagens pendentes.' });
    }
    await prisma.outboundMessageQueue.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    res.json({ cancelled: true });
  }

  /** POST /messages/queue/:instanceId/cancel-pending — cancela todas pendentes */
  static async cancelPendingByInstance(req: Request, res: Response) {
    const { instanceId } = req.params;
    const orgId = req.headers['x-org-id'] as string | undefined;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await prisma.outboundMessageQueue.updateMany({
      where: { orgId, instanceId, status: 'pending' },
      data: { status: 'cancelled' },
    });
    res.json({ cancelled: result.count });
  }

  /**
   * POST /cron/process-message-queue — protegido por CRON_SECRET.
   * Pega rows pending com scheduledAt <= now, processa em ordem por instância.
   * Cada chamada do cron processa até MAX_PER_RUN msgs (cap de tempo de execução
   * do Vercel serverless é 60-300s, jitter ~1.5s ⇒ ~200 msgs/min em pico).
   */
  static async processCron(req: Request, res: Response) {
    const auth = req.headers.authorization;
    const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
    if (!process.env.CRON_SECRET || auth !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const MAX_PER_RUN = parseInt(process.env.MESSAGE_QUEUE_MAX_PER_RUN || '120', 10);
    const startedAt = Date.now();
    const stats = { picked: 0, sent: 0, failed: 0, skippedLimit: 0 };

    try {
      // Pega rows prontas, ordenadas — vamos processar agrupando por instância
      // (uma instância só envia 1 msg de cada vez, garantindo ordem FIFO).
      const rows = await prisma.outboundMessageQueue.findMany({
        where: { status: 'pending', scheduledAt: { lte: new Date() } },
        orderBy: { scheduledAt: 'asc' },
        take: MAX_PER_RUN,
      });

      // Agrupa por instância e processa sequencialmente cada uma.
      // Diferentes instâncias podem ser paralelas (Promise.all), mesma instância é serial.
      const byInstance = new Map<string, typeof rows>();
      for (const r of rows) {
        const arr = byInstance.get(r.instanceId) || [];
        arr.push(r);
        byInstance.set(r.instanceId, arr);
      }
      stats.picked = rows.length;

      await Promise.all(
        Array.from(byInstance.entries()).map(async ([instanceId, msgs]) => {
          for (const msg of msgs) {
            // Re-valida limite (pode ter atingido depois do enfileiramento)
            const check = await EnforcementService.canSendMessage(msg.orgId, msg.instanceId);
            if (!check.allowed) {
              await prisma.outboundMessageQueue.update({
                where: { id: msg.id },
                data: { status: 'skipped_limit', lastError: 'Limite diário atingido.' },
              });
              stats.skippedLimit += 1;
              continue;
            }

            // Marca processing pra evitar pickup duplicado em corrida com outro cron tick
            const claimed = await prisma.outboundMessageQueue.updateMany({
              where: { id: msg.id, status: 'pending' },
              data: { status: 'processing', attempts: msg.attempts + 1 },
            });
            if (claimed.count === 0) continue; // outro tick pegou

            try {
              const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
              const evoName = instance?.evolutionInstanceName || instanceId;

              let evoResult: any;
              if (msg.type === 'buttons') {
                evoResult = await EvolutionService.sendButtons(evoName, msg.payload as any);
              } else {
                evoResult = await EvolutionService.sendText(evoName, msg.number, msg.body || '');
              }

              await prisma.$transaction([
                prisma.outboundMessageQueue.update({
                  where: { id: msg.id },
                  data: { status: 'sent', sentAt: new Date() },
                }),
                prisma.message.create({
                  data: {
                    orgId: msg.orgId,
                    instanceId,
                    to: msg.number,
                    body: msg.body || JSON.stringify(msg.payload),
                    type: msg.type,
                    status: 'sent',
                  },
                }),
              ]);
              await EnforcementService.incrementMessageCount(msg.orgId, msg.instanceId, !!(check as any).consumesPool);
              await WebhookDeliveryService.trigger(msg.orgId, 'message.sent', {
                instanceId,
                number: msg.number,
                type: msg.type,
                queueId: msg.id,
              }).catch(() => null);
              stats.sent += 1;
            } catch (err: any) {
              await prisma.outboundMessageQueue.update({
                where: { id: msg.id },
                data: { status: 'failed', lastError: String(err?.message || err).slice(0, 500) },
              });
              await prisma.message.create({
                data: {
                  orgId: msg.orgId,
                  instanceId,
                  to: msg.number,
                  body: msg.body || JSON.stringify(msg.payload),
                  type: msg.type,
                  status: 'failed',
                  error: String(err?.message || err).slice(0, 500),
                },
              }).catch(() => null);
              await WebhookDeliveryService.trigger(msg.orgId, 'message.failed', {
                instanceId,
                number: msg.number,
                queueId: msg.id,
                error: String(err?.message || err).slice(0, 200),
              }).catch(() => null);
              stats.failed += 1;
            }
          }
        })
      );

      res.json({ ok: true, durationMs: Date.now() - startedAt, ...stats });
    } catch (e: any) {
      console.error('processCron error:', e);
      res.status(500).json({ error: e.message, ...stats });
    }
  }
}
