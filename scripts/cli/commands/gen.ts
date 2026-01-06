/**
 * Comando: gen (generadores)
 *
 * Generadores de código para componentes, rutas, hooks, etc.
 */

import { Command } from 'commander';
import { logger, paths, input, select, colors } from '../../lib/index';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

export const genCommand = new Command('gen')
  .description('Generadores de código')
  .addCommand(componentCommand())
  .addCommand(routeCommand())
  .addCommand(hookCommand())
  .addCommand(apiClientCommand());

function componentCommand(): Command {
  return new Command('component')
    .description('Generar componente React')
    .argument('<name>', 'Nombre del componente (PascalCase)')
    .option('--package <pkg>', 'Paquete destino (ui, web)', 'ui')
    .option('--dir <dir>', 'Directorio dentro de components/')
    .option('--no-test', 'No generar archivo de test')
    .action(async (name, options) => {
      logger.header('Generador de Componentes');

      // Validar nombre
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
        logger.error('El nombre debe estar en PascalCase (ej: MyComponent)');
        process.exit(1);
      }

      const packagePath = options.package === 'ui' ? paths.packages.ui : paths.apps.web;
      const componentDir = options.dir
        ? join(packagePath, 'src/components', options.dir, name)
        : join(packagePath, 'src/components', name);

      if (existsSync(componentDir)) {
        logger.error(`El componente ya existe: ${componentDir}`);
        process.exit(1);
      }

      // Crear directorio
      mkdirSync(componentDir, { recursive: true });

      // Generar archivos
      const files = generateComponentFiles(name, options.package === 'ui');

      // Escribir archivos
      writeFileSync(join(componentDir, `${name}.tsx`), files.component);
      writeFileSync(join(componentDir, 'index.ts'), files.index);

      if (options.test) {
        writeFileSync(join(componentDir, `${name}.test.tsx`), files.test);
      }

      logger.success(`Componente creado: ${name}`);
      logger.newline();
      logger.info('Archivos generados:');
      logger.list([`${name}.tsx`, 'index.ts', ...(options.test ? [`${name}.test.tsx`] : [])]);

      logger.newline();
      logger.info(`Ubicación: ${componentDir}`);
    });
}

function routeCommand(): Command {
  return new Command('route')
    .description('Generar ruta de API')
    .argument('<path>', 'Path de la ruta (ej: users/profile)')
    .option('--methods <methods>', 'Métodos HTTP (get,post,put,delete)', 'get')
    .action(async (routePath, options) => {
      logger.header('Generador de Rutas API');

      const methods = options.methods.split(',').map((m: string) => m.trim().toLowerCase());
      const routeFile = join(paths.apps.api, 'src/routes', `${routePath}.ts`);
      const testFile = join(paths.apps.api, 'src/routes', `${routePath}.test.ts`);

      if (existsSync(routeFile)) {
        logger.error(`La ruta ya existe: ${routeFile}`);
        process.exit(1);
      }

      // Crear directorios
      mkdirSync(dirname(routeFile), { recursive: true });

      // Generar archivos
      const files = generateRouteFiles(routePath, methods);

      writeFileSync(routeFile, files.route);
      writeFileSync(testFile, files.test);

      logger.success(`Ruta creada: ${routePath}`);
      logger.newline();
      logger.info('Archivos generados:');
      logger.list([`${routePath}.ts`, `${routePath}.test.ts`]);

      logger.newline();
      logger.warn('Recuerda registrar la ruta en el router principal');
    });
}

