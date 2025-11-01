#!/bin/bash
# Script de limpieza automática para rama administration-center
# Ejecutar desde la raíz del proyecto

set -e  # Exit on error

echo "🧹 Limpieza de rama administration-center"
echo "=========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. CRÍTICO: Remover CSVs de Git
echo -e "${RED}[1/7]${NC} Removiendo archivos CSV del tracking de Git..."

if [ -d "apps/api/apps/api/uploads" ]; then
  echo "  ⚠️  Path duplicado detectado: apps/api/apps/api/uploads/"
  
  # Agregar a .gitignore
  if ! grep -q "apps/api/uploads/" .gitignore 2>/dev/null; then
    echo "apps/api/uploads/" >> .gitignore
    echo "  ✅ Agregado a .gitignore"
  fi
  
  if ! grep -q "apps/api/apps/" .gitignore 2>/dev/null; then
    echo "apps/api/apps/" >> .gitignore
    echo "  ✅ Agregado path corrupto a .gitignore"
  fi
  
  # Remover del tracking (mantener archivos locales)
  git rm --cached -r apps/api/apps/api/uploads/ 2>/dev/null || true
  echo "  ✅ Archivos removidos del tracking de Git"
  
  # Mover archivos a la ubicación correcta si existe
  if [ ! -d "apps/api/uploads" ]; then
    mkdir -p apps/api/uploads
  fi
  
  mv apps/api/apps/api/uploads/*.csv apps/api/uploads/ 2>/dev/null || true
  echo "  ✅ Archivos movidos a apps/api/uploads/"
  
  # Limpiar directorio corrupto
  rm -rf apps/api/apps/
  echo "  ✅ Directorio corrupto eliminado"
else
  echo "  ℹ️  No se encontró path duplicado (ya corregido)"
fi

echo ""

# 2. ALTO: Crear configuración de límites
echo -e "${YELLOW}[2/7]${NC} Creando archivo de configuración de límites AUM..."

cat > apps/api/src/config/aum-limits.ts << 'EOF'
/**
 * Configuración centralizada de límites para el sistema AUM
 * AI_DECISION: Centralizar magic numbers para facilitar ajustes de performance
 * Justificación: Valores dispersos en el código dificultan mantenimiento
 * Impacto: Mejora configurabilidad y claridad
 */

export const AUM_LIMITS = {
  // File upload limits
  MAX_FILE_SIZE: 25 * 1024 * 1024,  // 25MB
  ALLOWED_MIME_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',  // .xls
    'text/csv'
  ],
  
  // Batch processing
  BATCH_INSERT_SIZE: 250,
  
  // Pagination
  MAX_ROWS_PER_PAGE: 200,
  DEFAULT_PAGE_SIZE: 50,
  PREVIEW_LIMIT: 500,
  
  // Matching thresholds
  SIMILARITY_THRESHOLD: 0.5,
  MAX_SIMILARITY_RESULTS: 5
} as const;

export type AumLimits = typeof AUM_LIMITS;
EOF

echo "  ✅ Creado apps/api/src/config/aum-limits.ts"
echo ""

# 3. ALTO: Crear helper de respuestas de error
echo -e "${YELLOW}[3/7]${NC} Creando helper para respuestas de error..."

cat > apps/api/src/utils/error-response.ts << 'EOF'
/**
 * Helper para generar respuestas de error consistentes
 * AI_DECISION: Evitar exponer detalles internos en producción
 * Justificación: Seguridad y consistencia con el patrón del proyecto
 * Impacto: Todas las rutas usan el mismo formato de error
 */

export interface ErrorResponseOptions {
  error: unknown;
  requestId?: string;
  userMessage?: string;
  context?: Record<string, unknown>;
}

export function createErrorResponse(options: ErrorResponseOptions) {
  const { error, requestId, userMessage, context } = options;
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response: Record<string, unknown> = {
    error: userMessage || 'Internal server error',
    requestId
  };
  
  // Solo incluir detalles en desarrollo
  if (!isProduction && error instanceof Error) {
    response.message = error.message;
    response.stack = error.stack;
    if (context) {
      response.context = context;
    }
  }
  
  return response;
}

