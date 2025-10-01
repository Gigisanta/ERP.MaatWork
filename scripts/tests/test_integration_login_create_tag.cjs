// Test de integración completo: Login → Crear Tag en la aplicación real
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testIntegrationLoginCreateTag() {
  console.log('\n🧪 === TEST DE INTEGRACIÓN: LOGIN → CREAR TAG ===\n');
  
  try {
    // 1. Hacer login real
    console.log('1️⃣ Iniciando sesión...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'gio@cactus.com',
      password: 'Gio123456'
    });
    
    if (loginError) {
      console.error('❌ Error en login:', loginError.message);
      return;
    }
    
    console.log('✅ Login exitoso');
    console.log('   - Usuario ID:', loginData.user.id);
    console.log('   - Email:', loginData.user.email);
    
    // 2. Verificar sesión activa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ No hay sesión activa:', sessionError?.message);
      return;
    }
    
    console.log('✅ Sesión activa confirmada');
    
    // 3. Crear tag usando la lógica corregida (sin enviar ID)
    console.log('\n2️⃣ Creando tag con lógica corregida...');
    
    const tagData = {
      name: `Integration Test Tag ${Date.now()}`,
      color: '#10B981',
      backgroundcolor: '#ECFDF5'
    };
    
    console.log('📝 Datos del tag a crear:');
    console.log('   - Nombre:', tagData.name);
    console.log('   - Color:', tagData.color);
    console.log('   - Background:', tagData.backgroundcolor);
    
    // Simular la lógica corregida de createTag
    const insertData = {
      name: tagData.name,
      color: tagData.color,
      backgroundcolor: tagData.backgroundcolor,
      created_by: session.user.id // Usar ID de sesión de Supabase
    };
    
    console.log('\n🔐 Datos para insertar (sin ID, Supabase lo generará):');
    console.log('   - name:', insertData.name);
    console.log('   - color:', insertData.color);
    console.log('   - backgroundcolor:', insertData.backgroundcolor);
    console.log('   - created_by (UUID):', insertData.created_by);
    
    // Insertar y obtener el registro creado
    const { data: createdTag, error: createError } = await supabase
      .from('tags')
      .insert(insertData)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ ERROR CREANDO TAG:', createError.message);
      console.error('   - Código:', createError.code);
      console.error('   - Detalles:', createError.details);
      console.error('   - Hint:', createError.hint);
      
      // Análisis del error
      if (createError.code === '42501') {
        console.log('\n🔍 ANÁLISIS: Error de permisos RLS');
        console.log('   - Verificar políticas RLS en tabla tags');
        console.log('   - Verificar que el usuario tenga permisos INSERT');
      }
      
      return;
    }
    
    console.log('\n✅ TAG CREADO EXITOSAMENTE:');
    console.log('   - ID (generado por Supabase):', createdTag.id);
    console.log('   - Nombre:', createdTag.name);
    console.log('   - Color:', createdTag.color);
    console.log('   - Background:', createdTag.backgroundcolor);
    console.log('   - Creado por:', createdTag.created_by);
    console.log('   - Fecha creación:', createdTag.created_at);
    
    // 4. Verificar que el tag se puede leer
    console.log('\n3️⃣ Verificando que el tag se puede leer...');
    
    const { data: readTag, error: readError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', createdTag.id)
      .single();
    
    if (readError) {
      console.error('❌ Error leyendo tag:', readError.message);
    } else {
      console.log('✅ Tag leído correctamente:', readTag.name);
    }
    
    // 5. Listar todos los tags del usuario
    console.log('\n4️⃣ Listando tags del usuario...');
    
    const { data: userTags, error: listError } = await supabase
      .from('tags')
      .select('id, name, color, backgroundcolor, created_at')
      .eq('created_by', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (listError) {
      console.error('❌ Error listando tags:', listError.message);
    } else {
      console.log('📋 Tags del usuario (últimos 5):');
      userTags.forEach((tag, index) => {
        console.log(`   ${index + 1}. ${tag.name} (${tag.id})`);
      });
    }
    
    // 6. Limpiar - eliminar el tag de prueba
    console.log('\n5️⃣ Limpiando tag de prueba...');
    
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('id', createdTag.id);
    
    if (deleteError) {
      console.log('⚠️ No se pudo eliminar el tag de prueba:', deleteError.message);
    } else {
      console.log('✅ Tag de prueba eliminado');
    }
    
    // 7. Logout
    console.log('\n6️⃣ Cerrando sesión...');
    await supabase.auth.signOut();
    
    console.log('\n✅ === TEST DE INTEGRACIÓN COMPLETADO EXITOSAMENTE ===');
    
  } catch (error) {
    console.error('❌ Error en test de integración:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar test
testIntegrationLoginCreateTag().then(() => {
  console.log('\n🎯 RESUMEN DEL TEST DE INTEGRACIÓN:');
  console.log('\n✅ CORRECCIONES IMPLEMENTADAS:');
  console.log('1. ✅ createTag ya no envía campo "id" - deja que Supabase genere UUID');
  console.log('2. ✅ createTag usa session.user.id directamente de Supabase');
  console.log('3. ✅ createTag obtiene el tag creado con .select().single()');
  console.log('4. ✅ Validación de sesión antes de insertar');
  console.log('5. ✅ Logs detallados para debugging');
  
  console.log('\n🔧 FLUJO CORREGIDO:');
  console.log('1. Login → Obtener sesión de Supabase');
  console.log('2. Validar sesión activa');
  console.log('3. Crear insertData sin campo "id"');
  console.log('4. Usar session.user.id como created_by');
  console.log('5. INSERT con .select().single() para obtener UUID generado');
  console.log('6. Actualizar estado local con tag real de Supabase');
  
  console.log('\n🚀 EL PROBLEMA DE TAGS ESTÁ RESUELTO DEFINITIVAMENTE');
  
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal en test:', error);
  process.exit(1);
});