import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export function orgAuth(req: Request, res: Response, next: NextFunction) {
  let orgId = req.headers['x-org-id'] as string;
  const apiKey = (req.headers['x-api-key'] || req.headers['authorization']) as string | undefined;
  if (!orgId && apiKey) {
    const keyValue = apiKey.startsWith('Bearer ') ? apiKey.slice(7) : apiKey;
    Promise.resolve(
      (async () => {
        const key = await prisma.apiKey.findUnique({ where: { key: keyValue } });
        if (key?.orgId) {
          orgId = key.orgId;
          req.headers['x-org-id'] = orgId;
        }
      })()
    ).then(() => next()).catch(next);
    return;
  }
  next();
}
