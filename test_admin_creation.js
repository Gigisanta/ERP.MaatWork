// Script de prueba para verificar la creación del administrador inicial
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (usar las credenciales del proyecto)
const supabaseUrl = 'https://ywqjqjqjqjqjqjqj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cWpxanFqcWpxanFqcWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNTU2NzI5NCwiZXhwIjoyMDUxMTQzMjk0fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAdminCreation() {
  console.log('🧪 Iniciando prueba de creación de administrador inicial...');
  
  try {
    // 1. Verificar si existen administradores
    console.log('\n1️⃣ Verificando administradores existentes...');
    const { data: hasAdmins, error: rpcError } = await supabase.rpc('has_existing_admins');
    
    if (rpcError) {
      console.error('❌ Error ejecutando has_existing_admins():', rpcError);
      return;
    }
    
    console.log('✅ Función has_existing_admins() ejecutada correctamente');
    console.log('📊 Resultado:', hasAdmins ? 'SÍ existen admins' : 'NO existen admins');
    
    // 2. Verificar usuarios existentes en la tabla
    console.log('\n2️⃣ Consultando usuarios existentes...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, is_approved')
      .eq('role', 'admin');
    
    if (usersError) {
      console.error('❌ Error consultando usuarios:', usersError);
      return;
    }
    
    console.log('👥 Administradores encontrados:', users?.length || 0);
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} - Aprobado: ${user.is_approved}`);
      });
    }
    
    // 3. Probar inserción de admin si no existen
    if (!hasAdmins) {
      console.log('\n3️⃣ Probando inserción de administrador inicial...');
      
      const testAdminData = {
        id: '00000000-0000-0000-0000-000000000001', // UUID de prueba
        email: 'admin.test@cactus.com',
        full_name: 'Administrador de Prueba',
        role: 'admin',
        is_approved: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert(testAdminData)
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Error insertando admin de prueba:', insertError);
        console.error('   Código:', insertError.code);
        console.error('   Mensaje:', insertError.message);
        console.error('   Detalles:', insertError.details);
      } else {
        console.log('✅ Admin de prueba insertado correctamente:', insertData.email);
        
        // Limpiar el admin de prueba
        console.log('\n🧹 Limpiando admin de prueba...');
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', testAdminData.id);
        
        if (deleteError) {
          console.warn('⚠️ No se pudo eliminar el admin de prueba:', deleteError.message);
        } else {
          console.log('✅ Admin de prueba eliminado correctamente');
        }
      }
    } else {
      console.log('\n3️⃣ ⏭️ Saltando prueba de inserción (ya existen admins)');
    }
    
    console.log('\n🎉 Prueba completada exitosamente');
    
  } catch (error) {
    console.error('💥 Error general en la prueba:', error);
  }
}

// Ejecutar la prueba
testAdminCreation();