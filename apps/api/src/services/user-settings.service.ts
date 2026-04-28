import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';

export function hashClientToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

export async function getOrCreateSettings(orgId: string) {
  return prisma.userSettings.upsert({
    where: { orgId },
    create: { orgId },
    update: {},
  });
}

export function verifyClientToken(plain: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const h = hashClientToken(plain);
  return h === storedHash;
}
