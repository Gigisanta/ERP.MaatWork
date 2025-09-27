import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import crypto from 'crypto';

const router = Router();

// Configuración OAuth de Notion
const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI || 'http://localhost:5173/api/auth/notion/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Función para cifrar tokens
function encryptToken(token: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

// Función para descifrar tokens
function decryptToken(encryptedToken: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const [ivHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipher(algorithm, key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Iniciar flujo OAuth de Notion
router.get('/notion/connect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Generar state para seguridad OAuth
    const state = crypto.randomBytes(32).toString('hex');
    
    // Guardar state en la sesión del usuario
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        preference_key: 'oauth_state',
        preference_value: state,
        updated_at: new Date().toISOString()
      });

    // Construir URL de autorización de Notion
    const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
    authUrl.searchParams.set('client_id', NOTION_CLIENT_ID || '');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('owner', 'user');
    authUrl.searchParams.set('redirect_uri', NOTION_REDIRECT_URI);
    authUrl.searchParams.set('state', state);

    res.json({ 
      authUrl: authUrl.toString(),
      state 
    });

  } catch (error) {
    console.error('Error iniciando OAuth:', error);
    res.status(500).json({ 
      error: 'Error iniciando conexión con Notion',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Callback OAuth de Notion
router.get('/notion/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Error OAuth de Notion:', error);
      return res.redirect(`${FRONTEND_URL}/crm?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${FRONTEND_URL}/crm?error=missing_params`);
    }

    // Verificar state para prevenir CSRF
    const { data: stateData } = await supabase
      .from('user_preferences')
      .select('user_id')
      .eq('preference_key', 'oauth_state')
      .eq('preference_value', state as string)
      .single();

    if (!stateData) {
      return res.redirect(`${FRONTEND_URL}/crm?error=invalid_state`);
    }

    const userId = stateData.user_id;

    // Intercambiar código por token de acceso
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: NOTION_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Error obteniendo token:', errorData);
      return res.redirect(`${FRONTEND_URL}/crm?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, workspace_name, workspace_icon, workspace_id, bot_id } = tokenData;

    // Cifrar el token antes de guardarlo
    const encryptedToken = encryptToken(access_token);

    // Guardar workspace en la base de datos
    const { error: insertError } = await supabase
      .from('notion_workspaces')
      .upsert({
        user_id: userId,
        workspace_id: workspace_id,
        workspace_name: workspace_name || 'Workspace Principal',
        workspace_icon: workspace_icon || '🏢',
        access_token: encryptedToken,
        bot_id: bot_id,
        is_active: true,
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error guardando workspace:', insertError);
      return res.redirect(`${FRONTEND_URL}/crm?error=save_failed`);
    }

    // Limpiar state usado
    await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('preference_key', 'oauth_state');

    // Registrar conexión exitosa
    await supabase
      .from('connection_health')
      .insert({
        user_id: userId,
        workspace_id: workspace_id,
        status: 'healthy',
        last_check: new Date().toISOString(),
        response_time: 0,
        details: { connection_type: 'oauth_success' }
      });

    // Redireccionar al CRM con éxito
    res.redirect(`${FRONTEND_URL}/crm?connected=true`);

  } catch (error) {
    console.error('Error en callback OAuth:', error);
    res.redirect(`${FRONTEND_URL}/crm?error=callback_failed`);
  }
});

// Verificar conexión automática
router.post('/notion/auto-connect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Buscar workspace activo del usuario
    const { data: workspace, error: workspaceError } = await supabase
      .from('notion_workspaces')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (workspaceError || !workspace) {
      return res.status(404).json({ 
        error: 'No hay conexión previa con Notion',
        code: 'NO_PREVIOUS_CONFIG'
      });
    }

    try {
      // Descifrar token y verificar validez
      const decryptedToken = decryptToken(workspace.access_token);
      
      // Probar conexión con Notion
      const testResponse = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${decryptedToken}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (!testResponse.ok) {
        if (testResponse.status === 401) {
          // Token expirado, marcar workspace como inactivo
          await supabase
            .from('notion_workspaces')
            .update({ is_active: false })
            .eq('id', workspace.id);

          return res.status(401).json({ 
            error: 'Token de Notion expirado',
            code: 'TOKEN_EXPIRED'
          });
        }
        throw new Error(`Error de conexión: ${testResponse.status}`);
      }

      const userData = await testResponse.json();

      // Actualizar estado de salud de la conexión
      await supabase
        .from('connection_health')
        .upsert({
          user_id: userId,
          workspace_id: workspace.workspace_id,
          status: 'healthy',
          last_check: new Date().toISOString(),
          response_time: 200,
          details: { auto_connect: true, user_info: userData }
        });

      res.json({
        success: true,
        connected: true,
        workspace: {
          id: workspace.workspace_id,
          name: workspace.workspace_name,
          icon: workspace.workspace_icon
        },
        user: userData
      });

    } catch (tokenError) {
      console.error('Error verificando token:', tokenError);
      
      // Marcar workspace como inactivo
      await supabase
        .from('notion_workspaces')
        .update({ is_active: false })
        .eq('id', workspace.id);

      res.status(401).json({ 
        error: 'Error verificando conexión con Notion',
        code: 'TOKEN_INVALID'
      });
    }

  } catch (error) {
    console.error('Error en auto-connect:', error);
    res.status(500).json({ 
      error: 'Error interno verificando conexión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Desconectar workspace
router.post('/notion/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Marcar todos los workspaces del usuario como inactivos
    const { error: updateError } = await supabase
      .from('notion_workspaces')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      throw updateError;
    }

    // Registrar desconexión
    await supabase
      .from('sync_logs')
      .insert({
        user_id: userId,
        workspace_id: 'disconnected',
        sync_type: 'disconnect',
        status: 'success',
        records_processed: 0,
        details: { action: 'user_disconnect' }
      });

    res.json({ 
      success: true,
      message: 'Desconectado de Notion exitosamente'
    });

  } catch (error) {
    console.error('Error desconectando:', error);
    res.status(500).json({ 
      error: 'Error desconectando de Notion',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;