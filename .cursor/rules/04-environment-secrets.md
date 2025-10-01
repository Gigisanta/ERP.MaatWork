# 🔑 Manejo de Variables de Entorno y Credenciales

## Principios Fundamentales

**REGLA DE ORO:** Los secretos NUNCA deben estar en el código. NUNCA.

### Jerarquía de Sensibilidad

```
🔴 CRÍTICO (NUNCA exponer):
├── Service Role Keys (Supabase)
├── API Keys con permisos de escritura
├── Client Secrets (OAuth)
├── Database passwords
├── Encryption keys
└── JWT signing keys

🟡 SENSIBLE (Solo backend):
├── OAuth Client IDs
├── API Keys de terceros
├── Webhook secrets
└── Internal API tokens

🟢 PÚBLICO (Puede estar en frontend):
├── Supabase URL
├── Supabase Anon Key (protegida por RLS)
├── OAuth Redirect URIs
└── Public API endpoints
```

## 1. Estructura de Variables de Entorno

### Archivo `.env` (NUNCA commitear)

**REGLA:** El archivo `.env` DEBE estar en `.gitignore`

```bash
# .gitignore
.env
.env.local
.env.production
.env.*.local
```

### Template `.env.example` (SÍ commitear)

**REGLA:** Mantener `.env.example` actualizado con todas las variables necesarias.

```env
# .env.example

# ==========================================
# SUPABASE - DATABASE & AUTH
# ==========================================
# Obtener de: https://app.supabase.com/project/_/settings/api

# ✅ PÚBLICO - Puede estar en frontend
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Anon key (protegida por RLS)

# 🔴 SECRETO - Solo backend, NUNCA en frontend
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Service role (bypasses RLS)

# ==========================================
# NOTION API - OAUTH
# ==========================================
# Obtener de: https://www.notion.so/my-integrations

# 🟡 SENSIBLE - Solo backend
VITE_NOTION_CLIENT_ID=abc123...
NOTION_CLIENT_SECRET=secret_...  # SIN prefijo VITE_

# ✅ PÚBLICO - URLs de redirect
VITE_NOTION_REDIRECT_URI=http://localhost:5173/notion-callback
VITE_NOTION_CRM_FALLBACK_URL=https://notion.so/fallback

# ==========================================
# ENTORNO
# ==========================================
NODE_ENV=development  # development | production
VITE_APP_ENV=development

# ==========================================
# API CONFIGURATION
# ==========================================
API_PORT=3001
API_URL=http://localhost:3001

# ==========================================
# LOGGING & MONITORING (Opcional)
# ==========================================
# SENTRY_DSN=https://...
# LOG_LEVEL=debug  # debug | info | warn | error
```

### Naming Conventions

**REGLA:** Seguir esta convención estrictamente:

```env
# ✅ BIEN: Variables de frontend (expuestas)
VITE_SUPABASE_URL=...
VITE_NOTION_CLIENT_ID=...
VITE_APP_VERSION=...

# 🔴 NUNCA: Secretos con prefijo VITE_
# ❌ VITE_NOTION_CLIENT_SECRET=...  # ¡PELIGRO!
# ❌ VITE_SUPABASE_SERVICE_KEY=...  # ¡PELIGRO!

# ✅ BIEN: Secretos sin prefijo VITE_ (solo backend)
NOTION_CLIENT_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_PASSWORD=...

# ✅ BIEN: Configuración general
NODE_ENV=production
API_PORT=3001
LOG_LEVEL=info
```

**IMPORTANTE:** Vite solo expone variables que empiezan con `VITE_` al frontend.

## 2. Acceso a Variables de Entorno

### En Frontend (React + Vite)

```typescript
// ✅ BIEN: Acceder a variables públicas
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ BIEN: Con TypeScript types
// vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_NOTION_CLIENT_ID: string;
  readonly VITE_NOTION_REDIRECT_URI: string;
  readonly VITE_APP_ENV: 'development' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ❌ MAL: Intentar acceder a secreto sin VITE_
const secret = import.meta.env.NOTION_CLIENT_SECRET;  // ❌ undefined
```

### En Backend (Node.js + Express)

```typescript
// ✅ BIEN: Usar dotenv para cargar .env
import dotenv from 'dotenv';
dotenv.config();

// ✅ BIEN: Acceder a secretos
const clientSecret = process.env.NOTION_CLIENT_SECRET;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ MEJOR: Con validación
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NOTION_CLIENT_SECRET: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  API_PORT: z.string().transform(Number).pipe(z.number().int().positive()),
});

// Validar al inicio
const env = envSchema.parse(process.env);

export default env;

// Uso:
import env from './config/env';
const secret = env.NOTION_CLIENT_SECRET;
```

