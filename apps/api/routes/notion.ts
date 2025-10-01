/**
 * API Routes para Notion CRM
 * Maneja la integración con Notion y el mapeo de páginas
 */

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { Router, Request, Response, type Router as ExpressRouter } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import notionService, { NotionServiceError, ERROR_CODES } from '../services/notionService';

// Interfaces para tipos de datos
interface NotionPageMap {
  id?: string;
  user_id: string;
  notion_page_url: string;
  page_title?: string;
  access_token?: string;
  workspace_id?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
};

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuración OAuth de Notion
const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Router de Express
const router: ExpressRouter = Router();

/**
 * Middleware mejorado para autenticación automática
 * Soporta múltiples métodos de autenticación y renovación automática
 */
const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  try {
    let token: string | null = null;
    let userId: string | null = null;

    // Método 1: Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Método 2: Cookie de sesión
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      if (cookies['sb-access-token']) {
        token = cookies['sb-access-token'];
      }
    }

    // Método 3: Header personalizado x-user-id (para desarrollo/testing)
    if (!token && req.headers['x-user-id']) {
      userId = req.headers['x-user-id'] as string;
      
      // Verificar que el usuario existe en la base de datos
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', userId)
        .single();
      
      if (!userError && userData) {
        req.user = {
          id: userData.id,
          email: userData.email
        };
        return next();
      }
    }

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de autorización requerido',
        code: 'UNAUTHORIZED',
        details: 'Proporciona un Bearer token, cookie de sesión o x-user-id header'
      });
    }
    
    // Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      // Intentar renovar token automáticamente si es posible
      if (error?.message?.includes('expired')) {
        return res.status(401).json({ 
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED',
          details: 'El token ha expirado. Renueva la sesión.'
        });
      }
      
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN',
        details: error?.message || 'Token no válido'
      });
    }

    req.user = {
      id: user.id,
      email: user.email
    };

    next();
  } catch (error) {
    console.error('[Notion API] Error en autenticación:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Middleware para verificar conexión activa con Notion
 */
const requireNotionConnection = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  try {
    const userId = req.user!.id;

    // Verificar si existe una conexión activa
    const { data: workspace, error } = await supabase
      .from('notion_workspaces')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !workspace) {
      return res.status(403).json({
        error: 'Conexión con Notion requerida',
        code: 'NOTION_NOT_CONNECTED',
        details: 'Conecta tu workspace de Notion antes de continuar'
      });
    }

    // Verificar health de la conexión
    try {
      const healthCheck = await notionService.checkHealth(userId);
      if (healthCheck.status === 'unhealthy') {
        return res.status(503).json({
          error: 'Conexión con Notion no disponible',
          code: 'NOTION_UNHEALTHY',
          details: healthCheck.error || 'Servicio temporalmente no disponible'
        });
      }
    } catch (healthError) {
      console.warn('[Notion API] Health check falló:', healthError);
      // Continuar sin bloquear si el health check falla
    }

    next();
  } catch (error) {
    console.error('[Notion API] Error verificando conexión Notion:', error);
    return res.status(500).json({
      error: 'Error verificando conexión',
      code: 'CONNECTION_CHECK_ERROR',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * GET /api/notion/me
 * Obtiene la configuración de Notion del usuario autenticado
 */
router.get('/me', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('notion_pages_map')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[Notion API] Error obteniendo configuración:', error);
      return res.status(500).json({ 
        error: 'Error al obtener configuración',
        code: 'DATABASE_ERROR' 
      });
    }

    // Si no hay configuración, devolver null
    if (!data) {
      return res.json({ 
        success: true,
        data: null,
        message: 'No hay configuración de Notion para este usuario'
      });
    }

    // Remover información sensible antes de enviar
    const safeData = {
      id: data.id,
      notion_page_url: data.notion_page_url,
      page_title: data.page_title,
      workspace_id: data.workspace_id,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    res.json({ 
      success: true,
      data: safeData 
    });

  } catch (error) {
    console.error('[Notion API] Error en /me:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR' 
    });
  }
});

/**
 * POST /api/notion/config
 * Crea o actualiza la configuración de Notion del usuario
 */
router.post('/config', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { notion_page_url, page_title } = req.body;

    // Validar URL de Notion
    if (!notion_page_url || typeof notion_page_url !== 'string') {
      return res.status(400).json({ 
        error: 'URL de Notion requerida',
        code: 'INVALID_URL' 
      });
    }

    // Validar formato de URL de Notion
    const notionUrlRegex = /^https:\/\/[\w-]+\.notion\.site\//;
    if (!notionUrlRegex.test(notion_page_url)) {
      return res.status(400).json({ 
        error: 'URL de Notion inválida. Debe ser una URL de notion.site',
        code: 'INVALID_NOTION_URL' 
      });
    }

    // Desactivar configuraciones anteriores
    await supabase
      .from('notion_pages_map')
      .update({ is_active: false })
      .eq('user_id', userId);

    // Crear nueva configuración
    const newConfig: Omit<NotionPageMap, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      notion_page_url,
      page_title: page_title || 'Mi Página de Notion',
      is_active: true
    };

    const { data, error } = await supabase
      .from('notion_pages_map')
      .insert([newConfig])
      .select()
      .single();

    if (error) {
      console.error('[Notion API] Error creando configuración:', error);
      return res.status(500).json({ 
        error: 'Error al guardar configuración',
        code: 'DATABASE_ERROR' 
      });
    }

    // Remover información sensible
    const safeData = {
      id: data.id,
      notion_page_url: data.notion_page_url,
      page_title: data.page_title,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    res.status(201).json({ 
      success: true,
      data: safeData,
      message: 'Configuración guardada exitosamente'
    });

  } catch (error) {
    console.error('[Notion API] Error en /config:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR' 
    });
  }
});

