import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);

  if (!auth?.userId) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const legacyRole = (auth.sessionClaims as any)?.metadata?.role;
  const effectiveRole = (auth as any).orgRole || legacyRole;
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'org:admin';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }

  (req as any).adminUser = { clerkId: auth.userId, role: 'admin' };
  next();
}
