# 🚀 Guía de Deployment - Cactus Dashboard

Guía completa para deployar Cactus Dashboard en producción.

## 🎯 Plataformas Soportadas

- ✅ **Vercel** (Recomendado) - Deployment automático
- ⚠️ **Netlify** - Compatible con ajustes
- ⚠️ **Railway** - Para backend separado

## 📦 Deployment en Vercel (Recomendado)

### Paso 1: Preparar el Proyecto

1. **Asegúrate de tener un repositorio Git**
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin <tu-repositorio-url>
   git push -u origin main
   ```

2. **Verificar que el build funciona localmente**
   ```bash
   npm run build
   npm run preview
   ```

### Paso 2: Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Click en "New Project"
3. Importa tu repositorio de GitHub/GitLab/Bitbucket
4. Vercel detectará automáticamente que es un proyecto Vite

### Paso 3: Configurar Variables de Entorno

En el panel de Vercel, ve a **Settings → Environment Variables** y agrega:

#### Variables Requeridas

```env
# Supabase (REQUERIDO)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui

# Entorno
NODE_ENV=production
VITE_APP_ENV=production
```

#### Variables Opcionales (para Notion)

```env
# Notion OAuth (OPCIONAL)
VITE_NOTION_CLIENT_ID=tu_notion_client_id
VITE_NOTION_CLIENT_SECRET=tu_notion_client_secret
VITE_NOTION_REDIRECT_URI=https://tu-dominio.vercel.app/notion-callback
VITE_NOTION_CRM_FALLBACK_URL=https://notion.so/tu-pagina
```

### Paso 4: Configuración de Build

Vercel debería detectar automáticamente estos valores, pero verifica:

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### Paso 5: Deploy

1. Click en "Deploy"
2. Espera a que el build termine (~2-3 minutos)
3. ¡Listo! Tu app estará en `https://tu-proyecto.vercel.app`

### Paso 6: Configurar Dominio (Opcional)

1. Ve a **Settings → Domains**
2. Agrega tu dominio personalizado
3. Configura los DNS según las instrucciones de Vercel
4. Espera propagación DNS (5-10 minutos)

## 🔧 Configuración Avanzada

### vercel.json

El proyecto ya incluye `vercel.json` con configuración optimizada:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Rutas API Serverless

Si tienes rutas API en `/api`, Vercel las manejará automáticamente como Serverless Functions.

Estructura:
```
api/
├── routes/
│   └── auth.ts  → /api/routes/auth
└── server.ts    → Entry point
```

## 📊 Configurar Supabase para Producción

### 1. Habilitar RLS

Asegúrate de que Row Level Security esté habilitado en todas las tablas:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
```

### 2. Configurar URL Permitidas

En el panel de Supabase:

1. Ve a **Authentication → URL Configuration**
2. Agrega en **Site URL**:
   ```
   https://tu-dominio.vercel.app
   ```
3. Agrega en **Redirect URLs**:
   ```
   https://tu-dominio.vercel.app/**
   https://tu-dominio.vercel.app/notion-callback
   ```

### 3. Aplicar Migraciones

```bash
# Desde el panel de Supabase SQL Editor
# Ejecuta todas las migraciones en /supabase/migrations
```

## 🔐 Seguridad en Producción

### Headers de Seguridad

Ya configurados en `vercel.json`:
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Strict-Transport-Security: HSTS habilitado
- ✅ Content-Security-Policy: Configurado

### Variables de Entorno

- ❌ **NUNCA** commitear `.env` al repositorio
- ✅ Usar variables de entorno de Vercel
- ✅ Keys de Supabase ANON son seguras para frontend
- ⚠️ Service Role Key solo en backend/serverless functions

### CORS

Configurado en backend para permitir solo tu dominio:

```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://tu-dominio.vercel.app'
    : 'http://localhost:5173',
  credentials: true
}));
```

## 📈 Monitoring y Analytics

### Vercel Analytics

1. Ve a tu proyecto en Vercel
2. Click en "Analytics" tab
3. Habilita Web Analytics (gratis)
4. Verás:
   - Visitas
   - Performance
   - Errores
   - Core Web Vitals

### Logs

Ver logs en tiempo real:
```bash
vercel logs <deployment-url>
```

O en el panel: **Deployments → [Tu deployment] → Function Logs**

### Monitoreo de Errores (Opcional)

Integrar Sentry:

```bash
npm install @sentry/react @sentry/vite-plugin
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "tu-sentry-dsn",
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

## 🧪 Testing antes de Deploy

### Checklist Pre-Deploy

```bash
# 1. Tests pasan
npm test

# 2. Build exitoso
npm run build

# 3. Preview funciona
npm run preview

# 4. Linter sin errores
npm run lint

# 5. Type checking
npm run check

# 6. Verificar variables de entorno
# Asegurarse de que estén todas configuradas en Vercel
```

### Preview Deployments

Vercel crea automáticamente preview deployments para cada PR:
- URL única para cada preview
- Testing antes de merge
- Variables de entorno compartidas

## 🔄 CI/CD

### GitHub Actions (Opcional)

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run build
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 📊 Performance Optimization

### Build Optimization

Ya configurado en `vite.config.ts`:
- ✅ Code splitting
- ✅ Tree shaking
- ✅ Minification
- ✅ Gzip compression

### Assets Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['chart.js', 'react-chartjs-2', 'recharts'],
          'ui-vendor': ['lucide-react', 'sonner']
        }
      }
    }
  }
});
```

## 🚨 Troubleshooting

### Error: "Failed to load module"
**Causa**: Path alias no configurado  
**Solución**: Verificar `tsconfig.json` y `vite.config.ts`

### Error: "Environment variables not defined"
**Causa**: Variables no configuradas en Vercel  
**Solución**: Agregar en Settings → Environment Variables

### Error: "Build failed"
**Causa**: TypeScript errors  
**Solución**: Ejecutar `npm run check` localmente

### Error: "API routes not working"
**Causa**: Backend no desplegado correctamente  
**Solución**: Verificar `/api` folder structure

### Deployment lento
**Causa**: Dependencias grandes  
**Solución**: Verificar bundle size, considerar code splitting

## 📞 Soporte

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Issues**: GitHub Issues del proyecto

---

**Última actualización:** Octubre 2025  
**Versión:** 1.0.0


