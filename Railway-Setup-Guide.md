# Guía Completa de Configuración Railway para MaatWork

> **ESTADO**: Esta guía cubre TODO - configuración desde cero hasta deploy en producción
> **DOMINIO**: maat.work (root) y api.maat.work (subdominio)
> **REPO**: https://github.com/Gigisanta/MaatWork/tree/feature/railway-migration

## 📋 TABLA DE CONTENIDO

| Fase | Descripción | Estado |
|-------|-------------|--------|
| 1 | Crear cuenta/proyecto Railway | 🔲 |
| 2 | Agregar servicio PostgreSQL | 🔲 |
| 3 | Agregar servicio API | 🔲 |
| 4 | Agregar servicio Web | 🔲 |
| 5 | Configurar variables de entorno | 🔲 |
| 6 | Configurar dominios personalizados | 🔲 |
| 7 | Verificación y testing | 🔲 |

---

## 🔧 REQUISITOS PREVIOS

Antes de comenzar, asegúrate de tener:

- [ ] Cuenta de GitHub con acceso al repo MaatWork
- [ ] Dominio maat.work disponible (comprado/registrado)
- [ ] Navegador web (Chrome/Firefox/Safari)
- [ ] 5-10 minutos disponibles para configuración completa

**NO necesitas:**
- ❌ Railway CLI instalado (usaremos dashboard web)
- ❌ Credit card (Railway tiene plan gratuito Hobby)
- ❌ Conocimiento técnico profundo (gui paso a paso)

---

## FASE 1: CREAR CUENTA/PROYECTO RAILWAY

### Paso 1.1: Crear cuenta Railway

1. Ir a https://railway.app
2. Click en **"New Project"**
3. Opciones de autenticación:
   - **Recomendado**: Continuar con GitHub (más fácil)
   - Opción B: Crear cuenta con email/password
4. Click en **"Continue with GitHub"**
5. Autorizar Railway a acceder a tu repositorio GitHub
6. Seleccionar repositorio: **Gigisanta/MaatWork**
7. Click en **"Import Project"**

### Paso 1.2: Seleccionar branch

1. Railway detectará automáticamente las ramas disponibles
2. Seleccionar rama: **feature/railway-migration**
   - Esta rama contiene todos los cambios para Railway
3. Click en **"Select Branch"**

**¿Por qué feature/railway-migration?**
- Contiene railway.toml configurado
- SSL para PostgreSQL habilitado
- Puerto dinámico configurado
- Código AWS archivado
- Documentación completa

**⚠️ NOTA**: Si quieres usar main, primero mergea feature/railway-migration a main.

---

## FASE 2: AGREGAR SERVICIO POSTGRESQL

### Paso 2.1: Crear base de datos

1. En el canvas del proyecto, click en **"+ New Service"**
2. Seleccionar **"Database"**
3. Elegir **"PostgreSQL"** (NO seleccionar MySQL u otros)
4. Click en **"Add PostgreSQL"**

### Paso 2.2: Configurar PostgreSQL

Railway creará automáticamente la base de datos y generará variables:
- `DATABASE_URL` - URL de conexión completa
- `PGDATABASE` - Nombre de la base de datos
- `PGUSER` - Usuario de la base de datos
- `PGPASSWORD` - Contraseña generada automáticamente
- `PGHOST` - Host de la base de datos
- `PGPORT` - Puerto (5432)

**NO necesitas configurar nada más** - Railway maneja todo automáticamente.

### Paso 2.3: Renombrar servicio (opcional)

1. Click en el servicio PostgreSQL recién creado
2. Click en **"Settings"** (icono de engranaje)
3. Cambiar "Service Name" a: **`postgres`** (más corto)
4. Click en **"Save Changes"**

**¿Por qué renombrar?**
- Referencias más cortas en variables: `${postgres.DATABASE_URL}`
- Más fácil identificar en logs

---

