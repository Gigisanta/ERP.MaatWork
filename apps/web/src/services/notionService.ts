// Servicio para manejo de datos de Notion CRM
// Fecha: 2024-01-20

import { supabase } from '@cactus/database';
import {
  NotionWorkspace,
  NotionContact,
  OAuthState,
  UserConfiguration,
  NotionPageMap,
  CreateNotionPageMap,
  UpdateNotionPageMap,
  NotionUserConfigResponse,
  NotionOAuthApiResponse,
  NotionCRMError,
  NotionErrorCodes,
  NotionValidators,
  NOTION_CONSTANTS
} from '../types/notion';

/**
 * Servicio principal para manejo de Notion CRM
 */
export class NotionService {
  private static instance: NotionService;
  private fallbackUrl: string;

  private constructor() {
    this.fallbackUrl = import.meta.env.VITE_NOTION_CRM_FALLBACK_URL || 'https://giolivosantarelli.notion.site/CRM-Dashboard-27296d1d68a3800e9860d8d8bc746181';
    
    if (!import.meta.env.VITE_NOTION_CRM_FALLBACK_URL) {
      console.warn('[NotionService] VITE_NOTION_CRM_FALLBACK_URL no configurada, usando URL por defecto');
    }
  }

  /**
   * Singleton instance
   */
  public static getInstance(): NotionService {
    if (!NotionService.instance) {
      NotionService.instance = new NotionService();
    }
    return NotionService.instance;
  }

