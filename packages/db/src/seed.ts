import { db } from './index';
import { notificationTemplates } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Script de seeding para datos iniciales de EPIC B
 * Ejecutar con: pnpm -F @cactus/db tsx src/seed.ts
 */

async function seed() {
  console.log('🌱 Iniciando seeding de EPIC B...');

  try {
    // 1. Crear templates de notificaciones
    console.log('📧 Creando templates de notificaciones...');
    const templatesData = [
      {
        code: 'task_assigned',
        name: 'Tarea Asignada',
        description: 'Notificación cuando se asigna una tarea',
        subjectTemplate: 'Nueva tarea: {{taskTitle}}',
        bodyTemplate:
          'Se te ha asignado una nueva tarea:\n\n**{{taskTitle}}**\n\nContacto: {{contactName}}\nVencimiento: {{dueDate}}\nPrioridad: {{priority}}',
        pushTemplate: 'Nueva tarea: {{taskTitle}} - {{contactName}}',
        variables: ['taskTitle', 'contactName', 'dueDate', 'priority'],
        defaultChannel: 'in_app',
        isActive: true,
        version: 1,
      },
      {
        code: 'task_due_soon',
        name: 'Tarea Próxima a Vencer',
        description: 'Recordatorio de tarea próxima a vencer',
        subjectTemplate: 'Recordatorio: {{taskTitle}} vence pronto',
        bodyTemplate:
          'Tu tarea **{{taskTitle}}** vence {{dueIn}}.\n\nContacto: {{contactName}}\nVencimiento: {{dueDate}}',
        pushTemplate: 'Tarea vence pronto: {{taskTitle}}',
        variables: ['taskTitle', 'contactName', 'dueDate', 'dueIn'],
        defaultChannel: 'in_app',
        isActive: true,
        version: 1,
      },
      {
        code: 'sla_overdue',
        name: 'SLA Vencido',
        description: 'Alerta cuando un contacto supera el SLA',
        subjectTemplate: 'SLA Vencido: {{contactName}}',
        bodyTemplate:
          'El contacto **{{contactName}}** ha superado el tiempo de SLA configurado.\n\nÚltimo contacto: {{lastTouch}}\nEtapa: {{stage}}\n\nPor favor, realice el seguimiento correspondiente.',
        pushTemplate: 'SLA vencido: {{contactName}}',
        variables: ['contactName', 'lastTouch', 'stage'],
        defaultChannel: 'in_app',
        isActive: true,
        version: 1,
      },
      {
        code: 'sla_warning',
        name: 'SLA Advertencia',
        description: 'Advertencia cuando un contacto está cerca de vencer SLA',
        subjectTemplate: 'Advertencia SLA: {{contactName}}',
        bodyTemplate:
          'El contacto **{{contactName}}** está próximo a vencer el SLA.\n\nTiempo restante: {{timeRemaining}}\nÚltimo contacto: {{lastTouch}}',
        pushTemplate: 'SLA cerca de vencer: {{contactName}}',
        variables: ['contactName', 'timeRemaining', 'lastTouch'],
        defaultChannel: 'in_app',
        isActive: true,
        version: 1,
      },
      {
        code: 'contact_moved',
        name: 'Contacto Movido en Pipeline',
        description: 'Notificación cuando se mueve un contacto en el pipeline',
        subjectTemplate: '{{contactName}} movido a {{newStage}}',
        bodyTemplate:
          'El contacto **{{contactName}}** ha sido movido a la etapa **{{newStage}}**.\n\nEtapa anterior: {{oldStage}}\nMovido por: {{movedBy}}',
        pushTemplate: '{{contactName}} → {{newStage}}',
        variables: ['contactName', 'newStage', 'oldStage', 'movedBy'],
        defaultChannel: 'in_app',
        isActive: true,
        version: 1,
      },
      {
        code: 'note_mention',
        name: 'Mención en Nota',
        description: 'Notificación cuando se menciona a un usuario en una nota',
        subjectTemplate: '{{mentionedBy}} te mencionó en una nota',
        bodyTemplate:
          '**{{mentionedBy}}** te mencionó en una nota sobre **{{contactName}}**:\n\n{{notePreview}}',
        pushTemplate: '{{mentionedBy}} te mencionó en una nota',
        variables: ['mentionedBy', 'contactName', 'notePreview'],
        defaultChannel: 'in_app',
        isActive: true,
        version: 1,
      },
      {
        code: 'audio_transcribed',
        name: 'Audio Transcrito',
        description: 'Notificación cuando finaliza la transcripción de audio',
        subjectTemplate: 'Transcripción completada: {{contactName}}',
        bodyTemplate:
          'La transcripción del audio de **{{contactName}}** ha finalizado.\n\n**Resumen:**\n{{summary}}\n\n**Tags sugeridos:** {{tags}}',
        pushTemplate: 'Transcripción lista: {{contactName}}',
        variables: ['contactName', 'summary', 'tags'],
        defaultChannel: 'in_app',
        isActive: true,
        version: 1,
      },
    ];

    for (const template of templatesData) {
      try {
        await db().insert(notificationTemplates).values(template);
        console.log(`  ✓ Template creado: ${template.name}`);
      } catch (err: any) {
        type ErrorWithMessage = {
          message?: string;
        };
        const error = err as ErrorWithMessage;
        if (error.message?.includes('UNIQUE')) {
          console.log(`  ⊙ Template ya existe: ${template.name}`);
        } else {
          throw err;
        }
      }
    }

    console.log('✅ Seeding completado exitosamente!');
  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    process.exit(1);
  }
}

// Ejecutar seeding
seed()
  .then(() => {
    console.log('👋 Seeding finalizado. Puedes cerrar este proceso.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });

