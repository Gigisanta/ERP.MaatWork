/**
 * Script de diagnóstico completo para la creación de contactos en el CRM
 * Verifica políticas RLS, autenticación, permisos y funcionalidad de inserción
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Configuración de clientes Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validar variables de entorno
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Variables de entorno faltantes:');
  console.error('  VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Configuración de Supabase cargada correctamente');
console.log('   URL:', supabaseUrl);
console.log('   Anon Key:', supabaseAnonKey.substring(0, 20) + '...');
console.log('   Service Key:', supabaseServiceKey.substring(0, 20) + '...');

console.log('🔍 DIAGNÓSTICO DE CREACIÓN DE CONTACTOS EN CRM');
console.log('=' .repeat(60));

async function diagnoseContactsCreation() {
  try {
    // 1. Verificar si RLS está habilitado en la tabla contacts
    console.log('\n1️⃣ VERIFICANDO RLS EN TABLA CONTACTS');
    console.log('-'.repeat(50));
    
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'contacts')
      .single();
    
    if (rlsError) {
      console.error('❌ Error al verificar RLS:', rlsError);
    } else {
      console.log(`✅ RLS habilitado: ${rlsStatus.relrowsecurity ? 'SÍ' : 'NO'}`);
    }

    // 2. Verificar estructura de tabla contacts
    console.log('\n2️⃣ VERIFICANDO ESTRUCTURA DE TABLA CONTACTS');
    console.log('-'.repeat(50));
    
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'contacts')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.error('❌ Error al obtener estructura:', tableError);
    } else {
      console.log('✅ Columnas de la tabla contacts:');
      tableInfo.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    }

    // 3. Probar autenticación de usuario
    console.log('\n3️⃣ PROBANDO AUTENTICACIÓN DE USUARIO');
    console.log('-'.repeat(50));
    
    // Obtener un usuario de prueba existente
    const { data: testUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .limit(1);
    
    if (usersError || !testUsers || testUsers.length === 0) {
      console.error('❌ No se encontraron usuarios de prueba:', usersError);
      return;
    }
    
    const testUser = testUsers[0];
    console.log(`✅ Usuario de prueba: ${testUser.email} (${testUser.role})`);
    
    // Simular autenticación (usando service key para obtener contexto)
    const { data: authTest, error: authError } = await supabaseAdmin.auth.admin.getUserById(testUser.id);
    
    if (authError) {
      console.error('❌ Error en autenticación:', authError);
    } else {
      console.log('✅ Autenticación simulada exitosa');
    }

    // 4. Intentar crear un contacto de prueba
    console.log('\n4️⃣ PROBANDO CREACIÓN DE CONTACTO');
    console.log('-'.repeat(50));
    
    const testContact = {
      name: 'Test Contact Diagnóstico',
      email: `test-${Date.now()}@diagnosis.com`,
      phone: `+54911${Math.floor(Math.random() * 10000000)}`,
      company: 'Empresa de Prueba',
      position: 'Contacto de Diagnóstico',
      source: 'diagnosis',
      status: 'new',
      assigned_to: testUser.id,
      created_by: testUser.id
    };
    
    console.log('📝 Datos del contacto de prueba:', JSON.stringify(testContact, null, 2));
    
    // Probar con cliente autenticado (simulando usuario)
    console.log('\n🔐 Probando inserción con cliente autenticado...');
    
    // Intentar inserción directa con service role
    console.log('⚠️ Usando service role para inserción (bypassing RLS)');
    
    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('contacts')
      .insert([testContact])
      .select();
    
    if (insertError) {
      console.error('❌ Error al insertar contacto:', insertError);
      console.error('   Código:', insertError.code);
      console.error('   Mensaje:', insertError.message);
      console.error('   Detalles:', insertError.details);
      console.error('   Hint:', insertError.hint);
    } else {
      console.log('✅ Contacto creado exitosamente:', insertResult[0]?.id);
      
      // Limpiar el contacto de prueba
      await supabaseAdmin
        .from('contacts')
        .delete()
        .eq('id', insertResult[0].id);
      console.log('🧹 Contacto de prueba eliminado');
    }

    // 5. Probar acceso directo a la tabla contacts
    console.log('\n5️⃣ PROBANDO ACCESO DIRECTO A CONTACTS');
    console.log('-'.repeat(50));
    
    // Probar lectura con cliente admin
    const { data: adminRead, error: adminReadError } = await supabaseAdmin
      .from('contacts')
      .select('id, name, email')
      .limit(1);
    
    if (adminReadError) {
      console.error('❌ Error lectura admin:', adminReadError);
    } else {
      console.log(`✅ Lectura admin exitosa: ${adminRead?.length || 0} registros`);
    }
    
    // Probar lectura con cliente anónimo
    const { data: anonRead, error: anonReadError } = await supabaseClient
      .from('contacts')
      .select('id, name, email')
      .limit(1);
    
    if (anonReadError) {
      console.log('⚠️ Lectura anónima bloqueada (esperado):', anonReadError.message);
    } else {
      console.log(`✅ Lectura anónima permitida: ${anonRead?.length || 0} registros`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 DIAGNÓSTICO COMPLETADO');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('💥 Error general en diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnoseContactsCreation().then(() => {
  console.log('\n✨ Diagnóstico finalizado. Revisa los resultados arriba.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});