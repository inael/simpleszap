import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export function requireScope(scope: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req.headers['x-api-key'] || req.headers['authorization']) as string | undefined;
    if (!apiKey) return next();
    const keyValue = apiKey.startsWith('Bearer ') ? apiKey.slice(7) : apiKey;
    const key = await prisma.apiKey.findUnique({ where: { key: keyValue } });
    if (!key) return res.status(401).json({ error: 'Invalid API key' });
    const scopes = key.scopes ? JSON.parse(key.scopes) as string[] : [];
    if (scopes.length && !scopes.includes(scope)) {
      return res.status(403).json({ error: 'Insufficient scope' });
    }
    next();
  };
}
