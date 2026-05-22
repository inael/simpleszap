import { prisma } from '../lib/prisma';

type PlanLimits = {
  messagesPerDay: number;
  instancesLimit: number;
  isActive: boolean;
};

export type EnforcementCheck =
  | { allowed: true }
  | {
      allowed: false;
      code: 'PLAN_INSTANCE_LIMIT_REACHED' | 'PLAN_DAILY_MESSAGE_LIMIT_REACHED';
      limit: number;
      current: number;
      planId: string | null;
    };

export class EnforcementService {
  // Simple defaults if no plan is linked
  static DEFAULT_INSTANCE_LIMIT = 1;
  static DEFAULT_MESSAGES_PER_DAY = 50;

  /** orgId = Logto sub ou valor em ApiKey.orgId — resolve User + SubscriptionPlan */
  private static limitsFromPlan(plan: PlanLimits | null) {
    if (!plan || !plan.isActive) {
      return {
        instancesLimit: this.DEFAULT_INSTANCE_LIMIT,
        messagesPerDay: this.DEFAULT_MESSAGES_PER_DAY,
      };
    }
    return {
      instancesLimit: plan.instancesLimit,
      messagesPerDay: plan.messagesPerDay,
    };
  }

  static async getLimitsForOrg(orgId: string) {
    let user = await prisma.user.findUnique({
      where: { logtoId: orgId },
      include: { subscriptionPlan: true },
    });
    if (!user) {
      const key = await prisma.apiKey.findFirst({
        where: { orgId },
        include: { user: { include: { subscriptionPlan: true } } },
      });
      user = key?.user ?? null;
    }
    const now = new Date();
    // Cortesia VIP ativa: usa plano linkado ignorando trial/Asaas.
    const manualActive = !!(user?.manualSubscriptionUntil && user.manualSubscriptionUntil > now);
    if (manualActive) {
      return { ...this.limitsFromPlan(user?.subscriptionPlan ?? null), planId: user?.subscriptionPlanId ?? null };
    }
    // Trial expirado sem Asaas customer (nunca pagou) → defaults Free
    const trialExpired = user?.trialEndsAt && user.trialEndsAt < now;
    if (trialExpired && !user?.asaasCustomerId) {
      return { ...this.limitsFromPlan(null), planId: null };
    }
    return { ...this.limitsFromPlan(user?.subscriptionPlan ?? null), planId: user?.subscriptionPlanId ?? null };
  }

  static async canCreateInstance(orgId: string): Promise<EnforcementCheck> {
    const limits = await this.getLimitsForOrg(orgId);
    if (limits.instancesLimit < 0) return { allowed: true };
    const count = await prisma.instance.count({ where: { orgId } });
    if (count < limits.instancesLimit) return { allowed: true };
    return {
      allowed: false,
      code: 'PLAN_INSTANCE_LIMIT_REACHED',
      limit: limits.instancesLimit,
      current: count,
      planId: limits.planId,
    };
  }

  static async canSendMessage(orgId: string): Promise<EnforcementCheck> {
    const limits = await this.getLimitsForOrg(orgId);
    if (limits.messagesPerDay < 0) return { allowed: true };
    const today = new Date();
    const dateOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    let usage = await prisma.dailyUsage.findUnique({ where: { userId_date: { userId: orgId, date: dateOnly } } });
    if (!usage) {
      usage = await prisma.dailyUsage.create({ data: { userId: orgId, orgId, date: dateOnly, count: 0 } });
    }
    if (usage.count < limits.messagesPerDay) return { allowed: true };
    return {
      allowed: false,
      code: 'PLAN_DAILY_MESSAGE_LIMIT_REACHED',
      limit: limits.messagesPerDay,
      current: usage.count,
      planId: limits.planId,
    };
  }

  static async incrementMessageCount(orgId: string) {
    const today = new Date();
    const dateOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    await prisma.dailyUsage.upsert({
      where: { userId_date: { userId: orgId, date: dateOnly } },
      update: { count: { increment: 1 } },
      create: { userId: orgId, orgId, date: dateOnly, count: 1 },
    });
  }
}
