import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export function authenticate(req: Request & { user?: any; clientIp?: string }, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  const ip = (req as any).clientIp;

  console.log(`[AUTH] ${req.method} ${req.url} from ${ip}`);

  if (!token) {
    console.warn(`[AUTH] No token for ${req.method} ${req.url}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    if (!req.user.tenant) req.user.tenant = 'default';
    console.log(`[AUTH] User: ${req.user.username}, Role: ${req.user.role}, Tenant: ${req.user.tenant}`);
    next();
  } catch (err) {
    console.warn(`[AUTH] Invalid token for ${req.method} ${req.url}: ${err}`);
    res.status(401).json({ error: 'Invalid token' });
  }
}
