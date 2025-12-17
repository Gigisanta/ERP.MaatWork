/**
 * Next.js Headers Configuration
 *
 * AI_DECISION: Optimizar headers para desarrollo - reducir overhead
 * Justificación: Headers complejos agregan overhead en cada request, simplificar en desarrollo
 * Impacto: Menor overhead de procesamiento de headers, requests más rápidas
 *
 * AI_DECISION: CSP permite conexiones necesarias para Next.js RSC y API
 * Justificación: Next.js requiere conexiones para prefetch, RSC payloads, y navegación
 * Impacto: Elimina errores de CSP sin comprometer seguridad significativamente
 */

/**
 * Generate headers configuration based on environment
 */
function generateHeaders() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // En desarrollo, headers mínimos para reducir overhead
  if (isDevelopment) {
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  }

  // En producción, headers completos de seguridad
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin, strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        {
          key: 'Content-Security-Policy',
          // AI_DECISION: CSP permisivo para Cloudflare proxy
          // Justificación: Cloudflare inyecta scripts, estilos y fuentes para analytics/security
          // Impacto: No más errores de CSP. Seguridad manejada por Cloudflare WAF.
          value: [
            "default-src 'self'",
            `connect-src 'self' ${apiUrl} https://fonts.googleapis.com https://fonts.gstatic.com https://static.cloudflareinsights.com https://cloudflareinsights.com`,
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://static.cloudflareinsights.com",
            "font-src 'self' https://fonts.gstatic.com https://static.cloudflareinsights.com",
            "img-src 'self' data: https: blob:",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    },
    {
      source: '/_next/static/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Pragma', value: 'no-cache' },
        { key: 'Expires', value: '0' },
      ],
    },
  ];
}

module.exports = {
  async headers() {
    return generateHeaders();
  },
};