## 3. Organización de Configuración

### Estructura de Config

```
apps/api/config/
├── env.ts           # Validación de variables de entorno
├── supabase.ts      # Cliente Supabase
├── notion.ts        # Cliente Notion
└── cors.ts          # Configuración CORS
```

**Ejemplo: `apps/api/config/env.ts`**

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

// Cargar .env
dotenv.config();

// Schema de validación
const envSchema = z.object({
  // Entorno
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.string().default('3001').transform(Number),
  
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Service role key is required'),
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  
  // Notion
  NOTION_CLIENT_SECRET: z.string().min(1, 'Notion client secret is required'),
  VITE_NOTION_CLIENT_ID: z.string().min(1, 'Notion client ID is required'),
  
  // Opcional
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().url().optional(),
});

// Validar y exportar
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default env;
```

**Ejemplo: `apps/api/config/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';
import env from './env';

// Cliente con service role (para backend)
export const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Cliente normal (para operaciones con auth)
export const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);
```

## 4. Deployment - Variables por Entorno

### Vercel

**REGLA:** Configurar variables en el dashboard de Vercel, NO en código.

```bash
# 1. Variables para TODOS los entornos (Production, Preview, Development)
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_NOTION_CLIENT_ID

# 2. Variables SOLO para Production
NODE_ENV=production
NOTION_CLIENT_SECRET
SUPABASE_SERVICE_ROLE_KEY

# 3. Variables SOLO para Preview
NODE_ENV=preview

# 4. Variables SOLO para Development
NODE_ENV=development
```

**En Vercel Dashboard:**
1. Settings → Environment Variables
2. Agregar cada variable
3. Seleccionar entornos (Production / Preview / Development)
4. Guardar y redeploy

### Scripts para verificar variables

```typescript
// scripts/checks/verify-env.ts
import env from '../apps/api/config/env';

console.log('✅ Environment variables validated successfully!');
console.log('\nConfiguration:');
console.log(`  NODE_ENV: ${env.NODE_ENV}`);
console.log(`  API_PORT: ${env.API_PORT}`);
console.log(`  Supabase URL: ${env.VITE_SUPABASE_URL}`);
console.log(`  Notion Client ID: ${env.VITE_NOTION_CLIENT_ID.substring(0, 10)}...`);

// Verificar que secretos NO están expuestos
if ((import.meta as any).env?.NOTION_CLIENT_SECRET) {
  console.error('❌ DANGER: Client secret exposed to frontend!');
  process.exit(1);
}

console.log('✅ No secrets exposed to frontend');
```

Agregar a `package.json`:
```json
{
  "scripts": {
    "verify:env": "tsx scripts/checks/verify-env.ts"
  }
}
```

## 5. Rotación de Secretos

### Cuando Rotar Secretos

**REGLA:** Rotar inmediatamente si:
- ❌ Se commiteó un secreto por error
- ❌ Se expuso en logs públicos
- ❌ Un miembro del equipo se va
- ❌ Sospecha de compromiso
- ⏰ Cada 90 días (preventivo)

### Proceso de Rotación

1. **Generar nuevo secreto**
   - Ir al servicio (Supabase, Notion, etc.)
   - Crear nueva API key/secret

2. **Actualizar en todos los entornos**
   ```bash
   # Vercel
   vercel env add NOTION_CLIENT_SECRET production
   
   # .env local
   # Actualizar manualmente
   ```

3. **Verificar que todo funciona**
   ```bash
   npm run verify:env
   npm run dev  # Verificar que inicia correctamente
   ```

4. **Revocar secreto antiguo**
   - Ir al servicio
   - Eliminar/revocar API key antigua

5. **Auditar**
   - Documentar cuándo y por qué se rotó
   - Notificar al equipo si aplica

## 6. Secretos Commiteados Por Error

### ⚠️ SI COMMITEASTE UN SECRETO

**REGLA:** Actuar INMEDIATAMENTE. No esperar.

**Proceso:**

1. **ROTAR el secreto YA** (aunque no hayas pusheado)
   ```bash
   # Ir al servicio y generar nuevo secreto
   # Actualizar .env local
   # Actualizar Vercel
   ```

2. **Limpiar el historial de Git**
   ```bash
   # Si NO has pusheado
   git reset --soft HEAD~1
   git checkout .env  # O eliminar cambios
   
   # Si YA pusheaste
   # NUNCA usar git push --force en main
   # Mejor: hacer un nuevo commit con el secreto rotado
   # Y agregar .env al .gitignore si no estaba
   ```

3. **Verificar .gitignore**
   ```bash
   # Asegurar que .env está ignorado
   echo ".env" >> .gitignore
   echo ".env.*" >> .gitignore
   echo "!.env.example" >> .gitignore
   git add .gitignore
   git commit -m "chore: ensure .env files are ignored"
   ```

4. **Escanear con herramientas**
   ```bash
   # Instalar git-secrets
   npm install -g git-secrets
   
   # Escanear repo
   git secrets --scan
   ```

5. **Notificar si es necesario**
   - Informar al equipo
   - Revisar logs de acceso
   - Auditar si hubo uso no autorizado

## 7. Herramientas de Seguridad

### Pre-commit Hooks

**REGLA:** Instalar hooks para prevenir commits de secretos.

```bash
# Instalar husky
npm install -D husky

