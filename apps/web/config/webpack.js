/* eslint-disable */
/**
 * Next.js Webpack Configuration
 *
 * AI_DECISION: Extraer configuración de webpack a módulo separado
 * Justificación: El archivo next.config.js era demasiado grande y complejo
 * Impacto: Código más organizado y mantenible
 */

const path = require('path');
const fs = require('fs');

module.exports = {
  webpack: (config, { dev, isServer }) => {
    // Enable symlinks for pnpm workspaces
    config.resolve.symlinks = true;

    // PATH CONSTANTS
    const UI_PKG_PATH = path.resolve(__dirname, '../../../packages/ui');
    const UI_SRC_ENTRY = path.resolve(__dirname, '../../../packages/ui/src/index.ts');
    const NODE_MODULES_UI = path.resolve(__dirname, '../node_modules/@maatwork/ui');

    // AI_DECISION: Removed custom aliases for @maatwork/ui
    // Justificación: Aliasing to src/index.ts in dev causes module resolution issues in Next.js 15
    //                transpilePackages is sufficient for handling workspace packages
    // Impacto: More stable builds, relies on Next.js's optimized package resolution

    config.resolve.alias = {
      ...config.resolve.alias,
    };

    // Ensure we can resolve modules from node_modules
    if (!config.resolve.modules) {
      config.resolve.modules = ['node_modules'];
    }
    if (!config.resolve.modules.includes('node_modules')) {
      config.resolve.modules.push('node_modules');
    }

    // Add UI dist to resolve modules to help with internal resolution
    const uiDistDir = path.resolve(UI_PKG_PATH, 'dist');
    if (!config.resolve.modules.includes(uiDistDir)) {
      config.resolve.modules.unshift(uiDistDir);
    }

    // Webpack resolution settings
    config.resolve.mainFields = ['main', 'module', 'exports', 'browser'];
    config.resolve.conditionNames = ['import', 'require', 'default', 'browser', 'module'];
    config.resolve.extensions = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.json',
      ...(config.resolve.extensions || []),
    ];

    // AI_DECISION: Removed manual cache, watchOptions, infrastructureLogging, and splitChunks
    // Justificación: Next.js 15 has optimized defaults that work better than manual configuration
    //                Custom splitChunks can interfere with Next.js server/client chunking strategy
    //                causing "originalFactory.call" errors
    // Impacto: More stable builds, better compatibility with Next.js 15 optimizations

    return config;
  },
};
