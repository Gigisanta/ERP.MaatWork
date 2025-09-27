# Guía de Implementación - Notion CRM Integration

## 1. Preparación del Entorno

### 1.1 Variables de Entorno

Agregar al archivo `.env.local`:

```bash
# Notion CRM Configuration
NOTION_CRM_FALLBACK_URL="https://tu-workspace.notion.site/tu-pagina-publica"

# Funcionalidad PRO (opcional)
NOTION_CLIENT_ID=""
NOTION_CLIENT_SECRET=""
NOTION_REDIRECT_URI="https://tu-dominio.vercel.app/api/notion/oauth/callback"
ENCRYPTION_KEY="" # Generar 32 caracteres aleatorios
```

### 1.2 Instalación de Dependencias

```bash
# Dependencias principales (ya instaladas)
npm install @supabase/supabase-js react-router-dom lucide-react

# Funcionalidad PRO (opcional)
npm install @notionhq/client crypto-js
npm install --save-dev @types/crypto-js
```

## 2. Migración de Base de Datos

### 2.1 Crear Migración

Crear archivo: `supabase/migrations/create_notion_pages_map.sql`

```sql
-- Migración: Crear tabla notion_pages_map
-- Fecha: 2024-01-XX
-- Descripción: Tabla para mapear usuarios a sus páginas/workspaces de Notion

-- Crear tabla para mapeo de usuarios a páginas de Notion
CREATE TABLE IF NOT EXISTS notion_pages_map (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    notion_page_url TEXT,
    notion_page_id TEXT,
    notion_workspace_id TEXT,
    notion_access_token TEXT, -- Cifrado con ENCRYPTION_KEY
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_notion_pages_map_user_id ON notion_pages_map(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_pages_map_updated_at ON notion_pages_map(updated_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE notion_pages_map ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuarios solo pueden ver sus propios registros
CREATE POLICY "Users can view own notion pages" ON notion_pages_map
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notion pages" ON notion_pages_map
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notion pages" ON notion_pages_map
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notion pages" ON notion_pages_map
    FOR DELETE USING (auth.uid() = user_id);

-- Permisos para roles autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON notion_pages_map TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_notion_pages_map_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp
CREATE TRIGGER update_notion_pages_map_updated_at_trigger
    BEFORE UPDATE ON notion_pages_map
    FOR EACH ROW
    EXECUTE FUNCTION update_notion_pages_map_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE notion_pages_map IS 'Mapeo de usuarios a sus páginas/workspaces de Notion';
COMMENT ON COLUMN notion_pages_map.user_id IS 'ID del usuario (FK a auth.users)';
COMMENT ON COLUMN notion_pages_map.notion_page_url IS 'URL de la página de Notion del usuario';
COMMENT ON COLUMN notion_pages_map.notion_page_id IS 'ID de la página de Notion (opcional)';
COMMENT ON COLUMN notion_pages_map.notion_workspace_id IS 'ID del workspace de Notion (opcional)';
COMMENT ON COLUMN notion_pages_map.notion_access_token IS 'Token de acceso cifrado (funcionalidad PRO)';
```

## 3. Implementación del Frontend

### 3.1 Actualizar Sidebar

Modificar `src/components/Sidebar.tsx`:

```typescript
// Agregar import para el icono
import { Book } from 'lucide-react';

// En el array navigationItems, agregar después de CRM:
const navigationItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'CRM', path: '/crm' },
  { icon: Book, label: 'Notion CRM', path: '/notion-crm' }, // NUEVO
  { icon: UserCheck, label: 'Mi Equipo', path: '/team', requiresPermission: 'canManageTeam' },
  // ... resto de items
];
```

### 3.2 Crear Página Notion CRM

