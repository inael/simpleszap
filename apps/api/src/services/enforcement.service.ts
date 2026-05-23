import { prisma } from '../lib/prisma';

export type EnforcementCheck =
  | { allowed: true; consumesPool?: boolean }
  | {
      allowed: false;
      code:
        | 'PLAN_DAILY_MESSAGE_LIMIT_REACHED'
        | 'NEED_SUBSCRIPTION'
        | 'INSTANCE_LIMIT_REACHED'
        | 'PLAN_INSTANCE_LIMIT_REACHED';
      limit: number;
      current: number;
      planId: string | null;
    };

const FREE_DAILY_LIMIT = 100;

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Modelo de pricing (2026-05):
 *
 *   - Cortesia VIP (manualSubscriptionUntil) bypassa tudo. Mantém retrocompat.
 *   - Plano "interno" (cortesia perpétua via subscriptionPlanId) também bypassa.
 *   - Cada Instance paga (subscriptionStatus=active) tem cap próprio em
 *     messagesIncluded (default 300/dia).
 *   - Quando a instância estoura o cap próprio, consome do POOL GLOBAL da conta
 *     (soma de MessageAddon active.messagesPerDay).
 *   - Free: user sem assinatura, 1 instância → 100/dia. 2ª instância exige sub.
 */
export class EnforcementService {
  /** Limite Free pra retrocompat com lugares que ainda chamam getLimitsForOrg() */
  static DEFAULT_MESSAGES_PER_DAY = FREE_DAILY_LIMIT;
  static DEFAULT_INSTANCE_LIMIT = 1;

