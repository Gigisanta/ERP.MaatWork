/**
 * Request Correlation & Tracing Middleware
 *
 * AI_DECISION: Add distributed tracing with correlation IDs
 * Justificación: Enables tracking requests across microservices (API + Python analytics)
 * Impacto: Better observability, faster debugging of distributed issues
 *
 * Features:
 * - Request correlation ID propagation
 * - Child span tracking
 * - Performance metrics per endpoint
 * - Error correlation across services
 */
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

const TRACE_HEADER = 'X-Trace-Id';
const SPAN_HEADER = 'X-Span-Id';
const PARENT_SPAN_HEADER = 'X-Parent-Span-Id';

const traceStore = new Map<string, {
  traceId: string;
  parentId?: string;
  startTime: number;
}>();

interface TraceContext {
  traceId: string;
  parentId?: string;
  startTime: number;
}

/**
 * Get or create trace context for request
 */
function getOrCreateTrace(req: Request): TraceContext {
  const existingTraceId = req.header(TRACE_HEADER);
  const traceId = existingTraceId || randomUUID();
  const parentSpanId = req.header(SPAN_HEADER) || req.header(PARENT_SPAN_HEADER);

  return {
    traceId,
    parentId: parentSpanId,
    startTime: Date.now(),
  };
}

/**
 * Middleware: Add request correlation and tracing
 */
export function requestCorrelation() {
  return (req: Request, res: Response, next: NextFunction) => {
    const trace = getOrCreateTrace(req);
    const spanId = randomUUID();

    traceStore.set(spanId, trace);

    req.traceId = trace.traceId;
    req.spanId = spanId;
    req.parentSpanId = trace.parentId;

    res.setHeader(TRACE_HEADER, trace.traceId);
    res.setHeader(SPAN_HEADER, spanId);

    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      traceStore.delete(spanId);

      logger.info({
        traceId: trace.traceId,
        spanId,
        parentId: trace.parentId,
        duration,
        method: req.method,
        path: req.path,
        userAgent: req.header('user-agent'),
        ip: req.ip,
      }, `${req.method} ${req.path} completed`);
    });

    next();
  };
}

/**
 * Get active trace context
 */
export function getTraceContext(spanId: string): TraceContext | undefined {
  return traceStore.get(spanId);
}

/**
 * Create child span for async operations
 */
export function createChildSpan(parentSpanId: string, name: string): { spanId: string; context: TraceContext } {
  const spanId = randomUUID();
  const parentContext = traceStore.get(parentSpanId);

  if (!parentContext) {
    return { spanId, context: { traceId: randomUUID(), startTime: Date.now() } };
  }

  const context: TraceContext = {
    ...parentContext,
    parentId: parentSpanId,
  };

  traceStore.set(spanId, context);

  return { spanId, context };
}

/**
 * End span and record metrics
 */
export function endSpan(spanId: string, metadata?: Record<string, unknown>): void {
  const context = traceStore.get(spanId);
  if (!context) return;

  const duration = Date.now() - context.startTime;

  logger.info({
    traceId: context.traceId,
    spanId,
    parentId: context.parentId,
    duration,
    ...metadata,
  }, `Span completed`);

  traceStore.delete(spanId);
}

/**
 * Trace async function with automatic span creation
 */
export async function traceAsync<T>(
  parentSpanId: string,
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const { spanId } = createChildSpan(parentSpanId, name);

  try {
    const result = await fn();
    endSpan(spanId, { status: 'success' });
    return result;
  } catch (error) {
    endSpan(spanId, {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
