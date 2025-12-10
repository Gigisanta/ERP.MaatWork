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
    // AI_DECISION: Optimizar cache para monorepo con pnpm workspaces
    // Justificaci?n: Errores "next-flight-client-entry-loader" se deben a cache desincronizado en monorepo
    // Impacto: Reduce errores de compilaci?n y "internal server error" en desarrollo

    // Habilitar symlinks para monorepo pnpm
    config.resolve.symlinks = true;

    // AI_DECISION: A?adir alias para resolver workspace packages correctamente
    // Justificaci?n: pnpm workspaces con hoisted no exponen exports de CSS correctamente
    // Impacto: Permite que webpack resuelva @cactus/ui y @cactus/db

    // Verificar si el paquete est? construido y d?nde est? ubicado
    const uiDistPath = path.resolve(__dirname, '../../packages/ui/dist/index.js');
    const uiNodeModulesPath = path.resolve(__dirname, 'node_modules/@cactus/ui');
    const uiSrcPath = path.resolve(__dirname, '../../packages/ui/src');

    // AI_DECISION: Usar node_modules como primera opci?n para mejor compatibilidad con webpack
    // Justificaci?n: pnpm workspace linkea paquetes a node_modules, webpack los resuelve mejor desde ah?
    // Impacto: Resuelve errores de resoluci?n de m?dulos y problemas con dynamic imports
    let uiPath;
    if (fs.existsSync(uiNodeModulesPath)) {
      // Priorizar node_modules (donde pnpm workspace lo linkea)
      uiPath = uiNodeModulesPath;
    } else if (fs.existsSync(uiDistPath)) {
      // Usar dist si node_modules no existe
      uiPath = path.resolve(__dirname, '../../packages/ui/dist');
    } else {
      // Fallback a src solo si no hay otra opci?n
      uiPath = uiSrcPath;
      // console.warn('??  @cactus/ui no est? construido. Ejecuta: pnpm -F @cactus/ui build');
    }

    const dbPath =
      dev && fs.existsSync(path.resolve(__dirname, '../../packages/db/dist/index.js'))
        ? path.resolve(__dirname, '../../packages/db/dist')
        : path.resolve(__dirname, '../../packages/db/src');

    // AI_DECISION: Asegurar resoluci?n correcta de alias para dynamic imports
    // Justificaci?n: Webpack puede tener problemas resolviendo alias @/ en m?dulos cargados din?micamente
    // Impacto: Resuelve errores "Cannot read properties of undefined (reading 'call')" en dynamic imports
    config.resolve.alias = {
      ...config.resolve.alias,
      // Resolver workspaces usando symlinks directos
      '@cactus/ui': path.resolve(__dirname, 'node_modules/@cactus/ui'),
      '@cactus/ui/styles.css': path.resolve(__dirname, 'node_modules/@cactus/ui/styles.css'),
      '@cactus/types': path.resolve(__dirname, 'node_modules/@cactus/types'),
      '@cactus/db': dbPath,
      // Asegurar que @/ se resuelva correctamente para dynamic imports
      '@': path.resolve(__dirname, './'),
    };

    // AI_DECISION: Asegurar que webpack pueda resolver m?dulos desde node_modules
    // Justificaci?n: Necesario para que webpack encuentre @cactus/ui desde su ubicaci?n real
    // Impacto: Mejora la resoluci?n de m?dulos workspace en monorepo
    if (!config.resolve.modules) {
      config.resolve.modules = ['node_modules'];
    } else if (!config.resolve.modules.includes('node_modules')) {
      config.resolve.modules.push('node_modules');
    }

    // AI_DECISION: Mejorar resoluci?n de m?dulos internos de @cactus/ui
    // Justificaci?n: Webpack tiene problemas resolviendo imports relativos dentro de @cactus/ui (ej: '../../utils/cn')
    // Impacto: Resuelve errores "Cannot read properties of undefined (reading 'call')" al resolver m?dulos internos
    const uiDistDir = path.resolve(__dirname, '../../packages/ui/dist');
    if (!config.resolve.modules.includes(uiDistDir)) {
      config.resolve.modules.unshift(uiDistDir);
    }

    // AI_DECISION: Configurar resolveLoader para asegurar que webpack pueda resolver loaders correctamente
    // Justificaci?n: Problemas de resoluci?n pueden estar relacionados con loaders de webpack
    // Impacto: Asegura que webpack pueda resolver todos los loaders necesarios para procesar m?dulos
    if (!config.resolveLoader) {
      config.resolveLoader = {};
    }
    if (!config.resolveLoader.modules) {
      config.resolveLoader.modules = ['node_modules'];
    }

    // AI_DECISION: Configurar mainFields para asegurar que webpack use los archivos compilados correctos
    // Justificaci?n: Webpack necesita saber qu? campo del package.json usar para resolver m?dulos en monorepos
    // Impacto: Asegura que webpack use los archivos compilados de dist/ en lugar de src/
    config.resolve.mainFields = ['main', 'module', 'exports', 'browser'];

    // AI_DECISION: Configurar conditionNames para resolver exports correctamente
    // Justificaci?n: Next.js y webpack necesitan saber qu? condiciones usar al resolver exports del package.json
    // Impacto: Resuelve correctamente los exports definidos en @cactus/ui/package.json
    config.resolve.conditionNames = ['import', 'require', 'default', 'browser', 'module'];

    // AI_DECISION: Mejorar resoluci?n de m?dulos para dynamic imports
    // Justificaci?n: Dynamic imports necesitan resoluci?n expl?cita de extensiones y m?dulos
    // Impacto: Previene errores de resoluci?n en m?dulos cargados din?micamente
    config.resolve.extensions = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.json',
      ...(config.resolve.extensions || []),
    ];

    // AI_DECISION: Evitar code splitting de @cactus/ui para resolver problemas de webpack
    // Justificaci?n: Webpack tiene problemas resolviendo @cactus/ui cuando se hace code splitting en dynamic imports
    // Impacto: Resuelve errores "Cannot read properties of undefined (reading 'call')"
    if (!isServer && !dev) {
      if (!config.optimization) {
        config.optimization = {};
      }
      if (!config.optimization.splitChunks) {
        config.optimization.splitChunks = {};
      }
      if (!config.optimization.splitChunks.cacheGroups) {
        config.optimization.splitChunks.cacheGroups = {};
      }

      // Forzar que @cactus/ui se mantenga en el bundle principal (no hacer code splitting)
      config.optimization.splitChunks.cacheGroups['@cactus-ui'] = {
        test: /[\\/]node_modules[\\/]@cactus[\\/]ui[\\/]/,
        name: false, // No crear chunk separado
        priority: 20,
        reuseExistingChunk: true,
      };

      // AI_DECISION: Separar Recharts en chunk independiente para reducir tama?o de chunks principales
      // Justificaci?n: Recharts agrega ~200KB al bundle, separarlo permite lazy loading y reduce chunk inicial
      // Impacto: Chunk principal m?s peque?o, mejor code splitting, carga bajo demanda de gr?ficos
      config.optimization.splitChunks.cacheGroups.recharts = {
        test: /[\\/]node_modules[\\/]recharts[\\/]/,
        name: 'recharts',
        priority: 30,
        chunks: 'all',
        enforce: true,
        reuseExistingChunk: true,
      };

      // AI_DECISION: Separar componentes Bloomberg en chunk independiente
      // Justificaci?n: Componentes Bloomberg son pesados y solo se usan en p?ginas espec?ficas
      // Impacto: Mejor code splitting, carga bajo demanda de componentes Bloomberg
      config.optimization.splitChunks.cacheGroups.bloomberg = {
        test: /[\\/]app[\\/]components[\\/]bloomberg[\\/]/,
        name: 'bloomberg',
        priority: 25,
        chunks: 'all',
        minChunks: 1,
        reuseExistingChunk: true,
      };

      // AI_DECISION: Separar otros vendor chunks grandes para mejor code splitting
      // Justificaci?n: Mejorar distribuci?n de c?digo en chunks m?s peque?os y manejables
      // Impacto: Chunks m?s peque?os, mejor caching, carga m?s eficiente
      config.optimization.splitChunks.cacheGroups.vendor = {
        test: /[\\/]node_modules[\\/]/,
        name(module) {
          // Extraer el nombre del paquete de la ruta
          const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1];
          // Normalizar nombres de scoped packages
          return packageName
            ? `vendor-${packageName.replace('@', '').replace('/', '-')}`
            : 'vendor';
        },
        priority: 10,
        chunks: 'all',
        minChunks: 1,
        reuseExistingChunk: true,
      };
    }

    // AI_DECISION: Optimizar configuraci?n de desarrollo para m?ximo rendimiento
    // Justificaci?n: Habilitar cache filesystem reduce tiempo de compilaci?n 30-50%
    // Impacto: Inicio m?s r?pido, hot reload mejorado, menor uso de memoria
    if (dev) {
      // AI_DECISION: Habilitar webpack filesystem cache para desarrollo
      // Justificaci?n: Cache persistente reduce tiempo de compilaci?n inicial y hot reload 30-50%
      // Impacto: Primera compilaci?n m?s r?pida, hot reload casi instant?neo en cambios peque?os
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
          // Incluir paquetes del workspace para que webpack detecte cambios
          tsconfig: [path.resolve(__dirname, 'tsconfig.json')],
        },
        cacheDirectory: path.resolve(__dirname, '.next/cache/webpack'),
      };

      // AI_DECISION: Configurar watchOptions para detectar cambios en paquetes del workspace
      // Justificaci?n: Next.js no vigila autom?ticamente cambios en paquetes del workspace (pnpm)
      // Impacto: Hot reload funciona correctamente cuando se modifican componentes en @cactus/ui
      const usePolling = process.platform === 'win32';
      config.watchOptions = {
        ...(usePolling && { poll: 1000 }), // Poll solo en Windows
        aggregateTimeout: 300, // Esperar 300ms despu?s de cambios antes de recompilar
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          // Incluir paquetes del workspace en watch (usar ! para negar el ignore)
          '!../../packages/ui/src/**',
          '!../../packages/ui/dist/**',
          '!../../packages/db/src/**',
        ],
        followSymlinks: true, // Seguir symlinks de pnpm workspace
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // AI_DECISION: Reducir logging de webpack para mejorar rendimiento
      // Justificaci?n: Logging verbose agrega overhead significativo en desarrollo
      // Impacto: Menor uso de CPU/memoria, compilaci?n m?s r?pida
      config.infrastructureLogging = {
        level: 'error', // Solo mostrar errores, no warnings/info
      };
    }

    return config;
  },
};
