# Memoria: Configuración Cursor para Evitar Cuelgues de Consola

## Problema
Cursor a veces se queda colgado con comandos de terminal/consola, especialmente con comandos de larga duración o que requieren interacción.

## Configuración Recomendada

### 1. Timeouts y Límites
- **Timeout por comando**: 30 segundos máximo
- **Cancelar automáticamente**: Si un comando no responde en 30s
- **Límite de output**: 1000 líneas máximo por comando

### 2. Comandos Problemáticos a Evitar
- Comandos interactivos sin flags `--yes` o `--non-interactive`
- `npm install` sin `--silent` (usar `npm ci` en su lugar)
- Comandos que requieren input del usuario
- Procesos de larga duración sin `is_background: true`

### 3. Mejores Prácticas
```bash
# ✅ BUENO - Comandos no interactivos
pnpm install --frozen-lockfile
npm ci --silent
docker compose up -d
pnpm build --silent

# ❌ MALO - Comandos interactivos
npm install  # puede pedir confirmaciones
pnpm install  # sin flags de no-interacción
```

### 4. Configuración de Comandos Largos
- Para procesos de larga duración: usar `is_background: true`
- Para comandos de build: usar flags `--silent` o `--quiet`
- Para instalaciones: usar `--frozen-lockfile` o `--ci`

### 5. Monitoreo de Comandos
- Verificar que los comandos terminen correctamente
- Si se cuelga, cancelar manualmente y revisar el comando
- Preferir comandos que retornen exit code claro

## Comandos Específicos del Proyecto CACTUS
```bash
# Desarrollo
pnpm dev  # usar is_background: true
docker compose up -d  # ✅ No interactivo

# Build
pnpm build  # agregar --silent si disponible
pnpm -F @cactus/api build

# Base de datos
pnpm db:generate  # migraciones Drizzle
pnpm db:migrate

# Tests
pnpm test --passWithNoTests
```

## Solución de Cuelgues
1. **Cancelar comando**: Ctrl+C en la terminal
2. **Revisar logs**: Verificar si hay errores
3. **Simplificar comando**: Usar versión más básica
4. **Verificar dependencias**: Asegurar que Node/pnpm estén actualizados
5. **Reiniciar Cursor**: Si persiste el problema

## Variables de Entorno Útiles
```bash
# Reducir verbosidad
NODE_ENV=production
CI=true
NPM_CONFIG_LOGLEVEL=error
```






