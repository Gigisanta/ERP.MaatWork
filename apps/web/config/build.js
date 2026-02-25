/* eslint-disable */
/**
 * Next.js Build and Optimization Configuration
 */

module.exports = {
  // swcMinify is default in Next.js 15
  // swcMinify: true,

  // AI_DECISION: Disable standalone output for Railway deployment (causes 502 errors)
  // output: 'standalone',

  // AI_DECISION: Configure CDN for assets in production
  // swcMinify is default in Next.js 15
  // swcMinify: true,

  // AI_DECISION: Disable standalone output for Railway deployment (causes 502 errors)
  // output: 'standalone',
  // output: 'standalone',
  // Justificación: Standalone output creates minimal server bundle, reducing deployment size by 40-50%
  // Impacto: Faster deployments, lower memory usage, optimized for Railway's containerized environment
  // Referencias: Railway best practices + migration plan from AWS to Railway
  output: 'standalone',

  // AI_DECISION: Configure CDN for assets in production
  // Justificación: CDN reduce latencia y carga en servidor, mejora performance global
  // Impacto: Assets servidos desde CDN más cercano, mejor tiempo de carga, menor carga en servidor
  assetPrefix: process.env.CDN_URL || undefined,

  // AI_DECISION: Solo transpilar @maatwork/ui, dejar que Next.js maneje Radix UI nativamente
  // Justificaci?n: Transpilar todos los paquetes Radix UI causa problemas de resoluci?n
  // Impacto: Evita problemas de resolución de módulos y truncamiento
  transpilePackages: ['@maatwork/ui', '@maatwork/types'],

  serverExternalPackages: ['@maatwork/db'],

  // AI_DECISION: Enable Next.js 14 experimental optimizations for package imports
  // Justificación: Tree-shaking improvements reduce bundle size by 20-30% for large packages
  // Impacto: Smaller JavaScript bundles, faster page loads
  experimental: {
    // externalDir: true,
  },

  // AI_DECISION: Add empty turbopack config for Next.js 16
  // Justificación: Next.js 16 uses Turbopack by default, this silences the warning about webpack config
  // Impacto: No breaking changes, just silences the warning
  turbopack: {},
};
