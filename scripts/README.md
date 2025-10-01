# 📁 Scripts - Documentación

Esta carpeta contiene todos los scripts de utilidad, testing, debugging y mantenimiento del proyecto CactusDashboard.

## 📂 Estructura de Carpetas

### 🧪 `tests/` (31 archivos)
Scripts para testing y pruebas del sistema:
- Tests de autenticación (`test_auth_*`, `test_login_*`)
- Tests de registro (`test_registration_*`, `test_register_*`)
- Tests de CRM y tags (`test_crm_*`, `test_tags_*`)
- Tests de RLS y permisos (`test_rls_*`)
- Archivos HTML de testing

**Uso:** Scripts para validar funcionalidades antes de deploy o después de cambios.

### 🔍 `checks/` (12 archivos)
Scripts de verificación y validación:
- `check_*` - Verificaciones de estado (auth, contactos, RLS, permisos)
- `verify_*` - Validaciones de producción (advisors, database, roles)
- `final_rls_verification.js` - Verificación final de RLS

**Uso:** Scripts para verificar el estado del sistema y detectar problemas.

### 🐛 `debug/` (11 archivos)
Scripts de debugging y diagnóstico:
- `debug_auth*` - Debugging de autenticación
- `debug_advisor_*` - Debugging de registro de advisors
- `debug_contact_*` - Debugging de creación de contactos
- `debug_rls_*` - Debugging de Row Level Security
- `debug_user_*` - Debugging de usuarios

**Uso:** Scripts para diagnosticar problemas específicos en desarrollo o producción.

### 🛠️ `setup/` (4 archivos)
Scripts de creación y configuración inicial:
- `create_advisors*.js` - Creación de advisors (bulk, admin)
- `create_test_user.js` - Creación de usuarios de prueba

**Uso:** Scripts para configurar datos iniciales o crear usuarios de prueba.

### 🔧 `fixes/` (4 archivos)
Scripts de reparación y corrección:
- `fix_gio_admin_role.js` - Corrección de rol admin de Gio
- `fix_missing_advisors.js` - Reparación de advisors faltantes
- `fix_nzappia_email.js` - Corrección de email de nzappia
- `unify_gio_users_production.js` - Unificación de usuarios duplicados

**Uso:** Scripts one-time para corregir problemas específicos en producción.

### 🛡️ `utils/` (4 archivos)
Utilidades generales:
- `auto_login.js` - Login automático para desarrollo
- `diagnose_contacts_creation.js` - Diagnóstico de creación de contactos
- `health-check.js` - Health check del sistema
- `temp_debug.js` - Script temporal de debugging

**Uso:** Scripts de utilidad general que no encajan en otras categorías.

## 🚀 Cómo Usar

### Usando comandos npm (recomendado)

#### Configuración inicial (Setup)
```bash
npm run seed:advisors              # Crear advisors individuales
npm run seed:advisors:admin        # Crear advisors con rol admin
npm run seed:advisors:bulk         # Crear múltiples advisors
npm run seed:test-user             # Crear usuario de prueba
```

#### Verificaciones (Checks)
```bash
npm run check:auth                 # Verificar autenticación
npm run check:permissions          # Verificar permisos
npm run check:rls                  # Verificar Row Level Security
npm run verify:db                  # Verificar base de datos
npm run verify:roles               # Verificar sistema de roles
npm run verify:advisors            # Verificar advisors
npm run health                     # Health check del sistema
```

### Ejecutar scripts directamente

#### Tests
```bash
node scripts/tests/test_auth_flow_complete.cjs
node scripts/tests/test_login.js
```

#### Debug
```bash
node scripts/debug/debug_auth.js
node scripts/debug/debug_contact_creation.js
```

#### Reparaciones (¡con cuidado!)
```bash
node scripts/fixes/fix_missing_advisors.js
node scripts/fixes/fix_gio_admin_role.js
```

## ⚠️ Advertencias

- Los scripts en `fixes/` modifican la base de datos. **Úsalos con precaución**.
- Los scripts en `setup/` crean datos. **Verifica antes de ejecutar en producción**.
- Los scripts en `tests/` y `checks/` son de solo lectura (seguros).
- Muchos scripts requieren variables de entorno configuradas.

## 🧹 Mantenimiento

- **Archivos temporales:** Revisa `utils/temp_debug.js` regularmente y elimínalo si no se usa.
- **Scripts obsoletos:** Si un test o fix ya no es relevante, elimínalo.
- **Documentación:** Actualiza este README cuando agregues nuevos scripts.

---

**Última actualización:** Octubre 2025  
**Mantenido por:** Equipo Cactus Dashboard

