// Script para probar la creación de etiquetas después de la corrección del listener de autenticación
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTagCreation() {
  console.log('🧪 INICIANDO PRUEBA DE CREACIÓN DE ETIQUETAS');
  
  try {
    // 1. Verificar estado de autenticación
    console.log('\n1️⃣ Verificando estado de autenticación...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error obteniendo sesión:', sessionError);
      return;
    }
    
    if (!session) {
      console.log('⚠️ No hay sesión activa. Intentando login...');
      
      // Intentar login con credenciales de prueba
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'gio@test.com',
        password: 'Gio123'
      });
      
      if (loginError) {
        console.error('❌ Error en login:', loginError);
        console.log('💡 Nota: Es posible que el usuario no exista en Supabase Auth');
        return;
      }
      
      console.log('✅ Login exitoso:', loginData.user?.id);
    } else {
      console.log('✅ Sesión activa encontrada:', session.user.id);
    }
    
    // 2. Intentar crear una etiqueta
    console.log('\n2️⃣ Intentando crear etiqueta...');
    const tagData = {
      name: `Test Tag ${Date.now()}`,
      color: '#3B82F6',
      backgroundcolor: '#EFF6FF',
      created_by: session?.user?.id || 'test-user-id'
    };
    
    const { data: tagResult, error: tagError } = await supabase
      .from('tags')
      .insert(tagData)
      .select()
      .single();
    
    if (tagError) {
      console.error('❌ Error creando etiqueta:', tagError);
      console.log('📋 Detalles del error:', {
        code: tagError.code,
        message: tagError.message,
        details: tagError.details,
        hint: tagError.hint
      });
    } else {
      console.log('✅ Etiqueta creada exitosamente:', tagResult);
    }
    
    // 3. Verificar políticas RLS
    console.log('\n3️⃣ Verificando permisos de la tabla tags...');
    const { data: permissions, error: permError } = await supabase
      .rpc('check_table_permissions', { table_name: 'tags' })
      .single();
    
    if (permError) {
      console.log('⚠️ No se pudo verificar permisos (función RPC no disponible):', permError.message);
    } else {
      console.log('📋 Permisos de tabla:', permissions);
    }
    
  } catch (error) {
    console.error('💥 Error general en la prueba:', error);
  }
}

// Ejecutar la prueba
testTagCreation();

console.log('\n📖 INSTRUCCIONES:');
console.log('1. Ejecutar este script: node test_tags_creation.js');
console.log('2. Verificar que el listener de autenticación esté funcionando');
console.log('3. Probar creación de etiquetas desde la interfaz web');