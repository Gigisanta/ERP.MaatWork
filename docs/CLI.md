# MAATWORK CLI Reference

Herramienta unificada de desarrollo para el monorepo MAATWORK.

## Instalación

El CLI viene incluido en el proyecto. Solo necesitas tener las dependencias instaladas:

```bash
pnpm install
```

## Uso

```bash
pnpm mw <comando> [subcomando] [opciones]
```

O usa los aliases directos:

```bash
pnpm dev          # = pnpm mw dev
pnpm health       # = pnpm mw health
pnpm gen          # = pnpm mw gen
```

---

## Comandos

### `mw dev` - Desarrollo

Inicia el entorno de desarrollo con validaciones y servicios.

```bash
pnpm mw dev                  # Inicio completo
pnpm mw dev --fast           # Sin validaciones (más rápido)
pnpm mw dev --skip-docker    # Sin verificar Docker
pnpm mw dev --only=api,web   # Solo servicios específicos
```

**Opciones:**
| Opción | Descripción |
|--------|-------------|
| `--fast` | Omite validaciones y verificaciones |
| `--skip-docker` | No verifica ni inicia Docker |
| `--only <apps>` | Inicia solo las apps especificadas (api,web,analytics) |
| `--no-cache` | Ignora el cache de validaciones |

---

### `mw db` - Base de Datos

Comandos de gestión de base de datos.

```bash
pnpm mw db migrate           # Ejecutar migraciones
pnpm mw db seed              # Ejecutar seeds
pnpm mw db studio            # Abrir Drizzle Studio
pnpm mw db reset             # Resetear BD (DESTRUCTIVO)
pnpm mw db generate          # Generar migración
pnpm mw db backup            # Crear backup
pnpm mw db restore <file>    # Restaurar backup
```

**Subcomandos:**

#### `db migrate`
```bash
pnpm mw db migrate --dry-run   # Solo mostrar migraciones pendientes
```

#### `db seed`
```bash
pnpm mw db seed --type=all       # Seed completo (default)
pnpm mw db seed --type=pipeline  # Solo pipeline stages
pnpm mw db seed --type=full      # Seed con datos de prueba
```

#### `db reset`
```bash
pnpm mw db reset --force    # Sin confirmación
pnpm mw db reset --seed     # Ejecutar seeds después
```

#### `db backup`
```bash
pnpm mw db backup --output=./backups   # Ruta personalizada
```

---

### `mw test` - Testing

Comandos de testing.

```bash
pnpm mw test unit            # Tests unitarios
pnpm mw test e2e             # Tests end-to-end
pnpm mw test coverage        # Tests con cobertura
pnpm mw test watch           # Modo watch
pnpm mw test affected        # Solo tests afectados
```

**Subcomandos:**

#### `test unit`
```bash
pnpm mw test unit --filter=api,ui    # Filtrar por paquetes
pnpm mw test unit --parallel         # Ejecutar en paralelo
```

#### `test e2e`
```bash
pnpm mw test e2e --headed    # Modo visible
pnpm mw test e2e --ui        # Interfaz de Playwright
pnpm mw test e2e --debug     # Modo debug
pnpm mw test e2e --setup     # Preparar BD antes
```

#### `test coverage`
```bash
pnpm mw test coverage --check   # Verificar thresholds
```

---

### `mw health` - Diagnóstico

Verificación completa de la salud del proyecto.

```bash
pnpm mw health               # Verificación rápida
pnpm mw health --full        # Verificación completa (incluye build y tests)
pnpm mw health --fix         # Intentar corregir problemas
pnpm mw health --json        # Output en JSON
```

**Verificaciones incluidas:**
- Versiones de Node.js y pnpm
- Estado de Docker y PostgreSQL
- Dependencias instaladas
- Paquetes construidos
- Configuración de entorno
- Estado de git
- (Con --full) TypeCheck, Lint, Tests

---

### `mw gen` - Generadores

Generadores de código para scaffolding.

```bash
pnpm mw gen component <name>     # Generar componente
pnpm mw gen route <path>         # Generar ruta API
pnpm mw gen hook <name>          # Generar hook
pnpm mw gen api-client <domain>  # Generar cliente API
```

**Subcomandos:**

#### `gen component`
```bash
pnpm mw gen component Button --package=ui     # En @maatwork/ui
pnpm mw gen component Card --package=web      # En @maatwork/web
pnpm mw gen component Modal --dir=feedback    # En subdirectorio
pnpm mw gen component Form --no-test          # Sin archivo de test
```

**Archivos generados:**
```
packages/ui/src/components/Button/
├── Button.tsx
├── Button.test.tsx
└── index.ts
```

#### `gen route`
```bash
pnpm mw gen route users/profile --methods=get,put
```

**Archivos generados:**
```
apps/api/src/routes/users/
├── profile.ts
└── profile.test.ts
```

