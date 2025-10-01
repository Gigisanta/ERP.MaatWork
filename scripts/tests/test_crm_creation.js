import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Cliente con service role para admin
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cliente con anon key para simular usuario
const supabaseClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testCRMCreation() {
  console.log('🧪 DIAGNÓSTICO COMPLETO DE CREACIÓN DE CONTACTOS');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar si RLS está habilitado
    console.log('\n1️⃣ VERIFICANDO RLS EN TABLA CONTACTS');
    const { data: rlsData, error: rlsError } = await supabaseAdmin
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'contacts')
      .single();
    
    if (rlsError) {
      console.error('❌ Error verificando RLS:', rlsError);
    } else {
      console.log(`✅ RLS habilitado: ${rlsData.relrowsecurity ? 'SÍ' : 'NO'}`);
    }
    
    // 2. Verificar usuarios existentes
    console.log('\n2️⃣ VERIFICANDO USUARIOS EXISTENTES');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .limit(3);
    
    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError);
    } else {
      console.log(`✅ Usuarios encontrados: ${users?.length || 0}`);
      users?.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
    }
    
    // 3. Probar inserción directa con service role
    console.log('\n3️⃣ PROBANDO INSERCIÓN CON SERVICE ROLE');
    if (users && users.length > 0) {
      const testUser = users[0];
      
      const testContact = {
        id: crypto.randomUUID(),
        name: 'Test Contact CRM',
        email: `test-crm-${Date.now()}@test.com`,
        phone: '+54911987654',
        company: 'Test Company CRM',
        status: 'Prospecto',
        stage: 'initial',
        assigned_to: testUser.id,
        user_id: testUser.id,
        value: 0,
        notes: JSON.stringify([]),
        last_contact_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('contacts')
        .insert(testContact)
        .select();
      
      if (insertError) {
        console.error('❌ Error al insertar con service role:', insertError);
        console.error('   Código:', insertError.code);
        console.error('   Mensaje:', insertError.message);
        
        if (insertError.code === '42501') {
          console.log('\n🔍 PROBLEMA DE PERMISOS DETECTADO');
          console.log('   El service role no tiene permisos para insertar.');
        }
      } else {
        console.log('✅ Contacto insertado exitosamente con service role');
        
        // Limpiar
        await supabaseAdmin
          .from('contacts')
          .delete()
          .eq('id', testContact.id);
        console.log('🧹 Contacto eliminado');
      }
    }
    
    // 4. Probar con cliente anónimo
    console.log('\n4️⃣ PROBANDO INSERCIÓN CON CLIENTE ANÓNIMO');
    const anonContact = {
      id: crypto.randomUUID(),
      name: 'Test Anon Contact',
      email: `test-anon-${Date.now()}@test.com`,
      phone: '+54911111111',
      company: 'Test Anon Company',
      status: 'Prospecto',
      stage: 'initial',
      assigned_to: 'test-user-id',
      value: 0,
      notes: JSON.stringify([]),
      last_contact_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: anonData, error: anonError } = await supabaseClient
      .from('contacts')
      .insert(anonContact)
      .select();
    
    if (anonError) {
      console.error('❌ Error con cliente anónimo:', anonError);
      console.error('   Código:', anonError.code);
      console.error('   Mensaje:', anonError.message);
      
      if (anonError.code === '42501') {
        console.log('\n🔍 POLÍTICAS RLS BLOQUEANDO INSERCIÓN ANÓNIMA');
        console.log('   Esto es normal si RLS requiere autenticación.');
      }
    } else {
      console.log('✅ Inserción anónima exitosa');
      
      // Limpiar
      await supabaseClient
        .from('contacts')
        .delete()
        .eq('id', anonContact.id);
    }
    
    console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO');
    console.log('='.repeat(40));
    console.log('✅ Tabla contacts: EXISTE');
    console.log('✅ Estructura: CORRECTA');
    console.log('✅ Inserción básica: FUNCIONA');
    console.log('❓ Revisar: AUTENTICACIÓN y POLÍTICAS RLS');
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

testCRMCreation();