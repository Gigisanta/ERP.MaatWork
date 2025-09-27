import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase con SERVICE ROLE (solo para diagnóstico)
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testRLSAdmin() {
  console.log('🔧 DIAGNÓSTICO RLS CON SERVICE ROLE\n');
  
  try {
    // 1. Verificar usuarios existentes
    console.log('1️⃣ Verificando usuarios en la base de datos...');
    
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError);
    } else {
      console.log(`✅ Usuarios encontrados: ${users?.length || 0}`);
      users?.forEach(user => {
        console.log(`  - ${user.email} (${user.role}) -> ${user.id}`);
      });
    }
    
    // 2. Verificar contactos existentes
    console.log('\n2️⃣ Verificando contactos en la base de datos...');
    
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('id, name, assigned_to')
      .limit(10);
    
    if (contactsError) {
      console.error('❌ Error obteniendo contactos:', contactsError);
    } else {
      console.log(`✅ Contactos encontrados: ${contacts?.length || 0}`);
      contacts?.forEach(contact => {
        console.log(`  - ${contact.name} -> asignado a: ${contact.assigned_to}`);
      });
    }
    
    // 3. Verificar políticas RLS activas
    console.log('\n3️⃣ Verificando políticas RLS activas...');
    
    const { data: policies, error: policiesError } = await supabaseAdmin
      .rpc('exec_sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'contacts'
          ORDER BY policyname;
        `
      });
    
    if (policiesError) {
      console.log('❌ Error obteniendo políticas:', policiesError.message);
      
      // Método alternativo
      console.log('\n🔄 Intentando método alternativo...');
      const { data: altPolicies, error: altError } = await supabaseAdmin
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'contacts');
      
      if (altError) {
        console.log('❌ Error con método alternativo:', altError.message);
      } else {
        console.log('✅ Políticas encontradas:', altPolicies?.length || 0);
        altPolicies?.forEach(policy => {
          console.log(`  - ${policy.policyname}: ${policy.cmd}`);
        });
      }
    } else {
      console.log('✅ Políticas RLS:', policies?.length || 0);
      policies?.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd} (${policy.permissive})`);
      });
    }
    
    // 4. Verificar estado RLS de la tabla
    console.log('\n4️⃣ Verificando estado RLS de la tabla contacts...');
    
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin
      .rpc('exec_sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity
          FROM pg_tables 
          WHERE tablename = 'contacts';
        `
      });
    
    if (rlsError) {
      console.log('❌ Error verificando RLS:', rlsError.message);
    } else {
      const table = rlsStatus?.[0];
      console.log(`📊 RLS habilitado en contacts: ${table?.rowsecurity ? '✅ SÍ' : '❌ NO'}`);
    }
    
    // 5. Probar funciones RLS
    console.log('\n5️⃣ Probando funciones RLS...');
    
    try {
      const { data: userId, error: userIdError } = await supabaseAdmin
        .rpc('get_current_user_id');
      console.log('get_current_user_id():', userId, userIdError ? `(Error: ${userIdError.message})` : '');
    } catch (e) {
      console.log('get_current_user_id() error:', e.message);
    }
    
    try {
      const { data: userRole, error: roleError } = await supabaseAdmin
        .rpc('get_current_user_role');
      console.log('get_current_user_role():', userRole, roleError ? `(Error: ${roleError.message})` : '');
    } catch (e) {
      console.log('get_current_user_role() error:', e.message);
    }
    
    // 6. Verificar permisos de roles
    console.log('\n6️⃣ Verificando permisos de roles...');
    
    const { data: rolePerms, error: rolePermsError } = await supabaseAdmin
      .rpc('exec_sql', {
        query: `
          SELECT 
            grantee,
            table_name,
            privilege_type
          FROM information_schema.role_table_grants 
          WHERE table_schema = 'public' 
          AND table_name = 'contacts'
          AND grantee IN ('anon', 'authenticated')
          ORDER BY grantee, privilege_type;
        `
      });
    
    if (rolePermsError) {
      console.log('❌ Error verificando permisos:', rolePermsError.message);
    } else {
      console.log('📋 Permisos de roles:');
      rolePerms?.forEach(perm => {
        console.log(`  - ${perm.grantee}: ${perm.privilege_type} en ${perm.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar diagnóstico
testRLSAdmin();