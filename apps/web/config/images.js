/**
 * Next.js Image Configuration
 *
 * AI_DECISION: Configure next/image for automatic image optimization
 * Justificación: next/image provides automatic image optimization, lazy loading, and responsive images
 * Impacto: Reduced image payload, better LCP scores, automatic WebP/AVIF conversion
 */
module.exports = {
  images: {
    // Allow images from same origin and data URIs (for icons, etc.)
    remotePatterns: [],
    // Disable static image imports optimization warnings in development
    unoptimized:
      process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_UNOPTIMIZED_IMAGES === 'true',
    // Image formats to use (WebP and AVIF are automatically used when supported)
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
