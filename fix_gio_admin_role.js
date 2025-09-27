import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixGioAdminRole() {
  console.log('🔧 Restaurando rol de admin para usuarios gio...');
  
  try {
    // IDs de los usuarios gio que necesitan ser admin
    const gioUsersToFix = [
      '28879afd-21c2-4877-b41d-775e987010cf', // gio@cactus.com
      '175f13d6-dd89-4e15-af28-f2020ed1e5d8'  // gio@test.com
    ];
    
    console.log('\n📝 Actualizando roles...');
    
    for (const userId of gioUsersToFix) {
      // Obtener información actual del usuario
      const { data: currentUser, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (getUserError) {
        console.error(`❌ Error obteniendo usuario ${userId}:`, getUserError);
        continue;
      }
      
      console.log(`\n👤 Usuario: ${currentUser.email} (${currentUser.full_name})`);
      console.log(`   Rol actual: ${currentUser.role}`);
      
      // Actualizar rol a admin
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          role: 'admin',
          updated_at: new Date().toISOString(),
          is_approved: true
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (updateError) {
        console.error(`❌ Error actualizando usuario ${userId}:`, updateError);
        continue;
      }
      
      console.log(`✅ Usuario actualizado exitosamente`);
      console.log(`   Nuevo rol: ${updatedUser.role}`);
      console.log(`   Aprobado: ${updatedUser.is_approved}`);
    }
    
    // Verificar los cambios
    console.log('\n🔍 Verificando cambios...');
    const { data: verifyUsers, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.%gio%,full_name.ilike.%gio%`);
    
    if (verifyError) {
      console.error('❌ Error verificando cambios:', verifyError);
      return;
    }
    
    console.log('\n📊 ESTADO FINAL DE USUARIOS GIO:');
    console.log('=================================');
    verifyUsers.forEach(user => {
      console.log(`${user.email} (${user.full_name}): ${user.role} - Aprobado: ${user.is_approved}`);
    });
    
    console.log('\n✅ Proceso completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

fixGioAdminRole();