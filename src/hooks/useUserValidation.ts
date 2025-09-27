import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface UserValidationResult {
  isValid: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  } | null;
  error?: string;
}

interface UserSyncStatus {
  authUsers: number;
  publicUsers: number;
  orphanedContacts: number;
  isSynced: boolean;
}

/**
 * Hook para validación automática de usuarios y sincronización
 * Resuelve el problema crítico de creación de contactos
 */
export const useUserValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * Valida que un usuario existe tanto en auth.users como en public.users
   */
  const validateUser = useCallback(async (userId?: string): Promise<UserValidationResult> => {
    setIsValidating(true);
    
    try {
      // Si no se proporciona userId, usar el usuario actual
      const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!currentUserId) {
        return {
          isValid: false,
          user: null,
          error: 'No hay usuario autenticado'
        };
      }

      // Verificar usuario en auth.users
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser.user) {
        return {
          isValid: false,
          user: null,
          error: 'Usuario no encontrado en autenticación'
        };
      }

      // Verificar usuario en public.users
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('id, email, name, full_name, role')
        .eq('id', currentUserId)
        .single();

      if (publicError || !publicUser) {
        // Intentar sincronizar automáticamente
        const syncResult = await syncCurrentUser();
        
        if (syncResult.success) {
          // Reintentar la consulta después de la sincronización
          const { data: syncedUser } = await supabase
            .from('users')
            .select('id, email, name, full_name, role')
            .eq('id', currentUserId)
            .single();
            
          if (syncedUser) {
            return {
              isValid: true,
              user: {
                id: syncedUser.id,
                email: syncedUser.email,
                name: syncedUser.name || syncedUser.full_name,
                role: syncedUser.role
              }
            };
          }
        }
        
        return {
          isValid: false,
          user: null,
          error: 'Usuario no sincronizado en la base de datos'
        };
      }

      return {
        isValid: true,
        user: {
          id: publicUser.id,
          email: publicUser.email,
          name: publicUser.name || publicUser.full_name,
          role: publicUser.role
        }
      };
      
    } catch (error) {
      console.error('Error validating user:', error);
      return {
        isValid: false,
        user: null,
        error: 'Error interno de validación'
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Sincroniza el usuario actual de auth.users a public.users
   */
  const syncCurrentUser = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setIsSyncing(true);
    
    try {
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser.user) {
        return { success: false, error: 'No hay usuario autenticado' };
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
        return { success: false, error: 'Error al sincronizar usuario' };
      }

      toast.success('Usuario sincronizado correctamente');
      return { success: true };
      
    } catch (error) {
      console.error('Error in syncCurrentUser:', error);
      return { success: false, error: 'Error interno de sincronización' };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Obtiene el estado de sincronización del sistema
   */
  const getSyncStatus = useCallback(async (): Promise<UserSyncStatus | null> => {
    try {
      // Llamar a la función de validación en la base de datos
      const { data, error } = await supabase
        .rpc('check_sync_status');

      if (error) {
        console.error('Error getting sync status:', error);
        return null;
      }

      // Procesar los resultados
      const authUsers = data?.find((item: any) => item.item === 'auth_users')?.count_val || 0;
      const publicUsers = data?.find((item: any) => item.item === 'public_users')?.count_val || 0;
      const orphanedContacts = data?.find((item: any) => item.item === 'orphaned_contacts')?.count_val || 0;

      return {
        authUsers,
        publicUsers,
        orphanedContacts,
        isSynced: authUsers === publicUsers && orphanedContacts === 0
      };
      
    } catch (error) {
      console.error('Error in getSyncStatus:', error);
      return null;
    }
  }, []);

  /**
   * Valida antes de crear un contacto
   */
  const validateBeforeContactCreation = useCallback(async (): Promise<boolean> => {
    const validation = await validateUser();
    
    if (!validation.isValid) {
      toast.error(`Error de validación: ${validation.error}`);
      return false;
    }

    return true;
  }, [validateUser]);

  /**
   * Fuerza la sincronización completa del sistema
   */
  const forceSyncAll = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setIsSyncing(true);
    
    try {
      // Primero sincronizar el usuario actual
      const syncResult = await syncCurrentUser();
      
      if (!syncResult.success) {
        return { success: false, message: syncResult.error || 'Error al sincronizar' };
      }

      // Verificar el estado después de la sincronización
      const status = await getSyncStatus();
      
      if (status?.isSynced) {
        return { success: true, message: 'Sistema completamente sincronizado' };
      } else {
        return { 
          success: false, 
          message: `Sincronización parcial. Auth: ${status?.authUsers}, Public: ${status?.publicUsers}` 
        };
      }
      
    } catch (error) {
      console.error('Error in forceSyncAll:', error);
      return { success: false, message: 'Error interno durante la sincronización' };
    } finally {
      setIsSyncing(false);
    }
  }, [syncCurrentUser, getSyncStatus]);

  return {
    // Estados
    isValidating,
    isSyncing,
    
    // Funciones principales
    validateUser,
    syncCurrentUser,
    getSyncStatus,
    validateBeforeContactCreation,
    forceSyncAll
  };
};

export default useUserValidation;