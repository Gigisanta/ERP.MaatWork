/**
 * Seed Portfolios
 *
 * Seeds portfolio templates and client portfolio assignments.
 * Uses actual schema:
 * - portfolios: name, description, createdByUserId
 * - portfolioLines: portfolioId, targetType (asset_class|instrument), assetClass, targetWeight
 * - clientPortfolioAssignments: contactId, portfolioId, status, startDate, createdByUserId
 */

import { db } from '../index';
import {
  portfolios,
  portfolioLines,
  clientPortfolioAssignments,
  contacts,
  users,
} from '../schema';
import { eq, and } from 'drizzle-orm';
import { getRandomElement, getRandomDateOnly } from './helpers';
import { type SeedVolume } from './index';

// Portfolio template data
const PORTFOLIO_TEMPLATES = [
  {
    code: 'AGG_CONSERVATIVE',
    name: 'Conservador',
    description: 'Cartera conservadora con énfasis en renta fija',
    lines: [
      { assetClass: 'fixed_income', targetWeight: '0.6000' },
      { assetClass: 'equity', targetWeight: '0.2000' },
      { assetClass: 'cash', targetWeight: '0.2000' },
    ],
  },
  {
    code: 'AGG_MODERATE',
    name: 'Moderado',
    description: 'Cartera balanceada con mix de activos',
    lines: [
      { assetClass: 'equity', targetWeight: '0.4000' },
      { assetClass: 'fixed_income', targetWeight: '0.4000' },
      { assetClass: 'cash', targetWeight: '0.1000' },
      { assetClass: 'real_estate', targetWeight: '0.1000' },
    ],
  },
  {
    code: 'AGG_AGGRESSIVE',
    name: 'Agresivo',
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
  advisorUsers: (typeof users.$inferSelect)[],
  volume: SeedVolume = 'normal'
) {
  // eslint-disable-next-line no-console
  console.log(`💼 Seeding portfolios... (Volume: ${volume})`);

  const createdPortfolios: (typeof portfolios.$inferSelect)[] = [];

  // Check for existing portfolios
  const existingTemplates = await db()
    .select()
    .from(portfolios)
    .limit(5);

  if (existingTemplates.length >= 3) {
    // eslint-disable-next-line no-console
    console.log(
      `  ⊙ Portfolio templates already seeded: ${existingTemplates.length} templates found`
    );

    // Still try to assign to contacts if needed
    if (contactsList.length > 0) {
      await assignPortfoliosToContacts(existingTemplates, contactsList, advisorUsers);
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Portfolios seeded\n`);
    return existingTemplates;
  }

  const adminUser = advisorUsers[0];
  if (!adminUser) {
    // eslint-disable-next-line no-console
    console.log('  ⚠️ No users available for portfolio creation');
    return [];
  }

  // Create portfolio templates
  for (const templateData of PORTFOLIO_TEMPLATES) {
    const existing = await db()
      .select()
      .from(portfolios)
      .where(eq(portfolios.name, templateData.name))
      .limit(1);

    let portfolioRecord: typeof portfolios.$inferSelect;

    if (existing.length > 0) {
      portfolioRecord = existing[0]!;
    } else {
      const [newPortfolio] = await db()
        .insert(portfolios)
        .values({
          code: templateData.code,
          name: templateData.name,
          description: templateData.description,
          createdByUserId: adminUser.id,
        })
        .returning();
      
      portfolioRecord = newPortfolio!;
      // eslint-disable-next-line no-console
    console.log(`  ✓ Created template: ${templateData.name}`);
    }

    createdPortfolios.push(portfolioRecord);

    // Create template lines
    for (const line of templateData.lines) {
      // Check if line already exists for this portfolio and asset class
      const existingLine = await db()
        .select()
        .from(portfolioLines)
        .where(
          and(
            eq(portfolioLines.portfolioId, portfolioRecord.id),
            eq(portfolioLines.targetType, 'asset_class'),
            eq(portfolioLines.assetClass, line.assetClass)
          )
        )
        .limit(1);

      if (existingLine.length === 0) {
        await db()
          .insert(portfolioLines)
          .values({
            portfolioId: portfolioRecord.id,
            targetType: 'asset_class',
            assetClass: line.assetClass,
            targetWeight: line.targetWeight,
          })
          .onConflictDoNothing();
      }
    }
  }

  // Assign portfolios to contacts
  if (contactsList.length > 0) {
    await assignPortfoliosToContacts(createdPortfolios, contactsList, advisorUsers, volume);
  }

  // eslint-disable-next-line no-console
    console.log(`✅ Portfolios seeded: ${createdPortfolios.length} templates\n`);
  return createdPortfolios;
}

/**
 * Assign portfolio templates to contacts
 */
async function assignPortfoliosToContacts(
  templates: (typeof portfolios.$inferSelect)[],
  contactsList: (typeof contacts.$inferSelect)[],
  advisorUsers: (typeof users.$inferSelect)[],
  volume: SeedVolume = 'normal'
): Promise<void> {
  // eslint-disable-next-line no-console
    console.log('  📊 Assigning portfolios to contacts...');

  let assignmentsCreated = 0;
  // Assign to ~50% of contacts
  const contactsForPortfolios = contactsList.filter(() => Math.random() > 0.5);

  for (const contact of contactsForPortfolios) {
    // Check if already assigned
    const existing = await db()
      .select()
      .from(clientPortfolioAssignments)
      .where(eq(clientPortfolioAssignments.contactId, contact.id))
      .limit(1);

    if (existing.length > 0) continue;

    // Simply assign a random portfolio from templates
    const template = getRandomElement(templates);

    const advisor =
      advisorUsers.find((a) => a.id === contact.assignedAdvisorId) ??
      getRandomElement(advisorUsers);

    const startDate = getRandomDateOnly(90, 0);

    await db()
      .insert(clientPortfolioAssignments)
      .values({
        contactId: contact.id,
        portfolioId: template.id,
        status: 'active',
        startDate,
        createdByUserId: advisor.id,
      })
      .onConflictDoNothing();

    assignmentsCreated++;
  }

  // eslint-disable-next-line no-console
    console.log(`    ✓ Created ${assignmentsCreated} portfolio assignments`);
}
