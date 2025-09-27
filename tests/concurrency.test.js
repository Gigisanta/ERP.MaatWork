/**
 * PRUEBAS DE CONCURRENCIA PARA MÚLTIPLES USUARIOS SIMULTÁNEOS
 * 
 * Este script verifica que:
 * - Múltiples usuarios pueden acceder simultáneamente sin conflictos
 * - Las operaciones CRUD concurrentes funcionan correctamente
 * - No hay bloqueos o deadlocks en la base de datos
 * - Las transacciones se manejan correctamente bajo carga concurrente
 */

const { createClient } = require('@supabase/supabase-js');
const assert = require('assert');
const crypto = require('crypto');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const { 
  isValidUUID, 
  generateUUID, 
  validateOrGenerateUUID,
  getSafeUserUUID,
  sanitizeObjectUUIDs,
  safeUUIDOperation 
} = require('./utils/uuid-validator');
const { getSupabasePool, closeGlobalPool } = require('./config/supabase-pool');

// Configuración de Supabase
require('dotenv').config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error('Variables de entorno de Supabase faltantes');
}

// Cliente con permisos de servicio
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Configuración de pruebas
const CONCURRENT_USERS = 10;
const OPERATIONS_PER_USER = 20;
const MAX_EXECUTION_TIME = 60000; // 60 segundos

class ConcurrencyTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      details: [],
      metrics: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        concurrentUsers: CONCURRENT_USERS,
        operationsPerUser: OPERATIONS_PER_USER
      }
    };
    this.createdUsers = [];
    this.createdContacts = [];
    this.operationTimes = [];
  }

  async setup() {
    console.log('🔧 Configurando usuarios para pruebas de concurrencia...');
    
    try {
      // Crear usuarios de prueba concurrentes
      for (let i = 0; i < CONCURRENT_USERS; i++) {
        const user = {
          email: `concurrent_user_${i}_${Date.now()}@test.com`,
          password: 'ConcurrentTest123!',
          role: 'advisor',
          full_name: `Concurrent User ${i + 1}`
        };

        // Crear usuario en auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true
        });

        if (authError) {
          throw new Error(`Error creando usuario auth ${user.email}: ${authError.message}`);
        }

        // Crear registro en public.users con validación UUID
        const authId = validateOrGenerateUUID(authData.user.id, `concurrent-user-${i}`);
        
        const userRecord = {
          id: authId,
          email: user.email,
          name: user.full_name,
          role: user.role,
          is_approved: true
        };
        
        const userResult = await safeUUIDOperation(
          async (data) => {
            const { error } = await supabaseAdmin
              .from('users')
              .insert(data);
            return { error };
          },
          userRecord,
          ['id']
        );

        if (userResult && userResult.error) {
          throw new Error(`Error creando usuario público ${user.email}: ${userResult.error.message}`);
        }

        user.authId = authId;
        this.createdUsers.push(user);
      }

      console.log(`✅ Setup completado: ${this.createdUsers.length} usuarios concurrentes creados`);
      
    } catch (error) {
      console.error('❌ Error en setup:', error.message);
      throw error;
    }
  }

  async cleanup() {
    console.log('🧹 Limpiando datos de pruebas de concurrencia...');
    
    try {
      // Eliminar contactos creados durante las pruebas
      if (this.createdContacts.length > 0) {
        const contactIds = this.createdContacts.map(c => c.id);
        await supabaseAdmin
          .from('contacts')
          .delete()
          .in('id', contactIds);
      }

      // Eliminar usuarios
      for (const user of this.createdUsers) {
        if (user.authId) {
          await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', user.authId);

          await supabaseAdmin.auth.admin.deleteUser(user.authId);
        }
      }

      console.log('✅ Cleanup de concurrencia completado');
    } catch (error) {
      console.error('⚠️ Error en cleanup:', error.message);
    }
  }

  async runTest(testName, testFn) {
    try {
      console.log(`🧪 Ejecutando: ${testName}`);
      const startTime = Date.now();
      await testFn();
      const endTime = Date.now();
      
      this.results.passed++;
      this.results.details.push({ 
        test: testName, 
        status: 'PASSED', 
        message: 'OK',
        duration: endTime - startTime
      });
      console.log(`✅ ${testName} - PASSED (${endTime - startTime}ms)`);
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: testName, error: error.message });
      this.results.details.push({ 
        test: testName, 
        status: 'FAILED', 
        message: error.message,
        duration: 0
      });
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
    }
  }

  // Worker para operaciones concurrentes
  static async workerOperation(userData, operationCount) {
    const { createClient } = require('@supabase/supabase-js');
    const crypto = require('crypto');
    const { 
      isValidUUID, 
      generateUUID, 
      validateOrGenerateUUID,
      getSafeUserUUID,
      sanitizeObjectUUIDs,
      safeUUIDOperation 
    } = require('./utils/uuid-validator');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    const client = createClient(supabaseUrl, supabaseAnonKey);
    
    // Autenticar usuario
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: userData.email,
      password: userData.password
    });

    if (authError) {
      throw new Error(`Error de autenticación: ${authError.message}`);
    }

    // Obtener UUID del usuario autenticado de forma segura
    const safeUserId = await getSafeUserUUID(client);
    if (!safeUserId) {
      throw new Error('No se pudo obtener UUID de usuario válido');
    }

    const results = {
      userId: userData.authId,
      operations: [],
      errors: [],
      totalTime: 0
    };

    const startTime = Date.now();

    // Realizar operaciones concurrentes
    for (let i = 0; i < operationCount; i++) {
      const opStartTime = Date.now();
      
      try {
        // Operación 1: Crear contacto con validación UUID
        const contactData = {
          name: `Contacto Concurrente ${userData.full_name} - ${i}`,
          email: `concurrent_${userData.authId}_${i}@test.com`,
          phone: `+5491${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
          status: 'Prospecto',
          assigned_to: safeUserId,
          user_id: safeUserId
        };

        const { data: contact, error: createError } = await safeUUIDOperation(
          async (data) => {
            return await client
              .from('contacts')
              .insert(data)
              .select()
              .single();
          },
          contactData,
          ['assigned_to', 'user_id']
        );

        if (createError) {
          throw new Error(`Error creando contacto: ${createError.message}`);
        }

        // Operación 2: Leer contactos propios
        const { data: contacts, error: readError } = await client
          .from('contacts')
          .select('*')
          .eq('assigned_to', userData.authId);

        if (readError) {
          throw new Error(`Error leyendo contactos: ${readError.message}`);
        }

        // Operación 3: Actualizar contacto
        const { error: updateError } = await client
          .from('contacts')
          .update({ 
            status: 'Contactado',
            phone: `+5491${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}` 
          })
          .eq('id', contact.id);

        if (updateError) {
          throw new Error(`Error actualizando contacto: ${updateError.message}`);
        }

        // Operación 4: Crear historial de estado
        const { error: historyError } = await client
          .from('contact_status_history')
          .insert({
            contact_id: contact.id,
            old_status: 'Prospecto',
            new_status: 'Contactado',
            changed_by: userData.authId,
            notes: `Cambio concurrente ${i}`
          });

        if (historyError) {
          // No es crítico si falla el historial
          console.warn(`Advertencia historial: ${historyError.message}`);
        }

        const opEndTime = Date.now();
        results.operations.push({
          operation: i,
          success: true,
          duration: opEndTime - opStartTime,
          contactId: contact.id
        });

      } catch (error) {
        const opEndTime = Date.now();
        results.errors.push({
          operation: i,
          error: error.message,
          duration: opEndTime - opStartTime
        });
      }
    }

    results.totalTime = Date.now() - startTime;
    return results;
  }

  async testConcurrentContactOperations() {
    console.log(`🔄 Iniciando ${CONCURRENT_USERS} usuarios concurrentes con ${OPERATIONS_PER_USER} operaciones cada uno...`);
    
    const promises = [];
    const startTime = Date.now();

    // Crear promesas para cada usuario concurrente
    for (const user of this.createdUsers) {
      const promise = ConcurrencyTester.workerOperation(user, OPERATIONS_PER_USER)
        .then(result => {
          this.results.metrics.totalOperations += result.operations.length;
          this.results.metrics.successfulOperations += result.operations.length;
          this.results.metrics.failedOperations += result.errors.length;
          
          // Recopilar tiempos de respuesta
          result.operations.forEach(op => {
            this.operationTimes.push(op.duration);
            if (op.duration > this.results.metrics.maxResponseTime) {
              this.results.metrics.maxResponseTime = op.duration;
            }
            if (op.duration < this.results.metrics.minResponseTime) {
              this.results.metrics.minResponseTime = op.duration;
            }
          });

          return result;
        });
      
      promises.push(promise);
    }

    // Ejecutar todas las operaciones concurrentemente
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const totalExecutionTime = endTime - startTime;

    // Analizar resultados
    let successfulUsers = 0;
    let totalErrors = 0;
    let allContactIds = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulUsers++;
        const userResult = result.value;
        allContactIds.push(...userResult.operations.map(op => op.contactId));
        totalErrors += userResult.errors.length;
      } else {
        console.error(`Usuario ${index} falló:`, result.reason);
        totalErrors++;
      }
    });

    // Calcular métricas
    if (this.operationTimes.length > 0) {
      this.results.metrics.averageResponseTime = 
        this.operationTimes.reduce((a, b) => a + b, 0) / this.operationTimes.length;
    }

    // Guardar IDs de contactos creados para cleanup
    this.createdContacts = allContactIds.map(id => ({ id }));

    // Verificaciones
    assert(successfulUsers >= CONCURRENT_USERS * 0.9, 
      `Al menos 90% de usuarios deberían completar exitosamente (${successfulUsers}/${CONCURRENT_USERS})`);
    
    assert(totalExecutionTime < MAX_EXECUTION_TIME, 
      `Tiempo total no debería exceder ${MAX_EXECUTION_TIME}ms (actual: ${totalExecutionTime}ms)`);
    
    assert(totalErrors < this.results.metrics.totalOperations * 0.1, 
      `Errores no deberían exceder 10% del total (${totalErrors}/${this.results.metrics.totalOperations})`);

    console.log(`✅ Concurrencia completada: ${successfulUsers}/${CONCURRENT_USERS} usuarios exitosos en ${totalExecutionTime}ms`);
  }

  async testDatabaseConnectionPool() {
    console.log('🔗 Probando pool de conexiones optimizado de base de datos...');
    const startTime = Date.now();
    const maxConnections = 50;
    const targetSuccessRate = 0.9; // 90% de conexiones exitosas (mejorado)
    
    const results = {
      totalAttempts: maxConnections,
      successful: 0,
      failed: 0,
      errors: [],
      avgResponseTime: 0,
      successRate: 0
    };
    
    // Usar el pool optimizado
    const pool = getSupabasePool(supabaseUrl, supabaseAnonKey);
    
    const connectionPromises = [];

    // Crear múltiples conexiones simultáneas usando el pool
    for (let i = 0; i < maxConnections; i++) {
      const promise = (async () => {
        const connectionStart = Date.now();
        
        try {
          // Usar el pool con retry automático
          const result = await pool.executeWithRetry(async (client) => {
            // Autenticar con el primer usuario
            const { error: authError } = await client.auth.signInWithPassword({
              email: this.createdUsers[0].email,
              password: this.createdUsers[0].password
            });

            if (authError) {
              throw new Error(`Error de autenticación conexión ${i}: ${authError.message}`);
            }

            // Realizar consulta simple
            const { data, error } = await client
              .from('contacts')
              .select('count')
              .eq('assigned_to', this.createdUsers[0].authId);

            if (error) {
              throw new Error(`Error de consulta conexión ${i}: ${error.message}`);
            }

            return data;
          }, `connection-test-${i}`);
          
          const responseTime = Date.now() - connectionStart;
          results.successful++;
          
          return { success: true, responseTime, connectionId: i };
        } catch (error) {
          results.failed++;
          results.errors.push({
            connectionId: i,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
          return { success: false, error: error.message, connectionId: i };
        }
      })();

      connectionPromises.push(promise);
    }

    const connectionResults = await Promise.allSettled(connectionPromises);
    const duration = Date.now() - startTime;
    
    // Obtener estadísticas del pool
    const poolStats = pool.getStats();
    
    // Calcular métricas
    const successfulResults = connectionResults.filter(r => r.status === 'fulfilled' && r.value.success);
    results.avgResponseTime = successfulResults.length > 0 
      ? Math.round(successfulResults.reduce((sum, r) => sum + r.value.responseTime, 0) / successfulResults.length)
      : 0;
    
    results.successRate = results.successful / results.totalAttempts;

    console.log(`📊 Pool de conexiones: ${results.successful}/${results.totalAttempts} exitosas (${Math.round(results.successRate * 100)}%)`);
    console.log(`⏱️ Tiempo promedio de respuesta: ${results.avgResponseTime}ms`);
    console.log(`🕐 Duración total: ${duration}ms`);
    console.log(`🔗 Estadísticas del pool:`, poolStats);
    
    // Al menos 90% de las conexiones deberían ser exitosas
    assert(results.successRate >= targetSuccessRate, 
      `Al menos ${Math.round(targetSuccessRate * 100)}% de conexiones deberían ser exitosas (${Math.round(results.successRate * 100)}%)`);
  }

  async testTransactionIntegrity() {
    console.log('🔒 Probando integridad de transacciones concurrentes...');
    
    const user = this.createdUsers[0];
    const client = createClient(supabaseUrl, supabaseAnonKey);
    
    // Autenticar
    await client.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });

    // Crear contacto base
    const { data: baseContact, error: createError } = await client
      .from('contacts')
      .insert({
        name: 'Contacto Transacción',
        email: 'transaction@test.com',
        status: 'Prospecto',
        assigned_to: user.authId
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Error creando contacto base: ${createError.message}`);
    }

    this.createdContacts.push(baseContact);

    // Realizar múltiples actualizaciones concurrentes del mismo contacto
    const updatePromises = [];
    const statuses = ['Contactado', 'Primera Reunion', 'Segunda Reunion', 'Apertura'];

    for (let i = 0; i < 10; i++) {
      const promise = client
        .from('contacts')
        .update({ 
          status: statuses[i % statuses.length],
          phone: `+5491${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', baseContact.id);
      
      updatePromises.push(promise);
    }

    const updateResults = await Promise.allSettled(updatePromises);
    const successfulUpdates = updateResults.filter(r => r.status === 'fulfilled').length;

    // Verificar que el contacto mantiene consistencia
    const { data: finalContact, error: readError } = await client
      .from('contacts')
      .select('*')
      .eq('id', baseContact.id)
      .single();

    if (readError) {
      throw new Error(`Error leyendo contacto final: ${readError.message}`);
    }

    // El contacto debe existir y tener un estado válido
    assert(finalContact !== null, 'El contacto debe existir después de actualizaciones concurrentes');
    assert(statuses.includes(finalContact.status), 'El contacto debe tener un estado válido');
    assert(successfulUpdates > 0, 'Al menos una actualización debe ser exitosa');

    console.log(`✅ Integridad verificada: ${successfulUpdates}/10 actualizaciones exitosas`);
  }

  async runAllTests() {
    console.log('🚀 Iniciando pruebas de concurrencia...');
    console.log('=' .repeat(60));

    await this.setup();

    try {
      await this.runTest('Operaciones concurrentes de contactos', 
        () => this.testConcurrentContactOperations());
      
      await this.runTest('Pool de conexiones de base de datos', 
        () => this.testDatabaseConnectionPool());
      
      await this.runTest('Integridad de transacciones concurrentes', 
        () => this.testTransactionIntegrity());

    } finally {
      await this.cleanup();
    }

    return this.results;
  }

  generateReport() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 REPORTE DE PRUEBAS DE CONCURRENCIA');
    console.log('=' .repeat(60));
    console.log(`✅ Pruebas exitosas: ${this.results.passed}`);
    console.log(`❌ Pruebas fallidas: ${this.results.failed}`);
    console.log(`📈 Tasa de éxito: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(2)}%`);
    
    console.log('\n📈 MÉTRICAS DE RENDIMIENTO:');
    console.log(`👥 Usuarios concurrentes: ${this.results.metrics.concurrentUsers}`);
    console.log(`🔄 Operaciones por usuario: ${this.results.metrics.operationsPerUser}`);
    console.log(`📊 Total de operaciones: ${this.results.metrics.totalOperations}`);
    console.log(`✅ Operaciones exitosas: ${this.results.metrics.successfulOperations}`);
    console.log(`❌ Operaciones fallidas: ${this.results.metrics.failedOperations}`);
    console.log(`⏱️ Tiempo promedio de respuesta: ${this.results.metrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`⏱️ Tiempo máximo de respuesta: ${this.results.metrics.maxResponseTime}ms`);
    console.log(`⏱️ Tiempo mínimo de respuesta: ${this.results.metrics.minResponseTime}ms`);
    
    if (this.results.errors.length > 0) {
      console.log('\n🔍 ERRORES ENCONTRADOS:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.error}`);
      });
    }

    console.log('\n📋 DETALLE DE PRUEBAS:');
    this.results.details.forEach(detail => {
      const icon = detail.status === 'PASSED' ? '✅' : '❌';
      const duration = detail.duration ? ` (${detail.duration}ms)` : '';
      console.log(`${icon} ${detail.test}: ${detail.message}${duration}`);
    });

    console.log('=' .repeat(60));
    
    return this.results;
  }
}

// Exportar para uso como módulo
module.exports = { ConcurrencyTestRunner: ConcurrencyTester };

// Alias para compatibilidad
ConcurrencyTester.prototype.run = ConcurrencyTester.prototype.runAllTests;

// Ejecutar directamente si es el archivo principal
if (require.main === module) {
  const runner = new ConcurrencyTester();
  runner.runAllTests().then(results => {
    runner.generateReport();
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('💥 Error fatal en las pruebas de concurrencia:', error.message);
    process.exit(1);
  });
}