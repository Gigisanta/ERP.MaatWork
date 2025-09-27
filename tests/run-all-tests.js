/**
 * Script Principal de Pruebas - CactusDashboard
 * Ejecuta todas las pruebas y genera reporte consolidado
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Importar todos los módulos de prueba
const { DataIsolationTestRunner } = require('./data-isolation.test.js');
const { ConcurrencyTestRunner } = require('./concurrency.test.js');
const { StressTestRunner } = require('./stress.test.js');
const { DataIntegrityTestRunner } = require('./data-integrity.test.js');
const { CriticalFunctionalityTestRunner } = require('./critical-functionality.test.js');
const { PerformanceMetricsRunner } = require('./performance-metrics.test.js');

class MasterTestRunner {
  constructor() {
    this.results = {
      startTime: null,
      endTime: null,
      totalDuration: 0,
      testSuites: {},
      overallStatus: 'UNKNOWN',
      readyForProduction: false,
      criticalIssues: [],
      warnings: [],
      recommendations: []
    };
    this.runners = {
      dataIsolation: new DataIsolationTestRunner(),
      concurrency: new ConcurrencyTestRunner(),
      stress: new StressTestRunner(),
      dataIntegrity: new DataIntegrityTestRunner(),
      criticalFunctionality: new CriticalFunctionalityTestRunner(),
      performanceMetrics: new PerformanceMetricsRunner()
    };
  }

  async runTestSuite(suiteName, runner, isOptional = false) {
    console.log(`\n🔄 Ejecutando ${suiteName}...`);
    const startTime = Date.now();
    
    try {
      const result = await runner.run();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.results.testSuites[suiteName] = {
        status: 'COMPLETED',
        duration,
        result,
        isOptional,
        success: this.evaluateTestSuccess(result, suiteName)
      };
      
      console.log(`✅ ${suiteName} completado en ${Math.round(duration / 1000)}s`);
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.results.testSuites[suiteName] = {
        status: 'FAILED',
        duration,
        error: error.message,
        isOptional,
        success: false
      };
      
      console.error(`❌ ${suiteName} falló: ${error.message}`);
      
      if (!isOptional) {
        this.results.criticalIssues.push(`${suiteName}: ${error.message}`);
      } else {
        this.results.warnings.push(`${suiteName}: ${error.message}`);
      }
    }
  }

  evaluateTestSuccess(result, suiteName) {
    if (!result) return false;
    
    switch (suiteName) {
      case 'dataIsolation':
        return result.summary?.successRate >= 90;
      
      case 'concurrency':
        return result.summary?.successRate >= 85;
      
      case 'stress':
        return result.summary?.successRate >= 80 && 
               result.recommendations?.length < 3;
      
      case 'dataIntegrity':
        return result.summary?.successRate >= 95;
      
      case 'criticalFunctionality':
        return result.summary?.successRate >= 90;
      
      case 'performanceMetrics':
        return result.performanceScore?.score >= 70;
      
      default:
        return false;
    }
  }

  evaluateProductionReadiness() {
    const criticalTests = ['dataIsolation', 'dataIntegrity', 'criticalFunctionality'];
    const importantTests = ['concurrency', 'performanceMetrics'];
    const optionalTests = ['stress'];
    
    let criticalPassed = 0;
    let importantPassed = 0;
    let optionalPassed = 0;
    
    // Evaluar pruebas críticas
    criticalTests.forEach(testName => {
      const testResult = this.results.testSuites[testName];
      if (testResult && testResult.success) {
        criticalPassed++;
      }
    });
    
    // Evaluar pruebas importantes
    importantTests.forEach(testName => {
      const testResult = this.results.testSuites[testName];
      if (testResult && testResult.success) {
        importantPassed++;
      }
    });
    
    // Evaluar pruebas opcionales
    optionalTests.forEach(testName => {
      const testResult = this.results.testSuites[testName];
      if (testResult && testResult.success) {
        optionalPassed++;
      }
    });
    
    // Determinar estado general
    if (criticalPassed === criticalTests.length && importantPassed >= 1) {
      if (importantPassed === importantTests.length && optionalPassed === optionalTests.length) {
        this.results.overallStatus = 'EXCELLENT';
        this.results.readyForProduction = true;
      } else if (importantPassed === importantTests.length) {
        this.results.overallStatus = 'GOOD';
        this.results.readyForProduction = true;
      } else {
        this.results.overallStatus = 'ACCEPTABLE';
        this.results.readyForProduction = true;
      }
    } else {
      this.results.overallStatus = 'CRITICAL_ISSUES';
      this.results.readyForProduction = false;
    }
    
    return {
      criticalPassed,
      criticalTotal: criticalTests.length,
      importantPassed,
      importantTotal: importantTests.length,
      optionalPassed,
      optionalTotal: optionalTests.length
    };
  }

  generateConsolidatedRecommendations() {
    const recommendations = [];
    
    // Recomendaciones basadas en resultados de pruebas
    Object.entries(this.results.testSuites).forEach(([suiteName, suiteResult]) => {
      if (!suiteResult.success && suiteResult.result?.recommendations) {
        recommendations.push(...suiteResult.result.recommendations.map(rec => 
          `[${suiteName}] ${rec}`
        ));
      }
    });
    
    // Recomendaciones generales basadas en el estado
    if (!this.results.readyForProduction) {
      recommendations.unshift('🚨 CRÍTICO: El sistema NO está listo para producción');
    }
    
    if (this.results.criticalIssues.length > 0) {
      recommendations.push('Resolver todos los problemas críticos antes del deployment');
    }
    
    if (this.results.warnings.length > 3) {
      recommendations.push('Revisar y corregir las advertencias para mejorar la estabilidad');
    }
    
    // Recomendaciones específicas por tipo de problema
    const hasDataIssues = !this.results.testSuites.dataIsolation?.success || 
                         !this.results.testSuites.dataIntegrity?.success;
    if (hasDataIssues) {
      recommendations.push('Priorizar la corrección de problemas de datos y seguridad');
    }
    
    const hasPerformanceIssues = !this.results.testSuites.performanceMetrics?.success ||
                                !this.results.testSuites.stress?.success;
    if (hasPerformanceIssues) {
      recommendations.push('Optimizar rendimiento antes de manejar carga de producción');
    }
    
    this.results.recommendations = [...new Set(recommendations)];
  }

  generateExecutiveSummary() {
    const evaluation = this.evaluateProductionReadiness();
    
    return {
      status: this.results.overallStatus,
      readyForProduction: this.results.readyForProduction,
      testResults: {
        critical: `${evaluation.criticalPassed}/${evaluation.criticalTotal}`,
        important: `${evaluation.importantPassed}/${evaluation.importantTotal}`,
        optional: `${evaluation.optionalPassed}/${evaluation.optionalTotal}`
      },
      totalDuration: this.results.totalDuration,
      criticalIssuesCount: this.results.criticalIssues.length,
      warningsCount: this.results.warnings.length,
      recommendationsCount: this.results.recommendations.length
    };
  }

  async checkPrerequisites() {
    console.log('🔍 Verificando prerequisitos...');
    
    const checks = {
      nodeModules: fs.existsSync(path.join(process.cwd(), 'node_modules')),
      packageJson: fs.existsSync(path.join(process.cwd(), 'package.json')),
      envFile: fs.existsSync(path.join(process.cwd(), '.env')) || 
               fs.existsSync(path.join(process.cwd(), '.env.local')),
      supabaseConfig: process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY
    };
    
    const issues = [];
    
    if (!checks.nodeModules) {
      issues.push('node_modules no encontrado - ejecutar npm install');
    }
    
    if (!checks.packageJson) {
      issues.push('package.json no encontrado');
    }
    
    if (!checks.envFile) {
      issues.push('Archivo .env no encontrado');
    }
    
    if (!checks.supabaseConfig) {
      issues.push('Variables de entorno de Supabase no configuradas');
    }
    
    if (issues.length > 0) {
      console.log('❌ Problemas encontrados:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      throw new Error('Prerequisitos no cumplidos');
    }
    
    console.log('✅ Todos los prerequisitos cumplidos');
  }

  async run() {
    try {
      this.results.startTime = Date.now();
      
      console.log('🚀 INICIANDO SUITE COMPLETA DE PRUEBAS - CACTUS DASHBOARD');
      console.log('============================================================');
      
      // Verificar prerequisitos
      await this.checkPrerequisites();
      
      // Ejecutar todas las pruebas
      await this.runTestSuite('dataIsolation', this.runners.dataIsolation, false);
      await this.runTestSuite('concurrency', this.runners.concurrency, false);
      await this.runTestSuite('stress', this.runners.stress, true);
      await this.runTestSuite('dataIntegrity', this.runners.dataIntegrity, false);
      await this.runTestSuite('criticalFunctionality', this.runners.criticalFunctionality, false);
      await this.runTestSuite('performanceMetrics', this.runners.performanceMetrics, false);
      
      this.results.endTime = Date.now();
      this.results.totalDuration = this.results.endTime - this.results.startTime;
      
      // Evaluar resultados
      this.evaluateProductionReadiness();
      this.generateConsolidatedRecommendations();
      
      // Generar reporte final
      const finalReport = {
        timestamp: new Date().toISOString(),
        executiveSummary: this.generateExecutiveSummary(),
        detailedResults: this.results,
        testSuites: this.results.testSuites
      };
      
      // Guardar reporte consolidado
      const reportPath = path.join(__dirname, 'reports', `consolidated-test-report-${Date.now()}.json`);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
      
      // Mostrar resumen ejecutivo
      this.displayExecutiveSummary(finalReport.executiveSummary);
      
      console.log(`\n📄 Reporte consolidado guardado en: ${reportPath}`);
      
      return finalReport;
      
    } catch (error) {
      console.error('💥 Error crítico en suite de pruebas:', error);
      throw error;
    }
  }

  displayExecutiveSummary(summary) {
    console.log('\n📋 RESUMEN EJECUTIVO');
    console.log('====================');
    
    // Estado general
    const statusEmoji = {
      'EXCELLENT': '🟢',
      'GOOD': '🟡',
      'ACCEPTABLE': '🟠',
      'CRITICAL_ISSUES': '🔴'
    };
    
    console.log(`${statusEmoji[summary.status]} Estado: ${summary.status}`);
    console.log(`🚀 Listo para producción: ${summary.readyForProduction ? 'SÍ' : 'NO'}`);
    console.log(`⏱️  Duración total: ${Math.round(summary.totalDuration / 1000)}s`);
    
    // Resultados por categoría
    console.log('\n📊 RESULTADOS POR CATEGORÍA:');
    console.log(`   🔴 Críticas: ${summary.testResults.critical}`);
    console.log(`   🟡 Importantes: ${summary.testResults.important}`);
    console.log(`   🟢 Opcionales: ${summary.testResults.optional}`);
    
    // Problemas encontrados
    if (summary.criticalIssuesCount > 0) {
      console.log(`\n🚨 Problemas críticos: ${summary.criticalIssuesCount}`);
      this.results.criticalIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
    
    if (summary.warningsCount > 0) {
      console.log(`\n⚠️  Advertencias: ${summary.warningsCount}`);
      this.results.warnings.slice(0, 5).forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
      if (this.results.warnings.length > 5) {
        console.log(`   ... y ${this.results.warnings.length - 5} más`);
      }
    }
    
    // Recomendaciones principales
    if (summary.recommendationsCount > 0) {
      console.log(`\n💡 RECOMENDACIONES PRINCIPALES:`);
      this.results.recommendations.slice(0, 10).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
      if (this.results.recommendations.length > 10) {
        console.log(`   ... y ${this.results.recommendations.length - 10} más en el reporte detallado`);
      }
    }
    
    // Veredicto final
    console.log('\n🎯 VEREDICTO FINAL:');
    if (summary.readyForProduction) {
      console.log('✅ El sistema está LISTO para deployment en producción');
      if (summary.status === 'EXCELLENT') {
        console.log('🌟 Excelente calidad - deployment recomendado');
      } else if (summary.status === 'GOOD') {
        console.log('👍 Buena calidad - deployment aprobado');
      } else {
        console.log('⚠️  Calidad aceptable - monitorear de cerca en producción');
      }
    } else {
      console.log('❌ El sistema NO está listo para producción');
      console.log('🔧 Corregir problemas críticos antes del deployment');
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const masterRunner = new MasterTestRunner();
  
  masterRunner.run()
    .then(report => {
      const exitCode = report.executiveSummary.readyForProduction ? 0 : 1;
      console.log(`\n🏁 Suite de pruebas completada - Código de salida: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('💥 Fallo crítico en suite de pruebas:', error);
      process.exit(1);
    });
}

module.exports = MasterTestRunner;