Crear archivo: `src/pages/NotionCRM.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

interface NotionCRMState {
  notionUrl: string | null;
  loading: boolean;
  error: string | null;
  showOAuthBanner: boolean;
  iframeError: boolean;
}

const NotionCRM: React.FC = () => {
  const { session } = useAuthStore();
  const [state, setState] = useState<NotionCRMState>({
    notionUrl: null,
    loading: true,
    error: null,
    showOAuthBanner: false,
    iframeError: false
  });

  // Obtener URL de Notion del usuario
  useEffect(() => {
    const fetchNotionUrl = async () => {
      if (!session?.access_token) {
        setState(prev => ({ ...prev, loading: false, error: 'No authenticated' }));
        return;
      }

      try {
        const response = await fetch('/api/notion/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setState(prev => ({
            ...prev,
            notionUrl: data.notionUrl,
            loading: false,
            showOAuthBanner: false
          }));
        } else if (response.status === 404) {
          // No hay URL configurada, usar fallback
          const fallbackUrl = import.meta.env.VITE_NOTION_CRM_FALLBACK_URL;
          setState(prev => ({
            ...prev,
            notionUrl: fallbackUrl || null,
            loading: false,
            showOAuthBanner: !fallbackUrl
          }));
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('Error fetching Notion URL:', error);
        // Usar URL de fallback en caso de error
        const fallbackUrl = import.meta.env.VITE_NOTION_CRM_FALLBACK_URL;
        setState(prev => ({
          ...prev,
          notionUrl: fallbackUrl || null,
          loading: false,
          error: fallbackUrl ? null : 'Error al cargar configuración de Notion',
          showOAuthBanner: !fallbackUrl
        }));
      }
    };

    fetchNotionUrl();
  }, [session]);

  // Manejar error de carga del iframe
  const handleIframeError = () => {
    setState(prev => ({ ...prev, iframeError: true }));
  };

  // Iniciar OAuth de Notion
  const handleConnectNotion = () => {
    if (session?.access_token) {
      window.location.href = `/api/notion/oauth/start?token=${session.access_token}`;
    }
  };

  // Abrir Notion en nueva pestaña
  const handleOpenNotion = () => {
    if (state.notionUrl) {
      window.open(state.notionUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-3 text-secondary">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Cargando Notion CRM...</span>
        </div>
      </div>
    );
  }

  if (state.error && !state.notionUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-primary mb-2">Error de Configuración</h3>
            <p className="text-secondary">{state.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Banner OAuth (si no hay URL configurada) */}
      {state.showOAuthBanner && (
        <div className="bg-cactus-50 border border-cactus-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-cactus-800 mb-1">
                Conectá tu workspace de Notion
              </h4>
              <p className="text-sm text-cactus-600">
                Configurá tu página personal de Notion para una experiencia personalizada.
              </p>
            </div>
            <button
              onClick={handleConnectNotion}
              className="ml-4 px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 transition-colors font-medium"
            >
              Conectar con Notion
            </button>
          </div>
        </div>
      )}

      {/* Contenedor del iframe o fallback */}
      <div className="flex-1 relative">
        {state.iframeError || !state.notionUrl ? (
          // Fallback cuando iframe no puede cargar
          <div className="flex items-center justify-center h-full">
            <div className="bg-white rounded-xl shadow-lg border border-border-primary p-8 max-w-md text-center">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">
                Notion no permitió el embed
              </h3>
              <p className="text-secondary mb-6">
                Algunas páginas de Notion no pueden mostrarse en un iframe por políticas de seguridad.
              </p>
              <button
                onClick={handleOpenNotion}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 transition-colors font-medium"
              >
                <ExternalLink className="w-5 h-5" />
                <span>Abrir en Notion</span>
              </button>
              <p className="text-xs text-secondary mt-4">
                💡 Si querés editar, asegurate de estar logueado en Notion en este navegador.
              </p>
            </div>
          </div>
        ) : (
          // iframe de Notion
          <iframe
            src={state.notionUrl}
            className="absolute inset-0 w-full h-full border-0 rounded-lg"
            loading="lazy"
            allow="clipboard-read; clipboard-write; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            onError={handleIframeError}
            title="Notion CRM"
          />
        )}
      </div>
    </div>
  );
};

export default NotionCRM;
```

### 3.3 Actualizar App Router

Modificar `src/App.tsx` para agregar la nueva ruta:

```typescript
// Agregar import
const NotionCRM = lazy(() => import('./pages/NotionCRM'));

// En las rutas protegidas con Layout, agregar:
<Route path="notion-crm" element={
  <Suspense fallback={<LoadingSpinner />}>
    <NotionCRM />
  </Suspense>
} />
```

## 4. Implementación del Backend

### 4.1 Servicio de Notion

Crear archivo: `src/services/notionService.ts`

```typescript
import { supabase } from '../lib/supabase';

export interface NotionPageMap {
  user_id: string;
  notion_page_url: string | null;
  notion_page_id: string | null;
  notion_workspace_id: string | null;
  notion_access_token: string | null;
  updated_at: string;
}

export class NotionService {
  /**
   * Obtener URL de Notion para un usuario
   */
  static async getUserNotionUrl(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('notion_pages_map')
        .select('notion_page_url')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró registro
          return null;
        }
        throw error;
      }

      return data?.notion_page_url || null;
    } catch (error) {
      console.error('Error fetching user Notion URL:', error);
      throw error;
    }
  }

  /**
   * Guardar o actualizar URL de Notion para un usuario
   */
  static async saveUserNotionUrl(
    userId: string,
    notionPageUrl: string,
    notionPageId?: string,
    notionWorkspaceId?: string,
    notionAccessToken?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('notion_pages_map')
        .upsert({
          user_id: userId,
          notion_page_url: notionPageUrl,
          notion_page_id: notionPageId || null,
          notion_workspace_id: notionWorkspaceId || null,
          notion_access_token: notionAccessToken || null,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving user Notion URL:', error);
      throw error;
    }
  }

  /**
   * Eliminar configuración de Notion para un usuario
   */
  static async deleteUserNotionConfig(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notion_pages_map')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting user Notion config:', error);
      throw error;
    }
  }
}
```

