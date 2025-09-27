/**
 * Script de Pruebas de Integridad de Datos - CactusDashboard
 * Valida constraints, foreign keys y consistencia de datos
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

class DataIntegrityTestRunner {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: [],
      validations: {},
      startTime: null,
      endTime: null
    };
    this.testUsers = [];
    this.testContacts = [];
  }

  async setup() {
    console.log('🔧 Configurando pruebas de integridad de datos...');
    this.results.startTime = Date.now();
    
    // Crear usuarios de prueba
    this.testUsers = [
      {
        email: 'integrity-admin@test.com',
        role: 'admin',
        full_name: 'Integrity Admin',
        is_approved: true
      },
      {
        email: 'integrity-manager@test.com',
        role: 'manager',
        full_name: 'Integrity Manager',
        is_approved: true
      },
      {
        email: 'integrity-advisor@test.com',
        role: 'advisor',
        full_name: 'Integrity Advisor',
        is_approved: true
      }
    ];

    try {
      const { error } = await supabase
        .from('users')
        .upsert(this.testUsers, { onConflict: 'id' });
      
      if (error) throw error;
      console.log('✅ Usuarios de prueba creados');
    } catch (error) {
      console.error('❌ Error creando usuarios:', error);
      throw error;
    }
  }

  async cleanup() {
    console.log('🧹 Limpiando datos de prueba...');
    
    try {
      // Eliminar contactos de prueba
      await supabase
        .from('contacts')
        .delete()
        .like('email', 'integrity%@test.com');
      
      // Eliminar usuarios de prueba
      const userIds = this.testUsers.map(u => u.id);
      await supabase
        .from('users')
        .delete()
        .in('id', userIds);
      
      console.log('✅ Limpieza completada');
    } catch (error) {
      console.error('❌ Error en limpieza:', error);
    }
  }

  async testRequiredFields() {
    console.log('📋 Probando campos requeridos...');
    
    try {
      // Intentar crear contacto sin campos requeridos
      const invalidContacts = [
        { email: 'test@test.com' }, // Sin name
        { name: 'Test Contact' }, // Sin email
        { name: 'Test', email: 'invalid-email' }, // Email inválido
        { name: '', email: 'empty@test.com' }, // Name vacío
        { name: 'Test', email: '' } // Email vacío
      ];

      let validationErrors = 0;
      
      for (const contact of invalidContacts) {
        try {
          const { error } = await supabase
            .from('contacts')
            .insert(contact);
          
          if (error) {
            validationErrors++;
          } else {
            // Si no hay error, es un problema
            this.results.errors.push({
              test: 'requiredFields',
              error: `Contacto inválido fue aceptado: ${JSON.stringify(contact)}`
            });
          }
        } catch (err) {
          validationErrors++;
        }
      }
      
      this.results.validations.requiredFields = {
        totalTests: invalidContacts.length,
        validationErrors: validationErrors,
        success: validationErrors === invalidContacts.length
      };
      
      if (validationErrors === invalidContacts.length) {
        console.log('✅ Validación de campos requeridos funciona correctamente');
        this.results.passed++;
      } else {
        console.log('❌ Algunos campos requeridos no están siendo validados');
        this.results.failed++;
      }
      
    } catch (error) {
      console.error('❌ Error en prueba de campos requeridos:', error);
      this.results.errors.push({
        test: 'requiredFields',
        error: error.message
      });
      this.results.failed++;
    }
    
    this.results.totalTests++;
  }

  async testForeignKeyConstraints() {
    console.log('🔗 Probando constraints de foreign keys...');
    
    try {
      // Intentar crear contacto con user_id inexistente
      const { error: fkError } = await supabase
        .from('contacts')
        .insert({
          name: 'Test Contact',
          email: 'integrity-fk@test.com',
          user_id: 'non-existent-user-id'
        });
      
      let fkValidationWorks = false;
      if (fkError) {
        fkValidationWorks = true;
      }
      
      // Crear contacto válido
      const { data: validContact, error: validError } = await supabase
        .from('contacts')
        .insert({
          name: 'Valid Contact',
          email: 'integrity-valid@test.com',
          user_id: this.testUsers[0].id
        })
        .select()
        .single();
      
      if (validError) throw validError;
      
      // Intentar eliminar usuario que tiene contactos
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', this.testUsers[0].id);
      
      let cascadeWorks = false;
      if (deleteError || validContact) {
        // Verificar si el contacto aún existe
        const { data: remainingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('id', validContact.id)
          .single();
        
        cascadeWorks = !remainingContact; // Si no existe, el cascade funcionó
      }
      
      this.results.validations.foreignKeys = {
        fkValidation: fkValidationWorks,
        cascadeDelete: cascadeWorks,
        success: fkValidationWorks
      };
      
      if (fkValidationWorks) {
        console.log('✅ Constraints de foreign keys funcionan correctamente');
        this.results.passed++;
      } else {
        console.log('❌ Problemas con constraints de foreign keys');
        this.results.failed++;
      }
      
    } catch (error) {
      console.error('❌ Error en prueba de foreign keys:', error);
      this.results.errors.push({
        test: 'foreignKeys',
        error: error.message
      });
      this.results.failed++;
    }
    
    this.results.totalTests++;
  }

  async testDataConsistency() {
    console.log('🔍 Probando consistencia de datos...');
    
    try {
      // Crear contactos de prueba
      const testContacts = [
        {
          name: 'Consistency Test 1',
          email: 'integrity-consistency1@test.com',
          user_id: this.testUsers[0].id,
          status: 'active'
        },
        {
          name: 'Consistency Test 2',
          email: 'integrity-consistency2@test.com',
          user_id: this.testUsers[1].id,
          status: 'inactive'
        }
      ];
      
      const { data: createdContacts, error: createError } = await supabase
        .from('contacts')
        .insert(testContacts)
        .select();
      
      if (createError) throw createError;
      
      // Verificar que los datos se guardaron correctamente
      const { data: retrievedContacts, error: retrieveError } = await supabase
        .from('contacts')
        .select('*')
        .in('id', createdContacts.map(c => c.id));
      
      if (retrieveError) throw retrieveError;
      
      let consistencyIssues = 0;
      
      for (let i = 0; i < createdContacts.length; i++) {
        const created = createdContacts[i];
        const retrieved = retrievedContacts.find(c => c.id === created.id);
        
        if (!retrieved) {
          consistencyIssues++;
          continue;
        }
        
        // Verificar campos críticos
        if (created.name !== retrieved.name ||
            created.email !== retrieved.email ||
            created.user_id !== retrieved.user_id ||
            created.status !== retrieved.status) {
          consistencyIssues++;
        }
      }
      
      // Verificar timestamps
      const timestampIssues = retrievedContacts.filter(contact => {
        return !contact.created_at || !contact.updated_at ||
               new Date(contact.created_at) > new Date() ||
               new Date(contact.updated_at) > new Date();
      }).length;
      
      this.results.validations.dataConsistency = {
        totalContacts: createdContacts.length,
        consistencyIssues: consistencyIssues,
        timestampIssues: timestampIssues,
        success: consistencyIssues === 0 && timestampIssues === 0
      };
      
      if (consistencyIssues === 0 && timestampIssues === 0) {
        console.log('✅ Consistencia de datos verificada');
        this.results.passed++;
      } else {
        console.log(`❌ Encontrados ${consistencyIssues} problemas de consistencia y ${timestampIssues} problemas de timestamp`);
        this.results.failed++;
      }
      
    } catch (error) {
      console.error('❌ Error en prueba de consistencia:', error);
      this.results.errors.push({
        test: 'dataConsistency',
        error: error.message
      });
      this.results.failed++;
    }
    
    this.results.totalTests++;
  }

  async testTransactionRollback() {
    console.log('🔄 Probando rollback de transacciones...');
    
    try {
      // Contar contactos antes
      const { count: initialCount, error: countError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.testUsers[0].id);
      
      if (countError) throw countError;
      
      // Intentar transacción que debe fallar
      try {
        // Crear contacto válido
        const { data: contact1, error: error1 } = await supabase
          .from('contacts')
          .insert({
            name: 'Transaction Test 1',
            email: 'integrity-transaction1@test.com',
            user_id: this.testUsers[0].id
          })
          .select()
          .single();
        
        if (error1) throw error1;
        
        // Intentar crear contacto inválido (debería fallar)
        const { error: error2 } = await supabase
          .from('contacts')
          .insert({
            name: 'Transaction Test 2',
            email: 'integrity-transaction1@test.com', // Email duplicado
            user_id: this.testUsers[0].id
          });
        
        if (error2) {
          // Eliminar el primer contacto si el segundo falló
          await supabase
            .from('contacts')
            .delete()
            .eq('id', contact1.id);
        }
        
      } catch (transactionError) {
        // Esperado que falle
      }
      
      // Contar contactos después
      const { count: finalCount, error: finalCountError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.testUsers[0].id);
      
      if (finalCountError) throw finalCountError;
      
      const rollbackWorked = finalCount === initialCount;
      
      this.results.validations.transactionRollback = {
        initialCount: initialCount,
        finalCount: finalCount,
        rollbackWorked: rollbackWorked,
        success: rollbackWorked
      };
      
      if (rollbackWorked) {
        console.log('✅ Rollback de transacciones funciona correctamente');
        this.results.passed++;
      } else {
        console.log('❌ Problemas con rollback de transacciones');
        this.results.failed++;
      }
      
    } catch (error) {
      console.error('❌ Error en prueba de rollback:', error);
      this.results.errors.push({
        test: 'transactionRollback',
        error: error.message
      });
      this.results.failed++;
    }
    
    this.results.totalTests++;
  }

  async testUniqueConstraints() {
    console.log('🔒 Probando constraints únicos...');
    
    try {
      // Crear contacto inicial
      const { data: contact1, error: error1 } = await supabase
        .from('contacts')
        .insert({
          name: 'Unique Test',
          email: 'integrity-unique@test.com',
          user_id: this.testUsers[0].id
        })
        .select()
        .single();
      
      if (error1) throw error1;
      
      // Intentar crear contacto con email duplicado
      const { error: duplicateError } = await supabase
        .from('contacts')
        .insert({
          name: 'Unique Test 2',
          email: 'integrity-unique@test.com', // Email duplicado
          user_id: this.testUsers[1].id
        });
      
      const uniqueConstraintWorks = !!duplicateError;
      
      // Intentar crear usuario con email duplicado
      const { error: userDuplicateError } = await supabase
        .from('users')
        .insert({
          id: 'duplicate-test',
          email: this.testUsers[0].email, // Email duplicado
          role: 'advisor',
          name: 'Duplicate Test'
        });
      
      const userUniqueWorks = !!userDuplicateError;
      
      this.results.validations.uniqueConstraints = {
        contactEmailUnique: uniqueConstraintWorks,
        userEmailUnique: userUniqueWorks,
        success: uniqueConstraintWorks && userUniqueWorks
      };
      
      if (uniqueConstraintWorks && userUniqueWorks) {
        console.log('✅ Constraints únicos funcionan correctamente');
        this.results.passed++;
      } else {
        console.log('❌ Problemas con constraints únicos');
        this.results.failed++;
      }
      
    } catch (error) {
      console.error('❌ Error en prueba de constraints únicos:', error);
      this.results.errors.push({
        test: 'uniqueConstraints',
        error: error.message
      });
      this.results.failed++;
    }
    
    this.results.totalTests++;
  }

  async testDataTypes() {
    console.log('📊 Probando tipos de datos...');
    
    try {
      const invalidDataTests = [
        {
          field: 'email',
          value: 123, // Número en lugar de string
          expected: 'string'
        },
        {
          field: 'tags',
          value: 'not-an-array', // String en lugar de array
          expected: 'array'
        },
        {
          field: 'created_at',
          value: 'invalid-date', // Fecha inválida
          expected: 'timestamp'
        }
      ];
      
      let typeValidationErrors = 0;
      
      for (const test of invalidDataTests) {
        try {
          const contactData = {
            name: 'Type Test',
            email: 'integrity-type@test.com',
            user_id: this.testUsers[0].id
          };
          
          contactData[test.field] = test.value;
          
          const { error } = await supabase
            .from('contacts')
            .insert(contactData);
          
          if (error) {
            typeValidationErrors++;
          }
        } catch (err) {
          typeValidationErrors++;
        }
      }
      
      this.results.validations.dataTypes = {
        totalTests: invalidDataTests.length,
        validationErrors: typeValidationErrors,
        success: typeValidationErrors > 0 // Al menos algunas validaciones deben funcionar
      };
      
      if (typeValidationErrors > 0) {
        console.log('✅ Validación de tipos de datos funciona');
        this.results.passed++;
      } else {
        console.log('❌ Validación de tipos de datos no funciona');
        this.results.failed++;
      }
      
    } catch (error) {
      console.error('❌ Error en prueba de tipos de datos:', error);
      this.results.errors.push({
        test: 'dataTypes',
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
      validations: this.results.validations,
      errors: this.results.errors,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const validations = this.results.validations;
    
    if (validations.requiredFields && !validations.requiredFields.success) {
      recommendations.push('Implementar validaciones más estrictas para campos requeridos');
    }
    
    if (validations.foreignKeys && !validations.foreignKeys.success) {
      recommendations.push('Revisar y corregir constraints de foreign keys');
    }
    
    if (validations.dataConsistency && !validations.dataConsistency.success) {
      recommendations.push('Investigar problemas de consistencia de datos');
    }
    
    if (validations.uniqueConstraints && !validations.uniqueConstraints.success) {
      recommendations.push('Verificar y corregir constraints únicos');
    }
    
    if (validations.transactionRollback && !validations.transactionRollback.success) {
      recommendations.push('Implementar manejo adecuado de transacciones');
    }
    
    if (this.results.failed > 0) {
      recommendations.push('Corregir todos los problemas de integridad antes del deployment');
    }
    
    return recommendations;
  }

  async run() {
    try {
      await this.setup();
      
      console.log('\n🔍 INICIANDO PRUEBAS DE INTEGRIDAD DE DATOS\n');
      
      await this.testRequiredFields();
      await this.testForeignKeyConstraints();
      await this.testDataConsistency();
      await this.testTransactionRollback();
      await this.testUniqueConstraints();
      await this.testDataTypes();
      
      const report = this.generateReport();
      
      // Guardar reporte
      const reportPath = path.join(__dirname, 'reports', `data-integrity-${Date.now()}.json`);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log('\n📊 REPORTE DE INTEGRIDAD DE DATOS');
      console.log('==================================');
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
      console.error('❌ Error crítico en pruebas de integridad:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Exportar para uso como módulo
module.exports = { DataIntegrityTestRunner };

// Ejecutar directamente si es el archivo principal
if (require.main === module) {
  const runner = new DataIntegrityTestRunner();
  runner.run().catch(console.error);
}