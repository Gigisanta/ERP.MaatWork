import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticoRLSCompleto() {
  console.log('🔍 === DIAGNÓSTICO COMPLETO RLS TAGS ===\n');
  
  try {
    // 1. Verificar usuarios existentes
    console.log('1️⃣ Verificando usuarios existentes...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, is_approved')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error consultando usuarios:', usersError.message);
    } else {
      console.log('✅ Usuarios encontrados:', users?.length || 0);
      users?.forEach(user => {
        console.log(`   - ${user.email} (${user.full_name}) - Aprobado: ${user.is_approved}`);
      });
    }
    
    // 2. Estado de autenticación actual
    console.log('\n2️⃣ Estado de autenticación actual...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error obteniendo sesión:', sessionError.message);
    } else if (!session) {
      console.log('⚠️ No hay sesión activa');
    } else {
      console.log('✅ Sesión activa:');
      console.log(`   - Usuario ID: ${session.user.id}`);
      console.log(`   - Email: ${session.user.email}`);
      console.log(`   - Expiración: ${new Date(session.expires_at * 1000).toLocaleString()}`);
    }
    
    // 3. Verificar auth.uid() directamente
    console.log('\n3️⃣ Verificando auth.uid() en base de datos...');
    const { data: authUidResult, error: authUidError } = await supabase
      .rpc('get_current_user_id');
    
    if (authUidError) {
      console.log('⚠️ Función get_current_user_id no existe, probando consulta directa...');
      
      // Intentar consulta que use auth.uid()
      const { data: directAuthTest, error: directAuthError } = await supabase
        .from('tags')
        .select('id, name, created_by')
        .eq('created_by', 'auth.uid()')
        .limit(1);
      
      if (directAuthError) {
        console.log('❌ Error en consulta con auth.uid():', directAuthError.message);
      } else {
        console.log('✅ Consulta con auth.uid() exitosa, resultados:', directAuthTest?.length || 0);
      }
    } else {
      console.log('✅ auth.uid() retorna:', authUidResult);
    }
    
    // 4. Consultar políticas RLS activas
    console.log('\n4️⃣ Consultando políticas RLS en tabla tags...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'tags');
    
    if (policiesError) {
      console.log('⚠️ No se pudieron consultar políticas:', policiesError.message);
    } else {
      console.log(`✅ Políticas encontradas: ${policies?.length || 0}`);
      policies?.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd} - ${policy.qual}`);
      });
    }
    
    // 5. Verificar permisos de tabla
    console.log('\n5️⃣ Verificando permisos de tabla tags...');
    const { data: permissions, error: permError } = await supabase
      .from('information_schema.role_table_grants')
      .select('*')
      .eq('table_name', 'tags')
      .in('grantee', ['anon', 'authenticated']);
    
    if (permError) {
      console.log('⚠️ No se pudieron consultar permisos:', permError.message);
    } else {
      console.log(`✅ Permisos encontrados: ${permissions?.length || 0}`);
      permissions?.forEach(perm => {
        console.log(`   - ${perm.grantee}: ${perm.privilege_type}`);
      });
    }
    
    // 6. Intentar login con usuario real
    console.log('\n6️⃣ Intentando login con usuario existente...');
    if (users && users.length > 0) {
      const testUser = users.find(u => u.is_approved) || users[0];
      console.log(`Intentando login con: ${testUser.email}`);
      
      // Nota: En producción necesitarías la contraseña real
      console.log('⚠️ Login requiere contraseña real - saltando para evitar bloqueos');
    }
    
    // 7. Probar creación de tag SIN autenticación
    console.log('\n7️⃣ Probando creación de tag sin autenticación...');
    const testTag = {
      id: `test-${Date.now()}`,
      name: `Test Tag ${Date.now()}`,
      color: '#FF0000',
      backgroundcolor: '#FFEEEE',
      created_by: 'test-user-id',
      created_at: new Date().toISOString()
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('tags')
      .insert(testTag);
    
    if (insertError) {
      console.log('❌ Error esperado creando tag sin auth:', insertError.message);
      console.log('   Código:', insertError.code);
      console.log('   Detalles:', insertError.details);
    } else {
      console.log('⚠️ PROBLEMA: Tag creado sin autenticación - RLS no está funcionando');
    }
    
    // 8. Consultar tags existentes
    console.log('\n8️⃣ Consultando tags existentes...');
    const { data: existingTags, error: tagsError } = await supabase
      .from('tags')
      .select('id, name, created_by, created_at')
      .limit(5);
    
    if (tagsError) {
      console.log('❌ Error consultando tags:', tagsError.message);
    } else {
      console.log(`✅ Tags encontrados: ${existingTags?.length || 0}`);
      existingTags?.forEach(tag => {
        console.log(`   - ${tag.name} (${tag.id}) - Creado por: ${tag.created_by}`);
      });
    }
    
    // 9. RESUMEN Y SOLUCIONES
    console.log('\n🎯 === RESUMEN DEL DIAGNÓSTICO ===');
    console.log('\n📋 PROBLEMAS IDENTIFICADOS:');
    
    if (!session) {
      console.log('❌ 1. No hay sesión activa de Supabase');
      console.log('   → La función createTag se ejecuta sin usuario autenticado');
      console.log('   → auth.uid() retorna NULL en las políticas RLS');
    }
    
    console.log('\n🔧 SOLUCIONES INMEDIATAS:');
    console.log('1. Verificar que authStore.inicializarListenerAutenticacion() se ejecute correctamente');
    console.log('2. Asegurar que currentUser esté disponible antes de llamar createTag');
    console.log('3. Agregar validación de autenticación más robusta en createTag');
    console.log('4. Verificar que las políticas RLS estén correctamente configuradas');
    
    console.log('\n⚡ PASOS INMEDIATOS:');
    console.log('1. Revisar App.tsx → useEffect → authStore.inicializarListenerAutenticacion()');
    console.log('2. Verificar que useAuthStore.getState().user esté disponible en crmStore');
    console.log('3. Agregar logs de depuración en la función createTag');
    console.log('4. Probar el flujo completo: Login → Crear Tag');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar diagnóstico
diagnosticoRLSCompleto().then(() => {
  console.log('\n✅ Diagnóstico completado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});