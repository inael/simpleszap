import { prisma } from '../lib/prisma';

export class AuditService {
  static async log(orgId: string, action: string, actorId?: string, data?: any) {
    await prisma.auditLog.create({ data: { orgId, action, actorId, data: data ? JSON.stringify(data) : undefined } });
  }
}
