import { Request, Response, NextFunction } from 'express';
import { orgAuth } from './org-auth';
import { enforceSecurity } from './security.middleware';

/** orgAuth + políticas de segurança (IP, Client-Token em chamadas com API key). */
export function orgAuthWithSecurity(req: Request, res: Response, next: NextFunction) {
  orgAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    void enforceSecurity(req, res, next);
  });
}
