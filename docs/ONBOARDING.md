# Guía de Onboarding

Esta guía está diseñada para nuevos desarrolladores que están configurando el proyecto CACTUS CRM por primera vez.

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Setup Inicial](#setup-inicial)
3. [Verificación](#verificación)
4. [Troubleshooting Común](#troubleshooting-común)
5. [Próximos Pasos](#próximos-pasos)

---

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** >=22.0.0 <25.0.0
- **pnpm** >=9.0.0
- **Docker Desktop** (para PostgreSQL y N8N)
- **Git**

### Verificar Instalaciones

```bash
# Verificar Node.js
node --version  # Debe ser v22.x.x o v23.x.x

# Verificar pnpm
pnpm --version  # Debe ser >=9.0.0

# Verificar Docker
docker --version
docker compose version
```

Si alguna de estas herramientas no está instalada, consulta:
- [Instalar Node.js](https://nodejs.org/)
- [Instalar pnpm](https://pnpm.io/installation)
- [Instalar Docker Desktop](https://www.docker.com/products/docker-desktop)

---

## Setup Inicial

### Paso 1: Clonar el Repositorio

```bash
git clone <repository-url>
cd CactusDashboard
```

### Paso 2: Instalar Dependencias

```bash
pnpm install
```

Esto instalará todas las dependencias del monorepo (puede tomar varios minutos la primera vez).

### Paso 3: Ejecutar Setup Automático

El script de setup automatiza toda la configuración inicial:

```bash
pnpm setup
```

Este comando ejecuta automáticamente:

1. **Verificación de prerequisitos**
   - Node.js, pnpm, Docker
   - Verifica que Docker Desktop esté corriendo

2. **Configuración de variables de entorno**
   - Crea `apps/api/.env` desde `apps/api/config-example.env`
   - Configura valores por defecto para desarrollo

3. **Inicio de servicios Docker**
   - Inicia PostgreSQL en el puerto 5433
   - Inicia N8N en el puerto 5678

4. **Migraciones de base de datos**
   - Ejecuta todas las migraciones pendientes
   - Crea las tablas necesarias

5. **Creación de usuario admin inicial**
   - Crea usuario: `admin@cactus.local`
   - Rol: `admin` (acceso completo)

### Paso 4: Iniciar Desarrollo

```bash
pnpm dev
```

Esto iniciará todos los servicios:
- **Web App** en http://localhost:3000
- **API** en http://localhost:3001
- **Analytics Service** en http://localhost:3002 (o 3003 si 3002 está ocupado)

---

## Verificación

### Verificar que Todo Funciona

1. **Abre el navegador** en http://localhost:3000
2. **Haz login** con:
   - Email: `admin@cactus.local`
   - No se requiere contraseña en desarrollo
3. **Verifica el dashboard** - deberías ver la página principal con métricas

### Verificar Servicios

```bash
# Verificar que PostgreSQL está corriendo
docker ps | grep postgres

# Verificar que la API responde
curl http://localhost:3001/health

# Verificar que la Web responde
curl http://localhost:3000
```

---

## Troubleshooting Común

### Error: "DATABASE_URL not set"

**Problema:** El archivo `.env` no existe o no está configurado.

**Solución:**
```bash
# Ejecutar setup nuevamente
pnpm setup

# O crear manualmente
cp apps/api/config-example.env apps/api/.env
```

### Error: "Port 3000/3001 already in use"

**Problema:** Otro proceso está usando los puertos requeridos.

**Solución:**
```bash
# Detener procesos en los puertos
pnpm dev:kill

# O encontrar y matar el proceso manualmente
# macOS/Linux:
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Error: "401 Unauthorized" o problemas de autenticación

**Problema:** Tokens viejos o cookies inválidas del navegador.

**Solución:**

1. **Limpiar cookies del navegador:**
   - Abre DevTools (F12)
   - Ve a Application → Cookies → http://localhost:3000
   - Elimina todas las cookies
   - Recarga la página

2. **O usar modo incógnito:**
   - Abre una ventana incógnita
   - Navega a http://localhost:3000

3. **Verificar JWT_SECRET:**
   - Asegúrate de que `JWT_SECRET` en `apps/api/.env` y `apps/web/.env.local` sean iguales
   - Si cambiaste el secret, necesitas hacer logout y login nuevamente

### Error: "PostgreSQL connection failed"

**Problema:** PostgreSQL no está corriendo o la conexión es incorrecta.

**Solución:**
```bash
# Verificar que Docker está corriendo
docker ps

# Iniciar servicios Docker
docker compose up -d

# Verificar logs de PostgreSQL
docker compose logs db

# Verificar DATABASE_URL en apps/api/.env
# Debe ser: postgresql://postgres:postgres@localhost:5433/CRM
```

### Error: "Role mismatch between token and database"

**Problema:** El token tiene un rol diferente al que está en la base de datos.

**Solución:**
- Este es un warning normal cuando el rol del usuario cambió en la DB
- El sistema automáticamente usa el rol de la base de datos (correcto)
- Si persiste, limpia las cookies y haz login nuevamente

### Error: "Cannot find module" o problemas de dependencias

**Problema:** Las dependencias no están instaladas correctamente.

**Solución:**
```bash
# Limpiar e instalar dependencias
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
pnpm install

# Si persiste, limpiar cache de pnpm
pnpm store prune
pnpm install
```

### Error: "Migration failed" o problemas de base de datos

**Problema:** Las migraciones fallaron o la base de datos está en un estado inconsistente.

**Solución:**
```bash
# Verificar que PostgreSQL está corriendo
docker compose ps

# Ejecutar migraciones manualmente
pnpm -F @cactus/db migrate

# Si hay problemas, puedes resetear la base de datos (CUIDADO: borra todos los datos)
docker compose down -v
docker compose up -d
pnpm -F @cactus/db migrate
```

---

## Próximos Pasos

Una vez que el setup está completo y todo funciona:

### 1. Explorar el Código

- **Frontend:** `apps/web/app/` - Páginas y componentes
- **Backend:** `apps/api/src/routes/` - Endpoints de la API
- **Base de Datos:** `packages/db/src/schema.ts` - Esquema de la DB
- **UI Components:** `packages/ui/src/components/` - Componentes reutilizables

### 2. Leer la Documentación

- [Guía de Desarrollo](./DEVELOPMENT.md) - Estándares y convenciones
- [Guía de Arquitectura](./ARCHITECTURE.md) - Estructura del sistema
- [Guía de Base de Datos](./DATABASE.md) - Schema y migraciones

### 3. Configurar tu Entorno

- Configura tu editor con TypeScript
- Instala extensiones recomendadas (Prettier, ESLint)
- Configura pre-commit hooks (ya están configurados con Husky)

### 4. Crear tu Primer Cambio

1. Crea una rama: `git checkout -b mi-primera-feature`
2. Haz tus cambios
3. Ejecuta tests: `pnpm test`
4. Verifica tipos: `pnpm typecheck`
5. Commit y push

### 5. Comandos Útiles

```bash
# Desarrollo
pnpm dev              # Iniciar todos los servicios
pnpm dev:kill         # Detener todos los servicios

# Verificación
pnpm typecheck       # Verificar tipos TypeScript
pnpm lint            # Ejecutar linter
pnpm test            # Ejecutar tests

# Base de datos
pnpm db:generate     # Generar nueva migración
pnpm db:migrate      # Ejecutar migraciones
pnpm db:studio       # Abrir Drizzle Studio (UI para DB)
```

---

## Recursos Adicionales

- **Slack/Discord:** [Canal del equipo] (si aplica)
- **Wiki:** [Documentación interna] (si aplica)
- **Issues:** [GitHub Issues] (si aplica)

---

## ¿Necesitas Ayuda?

Si encuentras problemas que no están cubiertos en esta guía:

1. Revisa los logs: `pnpm -F @cactus/api run dev:pretty`
2. Busca en los issues de GitHub
3. Pregunta en el canal de Slack/Discord del equipo
4. Crea un nuevo issue con detalles del problema

---

**¡Bienvenido al equipo! 🌵**