## FASE 3: AGREGAR SERVICIO API

### Paso 3.1: Crear servicio API

1. En el canvas del proyecto, click en **"+ New Service"**
2. Seleccionar **"Deploy from GitHub repo"**
3. Confirmar que el repositorio sea: **Gigisanta/MaatWork**
4. Click en **"Add Service"**

### Paso 3.2: Configurar servicio API

#### Tab: Settings

1. **Service Name**: Cambiar a `api`
2. **Root Directory**: **DEJAR VACÍO** ⚠️ CRUCIAL
   - **IMPORTANTE**: NO poner `/apps/api` o `/apps`
   - Root Directory debe ser `/` (vacío = raíz del repo)
   - Railway usará railway.toml en `/apps/api/railway.toml` automáticamente

3. **Branch**: `feature/railway-migration` (o la que prefieras)

#### Tab: Variables

Aquí es donde configuramos las variables de entorno CRÍTICAS:

**A. Referenciar DATABASE_URL desde PostgreSQL:**

1. Click en **"+ New Variable"**
2. **Name**: `DATABASE_URL`
3. **Value**: Click en el botón "Ref" (referencia)
4. Seleccionar servicio: **`postgres`** (o el nombre que le diste)
5. Railway rellenará automáticamente: `${postgres.DATABASE_URL}`

**¿Por qué usar Ref button?**
- Railway inyecta la URL completa de PostgreSQL
- Si cambias la DB, solo necesitas actualizar PostgreSQL service
- API se conecta automáticamente a la nueva DB

**B. JWT_SECRET (crítico para autenticación):**

1. Click en **"+ New Variable"**
2. **Name**: `JWT_SECRET`
3. **Value**: Generar un secreto fuerte (mínimo 32 caracteres)

**Cómo generar JWT_SECRET seguro:**

Opción 1 - Usar generador online (fácil):
1. Ir a https://www.uuidgenerator.net/guid
2. Copiar el UUID generado (ejemplo: `550e8400-e29b-41d4-a716-4466554400000`)
3. Usar ese valor como JWT_SECRET

Opción 2 - Generar localmente:
```bash
# En tu terminal:
openssl rand -base64 32
# Copiar el resultado
```

4. **Tipo**: Dejar en **"Secret"** ( 🔒 ícono de candado)
5. Click en **"Add Variable"**

**C. Otras variables API:**

1. **Name**: `NODE_ENV`
2. **Value**: `production`
3. **Type**: **"Plain"**

1. **Name**: `PORT`
2. **Value**: `3001`
3. **Type**: **"Plain"**

1. **Name**: `CORS_ORIGINS`
2. **Value**: `https://maat.work,https://api.maat.work`
3. **Type**: **"Plain"**
4. **Descripción**: URLs permitidas para CORS

1. **Name**: `FRONTEND_URL`
2. **Value**: `https://maat.work`
3. **Type**: **"Plain"**
4. **Descripción**: URL del frontend para redirects OAuth

1. **Name**: `COOKIE_DOMAIN`
2. **Value**: `.maat.work`
3. **Type**: **"Plain"**
4. **Descripción**: Dominio para cookies (punto al inicio para subdominios)

**Variables Google OAuth (si usas Google Auth):**

1. **Name**: `GOOGLE_CLIENT_ID`
2. **Value**: `[Tu_CLIENT_ID].apps.googleusercontent.com`
3. **Tipo**: **"Plain"**

1. **Name**: `GOOGLE_CLIENT_SECRET`
2. **Value**: `[Tu_CLIENT_SECRET]`
3. **Tipo**: **"Secret"** 🔒

1. **Name**: `GOOGLE_REDIRECT_URI`
2. **Value**: `https://api.maat.work/v1/auth/google/callback`
3. **Tipo**: **"Plain"**

1. **Name**: `GOOGLE_ENCRYPTION_KEY`
2. **Value**: `[32+ caracteres aleatorios]`
3. **Tipo**: **"Secret"** 🔒