  /**
   * Resume billing de um user pra UI. Retorna instâncias com status,
   * pool de addons ativos, uso do dia.
   */
  static async getBillingForUser(logtoId: string) {
    const user = await prisma.user.findUnique({
      where: { logtoId },
      include: { instances: true, messageAddons: true },
    });
    if (!user) return null;

    const today = todayUtc();
    const [usagesByInstance, addons] = await Promise.all([
      prisma.instanceDailyUsage.findMany({
        where: { instanceId: { in: user.instances.map((i) => i.id) }, date: today },
      }),
      user.messageAddons.filter((a) => a.status === 'active'),
    ]);

    const usageMap = new Map(usagesByInstance.map((u) => [u.instanceId, u.count]));
    const poolLimit = addons.reduce((acc, a) => acc + a.messagesPerDay, 0);
    // FK: DailyUsage.userId = User.id (PK), não logtoId
    const poolUsage = await prisma.dailyUsage.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });

    return {
      instances: user.instances.map((i) => ({
        id: i.id,
        name: i.name,
        status: i.status,
        subscriptionStatus: i.subscriptionStatus,
        pricePerMonthCents: i.pricePerMonthCents,
        messagesIncluded: i.messagesIncluded,
        usedToday: usageMap.get(i.id) || 0,
        paidUntil: i.paidUntil,
      })),
      addons: addons.map((a) => ({
        id: a.id,
        status: a.status,
        messagesPerDay: a.messagesPerDay,
        pricePerMonthCents: a.pricePerMonthCents,
        paidUntil: a.paidUntil,
      })),
      pool: {
        limit: poolLimit,
        usage: poolUsage?.count || 0,
        remaining: Math.max(0, poolLimit - (poolUsage?.count || 0)),
      },
      totalMonthlyCents:
        user.instances
          .filter((i) => i.subscriptionStatus === 'active')
          .reduce((acc, i) => acc + i.pricePerMonthCents, 0) +
        addons.reduce((acc, a) => acc + a.pricePerMonthCents, 0),
      vipUntil: user.manualSubscriptionUntil,
    };
  }

  /**
   * Retorna limites resumidos pra UI antiga (/me, dashboard). Mantém shape antigo
   * pra evitar regressão. dailyLimit = -1 quando ilimitado (VIP/interno).
   */
  static async getLimitsForOrg(orgId: string) {
    const user = await prisma.user.findUnique({
      where: { logtoId: orgId },
      include: { subscriptionPlan: true, instances: true, messageAddons: { where: { status: 'active' } } },
    });
    const now = new Date();
    const vip = !!(user?.manualSubscriptionUntil && user.manualSubscriptionUntil > now);
    if (vip || user?.subscriptionPlanId === 'interno') {
      return { instancesLimit: -1, messagesPerDay: -1, planId: user?.subscriptionPlanId ?? null };
    }
    const paidInstances = (user?.instances || []).filter((i) => i.subscriptionStatus === 'active');
    const totalIncluded = paidInstances.reduce((acc, i) => acc + i.messagesIncluded, 0);
    const poolExtra = (user?.messageAddons || []).reduce((acc, a) => acc + a.messagesPerDay, 0);
    const totalDaily = paidInstances.length === 0 ? FREE_DAILY_LIMIT : totalIncluded + poolExtra;
    return {
      instancesLimit: paidInstances.length || 1, // Free = 1, depois ilimitado conforme assinaturas
      messagesPerDay: totalDaily,
      planId: paidInstances.length > 0 ? 'paid' : 'free',
    };
  }

  /**
   * Verifica se pode criar nova instância. Free = 1 grátis, depois cada instância
   * extra exige assinatura (status pending vira active quando paga).
   */
  static async canCreateInstance(orgId: string): Promise<EnforcementCheck> {
    const user = await prisma.user.findUnique({
      where: { logtoId: orgId },
      include: { instances: true },
    });
    const now = new Date();
    const vip = !!(user?.manualSubscriptionUntil && user.manualSubscriptionUntil > now);
    if (vip || user?.subscriptionPlanId === 'interno') return { allowed: true };
    // Modelo novo: sempre pode criar (a 2ª+ entra como pending até pagar).
    // Mantém allowed=true porque o gating de uso é por subscriptionStatus na hora de enviar.
    return { allowed: true };
  }

  /**
   * Pode enviar mensagem por essa instância?
   *
   * Sequência:
   *  1. Cortesia VIP / plano interno → libera (consumesPool=false, não contabiliza)
   *  2. Instance.subscriptionStatus === 'active':
   *     a. usagesToday < messagesIncluded → libera (instance)
   *     b. senão, tenta pool (sum addons - poolUsage > 0) → libera (consumesPool=true)
   *     c. nem pool → bloqueia
   *  3. Instance sem sub mas é a única do user → Free 100/dia
   *  4. Caso contrário → NEED_SUBSCRIPTION
   */
  static async canSendMessage(orgId: string, instanceId?: string): Promise<EnforcementCheck> {
    const user = await prisma.user.findUnique({
      where: { logtoId: orgId },
      include: { instances: true, messageAddons: { where: { status: 'active' } } },
    });
    if (!user) return { allowed: false, code: 'NEED_SUBSCRIPTION', limit: 0, current: 0, planId: null };

    const now = new Date();
    const vip = !!(user.manualSubscriptionUntil && user.manualSubscriptionUntil > now);
    if (vip || user.subscriptionPlanId === 'interno') return { allowed: true };

    // Sem instanceId → não é envio de mensagem real (ex: validação genérica). Libera.
    if (!instanceId) return { allowed: true };

    const instance = user.instances.find((i) => i.id === instanceId);
    if (!instance) return { allowed: false, code: 'NEED_SUBSCRIPTION', limit: 0, current: 0, planId: null };

    const today = todayUtc();
    let instanceUsage: { count: number };
    try {
      instanceUsage = await prisma.instanceDailyUsage.upsert({
        where: { instanceId_date: { instanceId, date: today } },
        update: {},
        create: { instanceId, date: today, count: 0 },
      });
    } catch (err: any) {
      console.error(
        `[enforcement] canSendMessage: instanceDailyUsage upsert failed (instanceId=${instanceId}): ${err?.message || err}`,
      );
      instanceUsage = { count: 0 };
    }

    // Instance paga → usa cap próprio + pool
    if (instance.subscriptionStatus === 'active') {
      if (instanceUsage.count < instance.messagesIncluded) {
        return { allowed: true, consumesPool: false };
      }
      // Estourou cap próprio: tenta pool global
      const poolLimit = user.messageAddons.reduce((acc, a) => acc + a.messagesPerDay, 0);
      if (poolLimit > 0) {
        // FK: DailyUsage.userId referencia User.id (PK UUID), NÃO logtoId
        try {
          const poolUsage = await prisma.dailyUsage.upsert({
            where: { userId_date: { userId: user.id, date: today } },
            update: {},
            create: { userId: user.id, orgId, date: today, count: 0 },
          });
          if (poolUsage.count < poolLimit) {
            return { allowed: true, consumesPool: true };
          }
        } catch (err: any) {
          console.error(
            `[enforcement] canSendMessage: dailyUsage upsert failed (userId=${user.id}, orgId=${orgId}): ${err?.message || err}`,
          );
          // Falha defensiva: deixa passar como consumesPool=true. Pior caso
          // não contabiliza, melhor isso que travar envio.
          return { allowed: true, consumesPool: true };
        }
      }
      return {
        allowed: false,
        code: 'PLAN_DAILY_MESSAGE_LIMIT_REACHED',
        limit: instance.messagesIncluded + poolLimit,
        current: instanceUsage.count + (poolLimit > 0 ? poolLimit : 0),
        planId: 'paid',
      };
    }

    // Instance grátis (sem sub) → Free apenas se for a única
    if (user.instances.length === 1) {
      if (instanceUsage.count < FREE_DAILY_LIMIT) return { allowed: true };
      return {
        allowed: false,
        code: 'PLAN_DAILY_MESSAGE_LIMIT_REACHED',
        limit: FREE_DAILY_LIMIT,
        current: instanceUsage.count,
        planId: 'free',
      };
    }

    return {
      allowed: false,
      code: 'NEED_SUBSCRIPTION',
      limit: 0,
      current: 0,
      planId: null,
    };
  }

  /**
   * Incrementa contador da instância sempre. Se consumesPool=true, incrementa
   * também o contador global (pool).
   * IMPORTANTE: DailyUsage.userId referencia User.id (UUID PK), não logtoId.
   * Sempre fazer lookup pra evitar FK violation.
   */
  static async incrementMessageCount(orgId: string, instanceId?: string, consumesPool = false) {
    const today = todayUtc();
    if (instanceId) {
      try {
        await prisma.instanceDailyUsage.upsert({
          where: { instanceId_date: { instanceId, date: today } },
          update: { count: { increment: 1 } },
          create: { instanceId, date: today, count: 1 },
        });
      } catch (err: any) {
        console.error(
          `[enforcement] instanceDailyUsage upsert failed (instanceId=${instanceId}): ${err?.message || err}`,
        );
      }
    }
    if (consumesPool || !instanceId) {
      const user = await prisma.user.findUnique({ where: { logtoId: orgId } });
      if (!user) {
        console.error(
          `[enforcement] dailyUsage skipped: user not found for orgId=${orgId} (lookup by logtoId)`,
        );
        return;
      }
      try {
        await prisma.dailyUsage.upsert({
          where: { userId_date: { userId: user.id, date: today } },
          update: { count: { increment: 1 } },
          create: { userId: user.id, orgId, date: today, count: 1 },
        });
      } catch (err: any) {
        console.error(
          `[enforcement] dailyUsage upsert failed (userId=${user.id}, orgId=${orgId}): ${err?.message || err}`,
        );
      }
    }
  }
}
