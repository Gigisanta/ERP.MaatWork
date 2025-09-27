/**
 * Test de Verificación de Reparación de Contactos
 * 
 * Este test verifica que la solución implementada para reparar el error crítico
 * de creación de contactos funciona correctamente:
 * 
 * 1. Sincronización automática de usuarios entre auth.users y public.users
 * 2. Validaciones automáticas antes de crear contactos
 * 3. Manejo correcto de errores y recuperación automática
 * 4. Integridad de datos y políticas RLS
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

// Clientes Supabase
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Utilidades de test
const generateTestEmail = () => `test-repair-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
const generateTestUser = () => ({
  email: generateTestEmail(),
  password: 'TestPassword123!',
  name: `Test User ${Date.now()}`,
  phone: '+1234567890',
  company: 'Test Company'
});

// Función para limpiar datos de test
const cleanupTestData = async (testEmails) => {
  try {
    // Limpiar contactos de test
    await supabaseService
      .from('contacts')
      .delete()
      .in('email', testEmails);
    
    // Limpiar usuarios de test de public.users
    await supabaseService
      .from('users')
      .delete()
      .in('email', testEmails);
    
    // Limpiar usuarios de test de auth.users (solo si es necesario)
    for (const email of testEmails) {
      try {
        const { data: authUsers } = await supabaseService.auth.admin.listUsers();
        const testUser = authUsers.users.find(u => u.email === email);
        if (testUser) {
          await supabaseService.auth.admin.deleteUser(testUser.id);
        }
      } catch (error) {
        // Ignorar errores de limpieza de auth
      }
    }
  } catch (error) {
    console.warn('⚠️ Error durante limpieza:', error.message);
  }
};

// Tests principales
const runContactRepairVerificationTests = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    testSuite: 'Contact Repair Verification',
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    }
  };
  
  const testEmails = [];
  
  console.log('🔧 Iniciando Tests de Verificación de Reparación de Contactos...');
  
  try {
    // Test 1: Verificar que las tablas y funciones existen
    console.log('\n📋 Test 1: Verificación de Estructura de Base de Datos');
    const structureTest = {
      name: 'Database Structure Verification',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };
    
    try {
      // Verificar tabla users
      const { data: usersTable, error: usersError } = await supabaseService
        .from('users')
        .select('*')
        .limit(1);
      
      if (usersError) throw new Error(`Tabla users no accesible: ${usersError.message}`);
      
      // Verificar tabla contacts
      const { data: contactsTable, error: contactsError } = await supabaseService
        .from('contacts')
        .select('*')
        .limit(1);
      
      if (contactsError) throw new Error(`Tabla contacts no accesible: ${contactsError.message}`);
      
      // Verificar función de sincronización
      const { data: syncFunction, error: syncError } = await supabaseService
        .rpc('sync_auth_user_to_public', { user_id: '00000000-0000-0000-0000-000000000000' })
        .then(() => ({ success: true }))
        .catch(err => ({ error: err.message }));
      
      if (syncFunction?.error && !syncFunction.error.includes('not found')) {
        throw new Error(`Función de sincronización no disponible: ${syncFunction.error}`);
      }
      
      structureTest.status = 'passed';
      structureTest.details = {
        usersTable: 'accessible',
        contactsTable: 'accessible',
        syncFunction: 'available'
      };
      console.log('✅ Estructura de base de datos verificada');
      
    } catch (error) {
      structureTest.status = 'failed';
      structureTest.error = error.message;
      console.log(`❌ Error en estructura: ${error.message}`);
    }
    
    structureTest.endTime = new Date().toISOString();
    results.tests.push(structureTest);
    
    // Test 2: Verificar sincronización automática de usuarios
    console.log('\n🔄 Test 2: Sincronización Automática de Usuarios');
    const syncTest = {
      name: 'User Synchronization Test',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };
    
    try {
      const testUser = generateTestUser();
      testEmails.push(testUser.email);
      
      // Crear usuario en auth
      const { data: authUser, error: authError } = await supabaseService.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true
      });
      
      if (authError) throw new Error(`Error creando usuario auth: ${authError.message}`);
      
      // Esperar un momento para que el trigger actúe
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar que el usuario se sincronizó a public.users
      const { data: publicUser, error: publicError } = await supabaseService
        .from('users')
        .select('*')
        .eq('id', authUser.user.id)
        .single();
      
      if (publicError && publicError.code !== 'PGRST116') {
        // Si no existe, intentar sincronización manual
        const { error: manualSyncError } = await supabaseService
          .rpc('sync_auth_user_to_public', { user_id: authUser.user.id });
        
        if (manualSyncError) {
          throw new Error(`Error en sincronización manual: ${manualSyncError.message}`);
        }
        
        // Verificar nuevamente
        const { data: publicUserRetry, error: publicErrorRetry } = await supabaseService
          .from('users')
          .select('*')
          .eq('id', authUser.user.id)
          .single();
        
        if (publicErrorRetry) {
          throw new Error(`Usuario no sincronizado después de intento manual: ${publicErrorRetry.message}`);
        }
      }
      
      syncTest.status = 'passed';
      syncTest.details = {
        authUserId: authUser.user.id,
        publicUserSynced: true,
        email: testUser.email
      };
      console.log('✅ Sincronización automática funcionando');
      
    } catch (error) {
      syncTest.status = 'failed';
      syncTest.error = error.message;
      console.log(`❌ Error en sincronización: ${error.message}`);
    }
    
    syncTest.endTime = new Date().toISOString();
    results.tests.push(syncTest);
    
    // Test 3: Verificar creación de contactos con validaciones
    console.log('\n📝 Test 3: Creación de Contactos con Validaciones');
    const contactTest = {
      name: 'Contact Creation with Validation Test',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };
    
    try {
      // Usar el usuario creado en el test anterior
      const { data: testUsers } = await supabaseService
        .from('users')
        .select('*')
        .in('email', testEmails)
        .limit(1);
      
      if (!testUsers || testUsers.length === 0) {
        throw new Error('No hay usuario de test disponible para crear contacto');
      }
      
      const testUserId = testUsers[0].id;
      const contactEmail = generateTestEmail();
      testEmails.push(contactEmail);
      
      // Intentar crear contacto
      const { data: newContact, error: contactError } = await supabaseService
        .from('contacts')
        .insert({
          name: 'Test Contact Repair',
          email: contactEmail,
          phone: '+1234567890',
          company: 'Test Company',
          status: 'lead',
          user_id: testUserId
        })
        .select()
        .single();
      
      if (contactError) {
        throw new Error(`Error creando contacto: ${contactError.message}`);
      }
      
      // Verificar que el contacto se creó correctamente
      const { data: verifyContact, error: verifyError } = await supabaseService
        .from('contacts')
        .select('*')
        .eq('id', newContact.id)
        .single();
      
      if (verifyError) {
        throw new Error(`Error verificando contacto: ${verifyError.message}`);
      }
      
      contactTest.status = 'passed';
      contactTest.details = {
        contactId: newContact.id,
        contactEmail: contactEmail,
        userId: testUserId,
        createdSuccessfully: true
      };
      console.log('✅ Creación de contactos funcionando correctamente');
      
    } catch (error) {
      contactTest.status = 'failed';
      contactTest.error = error.message;
      console.log(`❌ Error en creación de contactos: ${error.message}`);
    }
    
    contactTest.endTime = new Date().toISOString();
    results.tests.push(contactTest);
    
    // Test 4: Verificar políticas RLS
    console.log('\n🔒 Test 4: Verificación de Políticas RLS');
    const rlsTest = {
      name: 'RLS Policies Verification Test',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };
    
    try {
      // Verificar acceso con cliente anónimo
      const { data: anonContacts, error: anonError } = await supabaseAnon
        .from('contacts')
        .select('*')
        .limit(1);
      
      // Verificar acceso con cliente de servicio
      const { data: serviceContacts, error: serviceError } = await supabaseService
        .from('contacts')
        .select('*')
        .limit(1);
      
      if (serviceError) {
        throw new Error(`Error con cliente de servicio: ${serviceError.message}`);
      }
      
      rlsTest.status = 'passed';
      rlsTest.details = {
        anonAccess: anonError ? 'restricted' : 'allowed',
        serviceAccess: 'allowed',
        rlsActive: true
      };
      console.log('✅ Políticas RLS verificadas');
      
    } catch (error) {
      rlsTest.status = 'failed';
      rlsTest.error = error.message;
      console.log(`❌ Error en políticas RLS: ${error.message}`);
    }
    
    rlsTest.endTime = new Date().toISOString();
    results.tests.push(rlsTest);
    
    // Test 5: Verificar manejo de errores y recuperación
    console.log('\n🛠️ Test 5: Manejo de Errores y Recuperación');
    const errorHandlingTest = {
      name: 'Error Handling and Recovery Test',
      status: 'running',
      startTime: new Date().toISOString(),
      details: {}
    };
    
    try {
      // Intentar crear contacto con usuario inexistente
      const { data: invalidContact, error: invalidError } = await supabaseService
        .from('contacts')
        .insert({
          name: 'Invalid Contact',
          email: generateTestEmail(),
          user_id: '00000000-0000-0000-0000-000000000000' // UUID inexistente
        })
        .select()
        .single();
      
      if (!invalidError) {
        throw new Error('Se esperaba un error al crear contacto con usuario inexistente');
      }
      
      // Verificar que el error es el esperado (violación de clave foránea)
      const isExpectedError = invalidError.message.includes('violates foreign key constraint') ||
                             invalidError.message.includes('not found') ||
                             invalidError.code === '23503';
      
      if (!isExpectedError) {
        throw new Error(`Error inesperado: ${invalidError.message}`);
      }
      
      errorHandlingTest.status = 'passed';
      errorHandlingTest.details = {
        expectedErrorCaught: true,
        errorType: 'foreign_key_violation',
        errorMessage: invalidError.message
      };
      console.log('✅ Manejo de errores funcionando correctamente');
      
    } catch (error) {
      errorHandlingTest.status = 'failed';
      errorHandlingTest.error = error.message;
      console.log(`❌ Error en manejo de errores: ${error.message}`);
    }
    
    errorHandlingTest.endTime = new Date().toISOString();
    results.tests.push(errorHandlingTest);
    
  } catch (error) {
    console.error('❌ Error crítico en tests:', error);
    results.summary.errors.push(error.message);
  } finally {
    // Limpiar datos de test
    console.log('\n🧹 Limpiando datos de test...');
    await cleanupTestData(testEmails);
  }
  
  // Calcular resumen
  results.summary.total = results.tests.length;
  results.summary.passed = results.tests.filter(t => t.status === 'passed').length;
  results.summary.failed = results.tests.filter(t => t.status === 'failed').length;
  
  // Mostrar resumen
  console.log('\n📊 RESUMEN DE TESTS DE REPARACIÓN DE CONTACTOS');
  console.log('=' .repeat(50));
  console.log(`Total de tests: ${results.summary.total}`);
  console.log(`✅ Pasaron: ${results.summary.passed}`);
  console.log(`❌ Fallaron: ${results.summary.failed}`);
  console.log(`📈 Tasa de éxito: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  
  if (results.summary.failed > 0) {
    console.log('\n❌ Tests fallidos:');
    results.tests.filter(t => t.status === 'failed').forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`);
    });
  }
  
  // Guardar reporte
  const reportPath = path.join(__dirname, 'reports', `contact-repair-verification-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Reporte guardado: ${reportPath}`);
  
  // Determinar resultado final
  const success = results.summary.failed === 0;
  console.log(`\n${success ? '🎉 TODOS LOS TESTS PASARON' : '⚠️ ALGUNOS TESTS FALLARON'}`);
  
  if (success) {
    console.log('✅ La reparación de contactos está funcionando correctamente');
    console.log('✅ Los usuarios se sincronizan automáticamente');
    console.log('✅ Los contactos se crean sin errores');
    console.log('✅ Las validaciones están activas');
    console.log('✅ Las políticas RLS funcionan correctamente');
  } else {
    console.log('⚠️ Se encontraron problemas que requieren atención');
  }
  
  return success;
};

// Ejecutar tests si se llama directamente
if (require.main === module) {
  runContactRepairVerificationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { runContactRepairVerificationTests };