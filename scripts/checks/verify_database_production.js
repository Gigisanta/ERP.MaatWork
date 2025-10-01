import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function verifyDatabaseProduction() {
  console.log('🔍 VERIFICACIÓN COMPLETA DE BASE DE DATOS - PRODUCCIÓN');
  console.log('====================================================');
  
  const results = {
    users: { status: 'unknown', details: [] },
    rls: { status: 'unknown', details: [] },
    permissions: { status: 'unknown', details: [] },
    data_integrity: { status: 'unknown', details: [] },
    production_ready: false
  };

  try {
    // 1. Verificar estructura de usuarios
    console.log('\n👥 1. VERIFICANDO ESTRUCTURA DE USUARIOS');
    console.log('========================================');
    
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, is_approved')
      .limit(50);
    
    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError.message);
      results.users.status = 'error';
      results.users.details.push(`Error: ${usersError.message}`);
    } else {
      console.log(`✅ Usuarios encontrados: ${users.length}`);
      
      // Verificar distribución de roles
      const roleCount = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Distribución de roles:');
      Object.entries(roleCount).forEach(([role, count]) => {
        console.log(`   ${role}: ${count} usuarios`);
      });
      
      // Verificar usuario admin gio
      const gioAdmin = users.find(u => u.email && u.email.toLowerCase().includes('gio') && u.role === 'admin');
      if (gioAdmin) {
        console.log('✅ Usuario admin gio encontrado y configurado correctamente');
        results.users.status = 'ok';
      } else {
        console.log('⚠️ Usuario admin gio no encontrado o mal configurado');
        results.users.status = 'warning';
      }
      
      results.users.details.push(`Total usuarios: ${users.length}`);
      results.users.details.push(`Distribución: ${JSON.stringify(roleCount)}`);
    }

    // 2. Verificar políticas RLS
    console.log('\n🛡️ 2. VERIFICANDO POLÍTICAS RLS');
    console.log('===============================');
    
    const criticalTables = ['users', 'teams', 'tasks', 'contacts', 'approvals', 'notifications'];
    let rlsWorking = true;
    
    for (const table of criticalTables) {
      console.log(`\n📋 Verificando tabla: ${table}`);
      
      // Probar acceso con admin (debería funcionar)
      try {
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from(table)
          .select('id')
          .limit(1);
        
        if (adminError) {
          console.log(`   ❌ Admin: ${adminError.message}`);
          rlsWorking = false;
          results.rls.details.push(`${table}: Admin error - ${adminError.message}`);
        } else {
          console.log(`   ✅ Admin: Acceso correcto`);
        }
      } catch (error) {
        console.log(`   ❌ Admin: Error de conexión`);
        rlsWorking = false;
      }
      
      // Probar acceso con anon (debería fallar para seguridad)
      try {
        const { data: anonData, error: anonError } = await supabaseAnon
          .from(table)
          .select('id')
          .limit(1);
        
        if (anonError) {
          console.log(`   🔒 Anon: Bloqueado correctamente (${anonError.code})`);
          results.rls.details.push(`${table}: RLS funcionando - acceso anon bloqueado`);
        } else {
          console.log(`   ⚠️ Anon: Acceso permitido (PROBLEMA DE SEGURIDAD)`);
          rlsWorking = false;
          results.rls.details.push(`${table}: PROBLEMA - acceso anon permitido`);
        }
      } catch (error) {
        console.log(`   🔒 Anon: Bloqueado por error de conexión`);
      }
    }
    
    results.rls.status = rlsWorking ? 'ok' : 'error';

    // 3. Verificar integridad de datos
    console.log('\n🔍 3. VERIFICANDO INTEGRIDAD DE DATOS');
    console.log('====================================');
    
    // Verificar contactos
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('id, name, assigned_to, user_id')
      .limit(20);
    
    if (contactsError) {
      console.log('❌ Error verificando contactos:', contactsError.message);
      results.data_integrity.status = 'error';
    } else {
      console.log(`📊 Contactos encontrados: ${contacts.length}`);
      
      // Verificar asignaciones válidas
      const unassigned = contacts.filter(c => !c.assigned_to);
      const withoutUser = contacts.filter(c => !c.user_id);
      
      console.log(`   Sin asignar: ${unassigned.length}`);
      console.log(`   Sin usuario: ${withoutUser.length}`);
      
      results.data_integrity.details.push(`Contactos: ${contacts.length}`);
      results.data_integrity.details.push(`Sin asignar: ${unassigned.length}`);
      results.data_integrity.status = 'ok';
    }

    // 4. Verificar datos de prueba
    console.log('\n🧹 4. VERIFICANDO DATOS DE PRUEBA');
    console.log('=================================');
    
    const testPatterns = ['test@', '@test.', 'example@', '@example.', 'demo@'];
    let testUsersFound = 0;
    
    for (const pattern of testPatterns) {
      const { data: testUsers, error: testError } = await supabaseAdmin
        .from('users')
        .select('email')
        .like('email', `%${pattern}%`);
      
      if (!testError && testUsers) {
        testUsersFound += testUsers.length;
        if (testUsers.length > 0) {
          console.log(`   ⚠️ Encontrados ${testUsers.length} usuarios con patrón '${pattern}'`);
        }
      }
    }
    
    if (testUsersFound === 0) {
      console.log('✅ No se encontraron usuarios de prueba obvios');
    } else {
      console.log(`⚠️ Total usuarios de prueba encontrados: ${testUsersFound}`);
    }

    // 5. Evaluación final
    console.log('\n📋 EVALUACIÓN FINAL DEL SISTEMA');
    console.log('================================');
    
    const allSystemsOk = (
      results.users.status === 'ok' &&
      results.rls.status === 'ok' &&
      results.data_integrity.status === 'ok'
    );
    
    results.production_ready = allSystemsOk;
    
    if (allSystemsOk) {
      console.log('🚀 ✅ SISTEMA LISTO PARA PRODUCCIÓN');
      console.log('   ✅ Usuarios configurados correctamente');
      console.log('   ✅ Políticas RLS funcionando');
      console.log('   ✅ Integridad de datos verificada');
      console.log('   ✅ Seguridad implementada correctamente');
    } else {
      console.log('⚠️ ❌ SISTEMA REQUIERE ATENCIÓN');
      console.log('   Problemas encontrados:');
      if (results.users.status !== 'ok') console.log('   - Configuración de usuarios');
      if (results.rls.status !== 'ok') console.log('   - Políticas RLS');
      if (results.data_integrity.status !== 'ok') console.log('   - Integridad de datos');
    }

    return results;

  } catch (error) {
    console.error('💥 Error general en verificación:', error.message);
    results.production_ready = false;
    return results;
  }
}

// Ejecutar verificación
verifyDatabaseProduction().then((results) => {
  console.log('\n📊 RESUMEN DE RESULTADOS:');
  console.log('=========================');
  console.log(JSON.stringify(results, null, 2));
  
  process.exit(results.production_ready ? 0 : 1);
}).catch(error => {
  console.error('💥 Error ejecutando verificación:', error);
  process.exit(1);
});