/**
 * GET /api/notion/oauth/start
 * Inicia el flujo OAuth de Notion
 */
router.get('/oauth/start', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!NOTION_CLIENT_ID || !NOTION_REDIRECT_URI) {
      return res.status(501).json({ 
        error: 'OAuth de Notion no configurado',
        code: 'OAUTH_NOT_CONFIGURED' 
      });
    }

    const userId = req.user!.id;
    const returnUrl = req.query.return_url as string || '/notion-crm';

    // Generar state para seguridad OAuth
    const state = jwt.sign(
      { 
        userId, 
        returnUrl, 
        timestamp: Date.now() 
      },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    // URL de autorización de Notion
    const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
    authUrl.searchParams.set('client_id', NOTION_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('owner', 'user');
    authUrl.searchParams.set('redirect_uri', NOTION_REDIRECT_URI);
    authUrl.searchParams.set('state', state);

    res.json({ 
      success: true,
      redirect_url: authUrl.toString() 
    });

  } catch (error) {
    console.error('[Notion API] Error en OAuth start:', error);
    res.status(500).json({ 
      error: 'Error iniciando OAuth',
      code: 'OAUTH_ERROR' 
    });
  }
});

/**
 * GET /api/notion/oauth/callback
 * Maneja el callback de OAuth de Notion
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Verificar si hay error de OAuth
    if (oauthError) {
      console.error('[Notion API] Error OAuth:', oauthError);
      return res.redirect(`/notion-crm?error=oauth_denied`);
    }

    // Verificar parámetros requeridos
    if (!code || !state) {
      return res.redirect(`/notion-crm?error=invalid_callback`);
    }

    // Verificar y decodificar state
    let stateData;
    try {
      stateData = jwt.verify(state as string, JWT_SECRET) as any;
    } catch (error) {
      console.error('[Notion API] State inválido:', error);
      return res.redirect(`/notion-crm?error=invalid_state`);
    }

    // Intercambiar código por token
    if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET || !NOTION_REDIRECT_URI) {
      return res.redirect(`/notion-crm?error=oauth_not_configured`);
    }

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
      console.error('[Notion API] Error obteniendo token:', await tokenResponse.text());
      return res.redirect(`/notion-crm?error=token_exchange_failed`);
    }

    const tokenData: any = await tokenResponse.json();
    
    // Cifrar el access token antes de guardarlo
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(JWT_SECRET, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encryptedToken = cipher.update(tokenData.access_token, 'utf8', 'hex');
    encryptedToken += cipher.final('hex');
    encryptedToken = iv.toString('hex') + ':' + encryptedToken;

    // Desactivar configuraciones anteriores
    await supabase
      .from('notion_pages_map')
      .update({ is_active: false })
      .eq('user_id', stateData.userId);

    // Guardar nueva configuración con token OAuth
    const newConfig: Omit<NotionPageMap, 'id' | 'created_at' | 'updated_at'> = {
      user_id: stateData.userId,
      notion_page_url: tokenData.workspace_url || '',
      page_title: tokenData.workspace_name || 'Workspace de Notion',
      access_token: encryptedToken,
      workspace_id: tokenData.workspace_id,
      is_active: true
    };

    const { error: insertError } = await supabase
      .from('notion_pages_map')
      .insert([newConfig]);

    if (insertError) {
      console.error('[Notion API] Error guardando configuración OAuth:', insertError);
      return res.redirect(`/notion-crm?error=save_failed`);
    }

    // Obtener información del usuario para redirección personalizada
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, configuracion')
      .eq('id', stateData.userId)
      .single();

    // Determinar URL de redirección personalizada
    let redirectUrl = stateData.returnUrl || '/notion-crm';
    
    if (userData && !userError) {
      // Redirección basada en rol o configuración del usuario
      const userConfig = userData.configuracion || {};
      
      if (userConfig.custom_crm_url) {
        // Si el usuario tiene una URL de CRM personalizada
        redirectUrl = userConfig.custom_crm_url;
      } else if (userData.rol === 'admin') {
        // Administradores van al dashboard principal
        redirectUrl = '/dashboard';
      } else if (userData.rol === 'sales') {
        // Vendedores van directamente al CRM
        redirectUrl = '/notion-crm';
      } else {
        // Otros roles van al CRM por defecto
        redirectUrl = '/notion-crm';
      }
    }

    // Registrar conexión exitosa en logs
    await supabase
      .from('sync_logs')
      .insert({
        workspace_id: tokenData.workspace_id,
        operation_type: 'oauth_connected',
        status: 'success',
        details: {
          user_id: stateData.userId,
          workspace_name: tokenData.workspace_name,
          redirect_url: redirectUrl
        }
      });

    // Redirigir con éxito
    res.redirect(`${redirectUrl}?success=oauth_connected&workspace=${encodeURIComponent(tokenData.workspace_name || 'Notion')}`);

  } catch (error) {
    console.error('[Notion API] Error en OAuth callback:', error);
    res.redirect(`/notion-crm?error=callback_error`);
  }
});

/**
 * DELETE /api/notion/config
 * Elimina la configuración de Notion del usuario
 */
