# 🔧 Configurar .env para Producción en AWS

## ✅ Cambios Realizados

He actualizado `apps/api/.env` con las configuraciones base para producción. Ahora necesitas completar los valores específicos de tu infraestructura.

## ⚠️ Valores que DEBES Reemplazar

### 1. DATABASE_URL (CRÍTICO)

**Ubicación:** Línea 7-8

```env
DATABASE_URL=postgresql://usuario:password@tu-rds-endpoint.region.rds.amazonaws.com:5432/CRM
```

**Cómo obtenerlo:**
- Si usas RDS: Ve a AWS Console → RDS → Databases → Selecciona tu instancia → Endpoint
- Formato: `postgresql://usuario:password@endpoint:5432/nombre_db`
- Ejemplo: `postgresql://maatwork_user:MiPassword123@maatwork-db.abc123.us-east-1.rds.amazonaws.com:5432/CRM`

**Verificar conexión desde el servidor:**
```bash
psql "postgresql://usuario:password@endpoint:5432/CRM"
```

### 2. JWT_SECRET (CRÍTICO - Seguridad)

**Ubicación:** Línea 97

```env
JWT_SECRET=CHANGE_ME_GENERATE_NEW_SECRET_WITH_OPENSSL_RAND_BASE64_32
```

**Generar uno nuevo:**
```bash
# En el servidor o localmente
openssl rand -base64 32
```

**Copia el resultado y reemplaza** `CHANGE_ME_GENERATE_NEW_SECRET_WITH_OPENSSL_RAND_BASE64_32`

⚠️ **NUNCA uses el mismo JWT_SECRET de desarrollo en producción**

### 3. Dominio de Producción

Reemplaza `maat.work` con tu dominio real en estas líneas:

**GOOGLE_REDIRECT_URI (Línea 116):**
```env
GOOGLE_REDIRECT_URI=https://TU_DOMINIO.com/v1/auth/google/callback
```

**FRONTEND_URL (Línea 122):**
```env
FRONTEND_URL=https://TU_DOMINIO.com
```

**CORS_ORIGINS (Línea 136):**
```env
CORS_ORIGINS=https://TU_DOMINIO.com,https://www.TU_DOMINIO.com
```

**COOKIE_DOMAIN (Línea 140):**
```env
COOKIE_DOMAIN=.TU_DOMINIO.com
```

⚠️ **IMPORTANTE:** El punto (`.`) antes del dominio en `COOKIE_DOMAIN` permite cookies en subdominios.

### 4. Google OAuth (Opcional - si cambias las credenciales)

Si tienes credenciales diferentes para producción:

**GOOGLE_CLIENT_ID (Línea 110):**
```env
GOOGLE_CLIENT_ID=tu-client-id-produccion.apps.googleusercontent.com
```

**GOOGLE_CLIENT_SECRET (Línea 113):**
```env
GOOGLE_CLIENT_SECRET=tu-client-secret-produccion
```

⚠️ **Asegúrate de agregar el Redirect URI en Google Cloud Console:**
1. Ve a https://console.cloud.google.com/apis/credentials
2. Selecciona tu OAuth 2.0 Client ID
3. Agrega: `https://TU_DOMINIO.com/v1/auth/google/callback`

## 📋 Checklist de Configuración

Antes de hacer deploy, verifica:

- [ ] `DATABASE_URL` apunta a tu base de datos de producción
- [ ] `JWT_SECRET` es un valor único generado con `openssl rand -base64 32`
- [ ] `GOOGLE_REDIRECT_URI` coincide con Google Cloud Console
- [ ] `FRONTEND_URL` es tu dominio de producción
- [ ] `CORS_ORIGINS` incluye todos los dominios que usarán la API
- [ ] `COOKIE_DOMAIN` tiene el punto inicial si usas subdominios
- [ ] Todos los valores de `maat.work` fueron reemplazados por tu dominio

## 🚀 Después de Configurar

### 1. Subir el archivo al servidor

```bash
# Desde tu máquina local
scp apps/api/.env ec2-user@56.125.148.180:/home/ec2-user/abax/apps/api/.env
```

### 2. Verificar en el servidor

```bash
# Conectarte al servidor
ssh ec2-user@56.125.148.180

# Verificar que el archivo existe
cd /home/ec2-user/abax/apps/api
cat .env | grep -E "(DATABASE_URL|JWT_SECRET|FRONTEND_URL|CORS_ORIGINS)"

# Verificar que no hay valores de placeholder
grep -E "CHANGE_ME|tu-rds-endpoint|TU_DOMINIO" .env
# No debería mostrar nada
```

### 3. Reiniciar la aplicación

```bash
# Si usas PM2
pm2 restart api

# O si usas otro método
# Reinicia tu servicio según tu configuración
```

## 🔒 Seguridad

### Variables Sensibles

Estas variables contienen información sensible:
- `DATABASE_URL` - Credenciales de base de datos
- `JWT_SECRET` - Secreto para tokens
- `GOOGLE_CLIENT_SECRET` - Secreto de OAuth
- `GOOGLE_ENCRYPTION_KEY` - Clave de encriptación

**Buenas prácticas:**
- ✅ El archivo `.env` está en `.gitignore` (no se sube a Git)
- ✅ Usa permisos restrictivos en el servidor: `chmod 600 apps/api/.env`
- ✅ Considera usar AWS Secrets Manager para valores críticos
- ✅ Rota los secretos periódicamente

### Verificar Permisos

```bash
# En el servidor
chmod 600 /home/ec2-user/abax/apps/api/.env
ls -la /home/ec2-user/abax/apps/api/.env
# Debe mostrar: -rw------- (solo el dueño puede leer/escribir)
```

## 🐛 Troubleshooting

### Error: "Missing required environment variables"

Verifica que todas las variables requeridas estén presentes:
```bash
cd /home/ec2-user/abax/apps/api
grep -E "^(DATABASE_URL|JWT_SECRET|CORS_ORIGINS|FRONTEND_URL|COOKIE_DOMAIN)=" .env
```

### Error de conexión a base de datos

1. Verifica que `DATABASE_URL` sea correcto
2. Verifica que el Security Group de RDS permita conexiones desde tu EC2
3. Prueba la conexión manualmente:
```bash
psql "$DATABASE_URL"
```

### Error de CORS

1. Verifica que `CORS_ORIGINS` incluya el dominio exacto desde donde haces requests
2. Verifica que no haya espacios extra en la lista
3. Formato correcto: `https://dominio1.com,https://dominio2.com`

### Cookies no funcionan

1. Verifica que `COOKIE_DOMAIN` tenga el punto inicial si usas subdominios
2. Verifica que `FRONTEND_URL` sea HTTPS en producción
3. Verifica que el navegador permita cookies de terceros

## 📚 Referencias

- `ecosystem.config.js` - Configuración de PM2
- `apps/api/src/config/env.ts` - Validación de variables de entorno
- `docs/OPERATIONS.md` - Documentación de operaciones
