import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testRealAuth() {
  console.log('🧪 PRUEBA: Iniciando prueba de autenticación real...');
  
  try {
    // 1. Crear usuario de prueba usando service role
    console.log('👤 Creando usuario de prueba...');
    const testEmail = 'testuser@example.com';
    const testPassword = 'TestPassword123!';
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    if (createError && !createError.message.includes('already registered')) {
      console.error('❌ Error al crear usuario:', createError.message);
      return;
    }
    
    if (newUser?.user) {
      console.log('✅ Usuario creado exitosamente:', newUser.user.email);
    } else {
      console.log('ℹ️ Usuario ya existe, continuando con la prueba...');
    }
    
    // 2. Intentar login con el usuario de prueba
    console.log('🔐 Intentando login con usuario de prueba...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (authError) {
      console.error('❌ Error en login:', authError.message);
      return;
    }
    
    console.log('✅ Login exitoso:', authData.user.email);
    
    // 3. Verificar sesión
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ No se pudo establecer la sesión');
      return;
    }
    
    console.log('👤 Usuario autenticado:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role || 'authenticated'
    });
    
    // 4. Intentar crear una etiqueta
    console.log('🏷️ Intentando crear etiqueta...');
    const tagData = {
      name: `Etiqueta Prueba ${Date.now()}`,
      color: '#3B82F6',
      backgroundcolor: '#EFF6FF',
      created_by: session.user.id
    };
    
    const { data: newTag, error: tagError } = await supabase
      .from('tags')
      .insert([tagData])
      .select()
      .single();
    
    if (tagError) {
      console.error('❌ Error al crear etiqueta:', tagError);
      console.error('📋 Detalles del error:', {
        message: tagError.message,
        details: tagError.details,
        hint: tagError.hint,
        code: tagError.code
      });
      
      // Verificar permisos de la tabla
      console.log('🔍 Verificando permisos de la tabla tags...');
      const { data: permissions, error: permError } = await supabaseAdmin
        .from('information_schema.role_table_grants')
        .select('grantee, table_name, privilege_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'tags')
        .in('grantee', ['anon', 'authenticated']);
      
      if (permError) {
        console.log('⚠️ No se pudieron obtener los permisos:', permError.message);
      } else {
        console.log('📋 Permisos actuales:', permissions);
      }
      
      return;
    }
    
    console.log('✅ Etiqueta creada exitosamente:', {
      id: newTag.id,
      name: newTag.name,
      created_by: newTag.created_by
    });
    
    // 5. Verificar que la etiqueta se guardó correctamente
    const { data: savedTag, error: fetchError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', newTag.id)
      .single();
    
    if (fetchError) {
      console.error('❌ Error al verificar etiqueta guardada:', fetchError);
    } else {
      console.log('✅ Etiqueta verificada en base de datos:', savedTag);
    }
    
    console.log('🎉 PRUEBA COMPLETADA: La autenticación real funciona correctamente');
    
  } catch (error) {
    console.error('💥 Error inesperado en la prueba:', error);
  }
}

// Ejecutar la prueba
testRealAuth().catch(console.error);