#### Tab: Config as Code (opcional - YA CONFIGURADO EN railway.toml)

Railway debería detectar automáticamente `/apps/api/railway.toml`. Verificar:

1. **Config as Code Path**: Debería mostrar `/apps/api/railway.toml`
2. **Build Command**: `pnpm turbo build --filter=api`
3. **Start Command**: `node dist/index.js`
4. **Health Check**: `/health`

Si no se detecta:
1. Click en **"+ New Variable"**
2. **Name**: `RAILWAY_CONFIG_PATH`
3. **Value**: `/apps/api/railway.toml`
4. **Tipo**: **"Plain"**

#### Tab: Networking (para dominios - configurar en FASE 6)

1. **Generate Domain** → NO usar ahora (usaremos dominio personalizado)
2. Verificar que **"Private Domain"** esté configurado (comunicación interna)

---

## FASE 4: AGREGAR SERVICIO WEB

### Paso 4.1: Crear servicio Web

1. En el canvas, click en **"+ New Service"**
2. Seleccionar **"Deploy from GitHub repo"**
3. Confirmar repositorio: **Gigisanta/MaatWork**
4. Click en **"Add Service"**

### Paso 4.2: Configurar servicio Web

#### Tab: Settings

1. **Service Name**: Cambiar a `web`
2. **Root Directory**: **DEJAR VACÍO** ⚠️ CRUCIAL
   - **IMPORTANTE**: NO poner `/apps/web` o `/apps`
   - Root Directory debe ser `/` (vacío = raíz del repo)
   - Railway usará railway.toml en `/apps/web/railway.toml` automáticamente

3. **Branch**: `feature/railway-migration`

#### Tab: Variables

**A. Referenciar API URL:**

1. Click en **"+ New Variable"**
2. **Name**: `NEXT_PUBLIC_API_URL`
3. **Value**: Click en botón "Ref" → Seleccionar servicio `api`
4. En el campo de valor, Railway generará: `${api.RAILWAY_PUBLIC_DOMAIN}}/api`
5. **Tipo**: **"Plain"**

**¿Por qué esta sintaxis?**
- `${api.RAILWAY_PUBLIC_DOMAIN}}` = Dominio público del servicio API
- Agregamos `/api` porque el frontend llama al API con ese prefijo
- `NEXT_PUBLIC_` = Variable accesible desde el navegador

**B. JWT_SECRET (compartir con API):**

1. Click en **"+ New Variable"**
2. **Name**: `JWT_SECRET`
3. **Value**: Click en botón "Ref" → Seleccionar servicio `api`
4. Railway generará: `${api.JWT_SECRET}`
5. **Tipo**: **"Secret"** 🔒

**¿Por qué referenciar desde API?**
- Mantiene sincronización: si cambias JWT_SECRET en API, se actualiza en Web automáticamente
- Previene inconsistencias de autenticación

**C. API_URL_INTERNAL (para Server Components):**

1. Click en **"+ New Variable"**
2. **Name**: `API_URL_INTERNAL`
3. **Value**: Click en botón "Ref" → Seleccionar servicio `api`
4. Railway generará: `${api.RAILWAY_PRIVATE_DOMAIN}}`
5. **Tipo**: **"Plain"**

**¿Por qué RAILWAY_PRIVATE_DOMAIN?**
- Comunicación interna entre servicios (sin pasar por internet)
- Más rápido y seguro para Server Components

**D. Google OAuth (si usas Google Auth):**

1. **Name**: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
2. **Value**: Click en botón "Ref" → Seleccionar servicio `api`
3. Railway generará: `${api.GOOGLE_CLIENT_ID}`
4. **Tipo**: **"Plain"**

**E. Otras variables Web:**

1. **Name**: `NEXT_PUBLIC_ENABLE_ANALYTICS`
2. **Value**: `false`
3. **Tipo**: **"Plain"**

