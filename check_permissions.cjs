const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPermissions() {
  console.log('🔍 Verificando permisos y políticas de la tabla contacts...');
  
  try {
    // Verificar permisos
    const { data: permissions, error: permError } = await supabase
      .from('information_schema.role_table_grants')
      .select('grantee, table_name, privilege_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'contacts')
      .in('grantee', ['anon', 'authenticated']);
    
    if (permError) {
      console.log('❌ Error al verificar permisos:', permError.message);
    } else {
      console.log('✅ Permisos encontrados:', permissions);
    }
    
    // Verificar políticas RLS
    const { data: policies, error: polError } = await supabase
      .from('pg_policies')
      .select('policyname, permissive, roles, cmd')
      .eq('tablename', 'contacts');
    
    if (polError) {
      console.log('❌ Error al verificar políticas:', polError.message);
    } else {
      console.log('✅ Políticas encontradas:', policies);
    }
    
    // Probar creación de contacto con usuario autenticado
    console.log('\n🧪 Probando creación de contacto...');
    
    // Primero autenticar con un usuario mock
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'gio@cactus.com',
      password: 'Gio123'
    });
    
    if (authError) {
      console.log('⚠️  Error de autenticación:', authError.message);
      console.log('   Probando inserción directa con service role...');
      
      // Probar inserción directa
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .insert({
          name: 'Test Contact',
          email: 'test@example.com',
          phone: '+54 11 1234-5678',
          status: 'Prospecto',
          user_id: '550e8400-e29b-41d4-a716-446655440000' // ID del usuario Gio
        })
        .select();
      
      if (contactError) {
        console.log('❌ Error al crear contacto:', contactError.message);
        console.log('   Código:', contactError.code);
        console.log('   Detalles:', contactError.details);
      } else {
        console.log('✅ Contacto creado exitosamente:', contactData);
        
        // Limpiar el contacto de prueba
        await supabase
          .from('contacts')
          .delete()
          .eq('id', contactData[0].id);
        console.log('🧹 Contacto de prueba eliminado');
      }
    } else {
      console.log('✅ Autenticación exitosa:', authData.user.email);
      
      // Probar creación con usuario autenticado
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .insert({
          name: 'Test Contact Auth',
          email: 'testauth@example.com',
          phone: '+54 11 1234-5678',
          status: 'Prospecto',
          user_id: authData.user.id
        })
        .select();
      
      if (contactError) {
        console.log('❌ Error al crear contacto autenticado:', contactError.message);
      } else {
        console.log('✅ Contacto creado con usuario autenticado:', contactData);
        
        // Limpiar el contacto de prueba
        await supabase
          .from('contacts')
          .delete()
          .eq('id', contactData[0].id);
        console.log('🧹 Contacto de prueba eliminado');
      }
    }
    
  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

checkPermissions();