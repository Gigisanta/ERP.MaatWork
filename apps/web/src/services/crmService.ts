import { supabase } from '@cactus/database';
import { toast } from 'sonner';

// Tipos para el servicio CRM
export interface Contact {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  status: 'lead' | 'prospect' | 'client' | 'inactive';
  source?: string;
  notes?: string;
  tags?: string[];
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContactFilters {
  status?: string;
  source?: string;
  search?: string;
  user_id?: string;
  tags?: string[];
}

export interface ContactStats {
  total: number;
  leads: number;
  prospects: number;
  clients: number;
  inactive: number;
  recentlyAdded: number;
}

export interface CrmServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Servicio CRM mejorado con validaciones automáticas
 * Resuelve el problema crítico de creación de contactos
 */
class CrmService {
  /**
   * Valida que el usuario actual existe en public.users
   */
  private async validateCurrentUser(): Promise<CrmServiceResult<{ id: string; email: string }>> {
    try {
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser.user) {
        return {
          success: false,
          error: 'Usuario no autenticado',
          code: 'AUTH_ERROR'
        };
      }

      // Verificar que existe en public.users
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', authUser.user.id)
        .single();

      if (publicError || !publicUser) {
        // Intentar sincronizar automáticamente
        const syncResult = await this.syncCurrentUser();
        
        if (syncResult.success) {
          return {
            success: true,
            data: { id: authUser.user.id, email: authUser.user.email! }
          };
        }
        
        return {
          success: false,
          error: 'Usuario no sincronizado en la base de datos',
          code: 'USER_NOT_SYNCED'
        };
      }

      return {
        success: true,
        data: { id: publicUser.id, email: publicUser.email }
      };
      
    } catch (error) {
      console.error('Error validating user:', error);
      return {
        success: false,
        error: 'Error interno de validación',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Sincroniza el usuario actual de auth.users a public.users
   */
  private async syncCurrentUser(): Promise<CrmServiceResult> {
    try {
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser.user) {
        return {
          success: false,
          error: 'No hay usuario autenticado',
          code: 'AUTH_ERROR'
        };
      }

      const user = authUser.user;
      const userName = user.user_metadata?.name || 
                      user.user_metadata?.full_name || 
                      user.email?.split('@')[0] || 
                      'Usuario';

      // Insertar o actualizar usuario en public.users
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email!,
          name: userName,
          full_name: userName,
          role: 'advisor',
          is_approved: true,
          status: 'active',
          approved: true,
          active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        console.error('Error syncing user:', upsertError);
        return {
          success: false,
          error: 'Error al sincronizar usuario',
          code: 'SYNC_ERROR'
        };
      }

      return { success: true };
      
    } catch (error) {
      console.error('Error in syncCurrentUser:', error);
      return {
        success: false,
        error: 'Error interno de sincronización',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Crea un nuevo contacto con validaciones automáticas
   */
  async createContact(contactData: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<CrmServiceResult<Contact>> {
    try {
      // Validar usuario antes de crear contacto
      const userValidation = await this.validateCurrentUser();
      
      if (!userValidation.success) {
        toast.error(`Error de validación: ${userValidation.error}`);
        return {
          success: false,
          error: userValidation.error,
          code: userValidation.code
        };
      }

      // Validar datos del contacto
      if (!contactData.name || !contactData.email) {
        return {
          success: false,
          error: 'Nombre y email son requeridos',
          code: 'VALIDATION_ERROR'
        };
      }

      // Verificar email único
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', contactData.email)
        .eq('user_id', userValidation.data!.id)
        .single();

      if (existingContact) {
        return {
          success: false,
          error: 'Ya existe un contacto con este email',
          code: 'DUPLICATE_EMAIL'
        };
      }

      // Crear el contacto
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          ...contactData,
          user_id: userValidation.data!.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating contact:', createError);
        
        // Manejar errores específicos
        if (createError.code === '23503') {
          return {
            success: false,
            error: 'Error de referencia de usuario. Intente sincronizar su cuenta.',
            code: 'FOREIGN_KEY_ERROR'
          };
        }
        
        return {
          success: false,
          error: 'Error al crear el contacto',
          code: 'CREATE_ERROR'
        };
      }

      toast.success('Contacto creado exitosamente');
      return {
        success: true,
        data: newContact
      };
      
    } catch (error) {
      console.error('Error in createContact:', error);
      return {
        success: false,
        error: 'Error interno al crear contacto',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Obtiene todos los contactos del usuario actual
   */
  async getContacts(filters?: ContactFilters): Promise<CrmServiceResult<Contact[]>> {
    try {
      const userValidation = await this.validateCurrentUser();
      
      if (!userValidation.success) {
        return {
          success: false,
          error: userValidation.error,
          code: userValidation.code
        };
      }

      let query = supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userValidation.data!.id)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.source) {
        query = query.eq('source', filters.source);
      }
      
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
      }

      const { data: contacts, error } = await query;

      if (error) {
        console.error('Error fetching contacts:', error);
        return {
          success: false,
          error: 'Error al obtener contactos',
          code: 'FETCH_ERROR'
        };
      }

      return {
        success: true,
        data: contacts || []
      };
      
    } catch (error) {
      console.error('Error in getContacts:', error);
      return {
        success: false,
        error: 'Error interno al obtener contactos',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Actualiza un contacto existente
   */
  async updateContact(contactId: string, updates: Partial<Contact>): Promise<CrmServiceResult<Contact>> {
    try {
      const userValidation = await this.validateCurrentUser();
      
      if (!userValidation.success) {
        return {
          success: false,
          error: userValidation.error,
          code: userValidation.code
        };
      }

      // Verificar que el contacto pertenece al usuario
      const { data: existingContact, error: fetchError } = await supabase
        .from('contacts')
        .select('id, user_id')
        .eq('id', contactId)
        .eq('user_id', userValidation.data!.id)
        .single();

      if (fetchError || !existingContact) {
        return {
          success: false,
          error: 'Contacto no encontrado',
          code: 'NOT_FOUND'
        };
      }

      // Actualizar el contacto
      const { data: updatedContact, error: updateError } = await supabase
        .from('contacts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId)
        .eq('user_id', userValidation.data!.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating contact:', updateError);
        return {
          success: false,
          error: 'Error al actualizar contacto',
          code: 'UPDATE_ERROR'
        };
      }

      toast.success('Contacto actualizado exitosamente');
      return {
        success: true,
        data: updatedContact
      };
      
    } catch (error) {
      console.error('Error in updateContact:', error);
      return {
        success: false,
        error: 'Error interno al actualizar contacto',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Elimina un contacto
   */
  async deleteContact(contactId: string): Promise<CrmServiceResult> {
    try {
      const userValidation = await this.validateCurrentUser();
      
      if (!userValidation.success) {
        return {
          success: false,
          error: userValidation.error,
          code: userValidation.code
        };
      }

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', userValidation.data!.id);

      if (error) {
        console.error('Error deleting contact:', error);
        return {
          success: false,
          error: 'Error al eliminar contacto',
          code: 'DELETE_ERROR'
        };
      }

      toast.success('Contacto eliminado exitosamente');
      return { success: true };
      
    } catch (error) {
      console.error('Error in deleteContact:', error);
      return {
        success: false,
        error: 'Error interno al eliminar contacto',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Obtiene estadísticas de contactos
   */
  async getContactStats(): Promise<CrmServiceResult<ContactStats>> {
    try {
      const userValidation = await this.validateCurrentUser();
      
      if (!userValidation.success) {
        return {
          success: false,
          error: userValidation.error,
          code: userValidation.code
        };
      }

      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('status, created_at')
        .eq('user_id', userValidation.data!.id);

      if (error) {
        console.error('Error fetching contact stats:', error);
        return {
          success: false,
          error: 'Error al obtener estadísticas',
          code: 'STATS_ERROR'
        };
      }

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats: ContactStats = {
        total: contacts?.length || 0,
        leads: contacts?.filter(c => c.status === 'lead').length || 0,
        prospects: contacts?.filter(c => c.status === 'prospect').length || 0,
        clients: contacts?.filter(c => c.status === 'client').length || 0,
        inactive: contacts?.filter(c => c.status === 'inactive').length || 0,
        recentlyAdded: contacts?.filter(c => new Date(c.created_at) >= sevenDaysAgo).length || 0
      };

      return {
        success: true,
        data: stats
      };
      
    } catch (error) {
      console.error('Error in getContactStats:', error);
      return {
        success: false,
        error: 'Error interno al obtener estadísticas',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Fuerza la sincronización del usuario actual
   */
  async forceSyncUser(): Promise<CrmServiceResult> {
    const result = await this.syncCurrentUser();
    
    if (result.success) {
      toast.success('Usuario sincronizado correctamente');
    } else {
      toast.error(`Error de sincronización: ${result.error}`);
    }
    
    return result;
  }

  /**
   * Verifica el estado de sincronización del sistema
   */
  async checkSyncStatus(): Promise<CrmServiceResult<{ isSynced: boolean; message: string }>> {
    try {
      const userValidation = await this.validateCurrentUser();
      
      if (!userValidation.success) {
        return {
          success: true,
          data: {
            isSynced: false,
            message: `Usuario no sincronizado: ${userValidation.error}`
          }
        };
      }

      return {
        success: true,
        data: {
          isSynced: true,
          message: 'Sistema sincronizado correctamente'
        }
      };
      
    } catch (error) {
      console.error('Error checking sync status:', error);
      return {
        success: false,
        error: 'Error al verificar estado de sincronización',
        code: 'SYNC_CHECK_ERROR'
      };
    }
  }
}

// Exportar instancia singleton
export const crmService = new CrmService();
export default crmService;