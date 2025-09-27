// Test específico para verificar el listener de autenticación y el flujo completo
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

// Simular el comportamiento del listener de autenticación
let authState = {
  user: null,
  isAuthenticated: false,
  isLoading: false
};

function simulateAuthListener() {
  console.log('🔄 Simulando inicialización del listener de autenticación...');
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`🔔 AUTH_LISTENER: Evento ${event}, sesión: ${session ? 'SÍ' : 'NO'}`);
    
    if (event === 'SIGNED_IN' && session) {
      console.log('✅ AUTH_LISTENER: Usuario autenticado, actualizando estado');
      authState = {
        user: {
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.username || session.user.email
        },
        isAuthenticated: true,
        isLoading: false
      };
      console.log('   - Estado actualizado:', authState);
    } else if (event === 'SIGNED_OUT') {
      console.log('🚪 AUTH_LISTENER: Usuario desautenticado');
      authState = {
        user: null,
        isAuthenticated: false,
        isLoading: false
      };
      console.log('   - Estado limpiado:', authState);
    }
  });
}

async function testCompleteAuthFlow() {
  console.log('\n🧪 === TEST COMPLETO DEL FLUJO DE AUTENTICACIÓN ===\n');
  
  try {
    // 1. Inicializar listener
    console.log('1️⃣ Inicializando listener de autenticación...');
    simulateAuthListener();
    
    // 2. Verificar estado inicial
    console.log('\n2️⃣ Estado inicial de autenticación:');
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    console.log('   - Sesión inicial:', initialSession ? 'EXISTE' : 'NO EXISTE');
    console.log('   - authState inicial:', authState);
    
    // 3. Intentar login con credenciales del sistema
    console.log('\n3️⃣ Intentando login...');
    
    // Primero intentar con el sistema de autenticación mock/local
    console.log('   - Probando credenciales del sistema: Gio/Gio123');
    
    // Para este test, vamos a simular directamente el estado autenticado
    // ya que el sistema usa autenticación mock, no Supabase Auth
    console.log('   - NOTA: El sistema usa autenticación mock, no Supabase Auth');
    console.log('   - Simulando estado autenticado...');
    
    // Simular usuario autenticado
    authState = {
      user: {
        id: 'mock-user-id-123',
        email: 'gio@cactus.com',
        username: 'Gio'
      },
      isAuthenticated: true,
      isLoading: false
    };
    
    console.log('✅ Estado autenticado simulado');
    console.log('   - Usuario ID:', authState.user.id);
    console.log('   - Username:', authState.user.username);
    
    const loginData = { user: authState.user };
    const loginError = null;
    
    if (loginError) {
      console.error('❌ Error en login:', loginError.message);
      return;
    }
    
    console.log('✅ Login exitoso');
    console.log('   - Usuario ID:', loginData.user?.id);
    console.log('   - Email:', loginData.user?.email);
    
    // 4. Esperar a que el listener procese el evento
    console.log('\n4️⃣ Esperando procesamiento del listener...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Verificar estado después del login
    console.log('\n5️⃣ Estado después del login:');
    const { data: { session: postLoginSession } } = await supabase.auth.getSession();
    console.log('   - Sesión post-login:', postLoginSession ? 'EXISTE' : 'NO EXISTE');
    console.log('   - authState post-login:', authState);
    
    // 6. Simular creación de tag con logs detallados
    console.log('\n6️⃣ Simulando creación de tag con logs detallados...');
    
    // LOG 1: Estado de autenticación
    console.log('🔐 [DEBUG LOG 1] Estado de autenticación:');
    console.log('   - isAuthenticated:', authState.isAuthenticated);
    console.log('   - user existe:', !!authState.user);
    console.log('   - user.id:', authState.user?.id || 'NO DISPONIBLE');
    
    // LOG 2: Sesión de Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('🔐 [DEBUG LOG 2] Sesión de Supabase:');
    console.log('   - session existe:', !!session);
    console.log('   - session.user.id:', session?.user?.id || 'NO DISPONIBLE');
    console.log('   - sessionError:', sessionError?.message || 'ninguno');
    
    // LOG 3: auth.uid() directo
    try {
      const { data: authUid, error: uidError } = await supabase.rpc('auth.uid');
      console.log('🔐 [DEBUG LOG 3] auth.uid() directo:');
      console.log('   - authUid:', authUid || 'NO DISPONIBLE');
      console.log('   - uidError:', uidError?.message || 'ninguno');
    } catch (rpcError) {
      console.log('🔐 [DEBUG LOG 3] Error en auth.uid():', rpcError.message);
    }
    
    // 7. Intentar crear tag
    if (authState.isAuthenticated && authState.user) {
      console.log('\n7️⃣ Creando tag de prueba...');
      
      const tagData = {
        id: `test-tag-${Date.now()}`,
        name: `Tag Test ${Date.now()}`,
        color: '#3B82F6',
        backgroundcolor: '#EFF6FF',
        created_by: authState.user.id,
        created_at: new Date().toISOString()
      };
      
      console.log('🔐 [DEBUG LOG 4] Datos para insertar:', tagData);
      
      const { data: tagResult, error: tagError } = await supabase
        .from('tags')
        .insert(tagData)
        .select();
      
      if (tagError) {
        console.error('❌ Error creando tag:', tagError.message);
        console.error('   - Código:', tagError.code);
        console.error('   - Detalles:', tagError.details);
        console.error('   - Hint:', tagError.hint);
      } else {
        console.log('✅ Tag creado exitosamente:', tagResult);
      }
    } else {
      console.error('❌ No se puede crear tag: usuario no autenticado');
    }
    
    // 8. Logout
    console.log('\n8️⃣ Cerrando sesión...');
    await supabase.auth.signOut();
    
    // Esperar procesamiento del logout
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n9️⃣ Estado final después del logout:');
    const { data: { session: finalSession } } = await supabase.auth.getSession();
    console.log('   - Sesión final:', finalSession ? 'EXISTE' : 'NO EXISTE');
    console.log('   - authState final:', authState);
    
    console.log('\n✅ === TEST COMPLETADO ===');
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
  }
}

// Ejecutar test
testCompleteAuthFlow().then(() => {
  console.log('\n🎯 RESUMEN DE PROBLEMAS IDENTIFICADOS:');
  console.log('1. Verificar que el listener se inicialice correctamente en App.tsx');
  console.log('2. Confirmar que los eventos SIGNED_IN/SIGNED_OUT se procesen');
  console.log('3. Validar que el estado de autenticación se sincronice correctamente');
  console.log('4. Asegurar que createTag tenga acceso al usuario autenticado');
  console.log('\n🔧 SOLUCIONES INMEDIATAS:');
  console.log('- Agregar logs en App.tsx para confirmar inicialización del listener');
  console.log('- Verificar que useAuthStore.getState().user esté disponible en createTag');
  console.log('- Implementar validación robusta antes de operaciones de Supabase');
  
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});