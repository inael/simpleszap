import { prisma } from '../lib/prisma';

type PlanLimits = {
  messagesPerDay: number;
  instancesLimit: number;
  isActive: boolean;
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
    // Trial expired and user has no Asaas customer (never paid) → fall back to Free defaults
    const trialExpired = user?.trialEndsAt && user.trialEndsAt < new Date();
    if (trialExpired && !user?.asaasCustomerId) {
      return this.limitsFromPlan(null);
    }
    return this.limitsFromPlan(user?.subscriptionPlan ?? null);
  }

  static async canCreateInstance(orgId: string) {
    const limits = await this.getLimitsForOrg(orgId);
    if (limits.instancesLimit < 0) return true;
    const count = await prisma.instance.count({ where: { orgId } });
    return count < limits.instancesLimit;
  }

  static async canSendMessage(orgId: string) {
    const limits = await this.getLimitsForOrg(orgId);
    if (limits.messagesPerDay < 0) return true;
    const today = new Date();
    const dateOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    let usage = await prisma.dailyUsage.findUnique({ where: { userId_date: { userId: orgId, date: dateOnly } } });
    if (!usage) {
      usage = await prisma.dailyUsage.create({ data: { userId: orgId, orgId, date: dateOnly, count: 0 } });
    }
    return usage.count < limits.messagesPerDay;
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