router.delete('/config', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { error } = await supabase
      .from('notion_pages_map')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      console.error('[Notion API] Error eliminando configuración:', error);
      return res.status(500).json({ 
        error: 'Error al eliminar configuración',
        code: 'DATABASE_ERROR' 
      });
    }

    res.json({ 
      success: true,
      message: 'Configuración eliminada exitosamente'
    });

  } catch (error) {
    console.error('[Notion API] Error en DELETE /config:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR' 
    });
  }
});

/**
 * GET /api/notion/connection/status
 * Verifica el estado de conexión con Notion del usuario
 */
router.get('/connection/status', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Verificar workspace activo
    const { data: workspace, error } = await supabase
      .from('notion_workspaces')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !workspace) {
      return res.json({
        success: true,
        connected: false,
        message: 'No hay conexión activa con Notion'
      });
    }

    // Realizar health check
    try {
      const healthCheck = await notionService.checkHealth(userId);
      
      return res.json({
        success: true,
        connected: true,
        healthy: healthCheck.status === 'healthy',
        workspace: {
          id: workspace.workspace_id,
          name: workspace.workspace_name,
          url: workspace.workspace_url
        },
        lastCheck: healthCheck.lastCheck,
        responseTime: healthCheck.responseTime,
        error: healthCheck.error
      });
    } catch (healthError) {
      return res.json({
        success: true,
        connected: true,
        healthy: false,
        workspace: {
          id: workspace.workspace_id,
          name: workspace.workspace_name,
          url: workspace.workspace_url
        },
        error: healthError instanceof Error ? healthError.message : 'Health check falló'
      });
    }
  } catch (error) {
    console.error('[Notion API] Error verificando estado:', error);
    res.status(500).json({
      error: 'Error verificando estado de conexión',
      code: 'CONNECTION_STATUS_ERROR'
    });
  }
});

/**
 * POST /api/notion/connection/auto-connect
 * Intenta conectar automáticamente usando configuración existente
 */
router.post('/connection/auto-connect', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Buscar configuración existente
    const { data: existingConfig, error: configError } = await supabase
      .from('notion_workspaces')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (configError || !existingConfig) {
      return res.status(404).json({
        error: 'No se encontró configuración previa',
        code: 'NO_PREVIOUS_CONFIG',
        details: 'Inicia el flujo OAuth para conectar por primera vez'
      });
    }

    // Verificar si el token sigue siendo válido
    try {
      const healthCheck = await notionService.checkHealth(userId);
      
      if (healthCheck.status === 'healthy') {
        // Activar la configuración existente
        await supabase
          .from('notion_workspaces')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', existingConfig.id);

        return res.json({
          success: true,
          message: 'Conexión automática exitosa',
          workspace: {
            id: existingConfig.workspace_id,
            name: existingConfig.workspace_name,
            url: existingConfig.workspace_url
          }
        });
      } else {
        return res.status(401).json({
          error: 'Token expirado o inválido',
          code: 'TOKEN_EXPIRED',
          details: 'Requiere nueva autenticación OAuth'
        });
      }
    } catch (error) {
      return res.status(401).json({
        error: 'Error verificando conexión',
        code: 'CONNECTION_FAILED',
        details: error instanceof Error ? error.message : 'Conexión no válida'
      });
    }
  } catch (error) {
    console.error('[Notion API] Error en auto-connect:', error);
    res.status(500).json({
      error: 'Error en conexión automática',
      code: 'AUTO_CONNECT_ERROR'
    });
  }
});