1. **Name**: `NODE_ENV`
2. **Value**: `production`
3. **Tipo**: **"Plain"**

#### Tab: Config as Code

Railway debería detectar automáticamente `/apps/web/railway.toml`. Verificar:

1. **Config as Code Path**: `/apps/web/railway.toml`
2. **Build Command**: `pnpm turbo build --filter=web`
3. **Start Command**: `node .next/standalone/apps/web/server.js`
4. **Health Check**: `/`

#### Tab: Networking

1. **Generate Domain** → NO usar ahora
2. Verificar que **"Private Domain"** esté configurado

---

## FASE 5: DEPLOYAR SERVICIOS

### Paso 5.1: Desplegar PostgreSQL

1. Ir a servicio **`postgres`**
2. Click en tab **"Deployments"**
3. Verificar que el deployment esté en **"Success"**
4. Si hay errores, ver logs en tab **"Logs"**

**NOTA**: PostgreSQL no tiene código, por lo que deployment es casi instantáneo.

### Paso 5.2: Desplegar API

1. Ir a servicio **`api`**
2. Click en tab **"Deployments"**
3. Click en **"New Deployment"** (o esperar deployment automático tras commit)
4. Verificar en el deployment:
   - **Build Command** debería ser: `pnpm turbo build --filter=api`
   - **Health Check**: `/health` (debe retornar 200)
   - **Migraciones**: Se ejecutarán antes del start (preDeployCommand)

**Si el deployment falla:**

Errores comunes:
- ❌ **"Cannot find module '@maatwork/db'"** → Root Directory configurado incorrectamente
- ❌ **"error:03001: directory not found"** → Watch paths incorrectos
- ❌ **Build timeout** → Aumentar RAM en servicio (Settings → Environment)

### Paso 5.3: Desplegar Web

1. Ir a servicio **`web`**
2. Click en tab **"Deployments"**
3. Click en **"New Deployment"**
4. Verificar en el deployment:
   - **Build Command**: `pnpm turbo build --filter=web`
   - **Health Check**: `/` (debe retornar 200)
   - **Output**: `standalone` (crea servidor autónomo)

**Si el build falla:**

Verificar railway.toml:
```toml
[deploy]
startCommand = "node .next/standalone/apps/web/server.js"
```

El problema común es que la ruta del servidor standalone puede variar. Verificar la ruta exacta en los logs del build.

---

## FASE 6: CONFIGURAR DOMINIOS PERSONALIZADOS

### Paso 6.1: Configurar dominio del Frontend (maat.work)

1. Ir a servicio **`web`**
2. Click en tab **"Settings"**
3. Navegar a **"Networking"** → **"Public Networking"**
4. Click en **"+ Custom Domain"**

5. **Domain**: `maat.work`
6. Click en **"Add Domain"**