### 4.2 API Routes

Crear archivo: `api/routes/notion.ts`

```typescript
import { Router, Request, Response } from 'express';
import { supabase } from '../../src/lib/supabase';
import { NotionService } from '../../src/services/notionService';

const router = Router();

// Middleware para validar token de Supabase
const validateAuth = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/notion/me
 * Obtener URL de Notion del usuario autenticado
 */
router.get('/me', validateAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const notionUrl = await NotionService.getUserNotionUrl(userId);

    if (!notionUrl) {
      return res.status(404).json({
        error: 'No Notion URL configured for user',
        status: 'not_found'
      });
    }

    res.json({
      notionUrl,
      status: 'success'
    });
  } catch (error) {
    console.error('Error in /api/notion/me:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notion/me
 * Guardar URL de Notion del usuario autenticado
 */
router.post('/me', validateAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { notionPageUrl, notionPageId, notionWorkspaceId } = req.body;

    if (!notionPageUrl) {
      return res.status(400).json({ error: 'notionPageUrl is required' });
    }

    // Validar que sea una URL de Notion válida
    const notionUrlRegex = /^https:\/\/(www\.)?(notion\.site|notion\.so)\/.+/;
    if (!notionUrlRegex.test(notionPageUrl)) {
      return res.status(400).json({ error: 'Invalid Notion URL format' });
    }

    await NotionService.saveUserNotionUrl(
      userId,
      notionPageUrl,
      notionPageId,
      notionWorkspaceId
    );

    res.json({
      message: 'Notion URL saved successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error in POST /api/notion/me:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/notion/me
 * Eliminar configuración de Notion del usuario
 */
router.delete('/me', validateAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    await NotionService.deleteUserNotionConfig(userId);

    res.json({
      message: 'Notion configuration deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error in DELETE /api/notion/me:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### 4.3 Actualizar App Server

Modificar `api/app.ts` para incluir las rutas de Notion:

```typescript
// Agregar import
import notionRoutes from './routes/notion';

// Agregar después de las rutas existentes
app.use('/api/notion', notionRoutes);
```

## 5. Funcionalidad PRO: OAuth de Notion

### 5.1 Instalar Dependencias Adicionales

```bash
npm install @notionhq/client crypto-js
npm install --save-dev @types/crypto-js
```

### 5.2 Utilidad de Cifrado

Crear archivo: `src/utils/encryption.ts`

```typescript
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn('ENCRYPTION_KEY not set - token encryption disabled');
}

export const encryptToken = (token: string): string => {
  if (!ENCRYPTION_KEY) {
    return token; // Fallback sin cifrado
  }
  
  try {
    return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Error encrypting token:', error);
    return token;
  }
};

export const decryptToken = (encryptedToken: string): string => {
  if (!ENCRYPTION_KEY) {
    return encryptedToken; // Fallback sin cifrado
  }
  
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Error decrypting token:', error);
    return encryptedToken;
  }
};
```

### 5.3 OAuth Routes

Crear archivo: `api/routes/notionOAuth.ts`

```typescript
import { Router, Request, Response } from 'express';
import { Client } from '@notionhq/client';
import { NotionService } from '../../src/services/notionService';
import { encryptToken } from '../../src/utils/encryption';
import crypto from 'crypto';

const router = Router();

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI;

/**
 * GET /api/notion/oauth/start
 * Iniciar flujo OAuth de Notion
 */
