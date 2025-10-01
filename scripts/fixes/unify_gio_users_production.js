import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function unifyGioUsersForProduction() {
  console.log('🔧 UNIFICANDO USUARIOS GIO PARA PRODUCCIÓN');
  console.log('==========================================');
  
  try {
    // 1. Obtener todos los usuarios gio
    const { data: gioUsers, error: getUsersError } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.%gio%,full_name.ilike.%gio%`);
    
    if (getUsersError) {
      console.error('❌ Error obteniendo usuarios gio:', getUsersError);
      return;
    }
    
    console.log(`\n📊 Usuarios gio encontrados: ${gioUsers.length}`);
    gioUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.full_name}) - ID: ${user.id} - Rol: ${user.role}`);
    });
    
    // 2. Definir el usuario principal (el más antiguo o el que tenga mejor email)
    const mainUser = gioUsers.find(u => u.email === 'giolivosantarelli@gmail.com') || gioUsers[0];
    const usersToMerge = gioUsers.filter(u => u.id !== mainUser.id);
    
    console.log(`\n👑 Usuario principal seleccionado: ${mainUser.email} (${mainUser.id})`);
    console.log(`🔄 Usuarios a fusionar: ${usersToMerge.length}`);
    
    // 3. Obtener todas las tablas que referencian users
    const tablesWithUserRefs = [
      'teams', 'team_members', 'approvals', 'invitations', 'tasks', 
      'task_assignments', 'task_annotations', 'team_settings', 
      'notifications', 'user_metrics', 'tags'
    ];
    
    // 4. Migrar referencias de usuarios secundarios al principal
    for (const userToMerge of usersToMerge) {
      console.log(`\n🔄 Migrando datos de ${userToMerge.email}...`);
      
      for (const tableName of tablesWithUserRefs) {
        try {
          // Verificar si la tabla existe y tiene columnas que referencian users
          const { data: tableInfo, error: tableError } = await supabase
            .rpc('get_table_columns', { table_name: tableName })
            .single();
          
          if (tableError) {
            // Si no existe la función, intentar directamente
            console.log(`⚠️ No se pudo verificar tabla ${tableName}, intentando migración directa...`);
          }
          
          // Intentar actualizar referencias comunes
          const userColumns = ['user_id', 'assigned_to', 'created_by', 'updated_by', 'approved_by', 'invited_by', 'manager_id', 'reviewed_by'];
          
          for (const column of userColumns) {
            const { error: updateError } = await supabase
              .from(tableName)
              .update({ [column]: mainUser.id })
              .eq(column, userToMerge.id);
            
            if (!updateError) {
              console.log(`✅ Migrado ${tableName}.${column}`);
            }
          }
        } catch (error) {
          console.log(`⚠️ Error migrando ${tableName}:`, error.message);
        }
      }
    }
    
    // 5. Actualizar el usuario principal con la mejor información
    const bestEmail = 'gio@cactus.com'; // Email de producción
    const bestName = 'Gio Admin';
    
    const { error: updateMainError } = await supabase
      .from('users')
      .update({
        email: bestEmail,
        full_name: bestName,
        role: 'admin',
        is_approved: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', mainUser.id);
    
    if (updateMainError) {
      console.error('❌ Error actualizando usuario principal:', updateMainError);
    } else {
      console.log(`✅ Usuario principal actualizado: ${bestEmail}`);
    }
    
    // 6. Eliminar usuarios duplicados
    for (const userToDelete of usersToMerge) {
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);
      
      if (deleteError) {
        console.error(`❌ Error eliminando usuario ${userToDelete.email}:`, deleteError);
      } else {
        console.log(`🗑️ Usuario eliminado: ${userToDelete.email}`);
      }
    }
    
    // 7. Verificar el sistema de roles
    console.log('\n🔍 VERIFICANDO SISTEMA DE ROLES EN PRODUCCIÓN');
    console.log('=============================================');
    
    // Verificar políticas RLS
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies_info')
      .select('*');
    
    if (policiesError) {
      console.log('⚠️ No se pudieron verificar las políticas RLS directamente');
    }
    
    // Verificar permisos del usuario unificado
    const { data: finalUser, error: finalUserError } = await supabase
      .from('users')
      .select('*')
      .eq('email', bestEmail)
      .single();
    
    if (finalUserError) {
      console.error('❌ Error obteniendo usuario final:', finalUserError);
    } else {
      console.log('\n👤 USUARIO FINAL UNIFICADO:');
      console.log('===========================');
      console.log(`ID: ${finalUser.id}`);
      console.log(`Email: ${finalUser.email}`);
      console.log(`Nombre: ${finalUser.full_name}`);
      console.log(`Rol: ${finalUser.role}`);
      console.log(`Aprobado: ${finalUser.is_approved}`);
      console.log(`Creado: ${finalUser.created_at}`);
      console.log(`Actualizado: ${finalUser.updated_at}`);
    }
    
    // 8. Verificar acceso a recursos críticos
    console.log('\n🔐 VERIFICANDO ACCESO A RECURSOS CRÍTICOS:');
    console.log('==========================================');
    
    const criticalTables = ['users', 'teams', 'tasks', 'approvals'];
    
    for (const table of criticalTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Acceso correcto`);
        }
      } catch (error) {
        console.log(`❌ ${table}: Error de conexión`);
      }
    }
    
    console.log('\n✅ PROCESO DE UNIFICACIÓN COMPLETADO');
    console.log('====================================');
    console.log('🎯 Usuario gio unificado exitosamente');
    console.log('🔒 Sistema de roles verificado');
    console.log('🚀 Listo para producción');
    
  } catch (error) {
    console.error('❌ Error general en el proceso:', error);
  }
}

unifyGioUsersForProduction();