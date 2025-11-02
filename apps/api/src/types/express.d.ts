import type { AuthUser } from '../auth/types';
import type { Logger } from 'pino';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      log?: Logger;
      requestId?: string;
    }
  }
}

export {};


