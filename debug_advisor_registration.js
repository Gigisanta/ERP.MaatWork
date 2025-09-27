// Script de debug para identificar problemas en el registro de advisors
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (usar las mismas credenciales que en el proyecto)
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Datos de prueba para advisor
const testAdvisorData = {
  fullName: 'Test Advisor Debug',
  username: 'testadvisor_debug',
  email: 'testadvisor@gmail.com',
  phone: '+1234567890',
  role: 'advisor',
  password: 'TestPassword123!'
};

async function debugAdvisorRegistration() {
  console.log('🔍 Iniciando debug del registro de advisor...');
  console.log('📋 Datos de prueba:', testAdvisorData);
  
  try {
    // Paso 1: Verificar conexión con Supabase
    console.log('\n1️⃣ Verificando conexión con Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error('❌ Error de conexión con Supabase:', healthError);
      return;
    }
    console.log('✅ Conexión con Supabase exitosa');
    
    // Paso 2: Verificar si el usuario ya existe
    console.log('\n2️⃣ Verificando si el usuario ya existe...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testAdvisorData.email);
    
    if (checkError) {
      console.error('❌ Error al verificar usuario existente:', checkError);
      return;
    }
    
    if (existingUser && existingUser.length > 0) {
      console.log('⚠️ Usuario ya existe:', existingUser[0]);
      // Limpiar usuario de prueba si existe
      console.log('🧹 Limpiando usuario de prueba existente...');
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser[0].id);
      if (deleteError) {
        console.error('❌ Error al eliminar usuario existente:', deleteError);
      }
    } else {
      console.log('✅ Usuario no existe, procediendo con el registro');
    }
    
    // Paso 3: Intentar crear usuario en Supabase Auth
    console.log('\n3️⃣ Creando usuario en Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testAdvisorData.email,
      password: testAdvisorData.password,
      options: {
        data: {
          full_name: testAdvisorData.fullName,
          username: testAdvisorData.username,
          role: testAdvisorData.role
        }
      }
    });
    
    if (authError) {
      console.error('❌ Error en Supabase Auth:', authError);
      console.error('📝 Detalles del error:', {
        message: authError.message,
        status: authError.status,
        statusText: authError.statusText
      });
      return;
    }
    
    console.log('✅ Usuario creado en Auth:', authData.user?.id);
    
    // Paso 4: Intentar crear perfil de usuario
    console.log('\n4️⃣ Creando perfil de usuario...');
    const userProfile = {
      id: authData.user.id,
      full_name: testAdvisorData.fullName,
      email: testAdvisorData.email,
      phone: testAdvisorData.phone,
      role: testAdvisorData.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert([userProfile])
      .select();
    
    if (profileError) {
      console.error('❌ Error al crear perfil:', profileError);
      console.error('📝 Detalles del error:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint
      });
      return;
    }
    
    console.log('✅ Perfil creado exitosamente:', profileData[0]);
    
    // Paso 5: Verificar políticas RLS
    console.log('\n5️⃣ Verificando políticas RLS...');
    const { data: rlsCheck, error: rlsError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id);
    
    if (rlsError) {
      console.error('❌ Error en políticas RLS:', rlsError);
      return;
    }
    
    console.log('✅ Políticas RLS funcionando correctamente');
    
    console.log('\n🎉 ¡Registro de advisor completado exitosamente!');
    
  } catch (error) {
    console.error('💥 Error inesperado:', error);
    console.error('📊 Stack trace:', error.stack);
  }
}

// Función para limpiar datos de prueba
async function cleanupTestData() {
  console.log('🧹 Limpiando datos de prueba...');
  
  try {
    const { data: testUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testAdvisorData.email);
    
    if (findError) {
      console.error('❌ Error al buscar usuario de prueba:', findError);
      return;
    }
    
    if (testUser && testUser.length > 0) {
      // Eliminar de Auth
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(testUser[0].id);
      if (authDeleteError) {
        console.error('❌ Error al eliminar de Auth:', authDeleteError);
      }
      
      // Eliminar perfil
      const { error: profileDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', testUser[0].id);
      
      if (profileDeleteError) {
        console.error('❌ Error al eliminar perfil:', profileDeleteError);
      } else {
        console.log('✅ Datos de prueba eliminados');
      }
    }
  } catch (error) {
    console.error('💥 Error al limpiar:', error);
  }
}

// Ejecutar debug
if (process.argv.includes('--cleanup')) {
  cleanupTestData();
} else {
  debugAdvisorRegistration();
}

export { debugAdvisorRegistration, cleanupTestData };