/**
 * POST /api/notion/sync/trigger
 * Dispara sincronización manual de datos
 */
router.post('/sync/trigger', authenticateUser, requireNotionConnection, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { syncType = 'full' } = req.body; // 'full', 'contacts', 'deals', 'tasks'

    // Registrar inicio de sincronización
    const syncId = crypto.randomUUID();
    await supabase
      .from('sync_logs')
      .insert({
        workspace_id: (await supabase.from('notion_workspaces').select('workspace_id').eq('user_id', userId).single()).data?.workspace_id,
        operation_type: `sync_${syncType}`,
        status: 'started',
        details: { syncId, syncType, triggeredBy: 'manual' }
      });

    // Ejecutar sincronización según el tipo
    let result;
    try {
      switch (syncType) {
        case 'contacts':
          result = await notionService.getContacts(userId);
          break;
        case 'deals':
          result = await notionService.getDeals(userId);
          break;
        case 'tasks':
          result = await notionService.getTasks(userId);
          break;
        case 'full':
        default:
          const [contacts, deals, tasks] = await Promise.all([
            notionService.getContacts(userId),
            notionService.getDeals(userId),
            notionService.getTasks(userId)
          ]);
          result = { contacts, deals, tasks };
          break;
      }

      // Registrar éxito
      await supabase
        .from('sync_logs')
        .insert({
          workspace_id: (await supabase.from('notion_workspaces').select('workspace_id').eq('user_id', userId).single()).data?.workspace_id,
          operation_type: `sync_${syncType}`,
          status: 'success',
          details: { syncId, result: Array.isArray(result) ? { count: result.length } : result }
        });

      res.json({
        success: true,
        message: 'Sincronización completada',
        syncId,
        syncType,
        result
      });
    } catch (syncError) {
      // Registrar error
      await supabase
        .from('sync_errors')
        .insert({
          workspace_id: (await supabase.from('notion_workspaces').select('workspace_id').eq('user_id', userId).single()).data?.workspace_id,
          error_type: 'sync_error',
          error_message: syncError instanceof Error ? syncError.message : 'Error de sincronización',
          context: { syncId, syncType }
        });

      throw syncError;
    }
  } catch (error) {
    console.error('[Notion API] Error en sincronización:', error);
    res.status(500).json({
      error: 'Error durante la sincronización',
      code: 'SYNC_ERROR',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/notion/health
 * Endpoint de salud para verificar el estado del servicio
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true,
    service: 'notion-api',
    timestamp: new Date().toISOString(),
    oauth_enabled: !!(NOTION_CLIENT_ID && NOTION_CLIENT_SECRET && NOTION_REDIRECT_URI),
    cache_stats: notionService.getCacheStats()
  });
});

/**
 * POST /api/notion/redirect/configure
 * Configura URL de redirección personalizada para el usuario
 */
router.post('/redirect/configure', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { customUrl, resetToDefault } = req.body;

    // Validar URL si se proporciona
    if (customUrl && !customUrl.startsWith('/')) {
      return res.status(400).json({
        error: 'URL debe comenzar con /',
        code: 'INVALID_URL'
      });
    }

    // Obtener configuración actual del usuario
    const { data: currentUser, error: getUserError } = await supabase
      .from('usuarios')
      .select('configuracion')
      .eq('id', userId)
      .single();

    if (getUserError) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Actualizar configuración
    const currentConfig = currentUser.configuracion || {};
    const newConfig = {
      ...currentConfig,
      custom_crm_url: resetToDefault ? null : customUrl
    };

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ configuracion: newConfig })
      .eq('id', userId);

    if (updateError) {
      console.error('[Notion API] Error actualizando configuración:', updateError);
      return res.status(500).json({
        error: 'Error actualizando configuración',
        code: 'UPDATE_ERROR'
      });
    }

    res.json({
      success: true,
      message: resetToDefault ? 'Redirección restablecida a default' : 'URL de redirección configurada',
      customUrl: resetToDefault ? null : customUrl
    });

  } catch (error) {
    console.error('[Notion API] Error configurando redirección:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/notion/health/:userId
 * Health check específico para un usuario
 */
router.get('/health/:userId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    
    // Verificar que el usuario autenticado puede acceder a este health check
    if (req.user!.id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        code: 'FORBIDDEN'
      });
    }

    const healthCheck = await notionService.checkHealth(userId);
    res.json({
      success: true,
      ...healthCheck
    });
  } catch (error) {
    console.error('[Notion API] Error en health check:', error);
    res.status(500).json({
      error: 'Error en health check',
      code: 'HEALTH_CHECK_ERROR',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;