router.get('/start', async (req: Request, res: Response) => {
  try {
    if (!NOTION_CLIENT_ID || !NOTION_REDIRECT_URI) {
      return res.status(500).json({ error: 'OAuth not configured' });
    }

    // Generar state para CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Guardar state en sesión (simplificado - en producción usar Redis/DB)
    // req.session.oauthState = state;
    
    const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
      `client_id=${NOTION_CLIENT_ID}&` +
      `response_type=code&` +
      `owner=user&` +
      `redirect_uri=${encodeURIComponent(NOTION_REDIRECT_URI)}&` +
      `state=${state}`;

    res.redirect(authUrl);
  } catch (error) {
    console.error('Error in OAuth start:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notion/oauth/callback
 * Callback de OAuth de Notion
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('OAuth error:', error);
      return res.redirect('/notion-crm?error=oauth_denied');
    }

    if (!code) {
      return res.redirect('/notion-crm?error=missing_code');
    }

    // Validar state (simplificado)
    // if (state !== req.session.oauthState) {
    //   return res.redirect('/notion-crm?error=invalid_state');
    // }

    // Intercambiar código por token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: NOTION_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, workspace_id } = tokenData;

    // Inicializar cliente de Notion
    const notion = new Client({ auth: access_token });

    // Buscar páginas del usuario
    const searchResponse = await notion.search({
      filter: {
        property: 'object',
        value: 'page'
      },
      page_size: 10
    });

    // Usar la primera página encontrada o crear una URL por defecto
    let notionPageUrl = `https://notion.so/${workspace_id}`;
    let notionPageId = null;

    if (searchResponse.results.length > 0) {
      const firstPage = searchResponse.results[0];
      if ('url' in firstPage) {
        notionPageUrl = firstPage.url;
        notionPageId = firstPage.id;
      }
    }

    // Obtener usuario actual (simplificado - en producción validar token)
    const userId = req.query.user_id as string; // Pasar desde frontend

    if (!userId) {
      return res.redirect('/notion-crm?error=missing_user');
    }

    // Guardar configuración
    await NotionService.saveUserNotionUrl(
      userId,
      notionPageUrl,
      notionPageId,
      workspace_id,
      encryptToken(access_token)
    );

    res.redirect('/notion-crm?success=connected');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.redirect('/notion-crm?error=callback_failed');
  }
});

export default router;
```

## 6. Configuración de Producción

### 6.1 Variables de Entorno en Vercel

```bash
# En el dashboard de Vercel, agregar:
NOTION_CRM_FALLBACK_URL=https://tu-workspace.notion.site/tu-pagina
NOTION_CLIENT_ID=tu_client_id
NOTION_CLIENT_SECRET=tu_client_secret
NOTION_REDIRECT_URI=https://tu-dominio.vercel.app/api/notion/oauth/callback
ENCRYPTION_KEY=tu_clave_de_32_caracteres
```

### 6.2 Configurar CSP en Vercel

Actualizar `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "frame-src 'self' https://*.notion.site https://*.notion.so; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.notion.com;"
        }
      ]
    }
  ]
}
```

## 7. Testing y QA

### 7.1 Casos de Prueba

1. **Navegación**: Verificar que "Notion CRM" aparece en sidebar
2. **Carga básica**: iFrame carga con URL de fallback
3. **Fallback**: Card de fallback se muestra cuando iframe falla
4. **OAuth**: Flujo completo de conexión con Notion
5. **Persistencia**: URL personalizada se mantiene entre sesiones
6. **Responsive**: Funciona correctamente en móvil

### 7.2 Script de Testing

Crear archivo: `scripts/test_notion_crm.js`

```javascript
// Script para probar la funcionalidad de Notion CRM
const { supabase } = require('../src/lib/supabase');

async function testNotionCRM() {
  console.log('🧪 Testing Notion CRM functionality...');
  
  try {
    // Test 1: Verificar tabla existe
    const { data, error } = await supabase
      .from('notion_pages_map')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Database table test failed:', error.message);
      return;
    }
    
    console.log('✅ Database table accessible');
    
    // Test 2: Verificar variables de entorno
    const fallbackUrl = process.env.NOTION_CRM_FALLBACK_URL;
    if (fallbackUrl) {
      console.log('✅ Fallback URL configured:', fallbackUrl);
    } else {
      console.log('⚠️  Fallback URL not configured');
    }
    
    // Test 3: Verificar OAuth config (opcional)
    const oauthConfigured = process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET;
    if (oauthConfigured) {
      console.log('✅ OAuth configuration found');
    } else {
      console.log('ℹ️  OAuth not configured (optional)');
    }
    
    console.log('🎉 Notion CRM tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testNotionCRM();
}

module.exports = { testNotionCRM };
```

## 8. Troubleshooting

### 8.1 Problemas Comunes

**iFrame no carga:**
- Verificar CSP headers
- Comprobar que la URL de Notion es pública
- Revisar console del navegador por errores X-Frame-Options

**OAuth no funciona:**
- Verificar NOTION_CLIENT_ID y NOTION_CLIENT_SECRET
- Comprobar NOTION_REDIRECT_URI coincide con Notion app config
- Revisar logs del servidor para errores de token exchange

**Base de datos:**
- Ejecutar migración: `supabase db push`
- Verificar RLS policies están activas
- Comprobar permisos de usuario autenticado

### 8.2 Logs y Debugging

```typescript
// Agregar en NotionCRM.tsx para debugging
const debugMode = import.meta.env.DEV;

if (debugMode) {
  console.log('Notion CRM Debug:', {
    notionUrl: state.notionUrl,
    loading: state.loading,
    error: state.error,
    showOAuthBanner: state.showOAuthBanner,
    sessionToken: !!session?.access_token
  });
}
```

Esta guía proporciona una implementación completa de la funcionalidad Notion CRM adaptada a la arquitectura React + Vite del proyecto existente.