function hookCommand(): Command {
  return new Command('hook')
    .description('Generar hook de React')
    .argument('<name>', 'Nombre del hook (useXxx)')
    .option('--package <pkg>', 'Paquete destino (web, ui)', 'web')
    .action(async (name, options) => {
      logger.header('Generador de Hooks');

      // Validar nombre
      if (!name.startsWith('use')) {
        logger.error('El nombre del hook debe empezar con "use"');
        process.exit(1);
      }

      const packagePath = options.package === 'ui' ? paths.packages.ui : paths.apps.web;
      const hooksDir = join(packagePath, options.package === 'ui' ? 'src/hooks' : 'lib/hooks');
      const hookFile = join(hooksDir, `${name}.ts`);
      const testFile = join(hooksDir, `${name}.test.ts`);

      if (existsSync(hookFile)) {
        logger.error(`El hook ya existe: ${hookFile}`);
        process.exit(1);
      }

      mkdirSync(hooksDir, { recursive: true });

      const files = generateHookFiles(name);

      writeFileSync(hookFile, files.hook);
      writeFileSync(testFile, files.test);

      logger.success(`Hook creado: ${name}`);
      logger.newline();
      logger.info('Archivos generados:');
      logger.list([`${name}.ts`, `${name}.test.ts`]);
    });
}

function apiClientCommand(): Command {
  return new Command('api-client')
    .description('Generar cliente de API para frontend')
    .argument('<domain>', 'Dominio (ej: portfolios, contacts)')
    .action(async (domain) => {
      logger.header('Generador de API Client');

      const apiFile = join(paths.apps.web, 'lib/api', `${domain}.ts`);
      const typesFile = join(paths.apps.web, 'types', `${domain}.ts`);

      if (existsSync(apiFile)) {
        logger.error(`El API client ya existe: ${apiFile}`);
        process.exit(1);
      }

      mkdirSync(dirname(apiFile), { recursive: true });
      mkdirSync(dirname(typesFile), { recursive: true });

      const files = generateApiClientFiles(domain);

      writeFileSync(apiFile, files.api);
      writeFileSync(typesFile, files.types);

      logger.success(`API Client creado: ${domain}`);
      logger.newline();
      logger.info('Archivos generados:');
      logger.list([`lib/api/${domain}.ts`, `types/${domain}.ts`]);
    });
}

// ============================================
// Template Functions
// ============================================

function generateComponentFiles(
  name: string,
  isUiPackage: boolean
): { component: string; index: string; test: string } {
  const component = `import { type FC } from 'react';

export interface ${name}Props {
  /** Contenido del componente */
  children?: React.ReactNode;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * ${name} - Componente de UI
 *
 * @example
 * <${name}>Contenido</${name}>
 */
export const ${name}: FC<${name}Props> = ({ children, className }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

${name}.displayName = '${name}';
`;

  const index = `export { ${name} } from './${name}';
export type { ${name}Props } from './${name}';
`;

  const test = `import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('renders children correctly', () => {
    render(<${name}>Test content</${name}>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<${name} className="custom-class">Test</${name}>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
`;

  return { component, index, test };
}

function generateRouteFiles(routePath: string, methods: string[]): { route: string; test: string } {
  const routeName = routePath.split('/').pop() ?? routePath;
  const pascalName = routeName.charAt(0).toUpperCase() + routeName.slice(1);

  const methodHandlers = methods
    .map((method) => {
      const upperMethod = method.toUpperCase();
      return `
// ${upperMethod} /${routePath}
router.${method}('/',
  requireAuth,
  createRouteHandler(async (req) => {
    // TODO: Implementar handler
    return { message: '${upperMethod} ${routePath} not implemented' };
  })
);`;
    })
    .join('\n');

  const route = `/**
 * Ruta: /${routePath}
 *
 * Generado automáticamente por: pnpm mw gen route
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/routes/auth/middlewares';
import { validate } from '@/utils/validation';
import { createRouteHandler } from '@/utils/route-handler';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const create${pascalName}Schema = z.object({
  // TODO: Definir schema
});

const update${pascalName}Schema = z.object({
  // TODO: Definir schema
});

// ==========================================================
// Routes
// ==========================================================
${methodHandlers}

export default router;
`;

  const test = `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/index';

describe('${routePath} routes', () => {
  // TODO: Setup y teardown

  ${methods
    .map(
      (method) => `
  describe('${method.toUpperCase()} /${routePath}', () => {
    it('should require authentication', async () => {
      const response = await request(app).${method}('/v1/${routePath}');
      expect(response.status).toBe(401);
    });

    // TODO: Agregar más tests
  });`
    )
    .join('\n')}
});
`;

  return { route, test };
}