#### `gen hook`
```bash
pnpm mw gen hook useModal --package=ui
```

#### `gen api-client`
```bash
pnpm mw gen api-client portfolios
```

**Archivos generados:**
```
apps/web/lib/api/portfolios.ts
apps/web/types/portfolios.ts
```

---

### `mw clean` - Limpieza

Comandos de limpieza del proyecto.

```bash
pnpm mw clean cache       # Limpiar caches
pnpm mw clean artifacts   # Limpiar artefactos de build
pnpm mw clean deps        # Reinstalar dependencias
pnpm mw clean all         # Limpieza completa
```

**Subcomandos:**

#### `clean cache`
Elimina: `.turbo/`, `.next/`, `*.tsbuildinfo`

#### `clean artifacts`
Elimina: `dist/`, `coverage/`, `test-results/`

#### `clean deps`
```bash
pnpm mw clean deps --force   # Sin confirmación
```

---

### `mw audit` - Auditorías

Auditorías de código y dependencias.

```bash
pnpm mw audit code          # Auditoría de código con Knip
pnpm mw audit deps          # Auditoría de dependencias
pnpm mw audit bundle        # Análisis de bundle
pnpm mw audit console-logs  # Buscar console.log
```

**Subcomandos:**

#### `audit code`
```bash
pnpm mw audit code --fix    # Intentar corregir
pnpm mw audit code --ci     # Modo CI (exit 1 si hay problemas)
```

#### `audit console-logs`
```bash
pnpm mw audit console-logs --fix   # Mostrar archivos a corregir
```

---

### `mw release` - Releases

Gestión de releases y changelog.

```bash
pnpm mw release prepare    # Preparar release
pnpm mw release changelog  # Generar/ver changelog
pnpm mw release publish    # Publicar release
pnpm mw release status     # Ver estado actual
```

**Subcomandos:**

#### `release prepare`
```bash
pnpm mw release prepare --skip-verify   # Sin verificación completa
```

#### `release changelog`
```bash
pnpm mw release changelog --add   # Agregar nuevo changeset
```

#### `release publish`
```bash
pnpm mw release publish --dry-run   # Solo mostrar qué se haría
```

---

### `mw metrics` - Métricas

Dashboard de métricas del proyecto.

```bash
pnpm mw metrics           # Mostrar métricas
pnpm mw metrics --json    # Output en JSON
```

**Métricas incluidas:**
- Líneas de código por extensión
- Estadísticas por paquete (files, lines, size, coverage)
- Dependencias (total, producción, desarrollo, outdated)
- Deuda técnica (any types, TODOs, FIXMEs, barrel exports)
- Technical Debt Score

---

## Ejemplos de Uso

### Flujo de desarrollo diario

```bash
# Iniciar desarrollo
pnpm mw dev

# Verificar salud antes de commit
pnpm mw health

# Generar nuevo componente
pnpm mw gen component UserCard --package=ui

# Ejecutar tests afectados
pnpm mw test affected
```

### Antes de crear PR

```bash
# Verificación completa
pnpm mw health --full

# Auditar código
pnpm mw audit code

# Ver métricas
pnpm mw metrics
```

### Release

```bash
# Agregar changeset
pnpm mw release changelog --add

# Preparar release
pnpm mw release prepare

# Publicar (desde main)
pnpm mw release publish
```

---

## Configuración

El CLI usa la configuración del proyecto definida en:

- `package.json` - Versión, scripts, dependencias
- `turbo.json` - Configuración de Turbo
- `tsconfig.base.json` - Configuración de TypeScript
- `apps/api/.env` - Variables de entorno

---

## Solución de Problemas

### El CLI no encuentra comandos

```bash
# Reinstalar dependencias
pnpm install

# Verificar que tsx esté instalado
pnpm add -D tsx
```

### Errores de permisos en hooks

```bash
# Dar permisos de ejecución
chmod +x .husky/*
```

### Docker no está disponible

```bash
# Omitir verificación de Docker
pnpm mw dev --skip-docker
```

---

## Referencia Rápida

| Comando | Descripción |
|---------|-------------|
| `pnpm mw dev` | Iniciar desarrollo |
| `pnpm mw dev --fast` | Desarrollo sin validaciones |
| `pnpm mw db migrate` | Ejecutar migraciones |
| `pnpm mw db studio` | Abrir Drizzle Studio |
| `pnpm mw test unit` | Tests unitarios |
| `pnpm mw test e2e --ui` | E2E con interfaz |
| `pnpm mw health` | Verificar salud |
| `pnpm mw health --full` | Verificación completa |
| `pnpm mw gen component X` | Generar componente |
| `pnpm mw clean cache` | Limpiar caches |
| `pnpm mw audit code` | Auditar código |
| `pnpm mw metrics` | Ver métricas |
| `pnpm mw release prepare` | Preparar release |