Railway verificará disponibilidad del dominio y comenzará a provisionar certificado SSL (Let's Encrypt).

### Paso 6.2: Configurar DNS para maat.work

**Paso A: En tu proveedor de dominios (GoDaddy, Namecheap, Google Domains, etc.)**

1. Ir al panel de control de tu proveedor
2. Buscar sección **"DNS Management"** o **"DNS Records"**
3. Crear/actualizar registro **A** para raíz:

```
Type: A
Name: @
Value: [Valor que Railway te proporcionará en Fase 6.1]
TTL: 300 (o el que tu proveedor permita)
```

**¿Qué es el "Value"?**
- Railway te mostrará el valor después de agregar el dominio
- Es una dirección IP de Railway (ejemplo: `167.99.123.45`)
- Copiar ese valor exacto

**Paso B: Esperar valor de Railway**

1. Volver a Railway → servicio `web` → Networking
2. Buscar el dominio `maat.work` en la lista
3. Ver el campo **"DNS Target"** (o "Value" o "IP Address")
4. Copiar ese valor (ejemplo: `167.99.123.45`)

**Paso C: Configurar registro en tu proveedor**

1. Pegar el valor copiado en el campo **"Value"**
2. Guardar cambios
3. Esperar propagación DNS (5-30 minutos)

**⚠️ IMPORTANTE SOBRE PROPAGACIÓN DNS**:
- DNS puede tardar de 5 minutos a 48 horas en propagarse
- Railway mostrará el estado: "Pending" → "Verifying" → "Valid"
- Mientras está en "Pending", el dominio no funcionará
- Verificar propagación: https://dnschecker.org/

### Paso 6.3: Configurar dominio del API (api.maat.work)

1. Ir a servicio **`api`**
2. Click en tab **"Settings"**
3. Navegar a **"Networking"** → **"Public Networking"**
4. Click en **"+ Custom Domain"**

5. **Domain**: `api.maat.work`
6. Click en **"Add Domain"**

### Paso 6.4: Configurar DNS para api.maat.work

**Paso A: En tu proveedor de dominios**

1. Ir al panel de control de tu proveedor
2. Buscar sección **"DNS Management"** o **"DNS Records"**
3. Crear/actualizar registro **CNAME** para subdominio:

```
Type: CNAME
Name: api
Value: [Dominio Railway que te proporcionará]
TTL: 300
```

**Paso B: Esperar valor de Railway**

1. Volver a Railway → servicio `api` → Networking
2. Buscar el dominio `api.maat.work` en la lista
3. Ver el campo **"DNS Target"** (o "CNAME" o "Hostname")
4. Copiar ese valor (ejemplo: `something.up.railway.app`)

**Paso C: Configurar registro en tu proveedor**

1. Pegar el valor copiado en el campo **"Value"**
2. Guardar cambios
3. Esperar propagación DNS (5-30 minutos)

### Paso 6.5: Verificar estado de los dominios

En Railway → servicios → Networking:

**Para maat.work:**
- Estado debería cambiar: `Pending` → `Verifying` → `Valid` ✅
- "SSL Certificate": `Generating` → `Issued` ✅

**Para api.maat.work:**
- Estado debería cambiar: `Pending` → `Verifying` → `Valid` ✅
- "SSL Certificate": `Generating` → `Issued` ✅

**Tiempo estimado:**
- DNS: 5-30 minutos para propagación
- SSL: 1-5 minutos después que DNS esté valid
- Total: 10-35 minutos

---

## FASE 7: VERIFICACIÓN Y TESTING

### Paso 7.1: Verificar servicios corriendo

1. Ir a la página principal del proyecto Railway
2. Verificar estado de cada servicio:
   - **postgres**: 🟢 Running
   - **api**: 🟢 Running
   - **web**: 🟢 Running

Si alguno está rojo 🔴, ver logs.

### Paso 7.2: Verificar logs de deployment

**PostgreSQL:**
- Generalmente no tiene logs relevantes
- Verificar que esté conectado

**API:**
1. Ir a servicio **`api`** → tab **"Logs"**
2. Buscar en los logs:
   - ✅ "🔄 Ejecutando migraciones..." (preDeployCommand)
   - ✅ "✅ Migraciones completadas"
   - ✅ "🚀 API running on port 3001"
   - ❌ Si hay errores de migración

**Web:**
1. Ir a servicio **`web`** → tab **"Logs"**
2. Buscar en los logs:
   - ✅ "node .next/standalone/apps/web/server.js" (start command correcto)
   - ❌ Errores de dependencias (module not found)

### Paso 7.3: Test health checks

**Test API health:**
```bash
curl https://api.maat.work/health
# Debe retornar: 200 OK
```

**Test Web health:**
```bash
curl https://maat.work/
# Debe retornar HTML de Next.js
```

**Test conectividad Web → API:**

1. Abrir el navegador en: https://maat.work
2. Abrir DevTools → Network tab
3. Realizar alguna acción que llame al API (login, crear contacto)
4. Verificar que las llamadas API vayan a: `https://api.maat.work/api/...`
5. Verificar código de respuesta: 200 OK (no 40x, 500)

**Si ves errores CORS:**
- Verificar `CORS_ORIGINS` en servicio API incluya `https://maat.work`
- Verificar que `NEXT_PUBLIC_API_URL` en Web tenga `/api` al final

### Paso 7.4: Verificar migraciones de base de datos

1. Ir a servicio **`api`** → tab **"Logs"**
2. Buscar: "Executing migrations" o "migrate"
3. Verificar que no haya errores

**Si las migraciones fallan:**
1. Verificar en PostgreSQL service → Variables → `DATABASE_URL`
2. Verificar que esté referenciado desde servicio API
3. Redeploy API service

### Paso 7.5: Test flujo completo

1. Abrir: https://maat.work
2. Crear una cuenta nueva de usuario
3. Verificar que el usuario se cree correctamente
4. Login con el nuevo usuario
5. Verificar dashboard funcional

---

## 🔧 TROUBLESHOOTING

### Problema: Deployment falla - "Cannot find module '@maatwork/db'"

**Causa**: Root Directory configurado incorrectamente

**Solución**:
1. Ir a servicio API → Settings
2. Cambiar **Root Directory** a vacío `/`
3. Redeploy

### Problema: Build timeout en API

**Causa**: Memoria insuficiente (0.5GB default)

**Solución**:
1. Ir a servicio API → Settings
2. Click en **"Environment"**
3. Cambiar **"Pricing Plan"** de Free a Hobby ($5/mes)
4. Seleccionar **"0.75GB"** o **"1GB"** RAM
5. Redeploy

### Problema: Frontend no carga (página blanca)

**Causa**: Next.js standalone server no arranca

**Solución**:
1. Verificar railway.toml en Web service:
   ```toml
   [deploy]
   startCommand = "node .next/standalone/apps/web/server.js"
   ```
2. Verificar que la ruta sea correcta:
   - Ir a Build Logs → Último build exitoso
   - Copiar la ruta exacta del servidor standalone
3. Actualizar railway.toml con la ruta correcta

### Problema: Error de CORS en el navegador

**Causa**: `CORS_ORIGINS` no incluye el dominio del frontend

**Solución**:
1. Ir a servicio API → Variables
2. Actualizar `CORS_ORIGINS` a: `https://maat.work,https://api.maat.work`
3. Redeploy API

### Problema: Dominios no funcionan (502 Bad Gateway)

**Causa**: DNS no propagado o mal configurado

**Solución**:
1. Verificar registros DNS en tu proveedor
2. Esperar más tiempo (hasta 48 horas para algunos TLDs)
3. Verificar estado del dominio en Railway:
   - `Pending` → DNS no propagado aún
   - `Verifying` → DNS propagando
   - `Valid` → Todo correcto
4. Usar https://dnschecker.org/ para verificar propagación

### Problema: No se puede conectar a la base de datos

**Causa**: `DATABASE_URL` no referenciado correctamente

**Solución**:
1. Ir a servicio API → Variables
2. Verificar `DATABASE_URL` → Debería ser: `${postgres.DATABASE_URL}`
3. Si no tiene el botón "Ref", eliminarla y agregarla de nuevo
4. Seleccionar servicio `postgres` en el popup de referencia

### Problema: Variables compartidas no funcionan

**Causa**: Railway antiguo (antes de Shared Variables) o configuración incorrecta

**Solución**:
1. Verificar que estás usando sintaxis correcta: `${servicio.VARIABLE_NAME}}`
2. Dos llaves de cierre al final (no una sola)
3. Redeploy servicio que usa la variable

---

## 📊 ARQUITECTURA FINAL EN RAILWAY

```
┌─────────────────────────────────────────────────────────────┐
│                  RAILWAY PLATFORM                   │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ API (Node)│  │ Web (Next)│  │Postgres │  │
│  └──────────┘  └──────────┘  └────────┘  │
│  Managed services + automatic SSL/DNS            │
│  Domains: maat.work, api.maat.work            │
└─────────────────────────────────────────────────────────────┘
```

**Comunicación interna:**
- API ↔ PostgreSQL: `${postgres.DATABASE_URL}` (privado)
- Web → API: `${api.RAILWAY_PUBLIC_DOMAIN}}/api` (público)
- Web ↔ API (interno): `${api.RAILWAY_PRIVATE_DOMAIN}}` (privado)

**Costos mensuales estimados:**
- API (Hobby): ~$5
- Web (Hobby): ~$5
- PostgreSQL (Hobby): ~$5
- **Total**: ~$15/mes (50% ahorro vs AWS ~$30-35/mes)

---

## ✅ CHECKLIST FINAL

### Antes de considerar "listo para producción":

- [ ] Todos los servicios están en estado "Running" 🟢
- [ ] Health checks retornan 200 OK
- [ ] Dominios están en estado "Valid" ✅
- [ ] SSL certificates están "Issued" ✅
- [ ] Migraciones se ejecutaron sin errores
- [ ] Test de flujo completo de usuario funciona
- [ ] No hay errores en logs de deployment
- [ ] Frontend puede llamar a API sin errores CORS

### Documentación adicional:

- Guía oficial Railway: https://docs.railway.com
- Variables en Railway: https://docs.railway.com/variables
- Dominios en Railway: https://docs.railway.com/guides/domains
- Documentación local: `/infrastructure/README.md`

---

## 🚀 SIGUIENTE PASOS DESPUÉS DE CONFIGURACIÓN RAILWAY

Una vez que todo está funcionando en Railway:

1. **Eliminar recursos AWS** (si ya no los necesitas):
   - Repositorio S3
   - Instancia EC2
   - RDS PostgreSQL
   - Cloudflare Workers (si usabas)
   - Nota: Código AWS ya está archivado en `infrastructure/aws-deprecated/`

2. **Actualizar Cloudflare** (si aún lo usas para DNS):
   - Cambiar DNS records para apuntar a Railway
   - Mantener Cloudflare para WAF/CDN si lo deseas

3. **Monitoreo**:
   - Configurar alertas en Railway (Metrics → Alert Rules)
   - Monitorear logs regularmente
   - Configurar Uptime monitoring externo (UptimeRobot, Pingdom)

4. **Backups**:
   - Railway crea snapshots automáticos de PostgreSQL
   - Verificar retención de backups (por defecto 7 días)

5. **Testing en staging**:
   - Considerar usar Railway PR environments para testing antes de producción
   - Crear environment "staging" en Railway project

---

## 💡 CONSEJOS DE BUENAS PRÁCTICAS

1. **Variables secretas**: NUNCA comitear `.env` files con secrets
2. **Branch management**: Mantener `main` estable, usar feature branches para cambios
3. **Testing local**: Usar `pnpm dev` y `docker-compose.yml` para desarrollo local
4. **Despliegues graduales**: Deploy primero a staging, luego a producción
5. **Monitoreo de costos**: Revisar Railway Metrics regularmente
6. **Documentar cambios**: Actualizar documentación cuando hagas cambios en la arquitectura

---

## 📞 AYUDA Y SOPORTE

Si encuentras problemas:

1. **Railway Docs**: https://docs.railway.com
2. **Railway Discord**: https://discord.gg/railway
3. **Railway Help Station**: https://station.railway.com
4. **GitHub Issues**: https://github.com/railwayapp/issues
5. **Email**: support@railway.app

---

**Guía creada el 23 de febrero de 2026**
**Versión**: 1.0
**Autor**: Sisyphus (AI Agent)
**Proyecto**: MaatWork Railway Migration
