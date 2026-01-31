import { db } from '..';
import { automationConfigs } from '../schema/automations';
import { eq } from 'drizzle-orm';

export const DEFAULT_AUTOMATIONS = [
  {
    name: 'segunda_reunion_webhook',
    displayName: 'Email Segunda Reunión',
    triggerType: 'pipeline_stage_change',
    triggerConfig: { stageName: 'Segunda reunion' },
    enabled: true,
    config: {
      subject: 'Confirmación Segunda Reunión',
      body: '<p>Hola {contact.firstName},</p><p>Te confirmamos la segunda reunión...</p>',
      senderEmail: '',
    },
  },
  {
    name: 'mail_bienvenida',
    displayName: 'Email de Bienvenida (Cliente)',
    triggerType: 'pipeline_stage_change',
    triggerConfig: { stageName: 'Cliente' },
    enabled: true,
    config: {
      subject: 'Bienvenido a Cactus',
      body: '<p>Hola {contact.firstName},</p><p>Bienvenido a bordo...</p>',
      senderEmail: '',
    },
  },
  {
    name: 'cumpleanos_saludo',
    displayName: 'Saludo de Cumpleaños',
    triggerType: 'date_match',
    triggerConfig: { field: 'birthDate', relativeDays: 0 },
    enabled: true,
    config: {
      subject: '¡Feliz Cumpleaños!',
      body: '<p>Hola {contact.firstName},</p><p>¡Que tengas un excelente día!</p>',
      senderEmail: '',
    },
  },
  {
    name: 'alerta_vip',
    displayName: 'Alerta Nuevo Cliente VIP',
    triggerType: 'pipeline_stage_change',
    triggerConfig: { stageName: 'Cliente' },
    enabled: true,
    config: {
      subject: 'NUEVO CLIENTE VIP: {contact.fullName}',
      body: 'Se ha cerrado un cliente con perfil de riesgo {contact.riskProfile}. Revisar portafolio.',
      senderEmail: '',
    },
  },
];

export async function seedAutomations() {
  // eslint-disable-next-line no-console
    console.log('  ➜ Seeding automations...');

  const createdConfigs = [];

  for (const automation of DEFAULT_AUTOMATIONS) {
    // Check if exists
    const [existing] = await db()
      .select()
      .from(automationConfigs)
      .where(eq(automationConfigs.name, automation.name))
      .limit(1);

    if (!existing) {
      const [created] = await db()
        .insert(automationConfigs)
        .values({
          ...automation,
          triggerConfig: automation.triggerConfig as Record<string, unknown>,
          config: automation.config as Record<string, unknown>,
        })
        .returning();

      createdConfigs.push(created);
    } else {
      // Optional: Update existing if needed, but for now we just skip to avoid overwriting user changes
      // If we wanted to enforce defaults:
      // await db().update(automationConfigs).set({...}).where(...)
    }
  }

  // eslint-disable-next-line no-console
    console.log(`  ✅ Seeded ${createdConfigs.length} new automation configs`);
  return createdConfigs;
}