  /**
   * Obtiene la configuración de Notion para el usuario actual
   */
  public async getUserNotionConfig(): Promise<NotionUserConfigResponse> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new NotionCRMError(
          'Usuario no autenticado',
          NotionErrorCodes.UNAUTHORIZED
        );
      }

      const { data, error } = await supabase
        .from('notion_pages_map')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new NotionCRMError(
          'Error al obtener configuración de Notion',
          NotionErrorCodes.API_ERROR,
          error
        );
      }

      if (!data) {
        return {
          success: true,
          fallback_url: this.fallbackUrl,
          message: 'No hay configuración personalizada, usando fallback'
        };
      }

      return {
        success: true,
        data: data as NotionPageMap,
        fallback_url: this.fallbackUrl
      };

    } catch (error) {
      console.error('[NotionService] Error en getUserNotionConfig:', error);
      
      if (error instanceof NotionCRMError) {
        throw error;
      }
      
      throw new NotionCRMError(
        'Error interno del servidor',
        NotionErrorCodes.API_ERROR,
        error
      );
    }
  }

  /**
   * Crea o actualiza la configuración de Notion para el usuario
   */
  public async upsertUserNotionConfig(
    config: CreateNotionPageMap
  ): Promise<NotionPageMap> {
    try {
      // Validar URL de Notion
      if (!NotionValidators.isValidNotionUrl(config.notion_page_url)) {
        throw new NotionCRMError(
          'URL de Notion inválida',
          NotionErrorCodes.INVALID_URL
        );
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new NotionCRMError(
          'Usuario no autenticado',
          NotionErrorCodes.UNAUTHORIZED
        );
      }

      const upsertData = {
        user_id: user.id,
        workspace_id: config.notion_workspace_id || 'default',
        workspace_name: 'Workspace',
        access_token: config.encrypted_access_token || '',
        is_active: true,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('notion_pages_map')
        .upsert(upsertData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        throw new NotionCRMError(
          'Error al guardar configuración de Notion',
          NotionErrorCodes.API_ERROR,
          error
        );
      }

      return data as NotionPageMap;

    } catch (error) {
      console.error('[NotionService] Error en upsertUserNotionConfig:', error);
      
      if (error instanceof NotionCRMError) {
        throw error;
      }
      
      throw new NotionCRMError(
        'Error interno del servidor',
        NotionErrorCodes.API_ERROR,
        error
      );
    }
  }

  /**
   * Actualiza parcialmente la configuración de Notion
   */
  public async updateUserNotionConfig(
    updates: UpdateNotionPageMap
  ): Promise<NotionPageMap> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new NotionCRMError(
          'Usuario no autenticado',
          NotionErrorCodes.UNAUTHORIZED
        );
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('notion_pages_map')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotionCRMError(
            'Configuración de Notion no encontrada',
            NotionErrorCodes.NOT_FOUND
          );
        }
        
        throw new NotionCRMError(
          'Error al actualizar configuración de Notion',
          NotionErrorCodes.API_ERROR,
          error
        );
      }

      return data as NotionPageMap;

    } catch (error) {
      console.error('[NotionService] Error en updateUserNotionConfig:', error);
      
      if (error instanceof NotionCRMError) {
        throw error;
      }
      
      throw new NotionCRMError(
        'Error interno del servidor',
        NotionErrorCodes.API_ERROR,
        error
      );
    }
  }

  /**
   * Elimina la configuración de Notion del usuario
   */
  public async deleteUserNotionConfig(): Promise<void> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new NotionCRMError(
          'Usuario no autenticado',
          NotionErrorCodes.UNAUTHORIZED
        );
      }

      const { error } = await supabase
        .from('notion_pages_map')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw new NotionCRMError(
          'Error al eliminar configuración de Notion',
          NotionErrorCodes.API_ERROR,
          error
        );
      }

    } catch (error) {
      console.error('[NotionService] Error en deleteUserNotionConfig:', error);
      
      if (error instanceof NotionCRMError) {
        throw error;
      }
      
      throw new NotionCRMError(
        'Error interno del servidor',
        NotionErrorCodes.API_ERROR,
        error
      );
    }
  }

  /**
   * Inicia el flujo OAuth de Notion
   */
  public async startOAuthFlow(returnUrl?: string): Promise<string> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new NotionCRMError(
          'Usuario no autenticado',
          NotionErrorCodes.UNAUTHORIZED
        );
      }

      // Llamar a la API backend para iniciar OAuth
      const response = await fetch('/api/notion/oauth/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          return_url: returnUrl || window.location.href
        })
      });

      if (!response.ok) {
        throw new NotionCRMError(
          'Error al iniciar OAuth',
          NotionErrorCodes.OAUTH_FAILED
        );
      }

      const result: NotionOAuthApiResponse = await response.json();
      
      if (!result.success || !result.redirect_url) {
        throw new NotionCRMError(
          result.error || 'Error al generar URL de OAuth',
          NotionErrorCodes.OAUTH_FAILED
        );
      }

      return result.redirect_url;

    } catch (error) {
      console.error('[NotionService] Error en startOAuthFlow:', error);
      
      if (error instanceof NotionCRMError) {
        throw error;
      }
      
      throw new NotionCRMError(
        'Error interno del servidor',
        NotionErrorCodes.API_ERROR,
        error
      );
    }
  }

  /**
   * Obtiene la URL efectiva para mostrar (personalizada o fallback)
   */
  public async getEffectiveNotionUrl(): Promise<string> {
    try {
      const config = await this.getUserNotionConfig();
      
      if (config.data?.workspace_id) {
        // Construir URL basada en workspace_id o usar una URL por defecto
        return `https://notion.so/${config.data.workspace_id}`;
      }
      
      return this.fallbackUrl;
      
    } catch (error) {
      console.warn('[NotionService] Error al obtener URL, usando fallback:', error);
      return this.fallbackUrl;
    }
  }

  /**
   * Verifica si el usuario tiene configuración personalizada
   */
  public async hasCustomConfiguration(): Promise<boolean> {
    try {
      const config = await this.getUserNotionConfig();
      return !!config.data;
    } catch (error) {
      console.warn('[NotionService] Error al verificar configuración:', error);
      return false;
    }
  }

  /**
   * Obtiene la URL de fallback configurada
   */
  public getFallbackUrl(): string {
    return this.fallbackUrl;
  }

  /**
   * Valida si una URL de Notion es accesible
   */
  public async validateNotionUrl(url: string): Promise<boolean> {
    try {
      if (!NotionValidators.isValidNotionUrl(url)) {
        return false;
      }

      // Intentar hacer una petición HEAD para verificar accesibilidad
      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors' // Para evitar problemas de CORS
      });

      return true; // Si no hay error, la URL es válida
    } catch (error) {
      console.warn('[NotionService] URL no accesible:', url, error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const notionService = NotionService.getInstance();

// Exportar funciones de utilidad
export const notionUtils = {
  /**
   * Genera un estado seguro para OAuth
   */
  generateOAuthState: (userId: string, returnUrl?: string): string => {
    const state = {
      user_id: userId,
      return_url: returnUrl,
      timestamp: Date.now()
    };
    return btoa(JSON.stringify(state));
  },

  /**
   * Parsea y valida el estado de OAuth
   */
  parseOAuthState: (stateString: string): { user_id: string; return_url?: string; timestamp: number } | null => {
    try {
      const state = JSON.parse(atob(stateString));
      
      // Verificar que no haya expirado (10 minutos)
      if (Date.now() - state.timestamp > NOTION_CONSTANTS.OAUTH_STATE_EXPIRY) {
        return null;
      }
      
      return state;
    } catch (error) {
      console.error('[NotionUtils] Error al parsear estado OAuth:', error);
      return null;
    }
  },

  /**
   * Formatea una URL de Notion para embed
   */
  formatNotionUrlForEmbed: (url: string): string => {
    // Asegurar que la URL termine con ?embed=true para mejor compatibilidad
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}embed=true`;
  }
};