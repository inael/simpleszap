import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function orgAuth(req: Request, res: Response, next: NextFunction) {
  let orgId = req.headers['x-org-id'] as string;
  const apiKey = (req.headers['x-api-key'] || req.headers['authorization']) as string | undefined;
  if (!orgId && apiKey) {
    const keyValue = apiKey.startsWith('Bearer ') ? apiKey.slice(7) : apiKey;
    const key = await prisma.apiKey.findUnique({ where: { key: keyValue } });
    if (key?.orgId) {
      orgId = key.orgId;
      req.headers['x-org-id'] = orgId;
    }
  }
  next();
}
