/**
 * Seed Portfolios
 *
 * Seeds portfolio templates and client portfolio assignments.
 * Uses actual schema:
 * - portfolioTemplates: name, description, riskLevel, createdByUserId
 * - portfolioTemplateLines: templateId, targetType (asset_class|instrument), assetClass, targetWeight
 * - clientPortfolioAssignments: contactId, templateId, status, startDate, createdByUserId
 */

import { db } from '../index';
import {
  portfolioTemplates,
  portfolioTemplateLines,
  clientPortfolioAssignments,
  contacts,
  users,
} from '../schema';
import { eq } from 'drizzle-orm';
import { getRandomElement, getRandomDateOnly } from './helpers';

// Portfolio template data
const PORTFOLIO_TEMPLATES = [
  {
    name: 'Conservador',
    riskLevel: 'low',
    description: 'Cartera conservadora con énfasis en renta fija',
    lines: [
      { assetClass: 'fixed_income', targetWeight: '0.6000' },
      { assetClass: 'equity', targetWeight: '0.2000' },
      { assetClass: 'cash', targetWeight: '0.2000' },
    ],
  },
  {
    name: 'Moderado',
    riskLevel: 'mid',
    description: 'Cartera balanceada con mix de activos',
    lines: [
      { assetClass: 'equity', targetWeight: '0.4000' },
      { assetClass: 'fixed_income', targetWeight: '0.4000' },
      { assetClass: 'cash', targetWeight: '0.1000' },
      { assetClass: 'real_estate', targetWeight: '0.1000' },
    ],
  },
  {
    name: 'Agresivo',
    riskLevel: 'high',
    description: 'Cartera de alto crecimiento',
    lines: [
      { assetClass: 'equity', targetWeight: '0.7000' },
      { assetClass: 'fixed_income', targetWeight: '0.1500' },
      { assetClass: 'crypto', targetWeight: '0.1000' },
      { assetClass: 'cash', targetWeight: '0.0500' },
    ],
  },
];

/**
 * Seed portfolio templates and assign to contacts
 */
export async function seedPortfolios(
  contactsList: (typeof contacts.$inferSelect)[],
  advisorUsers: (typeof users.$inferSelect)[]
) {
  console.log('💼 Seeding portfolios...');

  const createdTemplates: (typeof portfolioTemplates.$inferSelect)[] = [];

  // Check for existing templates
  const existingTemplates = await db().select().from(portfolioTemplates).limit(5);
  if (existingTemplates.length >= 3) {
    console.log(
      `  ⊙ Portfolio templates already seeded: ${existingTemplates.length} templates found`
    );

    // Still try to assign to contacts if needed
    if (contactsList.length > 0) {
      await assignPortfoliosToContacts(existingTemplates, contactsList, advisorUsers);
    }

    console.log(`✅ Portfolios seeded\n`);
    return existingTemplates;
  }

  const adminUser = advisorUsers[0];
  if (!adminUser) {
    console.log('  ⚠️ No users available for portfolio creation');
    return [];
  }

  // Create portfolio templates
  for (const templateData of PORTFOLIO_TEMPLATES) {
    const existing = await db()
      .select()
      .from(portfolioTemplates)
      .where(eq(portfolioTemplates.name, templateData.name))
      .limit(1);

    if (existing.length > 0) {
      createdTemplates.push(existing[0]!);
      continue;
    }

    const [template] = await db()
      .insert(portfolioTemplates)
      .values({
        name: templateData.name,
        riskLevel: templateData.riskLevel,
        description: templateData.description,
        createdByUserId: adminUser.id,
      })
      .returning();

    createdTemplates.push(template);
    console.log(`  ✓ Created template: ${templateData.name}`);

    // Create template lines
    for (const line of templateData.lines) {
      await db()
        .insert(portfolioTemplateLines)
        .values({
          templateId: template.id,
          targetType: 'asset_class',
          assetClass: line.assetClass,
          targetWeight: line.targetWeight,
        })
        .onConflictDoNothing();
    }
  }

  // Assign portfolios to contacts
  if (contactsList.length > 0) {
    await assignPortfoliosToContacts(createdTemplates, contactsList, advisorUsers);
  }

  console.log(`✅ Portfolios seeded: ${createdTemplates.length} templates\n`);
  return createdTemplates;
}

/**
 * Assign portfolio templates to contacts
 */
async function assignPortfoliosToContacts(
  templates: (typeof portfolioTemplates.$inferSelect)[],
  contactsList: (typeof contacts.$inferSelect)[],
  advisorUsers: (typeof users.$inferSelect)[]
): Promise<void> {
  console.log('  📊 Assigning portfolios to contacts...');

  let assignmentsCreated = 0;
  const contactsForPortfolios = contactsList.filter(() => Math.random() > 0.5).slice(0, 20);

  for (const contact of contactsForPortfolios) {
    // Check if already assigned
    const existing = await db()
      .select()
      .from(clientPortfolioAssignments)
      .where(eq(clientPortfolioAssignments.contactId, contact.id))
      .limit(1);

    if (existing.length > 0) continue;

    // Match template to contact's risk profile
    let template: typeof portfolioTemplates.$inferSelect;
    if (contact.riskProfile === 'low') {
      template = templates.find((t) => t.riskLevel === 'low') ?? getRandomElement(templates);
    } else if (contact.riskProfile === 'high') {
      template = templates.find((t) => t.riskLevel === 'high') ?? getRandomElement(templates);
    } else {
      template = templates.find((t) => t.riskLevel === 'mid') ?? getRandomElement(templates);
    }

    const advisor =
      advisorUsers.find((a) => a.id === contact.assignedAdvisorId) ??
      getRandomElement(advisorUsers);

    const startDate = getRandomDateOnly(90, 0);

    await db()
      .insert(clientPortfolioAssignments)
      .values({
        contactId: contact.id,
        templateId: template.id,
        status: 'active',
        startDate,
        createdByUserId: advisor.id,
      })
      .onConflictDoNothing();

    assignmentsCreated++;
  }

  console.log(`    ✓ Created ${assignmentsCreated} portfolio assignments`);
}