# Inicializar husky
npx husky init

# Crear pre-commit hook
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Verificar que no hay secretos
npm run check:secrets

# Verificar que .env no está staged
if git diff --cached --name-only | grep -E '\.env$|\.env\.local$'; then
  echo "❌ Error: .env file is staged. Use .env.example instead."
  exit 1
fi
```

**Script de verificación:**

```typescript
// scripts/checks/check-secrets.ts
import { readFileSync } from 'fs';
import { glob } from 'glob';

const DANGEROUS_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?eyJ[a-zA-Z0-9_-]+/i,
  /CLIENT_SECRET\s*=\s*['"]?[a-zA-Z0-9_-]{32,}/i,
  /password\s*=\s*['"][^'"]+['"]/i,
  /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
];

const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
  ignore: ['node_modules/**', 'dist/**', '.git/**', 'scripts/checks/**']
});

let hasSecrets = false;

files.forEach(file => {
  const content = readFileSync(file, 'utf-8');
  
  DANGEROUS_PATTERNS.forEach(pattern => {
    if (pattern.test(content)) {
      console.error(`❌ Potential secret found in: ${file}`);
      hasSecrets = true;
    }
  });
});

if (hasSecrets) {
  console.error('\n❌ Secrets detected! Please remove them before committing.');
  process.exit(1);
}

console.log('✅ No secrets detected in code');
```

Agregar a `package.json`:
```json
{
  "scripts": {
    "check:secrets": "tsx scripts/checks/check-secrets.ts"
  }
}
```

### GitHub Actions Secrets Scanning

```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run secrets scan
        run: |
          npm run check:secrets
          
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level=moderate
```

## 8. Documentación de Secretos

### README de Secretos

**REGLA:** Mantener documentación actualizada de dónde obtener cada secreto.

```markdown
# 🔑 Secretos y Variables de Entorno

## Obtener Credenciales

### Supabase
1. Ir a https://app.supabase.com/project/[tu-proyecto]/settings/api
2. Copiar:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ NUNCA exponer)

### Notion
1. Ir a https://www.notion.so/my-integrations
2. Crear integración o usar existente
3. Copiar:
   - `OAuth Client ID` → `VITE_NOTION_CLIENT_ID`
   - `Client Secret` → `NOTION_CLIENT_SECRET` (⚠️ Solo backend)

## Variables Requeridas por Entorno

### Development
- [x] VITE_SUPABASE_URL
- [x] VITE_SUPABASE_ANON_KEY
- [x] SUPABASE_SERVICE_ROLE_KEY
- [x] VITE_NOTION_CLIENT_ID
- [x] NOTION_CLIENT_SECRET
- [ ] SENTRY_DSN (opcional)

### Production
- Mismo que Development
- Asegurar que `NODE_ENV=production`
```

## Checklist de Seguridad de Variables

**REGLA:** Antes de cada deploy, verificar:

### Código
- [ ] `.env` está en `.gitignore`
- [ ] `.env.example` está actualizado
- [ ] No hay secretos hardcodeados en el código
- [ ] Variables sensibles NO tienen prefijo `VITE_`
- [ ] Pre-commit hooks instalados

### Entorno
- [ ] Variables configuradas en Vercel/plataforma
- [ ] Secretos diferentes entre development y production
- [ ] Service role keys solo en backend
- [ ] CORS configurado correctamente

### Documentación
- [ ] README actualizado con cómo obtener secretos
- [ ] `.env.example` tiene todas las variables necesarias
- [ ] Documentado cuándo rotar secretos
- [ ] Equipo sabe a quién contactar para acceso

---

**REGLA CRÍTICA:** Un secreto expuesto debe rotarse INMEDIATAMENTE. No hay excepciones.

**Última actualización:** Octubre 2025

