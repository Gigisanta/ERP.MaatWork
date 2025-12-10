/**
 * HTTP utilities - named exports for better tree-shaking
 *
 * AI_DECISION: Convert barrel exports to named exports for better tree-shaking
 * Justificación: Barrel exports (export *) import everything even when only one function is needed
 * Impacto: Reduced bundle size and better optimization
 */

// HTTP client utilities
export { HttpClient, getHttpClient } from './http-client';

// Webhook client utilities
export { sendWebhook, type WebhookPayload, type WebhookOptions } from './webhook-client';
