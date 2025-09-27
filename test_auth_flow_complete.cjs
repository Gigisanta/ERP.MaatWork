require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

async function testCompleteAuthFlow() {
  console.log('🔍 DIAGNÓSTICO COMPLETO: Flujo de Autenticación y Creación de Tags');
  console.log('=' .repeat(80));
  
  try {
    // 1. VERIFICAR USUARIOS EXISTENTES
    console.log('\n1️⃣ VERIFICANDO USUARIOS EXISTENTES');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error consultando usuarios:', usersError.message);
    } else {
      console.log(`✅ Usuarios encontrados: ${users?.length || 0}`);
      if (users && users.length > 0) {
        users.forEach(user => {
          console.log(`   - ${user.email} (${user.role}) - Aprobado: ${user.is_approved}`);
        });
      }
    }
    
    // 2. CREAR USUARIO DE PRUEBA SI NO EXISTE
    console.log('\n2️⃣ CREANDO USUARIO DE PRUEBA');
    const testEmail = 'test@cactus.com';
    const testPassword = 'Test123456!';
    
    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    let testUserId;
    if (!existingUser) {
      // Crear usuario en Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Usuario Test',
          role: 'advisor',
          is_approved: true
        }
      });
      
      if (authError) {
        console.error('❌ Error creando usuario en Auth:', authError.message);
      } else {
        testUserId = authUser.user.id;
        console.log(`✅ Usuario creado en Auth: ${testUserId}`);
        
        // Crear usuario en tabla users
        const { error: userTableError } = await supabaseAdmin
          .from('users')
          .insert({
            id: testUserId,
            email: testEmail,
            full_name: 'Usuario Test',
            role: 'advisor',
            is_approved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (userTableError) {
          console.error('❌ Error creando usuario en tabla:', userTableError.message);
        } else {
          console.log('✅ Usuario creado en tabla users');
        }
      }
    } else {
      testUserId = existingUser.id;
      console.log(`✅ Usuario de prueba ya existe: ${testUserId}`);
    }
    
    // 3. PROBAR LOGIN
    console.log('\n3️⃣ PROBANDO LOGIN');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError) {
      console.error('❌ Error en login:', loginError.message);
      return;
    }
    
    console.log('✅ Login exitoso');
    console.log(`   - Usuario ID: ${loginData.user.id}`);
    console.log(`   - Email: ${loginData.user.email}`);
    console.log(`   - Sesión activa: ${loginData.session ? 'Sí' : 'No'}`);
    
    // 4. VERIFICAR ESTADO DE AUTENTICACIÓN
    console.log('\n4️⃣ VERIFICANDO ESTADO DE AUTENTICACIÓN');
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (sessionData.session) {
      console.log('✅ Sesión activa confirmada');
      console.log(`   - Access Token: ${sessionData.session.access_token.substring(0, 20)}...`);
      console.log(`   - Expira en: ${new Date(sessionData.session.expires_at * 1000).toLocaleString()}`);
    } else {
      console.log('❌ No hay sesión activa');
    }
    
    // 5. VERIFICAR auth.uid()
    console.log('\n5️⃣ VERIFICANDO auth.uid()');
    const { data: uidData, error: uidError } = await supabase
      .rpc('get_current_user_id');
    
    if (uidError) {
      console.log('⚠️ Función get_current_user_id no existe, probando consulta directa');
      
      // Probar consulta que use auth.uid()
      const { data: authTest, error: authTestError } = await supabase
        .from('tags')
        .select('count')
        .eq('created_by', 'auth.uid()');
      
      if (authTestError) {
        console.error('❌ Error probando auth.uid():', authTestError.message);
      } else {
        console.log('✅ auth.uid() funciona en consultas');
      }
    } else {
      console.log(`✅ auth.uid() retorna: ${uidData}`);
    }
    
    // 6. VERIFICAR POLÍTICAS RLS EN TAGS
    console.log('\n6️⃣ VERIFICANDO POLÍTICAS RLS EN TAGS');
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'tags');
    
    if (policiesError) {
      console.error('❌ Error consultando políticas:', policiesError.message);
    } else {
      console.log(`✅ Políticas encontradas: ${policies?.length || 0}`);
      policies?.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd} - ${policy.qual}`);
      });
    }
    
    // 7. VERIFICAR PERMISOS DE TABLA
    console.log('\n7️⃣ VERIFICANDO PERMISOS DE TABLA TAGS');
    const { data: permissions, error: permError } = await supabaseAdmin
      .from('information_schema.role_table_grants')
      .select('*')
      .eq('table_name', 'tags')
      .in('grantee', ['anon', 'authenticated']);
    
    if (permError) {
      console.error('❌ Error consultando permisos:', permError.message);
    } else {
      console.log(`✅ Permisos encontrados: ${permissions?.length || 0}`);
      permissions?.forEach(perm => {
        console.log(`   - ${perm.grantee}: ${perm.privilege_type}`);
      });
    }
    
    // 8. INTENTAR CREAR TAG
    console.log('\n8️⃣ INTENTANDO CREAR TAG');
    const newTag = {
      name: 'Test Tag ' + Date.now(),
      color: '#FF5733',
      created_by: loginData.user.id
    };
    
    const { data: tagData, error: tagError } = await supabase
      .from('tags')
      .insert(newTag)
      .select()
      .single();
    
    if (tagError) {
      console.error('❌ Error creando tag:', tagError.message);
      console.error('   Detalles:', tagError.details);
      console.error('   Hint:', tagError.hint);
    } else {
      console.log('✅ Tag creado exitosamente:', tagData);
    }
    
    // 9. VERIFICAR TAGS EXISTENTES
    console.log('\n9️⃣ VERIFICANDO TAGS EXISTENTES');
    const { data: existingTags, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .limit(5);
    
    if (tagsError) {
      console.error('❌ Error consultando tags:', tagsError.message);
    } else {
      console.log(`✅ Tags encontrados: ${existingTags?.length || 0}`);
      existingTags?.forEach(tag => {
        console.log(`   - ${tag.name} (${tag.color}) - Creado por: ${tag.created_by}`);
      });
    }
    
    // 10. LOGOUT
    console.log('\n🔟 CERRANDO SESIÓN');
    await supabase.auth.signOut();
    console.log('✅ Sesión cerrada');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 DIAGNÓSTICO COMPLETADO');
  console.log('\n📋 RESUMEN DE PROBLEMAS IDENTIFICADOS:');
  console.log('1. Verificar que las políticas RLS permitan INSERT para usuarios autenticados');
  console.log('2. Confirmar que los permisos de tabla incluyan INSERT para rol authenticated');
  console.log('3. Validar que auth.uid() funcione correctamente en el contexto de la aplicación');
  console.log('4. Asegurar que el flujo de autenticación mantenga la sesión activa');
  
  console.log('\n🔧 SOLUCIONES INMEDIATAS:');
  console.log('1. Ejecutar: GRANT INSERT ON tags TO authenticated;');
  console.log('2. Crear política: CREATE POLICY "Users can insert their own tags" ON tags FOR INSERT WITH CHECK (auth.uid() = created_by);');
  console.log('3. Verificar inicialización de authStore en la aplicación');
  console.log('4. Agregar logs de depuración en createTag para rastrear el estado de autenticación');
}

// Función auxiliar para crear la función get_current_user_id si no existe
async function createHelperFunction() {
  const { error } = await supabaseAdmin.rpc('exec', {
    sql: `
      CREATE OR REPLACE FUNCTION get_current_user_id()
      RETURNS uuid
      LANGUAGE sql
      SECURITY DEFINER
      AS $$
        SELECT auth.uid();
      $$;
    `
  });
  
  if (error) {
    console.log('⚠️ No se pudo crear función auxiliar:', error.message);
  }
}

// Ejecutar diagnóstico
createHelperFunction().then(() => {
  testCompleteAuthFlow().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
});