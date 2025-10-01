# 🚀 Guía Rápida de Scripts

Todos los scripts de desarrollo, testing y mantenimiento han sido reorganizados en carpetas temáticas dentro de `/scripts`.

## 📋 Comandos NPM Disponibles

### 🛠️ Desarrollo
```bash
npm run dev                        # Inicia cliente y servidor
npm run client:dev                 # Solo cliente (Vite)
npm run server:dev                 # Solo servidor (Nodemon)
npm run build                      # Build de producción
npm run preview                    # Preview del build
```

### 🧪 Testing y Calidad
```bash
npm test                          # Ejecuta tests (Vitest)
npm run test:watch                # Tests en modo watch
npm run lint                      # Linter (ESLint)
npm run check                     # Type checking (TypeScript)
```

### 🌱 Setup y Seeds
```bash
npm run seed:advisors             # Crear advisors individuales
npm run seed:advisors:admin       # Crear advisors con rol admin
npm run seed:advisors:bulk        # Crear múltiples advisors en lote
npm run seed:test-user            # Crear usuario de prueba
```

### ✅ Verificaciones
```bash
npm run check:auth                # Verificar autenticación
npm run check:permissions         # Verificar permisos de usuario
npm run check:rls                 # Verificar Row Level Security
npm run verify:db                 # Verificar estado de la base de datos
npm run verify:roles              # Verificar sistema de roles
npm run verify:advisors           # Verificar advisors creados
npm run health                    # Health check completo del sistema
```

## 📂 Estructura de Scripts

```
scripts/
├── tests/      (31 archivos) - Scripts de testing
├── checks/     (12 archivos) - Verificaciones y validaciones
├── debug/      (11 archivos) - Scripts de debugging
├── setup/      (4 archivos)  - Creación de datos iniciales
├── fixes/      (4 archivos)  - Reparaciones one-time
└── utils/      (4 archivos)  - Utilidades generales
```

### 🔍 Más información
Ver documentación completa en: [`scripts/README.md`](./scripts/README.md)

## 💡 Tips

- **Antes de deploy:** Ejecuta `npm run verify:db` y `npm run verify:roles`
- **Debugging:** Usa los scripts en `scripts/debug/` para diagnosticar problemas
- **Testing local:** Usa `npm run seed:test-user` para crear usuarios de prueba
- **Health check:** Ejecuta `npm run health` después de cambios importantes

## ⚠️ Precauciones

- Scripts en `scripts/fixes/` modifican la base de datos directamente
- Scripts en `scripts/setup/` crean datos (verificar entorno antes de ejecutar)
- Algunos scripts requieren variables de entorno configuradas

---

**Última actualización:** Octubre 2025  
**Estructura reorganizada:** ✅ Todos los scripts categorizados y documentados


