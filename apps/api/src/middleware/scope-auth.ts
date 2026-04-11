import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export function requireScope(scope: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const xApiKey = req.headers['x-api-key'] as string | undefined;
    const authorization = req.headers['authorization'] as string | undefined;
    const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : authorization;

    const keyValue = xApiKey || (bearer && /^(sk_|sz_)/.test(bearer) ? bearer : undefined);
    if (!keyValue) return next();

    const key = await prisma.apiKey.findUnique({ where: { key: keyValue } });
    if (!key) return res.status(401).json({ error: 'Invalid API key' });
    const scopes = key.scopes ? JSON.parse(key.scopes) as string[] : [];
    if (scopes.length && !scopes.includes(scope)) {
      return res.status(403).json({ error: 'Insufficient scope' });
    }
    next();
  };
}
