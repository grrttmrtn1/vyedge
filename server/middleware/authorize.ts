import { Request, Response, NextFunction } from 'express';

export function authorize(roles: string[]) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    console.log(`[AUTH] Authorizing ${req.user.username} (Role: ${req.user.role}) for ${req.method} ${req.url}. Required: ${roles}`);
    if (!roles.includes(req.user.role)) {
      console.warn(`[AUTH] Forbidden: ${req.user.username} has role ${req.user.role}, but needs ${roles}`);
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
