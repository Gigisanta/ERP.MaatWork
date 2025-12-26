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
    const NODE_MODULES_UI = path.resolve(__dirname, '../node_modules/@maatwork/ui');

    // Determine which path to use for @maatwork/ui alias
    // We prefer the local workspace path in development for easier debugging
    // But fallback to node_modules if needed
    const uiPath = dev ? UI_PKG_PATH : NODE_MODULES_UI;

    // Determine path for styles.css
    // Check local workspace dist first (most up to date in dev)
    const localStylesPath = path.join(UI_PKG_PATH, 'dist/styles.css');
    const nodeModulesStylesPath = path.join(NODE_MODULES_UI, 'dist/styles.css');

    // Explicitly find the CSS file
    let stylesPath = nodeModulesStylesPath;
    if (fs.existsSync(localStylesPath)) {
      stylesPath = localStylesPath;
    } else if (fs.existsSync(nodeModulesStylesPath)) {
      stylesPath = nodeModulesStylesPath;
    }

    // console.log('Webpack Config - UI Styles Path:', stylesPath);

    config.resolve.alias = {
      ...config.resolve.alias,
      '@maatwork/ui/styles.css': stylesPath,
      '@maatwork/ui': uiPath,
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

    // Development optimizations
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
          tsconfig: [path.resolve(__dirname, '../tsconfig.json')],
        },
        cacheDirectory: path.resolve(__dirname, '../.next/cache/webpack'),
      };

      const usePolling = process.platform === 'win32';
      config.watchOptions = {
        ...(usePolling && { poll: 1000 }),
        aggregateTimeout: 300,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '!../../packages/ui/src/**',
          '!../../packages/ui/dist/**',
        ],
        followSymlinks: true,
      };

      config.infrastructureLogging = {
        level: 'error',
      };
    }

    return config;
  },
};
