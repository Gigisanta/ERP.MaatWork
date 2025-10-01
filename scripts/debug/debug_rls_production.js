import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';

// Cliente con service role para verificar políticas
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Cliente con anon key para simular usuario autenticado
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function debugRLSPolicies() {
  console.log('🔍 DEBUGGING RLS POLICIES EN PRODUCCIÓN');
  console.log('=' .repeat(50));

  try {
    // 1. Verificar políticas RLS en tabla contacts
    console.log('\n1️⃣ Verificando políticas RLS en tabla contacts...');
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'contacts');

    if (policiesError) {
      console.error('❌ Error obteniendo políticas:', policiesError);
    } else {
      console.log('📋 Políticas encontradas:', policies.length);
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd} (${policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'})`);
        console.log(`    USING: ${policy.qual || 'N/A'}`);
        console.log(`    WITH CHECK: ${policy.with_check || 'N/A'}`);
      });
    }

    // 2. Verificar funciones auxiliares
    console.log('\n2️⃣ Verificando funciones auxiliares...');
    const functions = ['get_current_user_id', 'get_current_user_role', 'can_access_contact'];
    
    for (const funcName of functions) {
      const { data: funcExists, error: funcError } = await supabaseAdmin
        .from('pg_proc')
        .select('proname')
        .eq('proname', funcName)
        .limit(1);
      
      if (funcError) {
        console.error(`❌ Error verificando función ${funcName}:`, funcError);
      } else {
        console.log(`${funcExists.length > 0 ? '✅' : '❌'} Función ${funcName}: ${funcExists.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
      }
    }

    // 3. Verificar datos de contactos (sin autenticación)
    console.log('\n3️⃣ Verificando datos de contactos (admin view)...');
    const { data: allContacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('id, name, assigned_to')
      .limit(10);

    if (contactsError) {
      console.error('❌ Error obteniendo contactos:', contactsError);
    } else {
      console.log(`📊 Total contactos encontrados: ${allContacts.length}`);
      allContacts.forEach(contact => {
        console.log(`  - ${contact.name} (ID: ${contact.id.substring(0, 8)}...) -> Asignado a: ${contact.assigned_to || 'SIN ASIGNAR'}`);
      });
    }

    // 4. Verificar usuarios en public.users
    console.log('\n4️⃣ Verificando usuarios en public.users...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, role')
      .limit(10);

    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError);
    } else {
      console.log(`👥 Total usuarios encontrados: ${users.length}`);
      users.forEach(user => {
        console.log(`  - ${user.username} (${user.role}) -> ID: ${user.id.substring(0, 8)}...`);
      });
    }

    // 5. Probar acceso con usuario específico
    console.log('\n5️⃣ Probando acceso con usuario específico...');
    
    // Buscar un usuario advisor para probar
    const advisorUser = users.find(u => u.role === 'advisor');
    if (advisorUser) {
      console.log(`🧪 Probando con usuario advisor: ${advisorUser.username} (${advisorUser.id.substring(0, 8)}...)`);
      
      // Simular autenticación (esto requiere un token JWT válido)
      // Por ahora solo mostramos qué contactos deberían ser visibles
      const userContacts = allContacts.filter(c => c.assigned_to === advisorUser.id);
      console.log(`📋 Contactos que debería ver este advisor: ${userContacts.length}`);
      userContacts.forEach(contact => {
        console.log(`  - ${contact.name}`);
      });
    }

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar debug
debugRLSPolicies().then(() => {
  console.log('\n✅ Debug completado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error ejecutando debug:', error);
  process.exit(1);
});