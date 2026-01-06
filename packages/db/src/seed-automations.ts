/**
 * Seed Automation Configs
 *
 * Inserta configuraciones de automatización por defecto.
 * Ejecutar: pnpm -F @maatwork/db seed:automations
 */

import 'dotenv/config';
import { db, automationConfigs } from './index';
import { eq } from 'drizzle-orm';

const defaultAutomations = [
  {
    name: 'segunda_reunion_webhook',
    displayName: 'Email Segunda Reunión',
    triggerType: 'pipeline_stage_change',
    triggerConfig: { stageName: 'Segunda reunion' },
    enabled: false, // Disabled by default until user configures
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
    enabled: false, // Disabled by default until user configures
    config: {
      subject: 'Bienvenido a Cactus',
      body: '<p>Hola {contact.firstName},</p><p>Bienvenido a bordo...</p>',
      senderEmail: '',
    },
  },
];

async function seedAutomations() {
  console.log('🌱 Seeding automation configs...');

  for (const automation of defaultAutomations) {
    try {
      // Check if automation already exists
      const [existing] = await db()
        .select()
        .from(automationConfigs)
        .where(eq(automationConfigs.name, automation.name))
        .limit(1);

      if (existing) {
        console.log(`  ℹ️  Automation '${automation.name}' already exists. Skipping.`);
        continue;
      }

      // Insert new automation
      await db().insert(automationConfigs).values(automation);
      console.log(`  ✅ Created automation: ${automation.displayName}`);
    } catch (error) {
      console.error(`  ❌ Error creating automation '${automation.name}':`, error);
    }
  }

  console.log('✅ Automation configs seeded successfully!');
}

seedAutomations()
  .then(() => {
    console.log('✅ Automation seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Automation seed failed:', error);
    process.exit(1);
  });
