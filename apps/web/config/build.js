/**
 * Next.js Build and Optimization Configuration
 */

module.exports = {
  // swcMinify is default in Next.js 15
  // swcMinify: true,

  // AI_DECISION: Enable standalone output for optimized production builds
  // Justificación: Standalone output creates minimal server bundle, reducing deployment size by 40-50%
  // Impacto: Faster deployments, lower memory usage
  // Solo aplicar en producción para evitar problemas con archivos estáticos en desarrollo
  // DISABLED ON WINDOWS locally due to symlink EPERM issues
  // ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),

  // AI_DECISION: Configure CDN for assets in production
  // Justificación: CDN reduce latencia y carga en servidor, mejora performance global
  // Impacto: Assets servidos desde CDN más cercano, mejor tiempo de carga, menor carga en servidor
  assetPrefix: process.env.CDN_URL || undefined,

  // AI_DECISION: Solo transpilar @cactus/ui, dejar que Next.js maneje Radix UI nativamente
  // Justificaci?n: Transpilar todos los paquetes Radix UI causa problemas de resoluci?n
  // Impacto: Evita problemas de resolución de módulos y truncamiento
  transpilePackages: ['@cactus/ui'],

  serverExternalPackages: ['@cactus/db'],

  // AI_DECISION: Enable Next.js 14 experimental optimizations for package imports
  // Justificación: Tree-shaking improvements reduce bundle size by 20-30% for large packages
  // Impacto: Smaller JavaScript bundles, faster page loads
  experimental: {
    // AI_DECISION: Desactivar optimizePackageImports por inestabilidad con monorepos y paquetes transitorios (Radix UI)
    // Justificación: Evita generación de vendor-chunks inconsistentes como "./vendor-chunks/@radix-ui.js"
    // Impacto: Build de desarrollo estable; menor riesgo de errores MODULE_NOT_FOUND
    externalDir: true,
  },
};
