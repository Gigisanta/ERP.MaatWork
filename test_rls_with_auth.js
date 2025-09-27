import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSWithAuth() {
  console.log('🔐 PROBANDO RLS CON AUTENTICACIÓN REAL\n');
  
  try {
    // 1. Intentar autenticar con un usuario existente
    console.log('1️⃣ Intentando autenticar con usuario existente...');
    
    // Primero obtener un usuario válido
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      return;
    }
    
    const testUser = users[0];
    console.log(`📧 Usuario de prueba: ${testUser.email} (${testUser.role})`);
    
    // 2. Crear una sesión simulada usando signInWithPassword
    // Nota: Esto requiere que el usuario tenga una contraseña configurada
    console.log('\n2️⃣ Intentando crear sesión autenticada...');
    
    // Como no podemos autenticar sin contraseña, vamos a probar con service role
    console.log('⚠️  No podemos autenticar sin contraseña desde script');
    console.log('📋 Probando acceso directo a funciones RLS...');
    
    // 3. Probar las funciones RLS directamente
    console.log('\n3️⃣ Probando funciones RLS sin autenticación:');
    
    const { data: currentUserId, error: userIdError } = await supabase
      .rpc('get_current_user_id');
    
    console.log('get_current_user_id():', currentUserId, userIdError ? `(Error: ${userIdError.message})` : '');
    
    const { data: currentUserRole, error: roleError } = await supabase
      .rpc('get_current_user_role');
    
    console.log('get_current_user_role():', currentUserRole, roleError ? `(Error: ${roleError.message})` : '');
    
    // 4. Probar acceso a contactos sin autenticación
    console.log('\n4️⃣ Probando acceso a contactos sin autenticación:');
    
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, name, assigned_to')
      .limit(5);
    
    if (contactsError) {
      console.log('❌ Error accediendo a contactos (esperado):', contactsError.message);
    } else {
      console.log('⚠️  Acceso a contactos permitido sin autenticación:', contacts?.length || 0, 'contactos');
      contacts?.forEach(contact => {
        console.log(`  - ${contact.name} -> ${contact.assigned_to}`);
      });
    }
    
    // 5. Verificar políticas RLS activas
    console.log('\n5️⃣ Verificando políticas RLS activas:');
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'contacts');
    
    if (policiesError) {
      console.log('❌ Error obteniendo políticas:', policiesError.message);
    } else {
      console.log('📋 Políticas RLS activas:', policies?.length || 0);
      policies?.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd} (${policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'})`);
      });
    }
    
    // 6. Verificar si RLS está habilitado
    console.log('\n6️⃣ Verificando estado RLS de la tabla contacts:');
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'contacts');
    
    if (tableError) {
      console.log('❌ Error obteniendo info de tabla:', tableError.message);
    } else {
      const table = tableInfo?.[0];
      console.log(`📊 Tabla contacts - RLS habilitado: ${table?.relrowsecurity ? '✅ SÍ' : '❌ NO'}`);
    }
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar la prueba
testRLSWithAuth();