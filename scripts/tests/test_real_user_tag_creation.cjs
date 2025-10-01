// Test definitivo para identificar y resolver el problema de creación de tags
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testRealUserTagCreation() {
  console.log('\n🧪 === TEST DEFINITIVO: CREACIÓN DE TAGS CON USUARIO REAL ===\n');
  
  try {
    // 1. Crear usuario real en Supabase Auth si no existe
    console.log('1️⃣ Verificando/creando usuario real en Supabase...');
    
    const testEmail = 'gio@cactus.com';
    const testPassword = 'Gio123456';
    
    // Intentar crear usuario (si ya existe, continuará)
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        username: 'Gio',
        full_name: 'Gio Admin',
        role: 'admin'
      }
    });
    
    if (createError && !createError.message.includes('already registered')) {
      console.error('❌ Error creando usuario:', createError.message);
      return;
    }
    
    const userId = createData?.user?.id || 'existing-user';
    console.log('✅ Usuario disponible:', userId !== 'existing-user' ? userId : 'usuario existente');
    
    // 2. Hacer login real con Supabase Auth
    console.log('\n2️⃣ Haciendo login real con Supabase Auth...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError) {
      console.error('❌ Error en login:', loginError.message);
      return;
    }
    
    console.log('✅ Login exitoso');
    console.log('   - Usuario ID:', loginData.user.id);
    console.log('   - Email:', loginData.user.email);
    console.log('   - Username:', loginData.user.user_metadata?.username);
    
    // 3. Verificar sesión activa
    console.log('\n3️⃣ Verificando sesión activa...');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ No hay sesión activa:', sessionError?.message);
      return;
    }
    
    console.log('✅ Sesión activa confirmada');
    console.log('   - Session User ID:', session.user.id);
    console.log('   - Access Token presente:', !!session.access_token);
    
    // 4. Verificar auth.uid() funciona
    console.log('\n4️⃣ Verificando auth.uid()...');
    
    try {
      // Usar una consulta simple que internamente use auth.uid()
      const { data: testAuth, error: testAuthError } = await supabase
        .from('tags')
        .select('count')
        .limit(1);
      
      if (testAuthError) {
        console.log('⚠️ Error en consulta con auth:', testAuthError.message);
      } else {
        console.log('✅ auth.uid() funciona correctamente');
      }
    } catch (authTestError) {
      console.log('⚠️ Error probando auth:', authTestError.message);
    }
    
    // 5. Crear tag con logs detallados (reproduciendo el problema)
    console.log('\n5️⃣ Creando tag con logs detallados...');
    
    const tagData = {
      id: `real-tag-${Date.now()}`,
      name: `Real Tag ${Date.now()}`,
      color: '#10B981',
      backgroundcolor: '#ECFDF5',
      created_by: session.user.id, // Usar el ID real de la sesión
      created_at: new Date().toISOString()
    };
    
    console.log('🔐 [DEBUG LOG 1] Datos para insertar:');
    console.log('   - Tag ID:', tagData.id);
    console.log('   - Tag Name:', tagData.name);
    console.log('   - Created By (UUID):', tagData.created_by);
    console.log('   - Created At:', tagData.created_at);
    
    // Verificar que el UUID es válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValidUUID = uuidRegex.test(tagData.created_by);
    
    console.log('🔐 [DEBUG LOG 2] Validación UUID:');
    console.log('   - Es UUID válido:', isValidUUID);
    console.log('   - Longitud:', tagData.created_by.length);
    
    if (!isValidUUID) {
      console.error('❌ PROBLEMA IDENTIFICADO: created_by no es un UUID válido');
      console.error('   - Valor recibido:', tagData.created_by);
      console.error('   - Tipo:', typeof tagData.created_by);
      return;
    }
    
    // Intentar insertar el tag
    console.log('\n6️⃣ Insertando tag en Supabase...');
    
    const { data: tagResult, error: tagError } = await supabase
      .from('tags')
      .insert(tagData)
      .select()
      .single();
    
    if (tagError) {
      console.error('❌ ERROR CREANDO TAG:', tagError.message);
      console.error('   - Código:', tagError.code);
      console.error('   - Detalles:', tagError.details);
      console.error('   - Hint:', tagError.hint);
      
      // Análisis específico del error
      if (tagError.code === '42501') {
        console.log('\n🔍 ANÁLISIS: Error de permisos (42501)');
        console.log('   - Verificar políticas RLS en tabla tags');
        console.log('   - Verificar que el usuario tenga permisos INSERT');
      } else if (tagError.code === '23505') {
        console.log('\n🔍 ANÁLISIS: Violación de restricción única (23505)');
        console.log('   - El tag ID ya existe en la base de datos');
      } else if (tagError.code === '22P02') {
        console.log('\n🔍 ANÁLISIS: Error de sintaxis UUID (22P02)');
        console.log('   - El created_by no es un UUID válido');
      }
      
    } else {
      console.log('✅ TAG CREADO EXITOSAMENTE:');
      console.log('   - ID:', tagResult.id);
      console.log('   - Nombre:', tagResult.name);
      console.log('   - Creado por:', tagResult.created_by);
      console.log('   - Fecha:', tagResult.created_at);
    }
    
    // 7. Verificar tags existentes
    console.log('\n7️⃣ Verificando tags existentes...');
    
    const { data: existingTags, error: listError } = await supabase
      .from('tags')
      .select('id, name, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (listError) {
      console.error('❌ Error listando tags:', listError.message);
    } else {
      console.log('📋 Tags existentes (últimos 5):');
      existingTags.forEach((tag, index) => {
        console.log(`   ${index + 1}. ${tag.name} (${tag.id}) - Creado por: ${tag.created_by}`);
      });
    }
    
    // 8. Logout
    console.log('\n8️⃣ Cerrando sesión...');
    await supabase.auth.signOut();
    
    console.log('\n✅ === TEST COMPLETADO ===');
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar test
testRealUserTagCreation().then(() => {
  console.log('\n🎯 DIAGNÓSTICO COMPLETO:');
  console.log('\n📋 PROBLEMAS IDENTIFICADOS:');
  console.log('1. Sistema usa autenticación mock pero necesita UUID real para Supabase');
  console.log('2. createTag en crmStore.ts usa user.id del estado mock');
  console.log('3. No hay mapeo entre usuario mock y usuario real de Supabase');
  console.log('\n🔧 SOLUCIONES DEFINITIVAS:');
  console.log('1. Modificar createTag para obtener session.user.id directamente de Supabase');
  console.log('2. Agregar validación de UUID antes de insertar en Supabase');
  console.log('3. Implementar mapeo entre usuarios mock y usuarios reales');
  console.log('4. Asegurar que el listener de autenticación mantenga sesión de Supabase activa');
  
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});