/**
 * Image configuration and utilities for next/image
 * 
 * AI_DECISION: Centralize image configuration for consistency
 * Justificación: Provides single source of truth for image optimization settings
 * Impacto: Easier maintenance and consistent image handling across the app
 */

/**
 * Image optimization configuration
 * These values match next.config.js for consistency
 */
export const imageConfig = {
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  formats: ['image/avif', 'image/webp'] as const,
} as const;

/**
 * Common image quality settings
 */
export const imageQuality = {
  high: 90,
  medium: 75,
  low: 60,
  default: 75,
} as const;

/**
 * Common image placeholder types
 */
export type ImagePlaceholder = 'blur' | 'empty';

/**
 * Helper to determine if image optimization should be used
 */
export function shouldOptimizeImage(): boolean {
  return process.env.NODE_ENV === 'production' && 
         process.env.NEXT_PUBLIC_UNOPTIMIZED_IMAGES !== 'true';
}

