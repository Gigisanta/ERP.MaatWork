/**
 * Script de Métricas de Rendimiento - CactusDashboard
 * Monitorea y reporta métricas de rendimiento del sistema
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

class PerformanceMetricsRunner {
  constructor() {
    this.metrics = {
      database: {
        queryTimes: [],
        connectionTime: 0,
        throughput: 0,
        errorRate: 0
      },
      system: {
        cpuUsage: [],
        memoryUsage: [],
        networkLatency: []
      },
      application: {
        responseTime: [],
        concurrentUsers: 0,
        operationsPerSecond: 0
      },
      startTime: null,
      endTime: null
    };
    this.testUsers = [];
    this.errors = [];
  }

  async setup() {
    console.log('⚙️ Configurando métricas de rendimiento...');
    this.metrics.startTime = Date.now();
    
    // Crear usuarios de prueba para métricas
    this.testUsers = Array.from({ length: 10 }, (_, i) => ({
      email: `perf-user-${i}@test.com`,
      role: i < 2 ? 'admin' : i < 5 ? 'manager' : 'advisor',
      full_name: `Performance User ${i}`,
      is_approved: true
    }));

    try {
      const { error } = await supabase
        .from('users')
        .upsert(this.testUsers, { onConflict: 'id' });
      
      if (error) throw error;
      console.log('✅ Usuarios de prueba para métricas creados');
    } catch (error) {
      console.error('❌ Error creando usuarios para métricas:', error);
      throw error;
    }
  }

  async cleanup() {
    console.log('🧹 Limpiando datos de métricas...');
    
    try {
      // Eliminar contactos de prueba
      await supabase
        .from('contacts')
        .delete()
        .like('email', 'perf%@test.com');
      
      // Eliminar usuarios de prueba
      const userIds = this.testUsers.map(u => u.id);
      await supabase
        .from('users')
        .delete()
        .in('id', userIds);
      
      console.log('✅ Limpieza de métricas completada');
    } catch (error) {
      console.error('❌ Error en limpieza de métricas:', error);
    }
  }

  async measureDatabasePerformance() {
    console.log('🗄️ Midiendo rendimiento de base de datos...');
    
    try {
      const queries = [
        // Query simple
        () => supabase.from('users').select('id, name').limit(10),
        // Query con filtros
        () => supabase.from('users').select('*').eq('is_approved', true),
        // Query con joins (simulado con múltiples queries)
        () => supabase.from('contacts').select('*').limit(20),
        // Query de agregación
        () => supabase.from('contacts').select('*', { count: 'exact', head: true }),
        // Query compleja con filtros múltiples
        () => supabase.from('contacts')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50)
      ];

      const queryResults = [];
      let totalErrors = 0;
      
      for (let i = 0; i < 5; i++) {
        for (const query of queries) {
          const startTime = performance.now();
          
          try {
            const { data, error } = await query();
            const endTime = performance.now();
            const queryTime = endTime - startTime;
            
            if (error) {
              totalErrors++;
              this.errors.push({ type: 'database', error: error.message });
            } else {
              queryResults.push(queryTime);
              this.metrics.database.queryTimes.push(queryTime);
            }
          } catch (error) {
            totalErrors++;
            this.errors.push({ type: 'database', error: error.message });
          }
        }
      }
      
      // Calcular métricas
      if (queryResults.length > 0) {
        const avgQueryTime = queryResults.reduce((a, b) => a + b, 0) / queryResults.length;
        const maxQueryTime = Math.max(...queryResults);
        const minQueryTime = Math.min(...queryResults);
        
        this.metrics.database.avgQueryTime = avgQueryTime;
        this.metrics.database.maxQueryTime = maxQueryTime;
        this.metrics.database.minQueryTime = minQueryTime;
        this.metrics.database.errorRate = (totalErrors / (queryResults.length + totalErrors)) * 100;
        
        console.log(`📊 Tiempo promedio de query: ${avgQueryTime.toFixed(2)}ms`);
        console.log(`📊 Tiempo máximo de query: ${maxQueryTime.toFixed(2)}ms`);
        console.log(`📊 Tasa de errores: ${this.metrics.database.errorRate.toFixed(2)}%`);
      }
      
    } catch (error) {
      console.error('❌ Error midiendo rendimiento de BD:', error);
      this.errors.push({ type: 'database_performance', error: error.message });
    }
  }

  async measureConcurrentOperations() {
    console.log('🔄 Midiendo operaciones concurrentes...');
    
    try {
      const concurrentUsers = 20;
      const operationsPerUser = 10;
      const startTime = performance.now();
      
      // Crear operaciones concurrentes
      const operations = [];
      
      for (let user = 0; user < concurrentUsers; user++) {
        const userId = this.testUsers[user % this.testUsers.length].id;
        
        for (let op = 0; op < operationsPerUser; op++) {
          operations.push(
            this.simulateUserOperation(userId, op)
          );
        }
      }
      
      // Ejecutar todas las operaciones concurrentemente
      const results = await Promise.allSettled(operations);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const successfulOps = results.filter(r => r.status === 'fulfilled').length;
      const failedOps = results.filter(r => r.status === 'rejected').length;
      
      this.metrics.application.concurrentUsers = concurrentUsers;
      this.metrics.application.operationsPerSecond = (successfulOps / (totalTime / 1000));
      this.metrics.application.concurrencySuccessRate = (successfulOps / operations.length) * 100;
      
      console.log(`👥 Usuarios concurrentes: ${concurrentUsers}`);
      console.log(`⚡ Operaciones por segundo: ${this.metrics.application.operationsPerSecond.toFixed(2)}`);
      console.log(`✅ Tasa de éxito concurrente: ${this.metrics.application.concurrencySuccessRate.toFixed(2)}%`);
      
      // Registrar errores de concurrencia
      results.filter(r => r.status === 'rejected').forEach(result => {
        this.errors.push({ 
          type: 'concurrency', 
          error: result.reason?.message || 'Unknown concurrency error' 
        });
      });
      
    } catch (error) {
      console.error('❌ Error midiendo concurrencia:', error);
      this.errors.push({ type: 'concurrency_measurement', error: error.message });
    }
  }

  async simulateUserOperation(userId, operationId) {
    const operations = [
      // Crear contacto
      async () => {
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            name: `Perf Contact ${operationId}`,
            email: `perf-contact-${userId}-${operationId}@test.com`,
            user_id: userId,
            status: 'active'
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },
      
      // Leer contactos
      async () => {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_id', userId)
          .limit(10);
        
        if (error) throw error;
        return data;
      },
      
      // Actualizar contacto
      async () => {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
        
        if (contacts && contacts.length > 0) {
          const { data, error } = await supabase
            .from('contacts')
            .update({ company: `Updated Company ${operationId}` })
            .eq('id', contacts[0].id)
            .select();
          
          if (error) throw error;
          return data;
        }
        return null;
      }
    ];
    
    const operation = operations[operationId % operations.length];
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.metrics.application.responseTime.push(responseTime);
      return { success: true, responseTime, result };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.metrics.application.responseTime.push(responseTime);
      throw error;
    }
  }

  measureSystemResources() {
    console.log('💻 Midiendo recursos del sistema...');
    
    try {
      // Memoria
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      this.metrics.system.memoryUsage.push({
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: memoryUsagePercent
      });
      
      // CPU (simulado - en producción usarías librerías específicas)
      const cpuCount = os.cpus().length;
      const loadAvg = os.loadavg();
      
      this.metrics.system.cpuUsage.push({
        cores: cpuCount,
        loadAverage: loadAvg,
        utilization: Math.min((loadAvg[0] / cpuCount) * 100, 100)
      });
      
      console.log(`💾 Uso de memoria: ${memoryUsagePercent.toFixed(2)}%`);
      console.log(`🔧 Cores CPU: ${cpuCount}`);
      console.log(`📈 Load average: ${loadAvg[0].toFixed(2)}`);
      
    } catch (error) {
      console.error('❌ Error midiendo recursos del sistema:', error);
      this.errors.push({ type: 'system_resources', error: error.message });
    }
  }

  async measureNetworkLatency() {
    console.log('🌐 Midiendo latencia de red...');
    
    try {
      const latencyTests = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        try {
          await supabase.from('users').select('id').limit(1);
          const endTime = performance.now();
          const latency = endTime - startTime;
          latencyTests.push(latency);
        } catch (error) {
          this.errors.push({ type: 'network_latency', error: error.message });
        }
      }
      
      if (latencyTests.length > 0) {
        const avgLatency = latencyTests.reduce((a, b) => a + b, 0) / latencyTests.length;
        const maxLatency = Math.max(...latencyTests);
        const minLatency = Math.min(...latencyTests);
        
        this.metrics.system.networkLatency = {
          average: avgLatency,
          maximum: maxLatency,
          minimum: minLatency,
          samples: latencyTests
        };
        
        console.log(`🌐 Latencia promedio: ${avgLatency.toFixed(2)}ms`);
        console.log(`🌐 Latencia máxima: ${maxLatency.toFixed(2)}ms`);
      }
      
    } catch (error) {
      console.error('❌ Error midiendo latencia:', error);
      this.errors.push({ type: 'network_measurement', error: error.message });
    }
  }

  calculatePerformanceScore() {
    let score = 100;
    const penalties = [];
    
    // Penalizar por tiempo de query alto
    if (this.metrics.database.avgQueryTime > 1000) {
      const penalty = Math.min(30, (this.metrics.database.avgQueryTime - 1000) / 100);
      score -= penalty;
      penalties.push(`Query time penalty: -${penalty.toFixed(1)}`);
    }
    
    // Penalizar por alta tasa de errores
    if (this.metrics.database.errorRate > 5) {
      const penalty = Math.min(25, this.metrics.database.errorRate);
      score -= penalty;
      penalties.push(`Error rate penalty: -${penalty.toFixed(1)}`);
    }
    
    // Penalizar por baja concurrencia
    if (this.metrics.application.concurrencySuccessRate < 90) {
      const penalty = (90 - this.metrics.application.concurrencySuccessRate) / 2;
      score -= penalty;
      penalties.push(`Concurrency penalty: -${penalty.toFixed(1)}`);
    }
    
    // Penalizar por alta latencia
    if (this.metrics.system.networkLatency?.average > 500) {
      const penalty = Math.min(20, (this.metrics.system.networkLatency.average - 500) / 50);
      score -= penalty;
      penalties.push(`Latency penalty: -${penalty.toFixed(1)}`);
    }
    
    return {
      score: Math.max(0, score),
      penalties,
      grade: this.getPerformanceGrade(score)
    };
  }

  getPerformanceGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  generateReport() {
    this.metrics.endTime = Date.now();
    const totalDuration = this.metrics.endTime - this.metrics.startTime;
    const performanceScore = this.calculatePerformanceScore();
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      performanceScore,
      metrics: {
        database: {
          ...this.metrics.database,
          queryCount: this.metrics.database.queryTimes.length
        },
        system: this.metrics.system,
        application: {
          ...this.metrics.application,
          avgResponseTime: this.metrics.application.responseTime.length > 0 
            ? this.metrics.application.responseTime.reduce((a, b) => a + b, 0) / this.metrics.application.responseTime.length
            : 0
        }
      },
      errors: this.errors,
      recommendations: this.generateRecommendations(performanceScore)
    };
    
    return report;
  }

  generateRecommendations(performanceScore) {
    const recommendations = [];
    
    if (this.metrics.database.avgQueryTime > 1000) {
      recommendations.push('Optimizar queries de base de datos - considerar índices adicionales');
    }
    
    if (this.metrics.database.errorRate > 5) {
      recommendations.push('Investigar y corregir errores de base de datos');
    }
    
    if (this.metrics.application.concurrencySuccessRate < 90) {
      recommendations.push('Mejorar manejo de concurrencia y pool de conexiones');
    }
    
    if (this.metrics.system.networkLatency?.average > 500) {
      recommendations.push('Optimizar latencia de red - considerar CDN o servidor más cercano');
    }
    
    if (this.metrics.application.operationsPerSecond < 10) {
      recommendations.push('Mejorar throughput del sistema - optimizar código y recursos');
    }
    
    if (performanceScore.score < 70) {
      recommendations.push('CRÍTICO: Rendimiento por debajo del mínimo aceptable para producción');
    }
    
    if (this.errors.length > 10) {
      recommendations.push('Reducir número de errores antes del deployment');
    }
    
    return recommendations;
  }

  async run() {
    try {
      await this.setup();
      
      console.log('\n📊 INICIANDO ANÁLISIS DE MÉTRICAS DE RENDIMIENTO\n');
      
      await this.measureDatabasePerformance();
      await this.measureConcurrentOperations();
      this.measureSystemResources();
      await this.measureNetworkLatency();
      
      const report = this.generateReport();
      
      // Guardar reporte
      const reportPath = path.join(__dirname, 'reports', `performance-metrics-${Date.now()}.json`);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log('\n📊 REPORTE DE MÉTRICAS DE RENDIMIENTO');
      console.log('=====================================');
      console.log(`🎯 Puntuación de rendimiento: ${report.performanceScore.score.toFixed(1)}/100 (${report.performanceScore.grade})`);
      console.log(`⏱️  Duración total: ${Math.round(report.duration / 1000)}s`);
      console.log(`🗄️  Tiempo promedio de query: ${report.metrics.database.avgQueryTime?.toFixed(2) || 'N/A'}ms`);
      console.log(`🔄 Operaciones por segundo: ${report.metrics.application.operationsPerSecond.toFixed(2)}`);
      console.log(`🌐 Latencia promedio: ${report.metrics.system.networkLatency?.average?.toFixed(2) || 'N/A'}ms`);
      console.log(`❌ Total de errores: ${report.errors.length}`);
      
      if (report.performanceScore.penalties.length > 0) {
        console.log('\n⚠️  PENALIZACIONES:');
        report.performanceScore.penalties.forEach(penalty => {
          console.log(`   ${penalty}`);
        });
      }
      
      if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMENDACIONES:');
        report.recommendations.forEach((rec, i) => {
          console.log(`${i + 1}. ${rec}`);
        });
      }
      
      console.log(`\n📄 Reporte guardado en: ${reportPath}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Error crítico en métricas de rendimiento:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Exportar para uso como módulo
module.exports = { PerformanceMetricsRunner };

// Ejecutar directamente si es el archivo principal
if (require.main === module) {
  const runner = new PerformanceMetricsRunner();
  runner.run().catch(console.error);
}