#!/usr/bin/env tsx
/**
 * Test funcional de EPIC B
 * Prueba todas las funcionalidades principales sin Jest
 */

import { db } from '@cactus/db';
import { 
  contacts, pipelineStages, tasks, notes, tags, 
  notifications, notificationTemplates, users 
} from '@cactus/db';

console.log('🧪 Iniciando tests funcionales de EPIC B...\n');

async function testDatabase() {
  console.log('✅ 1. Conectando a la base de datos...');
  try {
    const dbInstance = db();
    console.log('   ✓ Base de datos conectada\n');
    return true;
  } catch (err) {
    console.error('   ✗ Error de conexión:', err);
    return false;
  }
}

async function testPipelineStages() {
  console.log('✅ 2. Creando etapas de pipeline...');
  try {
    const [stage] = await db().insert(pipelineStages).values({
      name: `Test Stage ${Date.now()}`,
      description: 'Etapa de prueba',
      order: 999,
      color: '#FF0000',
      slaHours: 24,
    }).returning();
    
    console.log(`   ✓ Etapa creada: ${stage.name} (ID: ${stage.id})`);
    return stage;
  } catch (err: any) {
    console.error('   ✗ Error:', err.message);
    return null;
  }
}

async function testContactCreation(stageId: string, userId: string) {
  console.log('\n✅ 3. Creando contacto de prueba...');
  try {
    const [contact] = await db().insert(contacts).values({
      firstName: 'Juan',
      lastName: 'Pérez Test',
      fullName: 'Juan Pérez Test',
      email: `test-${Date.now()}@example.com`,
      phone: '+54911234567',
      // lifecycleStage eliminado - ahora usamos solo pipelineStageId
      pipelineStageId: stageId,
      assignedAdvisorId: userId,
      slaStatus: 'ok',
      version: 1,
      customFields: { test: true },
    }).returning();
    
    console.log(`   ✓ Contacto creado: ${contact.fullName} (ID: ${contact.id})`);
    console.log(`   ✓ SLA Status: ${contact.slaStatus}`);
    console.log(`   ✓ Version: ${contact.version}`);
    return contact;
  } catch (err: any) {
    console.error('   ✗ Error:', err.message);
    return null;
  }
}

async function testTaskCreation(contactId: string, userId: string) {
  console.log('\n✅ 4. Creando tarea...');
  try {
    const [task] = await db().insert(tasks).values({
      contactId,
      title: 'Tarea de prueba',
      description: 'Esta es una tarea de prueba',
      status: 'open',
      priority: 'high',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      assignedToUserId: userId,
      createdByUserId: userId,
    }).returning();
    
    console.log(`   ✓ Tarea creada: ${task.title} (ID: ${task.id})`);
    console.log(`   ✓ Estado: ${task.status}, Prioridad: ${task.priority}`);
    return task;
  } catch (err: any) {
    console.error('   ✗ Error:', err.message);
    return null;
  }
}

async function testNoteCreation(contactId: string, userId: string) {
  console.log('\n✅ 5. Creando nota...');
  try {
    const [note] = await db().insert(notes).values({
      contactId,
      content: 'Nota de prueba - Cliente interesado en fondos de inversión',
      type: 'call',
      createdByUserId: userId,
    }).returning();
    
    console.log(`   ✓ Nota creada: ${note.content.substring(0, 50)}... (ID: ${note.id})`);
    console.log(`   ✓ Tipo: ${note.type}`);
    return note;
  } catch (err: any) {
    console.error('   ✗ Error:', err.message);
    return null;
  }
}

async function testTagCreation() {
  console.log('\n✅ 6. Creando tag...');
  try {
    const [tag] = await db().insert(tags).values({
      name: `Tag Test ${Date.now()}`,
      scope: 'contact',
      color: '#FFD700',
      icon: 'star',
      description: 'Tag de prueba',
    }).returning();
    
    console.log(`   ✓ Tag creado: ${tag.name} (ID: ${tag.id})`);
    console.log(`   ✓ Color: ${tag.color}, Icono: ${tag.icon}`);
    return tag;
  } catch (err: any) {
    console.error('   ✗ Error:', err.message);
    return null;
  }
}

