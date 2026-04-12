import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { getAuth } from '@clerk/express';

export async function orgAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      req.headers['x-user-id'] = auth.userId;
    }
    if (auth?.orgId) {
      req.headers['x-org-id'] = auth.orgId;
    }
  } catch {
    // Clerk middleware not available — fall through to header/api-key auth
  }

  let orgId = req.headers['x-org-id'] as string;
  const xApiKey = req.headers['x-api-key'] as string | undefined;
  const authorization = req.headers['authorization'] as string | undefined;
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : authorization;
  const apiKey = xApiKey || (bearer && /^(sk_|sz_)/.test(bearer) ? bearer : undefined);

  if (!orgId && apiKey) {
    try {
      const keyValue = apiKey.startsWith('Bearer ') ? apiKey.slice(7) : apiKey;
      const key = await prisma.apiKey.findUnique({ where: { key: keyValue } });
      if (key?.orgId) {
        orgId = key.orgId;
        req.headers['x-org-id'] = orgId;
      }
    } catch (err) {
      console.error('orgAuth: API key lookup failed:', err);
    }
  }

  next();
}
