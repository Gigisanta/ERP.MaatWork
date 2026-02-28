/* eslint-disable */
/**
 * Next.js Build and Optimization Configuration
 */

module.exports = {
  // Enable standalone output for proper Docker deployment
  output: 'standalone',

  // Configure CDN for assets in production
  assetPrefix: process.env.CDN_URL || undefined,

  // Solo transpilar @maatwork/ui
  transpilePackages: ['@maatwork/ui', '@maatwork/types'],

  serverExternalPackages: ['@maatwork/db'],

  // Use Turbopack with empty config to allow webpack overrides
  turbopack: {},
  turbopack: false,
};