function generateHookFiles(name: string): { hook: string; test: string } {
  const hook = `import { useState, useCallback } from 'react';

/**
 * ${name} - Custom hook
 *
 * @example
 * const { value, setValue } = ${name}();
 */
export function ${name}() {
  const [value, setValue] = useState<unknown>(null);

  const reset = useCallback(() => {
    setValue(null);
  }, []);

  return {
    value,
    setValue,
    reset,
  };
}
`;

  const test = `import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('returns initial value', () => {
    const { result } = renderHook(() => ${name}());
    expect(result.current.value).toBe(null);
  });

  it('updates value', () => {
    const { result } = renderHook(() => ${name}());

    act(() => {
      result.current.setValue('test');
    });

    expect(result.current.value).toBe('test');
  });

  it('resets value', () => {
    const { result } = renderHook(() => ${name}());

    act(() => {
      result.current.setValue('test');
      result.current.reset();
    });

    expect(result.current.value).toBe(null);
  });
});
`;

  return { hook, test };
}

function generateApiClientFiles(domain: string): { api: string; types: string } {
  const pascalDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
  const singularDomain = domain.endsWith('s') ? domain.slice(0, -1) : domain;
  const pascalSingular = singularDomain.charAt(0).toUpperCase() + singularDomain.slice(1);

  const api = `/**
 * API Client: ${domain}
 *
 * Generado automáticamente por: pnpm mw gen api-client
 */

import { apiClient } from './client';
import type { ApiResponse } from './client';
import type {
  ${pascalSingular},
  Create${pascalSingular}Request,
  Update${pascalSingular}Request,
  List${pascalDomain}Response,
} from '@/types/${domain}';

// ==========================================================
// API Functions
// ==========================================================

export async function get${pascalDomain}(): Promise<ApiResponse<List${pascalDomain}Response>> {
  return apiClient.get<List${pascalDomain}Response>('/v1/${domain}');
}

export async function get${pascalSingular}(id: string): Promise<ApiResponse<${pascalSingular}>> {
  return apiClient.get<${pascalSingular}>(\`/v1/${domain}/\${id}\`);
}

export async function create${pascalSingular}(
  data: Create${pascalSingular}Request
): Promise<ApiResponse<${pascalSingular}>> {
  return apiClient.post<${pascalSingular}>('/v1/${domain}', data);
}

export async function update${pascalSingular}(
  id: string,
  data: Update${pascalSingular}Request
): Promise<ApiResponse<${pascalSingular}>> {
  return apiClient.put<${pascalSingular}>(\`/v1/${domain}/\${id}\`, data);
}

export async function delete${pascalSingular}(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(\`/v1/${domain}/\${id}\`);
}
`;

  const types = `/**
 * Types: ${domain}
 *
 * Generado automáticamente por: pnpm mw gen api-client
 */

// ==========================================================
// Entity Types
// ==========================================================

export interface ${pascalSingular} {
  id: string;
  // TODO: Agregar campos
  createdAt: string;
  updatedAt: string;
}

// ==========================================================
// Request Types
// ==========================================================

export interface Create${pascalSingular}Request {
  // TODO: Agregar campos requeridos para crear
}

export interface Update${pascalSingular}Request {
  // TODO: Agregar campos opcionales para actualizar
}

// ==========================================================
// Response Types
// ==========================================================

export interface List${pascalDomain}Response {
  data: ${pascalSingular}[];
  total: number;
  page: number;
  limit: number;
}
`;

  return { api, types };
}
