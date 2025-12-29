# Documentacion del Proyecto MAATWORK

Indice principal de toda la documentacion tecnica del proyecto.

## Guias Principales

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitectura del sistema, decisiones tecnicas y estructura
- **[DATABASE.md](./DATABASE.md)** - Base de datos: optimizacion, configuracion, particionamiento, cache
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Desarrollo: Getting Started, Code Standards, Debugging
- **[TESTING.md](./TESTING.md)** - Testing: unit, integration, E2E y visual regression
- **[OPERATIONS.md](./OPERATIONS.md)** - Operaciones: deploy, monitoreo, troubleshooting, performance
- **[OPTIMIZATION.md](./OPTIMIZATION.md)** - Optimizaciones de bundle, builds y rendimiento

## Guias de Codigo

- **[CODE-IMPROVEMENTS.md](./CODE-IMPROVEMENTS.md)** - Mejoras de codigo: patrones, convenciones, type safety
- **[ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md)** - Registro de decisiones arquitectonicas (ADRs)
- **[FILE-STRUCTURE.md](./FILE-STRUCTURE.md)** - Estructura estandar de archivos por tipo de codigo

## Inicio Rapido

### Nuevos Desarrolladores
1. [DEVELOPMENT.md](./DEVELOPMENT.md) - Empezar aqui
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Entender la arquitectura
3. [CODE-IMPROVEMENTS.md](./CODE-IMPROVEMENTS.md) - Patrones y convenciones de codigo
4. [FILE-STRUCTURE.md](./FILE-STRUCTURE.md) - Como estructurar archivos
5. [TESTING.md](./TESTING.md) - Como escribir tests

### Para Entender Decisiones
1. [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md) - Por que se eligieron ciertas tecnologias
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Detalles de implementacion

### DevOps/Operaciones
1. [OPERATIONS.md](./OPERATIONS.md) - Deploy y monitoreo
2. [DATABASE.md](./DATABASE.md) - Configuracion y optimizacion de BD

## Enlaces Rapidos

- [README Principal](../README.md) - Inicio rapido y comandos esenciales
- [Reglas del Proyecto](../.cursor/rules/) - Reglas de desarrollo y arquitectura
- [Design System](../packages/ui/README.md) - Documentacion del design system
- [Templates](../.templates/) - Templates para crear nuevos archivos

## Estructura de Documentacion

```
docs/
├── README.md                   # Este archivo (indice)
├── ARCHITECTURE.md             # Arquitectura general
├── ARCHITECTURE-DECISIONS.md   # ADRs (decisiones arquitectonicas)
├── CODE-IMPROVEMENTS.md        # Patrones y convenciones
├── FILE-STRUCTURE.md           # Estructura de archivos
├── DATABASE.md                 # Base de datos
├── DEVELOPMENT.md              # Desarrollo
├── TESTING.md                  # Testing
├── OPERATIONS.md               # Operaciones
└── OPTIMIZATION.md             # Optimizacion
```
