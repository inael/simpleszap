import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EvolutionService } from '../services/evolution.service';

/**
 * Normaliza um telefone BR pra E.164 sem "+". Mantém só dígitos; se já começa
 * com 55 usa como está, senão prefixa "55". Retorna null se não sobrar dígito.
 */
function normalizeBrNumber(raw?: string | null): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function formatDateBr(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export class SubscriptionNotifyController {
  /**
   * GET/POST /cron/notify-expiring-subscriptions — protegido por CRON_SECRET.
   * Avisa o dono da conta (no WhatsApp dele) quando a assinatura de uma
   * instância conectada está perto de vencer (próximos 3 dias). Só notifica
   * cada instância 1x a cada ~3 dias (via Instance.expiryNotifiedAt).
   */
  static async notifyExpiring(req: Request, res: Response) {
    const auth = req.headers.authorization;
    const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
    if (!process.env.CRON_SECRET || auth !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    let checked = 0;
    let notified = 0;
    let skipped = 0;

    try {
      const instances = await prisma.instance.findMany({
        where: {
          subscriptionStatus: 'active',
          status: 'connected',
          paidUntil: { gte: now, lte: in3Days },
          OR: [
            { expiryNotifiedAt: null },
            { expiryNotifiedAt: { lt: threeDaysAgo } },
          ],
        },
        include: { user: true },
      });

      checked = instances.length;

      for (const instance of instances) {
        const number =
          normalizeBrNumber(instance.user?.notificationPhoneNumber) ||
          normalizeBrNumber(instance.phoneNumber);

        if (!number || !instance.evolutionInstanceName || !instance.paidUntil) {
          skipped += 1;
          continue;
        }

        const valor = formatBrl(instance.pricePerMonthCents);
        const vencimento = formatDateBr(instance.paidUntil);
        const msg =
          `Olá! A assinatura da sua instância "${instance.name}" vence em ${vencimento}.\n\n` +
          `Valor: R$ ${valor}/mês.\n\n` +
          `Para manter a instância ativa, é só manter o pagamento em dia. ` +
          `Se já pagou, pode desconsiderar este aviso.\n\n` +
          `— SimplesZap`;

        try {
          await EvolutionService.sendText(instance.evolutionInstanceName, number, msg);
          await prisma.instance.update({
            where: { id: instance.id },
            data: { expiryNotifiedAt: new Date() },
          });
          notified += 1;
        } catch (err: any) {
          console.error(
            `[notifyExpiring] falha ao avisar instância ${instance.id}: ${err?.message || err}`,
          );
          skipped += 1;
        }
      }

      res.json({ checked, notified, skipped });
    } catch (e: any) {
      console.error('notifyExpiring error:', e);
      res.status(500).json({ error: e.message, checked, notified, skipped });
    }
  }
}