/**
 * Helper para determinar código de estado HTTP desde error
 */
export function getStatusCodeFromError(error: unknown): number {
  if (error instanceof Error) {
    // Aquí puedes agregar más lógica para diferentes tipos de error
    if (error.message.includes('not found')) return 404;
    if (error.message.includes('unauthorized')) return 401;
    if (error.message.includes('forbidden')) return 403;
  }
  return 500;
}
EOF

echo "  ✅ Creado apps/api/src/utils/error-response.ts"
echo ""

# 4. MEDIO: Crear configuración centralizada para frontend
echo -e "${YELLOW}[4/7]${NC} Creando configuración centralizada para frontend..."

cat > apps/web/lib/config.ts << 'EOF'
/**
 * Configuración centralizada de la aplicación
 * AI_DECISION: Centralizar variables de entorno y fallbacks
 * Justificación: Evitar repetir process.env.NEXT_PUBLIC_API_URL 42 veces
 * Impacto: Single source of truth para configuración
 */

function getRequiredEnv(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  // API Configuration
  apiUrl: getRequiredEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001'),
  apiTimeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Feature flags
  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    debug: process.env.NEXT_PUBLIC_DEBUG === 'true'
  }
} as const;

export type Config = typeof config;
EOF

echo "  ✅ Creado apps/web/lib/config.ts"
echo ""

# 5. Actualizar .env.example
echo -e "${YELLOW}[5/7]${NC} Actualizando archivos .env.example..."

# Backend
if ! grep -q "UPLOAD_DIR" apps/api/.env.example 2>/dev/null; then
  cat >> apps/api/.env.example << 'EOF'

# AUM Upload Configuration
UPLOAD_DIR=./uploads
# UPLOAD_DIR=/var/app/uploads  # Producción
PG_TRGM_ENABLED=true  # Set to false if pg_trgm extension not available
EOF
  echo "  ✅ Actualizado apps/api/.env.example"
fi

# Frontend
if ! grep -q "NEXT_PUBLIC_API_TIMEOUT" apps/web/.env.example 2>/dev/null; then
  cat >> apps/web/.env.example << 'EOF'

# API Configuration
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_DEBUG=false
EOF
  echo "  ✅ Actualizado apps/web/.env.example"
fi

echo ""

# 6. Instalar dependencias necesarias
echo -e "${YELLOW}[6/7]${NC} Verificando dependencias..."

if ! grep -q '"csv-parse"' apps/api/package.json; then
  echo "  📦 Instalando csv-parse..."
  cd apps/api
  pnpm add csv-parse
  cd ../..
  echo "  ✅ csv-parse instalado"
else
  echo "  ℹ️  csv-parse ya está instalado"
fi

echo ""

# 7. Crear README de limpieza manual
echo -e "${YELLOW}[7/7]${NC} Creando checklist de limpieza manual..."

cat > CLEANUP_CHECKLIST.md << 'EOF'
# ✅ Checklist de Limpieza Manual

Este archivo complementa el script automatizado. Tareas que requieren intervención manual:

## 🔴 Crítico

- [ ] **Revisar datos en CSVs movidos** - Verificar que no contengan información sensible antes de eliminarlos
- [ ] **Actualizar imports en `aum.ts`**
  ```typescript
  // Agregar al inicio del archivo
  import { AUM_LIMITS } from '../config/aum-limits';
  import { createErrorResponse } from '../utils/error-response';
  
  // Reemplazar magic numbers:
  limits: { fileSize: AUM_LIMITS.MAX_FILE_SIZE }
  const batchSize = AUM_LIMITS.BATCH_INSERT_SIZE;
  ```

## 🟠 Alto

