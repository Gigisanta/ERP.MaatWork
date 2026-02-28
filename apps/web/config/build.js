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

  // generateBuildId: async () => {
  //   return 'my-build-id';
  // },

  // Experimental features
  experimental: {
    // optimizeCss: true,
  },

  serverExternalPackages: ['@maatwork/db'],
};
