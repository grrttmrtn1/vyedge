import { Request, Response, NextFunction } from 'express';

export function ipCapture(req: Request & { clientIp?: string }, _res: Response, next: NextFunction) {
  let ipValue = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (Array.isArray(ipValue)) {
    ipValue = ipValue[0];
  }
  req.clientIp = (ipValue as string).split(',')[0].trim();
  next();
}