- [ ] **Reemplazar fetch directo con cliente API** en:
  - [ ] `apps/web/app/admin/aum/page.tsx`
  - [ ] `apps/web/app/admin/aum/history/page.tsx`
  - [ ] `apps/web/app/admin/aum/[fileId]/page.tsx`
  - [ ] `apps/web/app/admin/aum/components/FileUploader.tsx`
  - [ ] `apps/web/app/admin/aum/components/ContactUserPicker.tsx`
  - [ ] `apps/web/app/admin/aum/components/DuplicateResolutionModal.tsx`
  - [ ] `apps/web/app/admin/aum/components/RowMatchForm.tsx`

- [ ] **Eliminar Pool manual** en `apps/api/src/routes/aum.ts`:
  ```typescript
  // ELIMINAR estas líneas (78-85)
  let _rawPool: Pool | null = null;
  function getRawPool(): Pool { ... }
  
  // ELIMINAR importación
  import { Pool } from 'pg';  // ← ELIMINAR
  
  // REEMPLAZAR uso en línea 784 con Drizzle query builder
  ```

- [ ] **Eliminar `ensureAumTables()`** en `apps/api/src/routes/aum.ts`:
  ```typescript
  // ELIMINAR función completa (líneas 298-335)
  // ELIMINAR llamadas (líneas 410-418)
  ```

- [ ] **Instalar pg_trgm extension en DB**:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```

## 🟡 Medio

- [ ] **Remover console.log/alert** en componentes:
  ```typescript
  // Reemplazar con:
  import { logger } from '@/lib/logger';
  import { toast } from '@/components/ui/toast';
  ```

- [ ] **Parametrizar script**: Editar `apps/api/src/scripts/assign-unassigned-contacts.ts`
  - Agregar CLI arguments con `yargs`
  - Remover nombre hardcodeado "giolivo santarelli"

- [ ] **Crear tipos extendidos** para Request:
  ```typescript
  // apps/api/src/types/express.d.ts
  import 'express';
  
  declare module 'express' {
    export interface Request {
      user?: {
        id: string;
        email: string;
        role: 'admin' | 'manager' | 'advisor';
      };
      requestId?: string;
    }
  }
  ```

- [ ] **Actualizar error handling** - Usar `createErrorResponse()` en todos los catch blocks

## 📝 Documentación

- [ ] Agregar sección en `apps/api/README.md` sobre prerequisitos:
  ```markdown
  ## Database Extensions Required
  
  - `pg_trgm` - Fuzzy text matching for contact similarity
    ```sql
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    ```
  ```

- [ ] Actualizar `.cursorrules` si hay nuevos patrones establecidos

## 🧪 Testing

- [ ] Probar upload de archivos AUM
- [ ] Verificar que paths sean correctos
- [ ] Confirmar que similarity search funciona (o fallback si no hay pg_trgm)
- [ ] Verificar paginación y filtros

## 🚀 Deploy

- [ ] Crear `UPLOAD_DIR` en servidor de producción
- [ ] Agregar variable `UPLOAD_DIR` a `.env` de producción
- [ ] Verificar permisos de escritura en directorio
- [ ] Configurar rotación de archivos antiguos (cron job)

---

## 📊 Progreso

- Completado: 0/28
- En progreso: 0/28
- Pendiente: 28/28

**Última actualización:** $(date)
EOF

echo "  ✅ Creado CLEANUP_CHECKLIST.md"
echo ""

# Resumen final
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Limpieza automática completada${NC}"
echo "=========================================="
echo ""
echo "📋 Siguientes pasos:"
echo "  1. Revisar cambios: git status"
echo "  2. Completar tareas manuales: cat CLEANUP_CHECKLIST.md"
echo "  3. Commitear: git add . && git commit -m 'chore: cleanup administration-center'"
echo ""
echo "📊 Archivos creados:"
echo "  - apps/api/src/config/aum-limits.ts"
echo "  - apps/api/src/utils/error-response.ts"
echo "  - apps/web/lib/config.ts"
echo "  - CLEANUP_CHECKLIST.md"
echo ""
echo "📦 Dependencias instaladas:"
echo "  - csv-parse"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "  - Revisar archivos CSV movidos antes de eliminarlos"
echo "  - Completar tareas manuales del checklist"
echo "  - Ejecutar: pnpm -F @cactus/db migrate"
echo ""

