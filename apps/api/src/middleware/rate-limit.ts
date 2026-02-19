import NodeCache from 'node-cache';
import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/route-handler';
import { logger } from '../utils/logger';

const limitCache = new NodeCache({ stdTTL: 60, checkperiod: 60 });

interface RateLimitOptions {
  windowMs: number; // Window size in milliseconds
  max: number; // Max requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Rate limiting middleware
 * Uses node-cache for efficient in-memory tracking
 */
export function rateLimit(options: RateLimitOptions) {
  const ttlSeconds = Math.ceil(options.windowMs / 1000);

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = options.keyGenerator 
        ? options.keyGenerator(req) 
        : `ratelimit_${req.ip}_${req.path}`;
      
      const current = limitCache.get<{ count: number; resetTime: number }>(key);
      const now = Date.now();

      if (current) {
        if (current.count >= options.max) {
          res.setHeader('X-RateLimit-Limit', options.max);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000));
          
          throw new HttpError(429, options.message || 'Too many requests, please try again later.');
        }

        // Increment count
        limitCache.set(key, { ...current, count: current.count + 1 }, ttlSeconds);
        
        res.setHeader('X-RateLimit-Limit', options.max);
        res.setHeader('X-RateLimit-Remaining', options.max - (current.count + 1));
        res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000));
      } else {
        // New entry
        const resetTime = now + options.windowMs;
        limitCache.set(key, { count: 1, resetTime }, ttlSeconds);
        
        res.setHeader('X-RateLimit-Limit', options.max);
        res.setHeader('X-RateLimit-Remaining', options.max - 1);
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
      }

      next();
    } catch (error) {
       if (error instanceof HttpError) {
         next(error);
       } else {
         logger.error({ error }, 'Rate limit error');
         next(); // Fail open if cache errors
       }
    }
  };
}
