# Documentación del Proyecto MAATWORK

Índice principal de toda la documentación técnica del proyecto.

## 🚀 Inicio Rápido

| Si eres... | Empieza con... |
|------------|----------------|
| Nuevo desarrollador | [ONBOARDING.md](./ONBOARDING.md) → [CLI.md](./CLI.md) |
| Contribuidor | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| Buscando comandos | [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) |
| Entendiendo arquitectura | [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## 📖 Guías Principales

### Desarrollo
- **[CLI.md](./CLI.md)** - Referencia completa del CLI (`pnpm mw`)
- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - Cheatsheet de comandos y patrones
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Guía de desarrollo detallada
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Cómo contribuir al proyecto
- **[ONBOARDING.md](./ONBOARDING.md)** - Guía de onboarding para nuevos

### Arquitectura
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitectura del sistema
- **[ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md)** - ADRs (decisiones arquitectónicas)
- **[FILE-STRUCTURE.md](./FILE-STRUCTURE.md)** - Estructura estándar de archivos

### Base de Datos
- **[DATABASE.md](./DATABASE.md)** - Drizzle ORM, migraciones, optimización

### Testing
- **[TESTING.md](./TESTING.md)** - Unit, integration, E2E y visual regression
- **[TEST-PERFORMANCE.md](./TEST-PERFORMANCE.md)** - Performance testing

### Operaciones
- **[OPERATIONS.md](./OPERATIONS.md)** - Deploy, monitoreo, troubleshooting
- **[OPTIMIZATION.md](./OPTIMIZATION.md)** - Optimizaciones de bundle y rendimiento
- **[DEPENDENCY-MANAGEMENT.md](./DEPENDENCY-MANAGEMENT.md)** - Gestión de dependencias

---

## 🔧 CLI Rápido

```bash
pnpm mw dev              # Iniciar desarrollo
pnpm mw health           # Verificar salud del proyecto
pnpm mw gen component    # Generar código
pnpm mw test unit        # Ejecutar tests
pnpm mw audit code       # Auditoría de código
pnpm mw metrics          # Ver métricas
```

Ver [CLI.md](./CLI.md) para documentación completa.

---

## 📁 Estructura de Documentación

```
docs/
├── README.md                   # Este archivo (índice)
│
├── # Desarrollo
├── CLI.md                      # ⭐ Referencia del CLI
├── QUICK-REFERENCE.md          # ⭐ Cheatsheet de comandos
├── CONTRIBUTING.md             # Guía de contribución
├── DEVELOPMENT.md              # Guía de desarrollo
├── ONBOARDING.md               # Guía de onboarding
│
├── # Arquitectura
├── ARCHITECTURE.md             # Arquitectura general
├── ARCHITECTURE-DECISIONS.md   # ADRs
├── FILE-STRUCTURE.md           # Estructura de archivos
│
├── # Base de Datos
├── DATABASE.md                 # Drizzle, migraciones
│
├── # Testing
├── TESTING.md                  # Estrategias de testing
├── TEST-PERFORMANCE.md         # Performance testing
│
├── # Operaciones
├── OPERATIONS.md               # Deploy, monitoreo
├── OPTIMIZATION.md             # Optimizaciones
├── DEPENDENCY-MANAGEMENT.md    # Gestión de deps
│
├── # Features
├── features/                   # Documentación de features específicas
│   └── team-calendar.md
│
├── # Troubleshooting
├── troubleshooting/            # Guías de solución de problemas
│   ├── browser-cache-cleanup.md
│   ├── isr-cookies-error.md
│   └── webpack-skeleton-error.md
│
└── archive/                    # Documentación obsoleta
```

---

## 🔗 Enlaces Rápidos

- [README Principal](../README.md) - Inicio rápido y comandos esenciales
- [Reglas del Proyecto](../.cursor/rules/) - Reglas de desarrollo y arquitectura
- [Design System](../packages/ui/README.md) - Documentación del design system
- [Templates](../.templates/) - Templates para crear nuevos archivos

---

## 📋 Por Tipo de Tarea

### Empezar a Desarrollar
1. [ONBOARDING.md](./ONBOARDING.md) - Setup inicial
2. [CLI.md](./CLI.md) - Comandos disponibles
3. [DEVELOPMENT.md](./DEVELOPMENT.md) - Estándares de código

### Crear Nuevo Código
1. [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Patrones de código
2. [CLI.md](./CLI.md#generadores) - Generadores (`pnpm mw gen`)
3. [FILE-STRUCTURE.md](./FILE-STRUCTURE.md) - Dónde poner archivos

### Contribuir
1. [CONTRIBUTING.md](./CONTRIBUTING.md) - Proceso de contribución
2. [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md) - Entender decisiones

### Debugging
1. [DEVELOPMENT.md](./DEVELOPMENT.md#debugging) - Guía de debugging
2. [troubleshooting/](./troubleshooting/) - Problemas comunes

### Deploy
1. [OPERATIONS.md](./OPERATIONS.md) - Guía de operaciones
2. [OPTIMIZATION.md](./OPTIMIZATION.md) - Optimizaciones