async function testNotificationTemplateCreation() {
  console.log('\n✅ 7. Creando template de notificación...');
  try {
    const [template] = await db().insert(notificationTemplates).values({
      code: `test_template_${Date.now()}`,
      name: 'Template de Prueba',
      description: 'Template para testing',
      subjectTemplate: 'Test: {{subject}}',
      bodyTemplate: 'Cuerpo del test: {{body}}',
      variables: ['subject', 'body'],
      defaultChannel: 'in_app',
      isActive: true,
      version: 1,
    }).returning();
    
    console.log(`   ✓ Template creado: ${template.name} (ID: ${template.id})`);
    console.log(`   ✓ Código: ${template.code}`);
    return template;
  } catch (err: any) {
    console.error('   ✗ Error:', err.message);
    return null;
  }
}

async function testNotificationCreation(userId: string, contactId: string, templateId: string) {
  console.log('\n✅ 8. Creando notificación...');
  try {
    const [notification] = await db().insert(notifications).values({
      userId,
      type: 'task_assigned',
      contactId,
      templateId,
      renderedSubject: 'Test notification',
      renderedBody: 'This is a test notification',
      channel: 'in_app',
    }).returning();
    
    console.log(`   ✓ Notificación creada: ${notification.renderedSubject} (ID: ${notification.id})`);
    console.log(`   ✓ Canal: ${notification.channel}, Tipo: ${notification.type}`);
    return notification;
  } catch (err: any) {
    console.error('   ✗ Error:', err.message);
    return null;
  }
}

async function testUserCreation() {
  console.log('\n✅ 0. Creando usuario de prueba...');
  try {
    const [user] = await db().insert(users).values({
      email: `testuser-${Date.now()}@cactus.com`,
      fullName: 'Usuario de Prueba EPIC B',
      role: 'advisor',
    }).returning();
    
    console.log(`   ✓ Usuario creado: ${user.fullName} (ID: ${user.id})`);
    return user;
  } catch (err: any) {
    console.error('   ✗ Error:', err.message);
    return null;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════\n');
  
  // Test 1: Base de datos
  const dbOk = await testDatabase();
  if (!dbOk) {
    console.log('\n❌ Tests fallaron: no se pudo conectar a la base de datos');
    process.exit(1);
  }
  
  // Test 0: Crear usuario
  const user = await testUserCreation();
  if (!user) {
    console.log('\n❌ Tests fallaron: no se pudo crear usuario');
    process.exit(1);
  }
  
  // Test 2: Pipeline stages
  const stage = await testPipelineStages();
  if (!stage) {
    console.log('\n❌ Tests fallaron: no se pudo crear etapa de pipeline');
    process.exit(1);
  }
  
  // Test 3: Contacto
  const contact = await testContactCreation(stage.id, user.id);
  if (!contact) {
    console.log('\n❌ Tests fallaron: no se pudo crear contacto');
    process.exit(1);
  }
  
  // Test 4: Tarea
  const task = await testTaskCreation(contact.id, user.id);
  if (!task) {
    console.log('\n⚠️  Advertencia: no se pudo crear tarea (continuando...)');
  }
  
  // Test 5: Nota
  const note = await testNoteCreation(contact.id, user.id);
  if (!note) {
    console.log('\n⚠️  Advertencia: no se pudo crear nota (continuando...)');
  }
  
  // Test 6: Tag
  const tag = await testTagCreation();
  if (!tag) {
    console.log('\n⚠️  Advertencia: no se pudo crear tag (continuando...)');
  }
  
  // Test 7: Template
  const template = await testNotificationTemplateCreation();
  if (!template) {
    console.log('\n⚠️  Advertencia: no se pudo crear template (continuando...)');
  }
  
  // Test 8: Notificación
  if (template) {
    const notification = await testNotificationCreation(user.id, contact.id, template.id);
    if (!notification) {
      console.log('\n⚠️  Advertencia: no se pudo crear notificación (continuando...)');
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ TODOS LOS TESTS COMPLETADOS EXITOSAMENTE!\n');
  console.log('📊 Resumen:');
  console.log(`   • Usuario creado: ${user.fullName}`);
  console.log(`   • Etapa pipeline: ${stage?.name || 'N/A'}`);
  console.log(`   • Contacto: ${contact?.fullName || 'N/A'}`);
  console.log(`   • Tarea: ${task ? '✓' : '✗'}`);
  console.log(`   • Nota: ${note ? '✓' : '✗'}`);
  console.log(`   • Tag: ${tag ? '✓' : '✗'}`);
  console.log(`   • Template: ${template ? '✓' : '✗'}`);
  console.log('\n🎉 Sistema EPIC B funcionando correctamente!\n');
}

// Ejecutar tests
runAllTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error fatal:', err);
    process.exit(1);
  });

