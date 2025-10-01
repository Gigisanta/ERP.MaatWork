import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function debugProductionContacts() {
  console.log('🔍 DIAGNÓSTICO DE CREACIÓN DE CONTACTOS EN PRODUCCIÓN');
  console.log('=' .repeat(60));
  
  try {
    // 1. Verificar conexión a Supabase
    console.log('\n1. Verificando conexión a Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('contacts')
      .select('count', { count: 'exact', head: true });
    
    if (healthError) {
      console.error('❌ Error de conexión:', healthError.message);
      return;
    }
    console.log('✅ Conexión a Supabase exitosa');
    
    // 2. Verificar políticas RLS en la tabla contacts
    console.log('\n2. Verificando políticas RLS...');
    let policies, policiesError;
    try {
      const result = await supabaseAdmin.rpc('get_table_policies', { table_name: 'contacts' });
      policies = result.data;
      policiesError = result.error;
    } catch (rpcError) {
      // Si la función no existe, usar consulta directa
      const result = await supabaseAdmin
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'contacts');
      policies = result.data;
      policiesError = result.error;
    }
    
    if (policies && policies.length > 0) {
      console.log('✅ Políticas RLS encontradas:', policies.length);
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd}`);
      });
    } else {
      console.log('⚠️  No se encontraron políticas RLS específicas');
    }
    
    // 3. Verificar permisos de la tabla contacts
    console.log('\n3. Verificando permisos de tabla...');
    const { data: permissions, error: permError } = await supabaseAdmin
      .from('information_schema.role_table_grants')
      .select('*')
      .eq('table_name', 'contacts')
      .in('grantee', ['anon', 'authenticated']);
    
    if (permissions && permissions.length > 0) {
      console.log('✅ Permisos encontrados:');
      permissions.forEach(perm => {
        console.log(`  - ${perm.grantee}: ${perm.privilege_type}`);
      });
    } else {
      console.log('❌ No se encontraron permisos para roles anon/authenticated');
    }
    
    // 4. Probar autenticación
    console.log('\n4. Probando autenticación...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (user) {
      console.log('✅ Usuario autenticado:', user.email);
      console.log('  - ID:', user.id);
      console.log('  - Rol:', user.role || 'No definido');
    } else {
      console.log('⚠️  No hay usuario autenticado');
      
      // Intentar autenticación de prueba
      console.log('\n   Intentando autenticación de prueba...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'gio@cactusventures.com.ar',
        password: 'Cactus2024!'
      });
      
      if (signInError) {
        console.error('❌ Error de autenticación:', signInError.message);
      } else {
        console.log('✅ Autenticación exitosa:', signInData.user?.email);
      }
    }
    
    // 5. Probar creación de contacto
    console.log('\n5. Probando creación de contacto...');
    const testContact = {
      name: 'Test Contact ' + Date.now(),
      email: `test${Date.now()}@example.com`,
      phone: '+54 11 1234-5678',
      position: 'Test Position',
      status: 'prospecto',
      user_id: user?.id || null
    };
    
    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert([testContact])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error al crear contacto:', insertError.message);
      console.error('   Código:', insertError.code);
      console.error('   Detalles:', insertError.details);
      console.error('   Hint:', insertError.hint);
    } else {
      console.log('✅ Contacto creado exitosamente:', newContact.id);
      
      // Limpiar contacto de prueba
      await supabase.from('contacts').delete().eq('id', newContact.id);
      console.log('🧹 Contacto de prueba eliminado');
    }
    
    // 6. Verificar estructura de la tabla
    console.log('\n6. Verificando estructura de tabla contacts...');
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'contacts')
      .eq('table_schema', 'public');
    
    if (columns) {
      console.log('✅ Estructura de tabla:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 DIAGNÓSTICO COMPLETADO');
}

// Ejecutar diagnóstico
debugProductionContacts().catch(console.error);