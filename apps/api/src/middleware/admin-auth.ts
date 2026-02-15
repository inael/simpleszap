import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);

  if (!auth?.userId) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const role = (auth.sessionClaims as any)?.metadata?.role;

  if (role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }

  (req as any).adminUser = { clerkId: auth.userId, role: 'admin' };
  next();
}
