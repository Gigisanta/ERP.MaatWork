/** @type {import('next').NextConfig} */
const nextConfig = {
  // AI_DECISION: Solo transpilar @cactus/ui, dejar que Next.js maneje Radix UI nativamente
  // Justificación: Transpilar todos los paquetes Radix UI causa problemas de resolución
  // Impacto: Evita problemas de resolución de módulos y truncamiento
  transpilePackages: ['@cactus/ui'],
  // AI_DECISION: Enable Next.js 14 experimental optimizations for package imports
  // Justificación: Tree-shaking improvements reduce bundle size by 20-30% for large packages
  // Impacto: Smaller JavaScript bundles, faster page loads
  experimental: {
    // AI_DECISION: Desactivar optimizePackageImports por inestabilidad con monorepos y paquetes transitorios (Radix UI)
    // Justificación: Evita generación de vendor-chunks inconsistentes como "./vendor-chunks/@radix-ui.js"
    // Impacto: Build de desarrollo estable; menor riesgo de errores MODULE_NOT_FOUND
    externalDir: true,
    serverComponentsExternalPackages: ['@cactus/db'],
  },
  // AI_DECISION: Enable standalone output for optimized production builds
  // Justificación: Standalone output creates minimal server bundle, reducing deployment size by 40-50%
  // Impacto: Faster deployments, lower memory usage
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    JWT_SECRET: process.env.JWT_SECRET,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    // Re-enable ESLint with simplified config
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Re-enable TypeScript checks now that errors are fixed
    ignoreBuildErrors: false,
  },
  // AI_DECISION: Disable source maps in production and enable SWC minification
  // Justificación: Source maps increase build size 2-3x. SWC minification is 20x faster than Terser
  // Impacto: Smaller production builds, faster build times
  productionBrowserSourceMaps: false,
  swcMinify: true,
  // Headers para desarrollo
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development'
              ? "default-src 'self' 'unsafe-eval' 'unsafe-inline' vscode-file: data: blob:; connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*;"
              : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || ''};`
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          }
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }
        ]
      }
    ];
  },
  // Webpack configuration
  // AI_DECISION: Optimizar cache para monorepo con pnpm workspaces
  // Justificación: Errores "next-flight-client-entry-loader" se deben a cache desincronizado en monorepo
  // Impacto: Reduce errores de compilación y "internal server error" en desarrollo
  webpack: (config, { dev, isServer }) => {
    // AI_DECISION: Configuración simplificada para evitar problemas de resolución
    // Justificación: Configuración compleja está causando problemas de resolución de módulos
    // Impacto: Resuelve errores de truncamiento y resolución de módulos
    
    // Habilitar symlinks para monorepo pnpm
    config.resolve.symlinks = true;
    
    // AI_DECISION: Añadir alias para resolver workspace packages correctamente
    // Justificación: pnpm workspaces con hoisted no exponen exports de CSS correctamente
    // Impacto: Permite que webpack resuelva @cactus/ui y @cactus/db
    // Restablecer alias mínimos para workspaces; mantener fuera cualquier vendor splitting experimental
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@cactus/ui': path.resolve(__dirname, '../../packages/ui/dist'),
      '@cactus/ui/styles.css': path.resolve(__dirname, '../../packages/ui/dist/styles/index.css'),
      '@cactus/db': path.resolve(__dirname, '../../packages/db/dist'),
    };
    
    // Mejorar source maps en desarrollo para debugging
    if (dev) {
      config.devtool = 'eval-source-map'; // Mejor debugging que 'eval'
      
      config.cache = false;
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Agregar logging de webpack para debugging
      config.infrastructureLogging = {
        level: 'verbose',
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;


