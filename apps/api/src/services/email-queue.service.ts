import { prisma } from '../lib/prisma';
import { EmailService } from './email.service';
import { renderTemplate, TemplateKey } from './email-templates';

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 50;

export type EnqueueInput = {
  userId: string;
  userEmail: string;
  template: TemplateKey;
  sendAt: Date;
  payload?: Record<string, any>;
};

export class EmailQueueService {
  // Enfileira email; idempotente por (userId, template) — não duplica.
  static async enqueue(input: EnqueueInput) {
    const exists = await prisma.emailQueue.findFirst({
      where: { userId: input.userId, template: input.template, status: { in: ['pending', 'sent'] } },
    });
    if (exists) return exists;

    return prisma.emailQueue.create({
      data: {
        userId: input.userId,
        userEmail: input.userEmail,
        template: input.template,
        sendAt: input.sendAt,
        payload: input.payload ?? {},
      },
    });
  }

  // Enfileira sequência onboarding (5 emails, D+0/D+1/D+3/D+5/D+7).
  static async enqueueOnboardingSequence(args: { userId: string; userEmail: string; userName?: string | null; trialEndsAt?: Date | null }) {
    const now = new Date();
    const trialEnd = args.trialEndsAt ?? new Date(now.getTime() + 7 * 86400_000);
    const payload = { name: args.userName ?? null };

    const items: { template: TemplateKey; sendAt: Date; payload?: any }[] = [
      { template: 'onboarding_d0', sendAt: now, payload },
      { template: 'onboarding_d1', sendAt: addDays(now, 1), payload },
      { template: 'onboarding_d3', sendAt: addDays(now, 3), payload },
      { template: 'trial_ending_d5', sendAt: addDays(trialEnd, -2), payload: { ...payload, daysLeft: 2 } },
      { template: 'trial_ended_d7', sendAt: addDays(trialEnd, 0), payload },
    ];

    for (const it of items) {
      await this.enqueue({
        userId: args.userId,
        userEmail: args.userEmail,
        template: it.template,
        sendAt: it.sendAt,
        payload: it.payload,
      });
    }
  }

  // Enfileira sequência win-back após cancelamento (D+3/D+14).
  static async enqueueWinbackSequence(args: { userId: string; userEmail: string; userName?: string | null }) {
    const now = new Date();
    const payload = { name: args.userName ?? null };
    await this.enqueue({ userId: args.userId, userEmail: args.userEmail, template: 'winback_d3', sendAt: addDays(now, 3), payload });
    await this.enqueue({ userId: args.userId, userEmail: args.userEmail, template: 'winback_d14', sendAt: addDays(now, 14), payload });
  }

  // Cancela emails pendentes de um user (ex: ao reassinar, cancela sequência winback).
  static async cancelPendingFor(userId: string, templates?: TemplateKey[]) {
    return prisma.emailQueue.updateMany({
      where: {
        userId,
        status: 'pending',
        ...(templates ? { template: { in: templates } } : {}),
      },
      data: { status: 'skipped' },
    });
  }

  // Processa fila — usado pelo cron. Pega emails com sendAt<=now, status=pending,
  // attempts<MAX. Renderiza template, envia via SimplesMail, atualiza row.
  // Retorna contadores pra log.
  static async processBatch() {
    const due = await prisma.emailQueue.findMany({
      where: {
        status: 'pending',
        sendAt: { lte: new Date() },
        attempts: { lt: MAX_ATTEMPTS },
      },
      take: BATCH_SIZE,
      orderBy: { sendAt: 'asc' },
    });

    let sent = 0, failed = 0, skipped = 0;
    for (const row of due) {
      const tpl = renderTemplate(row.template, (row.payload as any) || {});
      if (!tpl) {
        await prisma.emailQueue.update({
          where: { id: row.id },
          data: { status: 'failed', error: `template não encontrado: ${row.template}`, attempts: row.attempts + 1 },
        });
        failed++;
        continue;
      }

      const result = await EmailService.send({
        to: row.userEmail,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        tags: [
          { name: 'category', value: 'transactional' },
          { name: 'template', value: row.template },
        ],
      });

      if (result.ok) {
        await prisma.emailQueue.update({
          where: { id: row.id },
          data: { status: 'sent', sentAt: new Date(), messageId: result.messageId, attempts: row.attempts + 1, error: null },
        });
        sent++;
      } else {
        const newAttempts = row.attempts + 1;
        await prisma.emailQueue.update({
          where: { id: row.id },
          data: {
            status: newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
            attempts: newAttempts,
            error: (result.error || 'send failed').slice(0, 500),
          },
        });
        if (newAttempts >= MAX_ATTEMPTS) failed++; else skipped++;
      }
    }

    return { processed: due.length, sent, failed, retryLater: skipped };
  }
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
