/**
 * Script de Pruebas de Estrés - CactusDashboard
 * Simula carga pesada con múltiples usuarios y operaciones masivas
 */

// Cargar variables de entorno
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
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
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

class StressTestRunner {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: [],
      performanceMetrics: {},
      startTime: null,
      endTime: null
    };
    this.testUsers = [];
    this.testContacts = [];
  }

  async setup() {
    console.log('🚀 Iniciando configuración de pruebas de estrés...');
    this.results.startTime = Date.now();
    
    // Inicializar pool de conexiones optimizado
    this.pool = getSupabasePool(supabaseUrl, supabaseKey, {
      maxConnections: 30, // Aumentado para pruebas de estrés
      connectionTimeout: 20000,
      retryAttempts: 5,
      retryDelay: 500
    });
    
    // Crear usuarios de prueba para estrés con UUIDs válidos
    const userRoles = ['admin', 'manager', 'advisor'];
    for (let i = 0; i < 50; i++) {
      const role = userRoles[i % userRoles.length];
      const user = {
        id: generateUUID(), // Generar UUID válido
        email: `stress${i}@test.com`,
        role: i < 10 ? 'admin' : i < 30 ? 'manager' : 'advisor',
        full_name: `Stress User ${i}`,
        is_approved: true,
        status: 'active'
      };
      this.testUsers.push(user);
    }

    // Insertar usuarios en batch con validación UUID
    try {
      const { error } = await safeUUIDOperation(
        async (data) => {
          return await supabase
            .from('users')
            .upsert(data, { onConflict: 'id' });
        },
        this.testUsers,
        ['id']
      );
      
      if (error) throw error;
      console.log(`✅ ${this.testUsers.length} usuarios de prueba creados`);
    } catch (error) {
      console.error('❌ Error creando usuarios de prueba:', error);
      throw error;
    }
  }

  async cleanup() {
    console.log('🧹 Limpiando datos de prueba...');
    
    try {
      // Usar el pool para operaciones de limpieza
      await this.pool.executeWithRetry(async (client) => {
        // Eliminar contactos de prueba
        const { error: contactsError } = await client
          .from('contacts')
          .delete()
          .like('email', 'stress%@test.com');
        
        if (contactsError) throw contactsError;
        
        // Eliminar usuarios de prueba
        const userIds = this.testUsers.map(u => u.id);
        const { error: usersError } = await client
          .from('users')
          .delete()
          .in('id', userIds);
        
        if (usersError) throw usersError;
        
        return true;
      }, 'cleanup-operations');
      
      console.log('✅ Limpieza completada');
      
      // Cerrar pool al final
      await closeGlobalPool();
    } catch (error) {
      console.error('❌ Error en limpieza:', error);
    }
  }

  async runMassiveContactCreation() {
    console.log('📊 Ejecutando prueba de creación masiva de contactos...');
    const startTime = Date.now();
    const contactsPerUser = 100;
    const totalContacts = this.testUsers.length * contactsPerUser;
    
    try {
      const promises = this.testUsers.map(async (user, userIndex) => {
        const userContacts = [];
        
        // Validar UUID del usuario
        const validUserId = validateOrGenerateUUID(user.id, `stress-user-${userIndex}`);
        
        for (let i = 0; i < contactsPerUser; i++) {
          userContacts.push({
            name: `Contact ${i} - User ${userIndex}`,
            email: `stress-contact-${userIndex}-${i}@test.com`,
            phone: `+54911${String(userIndex).padStart(3, '0')}${String(i).padStart(4, '0')}`,
            company: `Company ${i}`,
            position: `Position ${i}`,
            status: 'active',
            user_id: validUserId,
            assigned_to: validUserId,
            tags: [`tag-${i % 5}`]
          });
        }
        
        // Insertar en batches de 50 con validación UUID usando pool
        const batchSize = 50;
        for (let j = 0; j < userContacts.length; j += batchSize) {
          const batch = userContacts.slice(j, j + batchSize);
          
          await this.pool.executeWithRetry(async (client) => {
            const { error } = await safeUUIDOperation(
              async (data) => {
                return await client
                  .from('contacts')
                  .insert(data);
              },
              batch,
              ['user_id', 'assigned_to']
            );
            
            if (error) throw error;
            return true;
          }, `batch-insert-user-${userIndex}-batch-${Math.floor(j/batchSize)}`);
        }
        
        return userContacts.length;
      });
      
      const results = await Promise.all(promises);
      const totalCreated = results.reduce((sum, count) => sum + count, 0);
      const duration = Date.now() - startTime;
      
      this.results.performanceMetrics.massiveCreation = {
        totalContacts: totalCreated,
        duration: duration,
        contactsPerSecond: Math.round(totalCreated / (duration / 1000)),
        success: totalCreated === totalContacts
      };
      
      console.log(`✅ Creados ${totalCreated} contactos en ${duration}ms`);
      console.log(`📈 Velocidad: ${this.results.performanceMetrics.massiveCreation.contactsPerSecond} contactos/segundo`);
      
      this.results.passed++;
    } catch (error) {
      console.error('❌ Error en creación masiva:', error);
      this.results.errors.push({
        test: 'massiveContactCreation',
        error: error.message
      });
      this.results.failed++;
    }
    
    this.results.totalTests++;
  }

  async runConcurrentReads() {
    console.log('📖 Ejecutando prueba de lecturas concurrentes...');
    const startTime = Date.now();
    const concurrentReads = 100;
    
    try {
      const promises = Array.from({ length: concurrentReads }, async (_, i) => {
        const user = this.testUsers[i % this.testUsers.length];
        
        // Validar UUID del usuario antes de la consulta
        const validUserId = validateOrGenerateUUID(user.id, `concurrent-read-user-${i}`);
        
        return await this.pool.executeWithRetry(async (client) => {
          const { data, error } = await client
            .from('contacts')
            .select('*')
            .eq('user_id', validUserId)
            .limit(10);
          
          if (error) throw error;
          return data.length;
        }, `concurrent-read-${i}`);
      });
      
      const results = await Promise.all(promises);
      const totalReads = results.length;
      const duration = Date.now() - startTime;
      
      this.results.performanceMetrics.concurrentReads = {
        totalReads: totalReads,
        duration: duration,
        readsPerSecond: Math.round(totalReads / (duration / 1000)),
        success: true
      };
      
      console.log(`✅ ${totalReads} lecturas concurrentes en ${duration}ms`);
      console.log(`📈 Velocidad: ${this.results.performanceMetrics.concurrentReads.readsPerSecond} lecturas/segundo`);
      
      this.results.passed++;
    } catch (error) {
      console.error('❌ Error en lecturas concurrentes:', error);
      this.results.errors.push({
        test: 'concurrentReads',
        error: error.message
      });
      this.results.failed++;
    }
    
    this.results.totalTests++;
  }

  async runMassiveUpdates() {
    console.log('🔄 Ejecutando prueba de actualizaciones masivas...');
    const startTime = Date.now();
    
    try {
      // Obtener contactos para actualizar usando pool
      const { data: contacts, error: fetchError } = await this.pool.executeWithRetry(async (client) => {
        return await client
          .from('contacts')
          .select('id, user_id')
          .like('email', 'stress-contact%')
          .limit(1000);
      }, 'fetch-contacts-for-update');
      
      if (fetchError) throw fetchError;
      
      // Actualizar en batches concurrentes usando pool
      const batchSize = 100;
      const promises = [];
      
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        
        const promise = this.pool.executeWithRetry(async (client) => {
          return await client
            .from('contacts')
            .update({ 
              company: `Updated Company ${Date.now()}`,
              updated_at: new Date().toISOString()
            })
            .in('id', batch.map(c => c.id));
        }, `batch-update-${Math.floor(i/batchSize)}`);
        
        promises.push(promise);
      }
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`${errors.length} batches fallaron`);
      }
      
      const duration = Date.now() - startTime;
      
      this.results.performanceMetrics.massiveUpdates = {
        totalUpdates: contacts.length,
        duration: duration,
        updatesPerSecond: Math.round(contacts.length / (duration / 1000)),
        success: true
      };
      
      console.log(`✅ ${contacts.length} actualizaciones en ${duration}ms`);
      console.log(`📈 Velocidad: ${this.results.performanceMetrics.massiveUpdates.updatesPerSecond} actualizaciones/segundo`);
      
      this.results.passed++;
    } catch (error) {
      console.error('❌ Error en actualizaciones masivas:', error);
      this.results.errors.push({
        test: 'massiveUpdates',
        error: error.message
      });
      this.results.failed++;
    }
    
    this.results.totalTests++;
  }

  async runDatabaseConnectionStress() {
    console.log('🔌 Ejecutando prueba de estrés de conexiones...');
    const startTime = Date.now();
    const maxConnections = 200;
    
    try {
      const promises = Array.from({ length: maxConnections }, async (_, i) => {
        // Crear cliente independiente para cada conexión
        const client = createClient(supabaseUrl, supabaseKey);
        
        const { data, error } = await client
          .from('users')
          .select('count')
          .limit(1);
        
        if (error) throw error;
        return true;
      });
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      this.results.performanceMetrics.connectionStress = {
        totalConnections: maxConnections,
        successfulConnections: results.length,
        duration: duration,
        connectionsPerSecond: Math.round(maxConnections / (duration / 1000)),
        success: results.length === maxConnections
      };
      
      console.log(`✅ ${results.length}/${maxConnections} conexiones exitosas en ${duration}ms`);
      
      this.results.passed++;
    } catch (error) {
      console.error('❌ Error en estrés de conexiones:', error);
      this.results.errors.push({
        test: 'connectionStress',
        error: error.message
      });
      this.results.failed++;
    }
    
    this.results.totalTests++;
  }

  async runMemoryLeakTest() {
    console.log('🧠 Ejecutando prueba de memory leaks...');
    const startTime = Date.now();
    const iterations = 1000;
    
    try {
      const initialMemory = process.memoryUsage();
      
      for (let i = 0; i < iterations; i++) {
        const { data, error } = await supabase
          .from('contacts')
          .select('id, name, email')
          .limit(50);
        
        if (error) throw error;
        
        // Simular procesamiento de datos
        const processed = data.map(contact => ({
          ...contact,
          processed: true,
          timestamp: Date.now()
        }));
        
        // Limpiar referencias
        processed.length = 0;
      }
      
      // Forzar garbage collection si está disponible
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const duration = Date.now() - startTime;
      
      this.results.performanceMetrics.memoryLeak = {
        iterations: iterations,
        duration: duration,
        initialMemory: Math.round(initialMemory.heapUsed / 1024 / 1024),
        finalMemory: Math.round(finalMemory.heapUsed / 1024 / 1024),
        memoryIncrease: Math.round(memoryIncrease / 1024 / 1024),
        success: memoryIncrease < 50 * 1024 * 1024 // Menos de 50MB de incremento
      };
      
      console.log(`✅ Memory test completado: ${this.results.performanceMetrics.memoryLeak.memoryIncrease}MB incremento`);
      
      this.results.passed++;
    } catch (error) {
      console.error('❌ Error en prueba de memoria:', error);
      this.results.errors.push({
        test: 'memoryLeak',
        error: error.message
      });
      this.results.failed++;
    }
    
    this.results.totalTests++;
  }

  generateReport() {
    this.results.endTime = Date.now();
    const totalDuration = this.results.endTime - this.results.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.totalTests,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: Math.round((this.results.passed / this.results.totalTests) * 100),
        totalDuration: totalDuration
      },
      performanceMetrics: this.results.performanceMetrics,
      errors: this.results.errors,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const metrics = this.results.performanceMetrics;
    
    if (metrics.massiveCreation && metrics.massiveCreation.contactsPerSecond < 100) {
      recommendations.push('Considerar optimización de índices para mejorar velocidad de inserción');
    }
    
    if (metrics.concurrentReads && metrics.concurrentReads.readsPerSecond < 500) {
      recommendations.push('Evaluar implementación de cache para mejorar lecturas concurrentes');
    }
    
    if (metrics.connectionStress && metrics.connectionStress.successfulConnections < metrics.connectionStress.totalConnections) {
      recommendations.push('Revisar límites de conexión y pool de conexiones');
    }
    
    if (metrics.memoryLeak && metrics.memoryLeak.memoryIncrease > 30) {
      recommendations.push('Investigar posibles memory leaks en el código');
    }
    
    if (this.results.failed > 0) {
      recommendations.push('Revisar y corregir errores antes del deployment');
    }
    
    return recommendations;
  }

  async run() {
    try {
      await this.setup();
      
      console.log('\n🔥 INICIANDO PRUEBAS DE ESTRÉS\n');
      
      await this.runMassiveContactCreation();
      await this.runConcurrentReads();
      await this.runMassiveUpdates();
      await this.runDatabaseConnectionStress();
      await this.runMemoryLeakTest();
      
      const report = this.generateReport();
      
      // Guardar reporte
      const reportPath = path.join(__dirname, 'reports', `stress-test-${Date.now()}.json`);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log('\n📊 REPORTE DE PRUEBAS DE ESTRÉS');
      console.log('================================');
      console.log(`✅ Pruebas exitosas: ${report.summary.passed}/${report.summary.totalTests}`);
      console.log(`📈 Tasa de éxito: ${report.summary.successRate}%`);
      console.log(`⏱️  Duración total: ${Math.round(report.summary.totalDuration / 1000)}s`);
      
      if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMENDACIONES:');
        report.recommendations.forEach((rec, i) => {
          console.log(`${i + 1}. ${rec}`);
        });
      }
      
      console.log(`\n📄 Reporte guardado en: ${reportPath}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Error crítico en pruebas de estrés:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Exportar para uso como módulo
module.exports = { StressTestRunner };

// Ejecutar directamente si es el archivo principal
if (require.main === module) {
  const runner = new StressTestRunner();
  runner.run().catch(console.error);
}