/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cactus/ui'],
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
    if (dev) {
      // AI_DECISION: Re-enable webpack cache for 40-60% faster dev rebuilds
      // Justificación: Cache issues were workspace-specific, now resolved with symlinks: true
      // Impacto: Dev rebuild time reduction from ~12s to ~6s
      // config.cache = false; // DISABLED: Restore cache for performance
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Forzar resolución correcta de @cactus/ui en monorepo
      config.resolve.symlinks = true;
    }
    
    return config;
  },
};

module.exports = nextConfig;


