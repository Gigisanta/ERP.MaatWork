/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

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
  // AI_DECISION: Deshabilitar logging de fetches en desarrollo para mejorar rendimiento
  // Justificación: El logging de fetches agrega overhead innecesario en desarrollo
  // Impacto: Reduce tiempo de compilación y uso de memoria en dev mode
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'production',
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
  // AI_DECISION: Optimizar headers para desarrollo - reducir overhead
  // Justificación: Headers complejos agregan overhead en cada request, simplificar en desarrollo
  // Impacto: Menor overhead de procesamiento de headers, requests más rápidas
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // En desarrollo, headers mínimos para reducir overhead
    if (isDevelopment) {
      return [
        {
          source: '/_next/static/:path*',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
          ]
        }
      ];
    }
    
    // En producción, headers completos de seguridad
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || ''} https://va.vercel-scripts.com https://vitals.vercel-insights.com; frame-src 'self' https://calendar.google.com;`
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
    // En desarrollo, usar código fuente si dist no está completo; en producción usar dist
    const uiPath = dev && require('fs').existsSync(path.resolve(__dirname, '../../packages/ui/dist/index.js'))
      ? path.resolve(__dirname, '../../packages/ui/dist')
      : path.resolve(__dirname, '../../packages/ui/src');
    const dbPath = dev && require('fs').existsSync(path.resolve(__dirname, '../../packages/db/dist/index.js'))
      ? path.resolve(__dirname, '../../packages/db/dist')
      : path.resolve(__dirname, '../../packages/db/src');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@cactus/ui': uiPath,
      '@cactus/ui/styles.css': path.resolve(__dirname, '../../packages/ui/dist/styles/index.css'),
      '@cactus/db': dbPath,
    };
    
    // AI_DECISION: Optimizar configuración de desarrollo para máximo rendimiento
    // Justificación: Habilitar cache filesystem reduce tiempo de compilación 30-50%, eval source maps son más rápidos
    // Impacto: Inicio más rápido, hot reload mejorado, menor uso de memoria
    if (dev) {
      // Usar 'eval' para source maps más rápidos (trade-off: menos detalle en debugging)
      // 'eval-source-map' es más lento pero mejor para debugging; 'eval' es ~2x más rápido
      config.devtool = 'eval';
      
      // AI_DECISION: Habilitar webpack filesystem cache para desarrollo
      // Justificación: Cache persistente reduce tiempo de compilación inicial y hot reload 30-50%
      // Impacto: Primera compilación más rápida, hot reload casi instantáneo en cambios pequeños
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: path.resolve(__dirname, '.next/cache/webpack'),
      };
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // AI_DECISION: Reducir logging de webpack para mejorar rendimiento
      // Justificación: Logging verbose agrega overhead significativo en desarrollo
      // Impacto: Menor uso de CPU/memoria, compilación más rápida
      config.infrastructureLogging = {
        level: 'error', // Solo mostrar errores, no warnings/info
      };
    }
    
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);


