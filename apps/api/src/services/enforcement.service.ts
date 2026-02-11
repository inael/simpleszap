import { prisma } from '../lib/prisma';

export class EnforcementService {
  // Simple defaults if no plan is linked
  static DEFAULT_INSTANCE_LIMIT = 1;
  static DEFAULT_MESSAGES_PER_DAY = 100;

  static async getLimitsForOrg(orgId: string) {
    // TODO: read organization plan; for now use defaults
    return {
      instancesLimit: this.DEFAULT_INSTANCE_LIMIT,
      messagesPerDay: this.DEFAULT_MESSAGES_PER_DAY,
    };
  }

  static async canCreateInstance(orgId: string) {
    const limits = await this.getLimitsForOrg(orgId);
    const count = await prisma.instance.count({ where: { orgId } });
    return count < limits.instancesLimit;
  }

  static async canSendMessage(orgId: string) {
    const limits = await this.getLimitsForOrg(orgId);
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
