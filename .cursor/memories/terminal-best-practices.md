# Memoria: Mejores Prácticas para Terminal en Cursor

## Propósito
Guía completa para evitar cuelgues de terminal en Cursor y usar comandos de forma segura y eficiente en el proyecto MAATWORK.

## Contexto
Usar esta memoria cuando:
- Ejecutar comandos de terminal desde Cursor
- Troubleshooting de cuelgues de consola
- Configurar comandos para desarrollo
- Necesitar comandos específicos del proyecto MAATWORK

## Problema: Cuelgues de Terminal

Cursor a veces se queda colgado con comandos de terminal/consola, especialmente con:
- Comandos de larga duración sin flags apropiados
- Comandos que requieren interacción del usuario
- Procesos que no terminan naturalmente

## Solución: Comandos Siempre No-Interactivos

### 1. Flags Obligatorios para Comandos Comunes

```bash
# ✅ SIEMPRE usar estos flags
npm install --yes --silent
pnpm install --frozen-lockfile
docker compose up -d
git commit -m "mensaje" --no-verify
npm ci --silent  # Preferir sobre npm install
```

### 2. Timeouts y Límites Explícitos

- **Timeout por comando**: 30 segundos máximo
- **Cancelar automáticamente**: Si un comando no responde en 30s
- **Límite de output**: 1000 líneas máximo por comando
- **Comandos de instalación**: máximo 2 minutos
- **Comandos de build**: máximo 5 minutos  
- **Comandos de test**: máximo 3 minutos
- Si excede, cancelar y investigar

### 3. Background para Procesos Largos

```bash
# Para servidores de desarrollo - SIEMPRE usar is_background: true
pnpm dev  # usar is_background: true
docker compose up  # usar is_background: true
```

### 4. Comandos Específicos del Proyecto MAATWORK

```bash
# ✅ Seguros (no interactivos)
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm test --passWithNoTests
docker compose up -d
pnpm -F @maatwork/db generate  # migraciones Drizzle
pnpm -F @maatwork/db migrate

# ⚠️ Requieren cuidado
pnpm dev  # usar background
pnpm publish  # puede requerir input
```

### 5. Patrones de Comandos Problemáticos

❌ **EVITAR**:
- Comandos sin flags de no-interacción
- Comandos que piden confirmación
- `npm install` sin `--yes` o `--silent`
- Comandos que abren editores
- Procesos que no terminan naturalmente
- Comandos interactivos sin flags `--yes` o `--non-interactive`

✅ **PREFERIR**:
- Comandos con flags explícitos
- Versiones que no requieren input
- Comandos con timeouts claros
- Procesos que terminan con exit code
- `pnpm install --frozen-lockfile` sobre `pnpm install`
- `npm ci --silent` sobre `npm install`

## Verificación de Estado

Antes de ejecutar comandos complejos:

1. Verificar que Node.js esté funcionando: `node --version`
2. Verificar que pnpm esté disponible: `pnpm --version`
3. Verificar que Docker esté corriendo: `docker ps`

### Comandos de Diagnóstico Rápido

```bash
# Verificar estado del proyecto
pnpm --version
node --version
docker ps
git status
```

## Manejo de Errores

- Si un comando falla, **NO reintentar inmediatamente**
- Leer el error completo antes de la siguiente acción
- Verificar logs específicos del comando
- Preferir comandos que retornen exit code claro

## Solución de Cuelgues

Si Cursor se cuelga:

1. **Cancelar comando**: Ctrl+C en la terminal
2. **Revisar logs**: Verificar si hay errores
3. **Simplificar comando**: Usar versión más básica
4. **Verificar dependencias**: Asegurar que Node/pnpm estén actualizados
5. **Verificar procesos**: `tasklist | findstr node` (Windows)
6. **Matar procesos colgados**: `taskkill /F /IM node.exe` (Windows)
7. **Reiniciar terminal**: Ctrl+Shift+P → "Terminal: Kill All Terminals"
8. **Reiniciar Cursor**: Si persiste el problema

## Variables de Entorno Útiles

```bash
# Reducir verbosidad
NODE_ENV=production
CI=true
NPM_CONFIG_LOGLEVEL=error
PNPM_DISABLE_PROMPT=true
```

## Comandos de Recuperación

```bash
# Verificar estado
git status
pnpm --version
node --version

# Reinstalar dependencias
pnpm install --frozen-lockfile

# Verificar build
pnpm build
```

## Referencias

- Reglas relacionadas: `.cursor/rules/project.mdc`
- Memoria relacionada: `.cursor/memories/cursor-settings.md`
- Documentación: `docs/DEVELOPMENT.md`

## Última Actualización

2025-01-16 - Consolidación de memorias de terminal
