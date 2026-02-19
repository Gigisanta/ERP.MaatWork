/**
 * Seed Broker Data
 *
 * Seeds broker accounts and balances using actual schema structure.
 * brokerAccounts: broker (string), accountNumber, holderName, contactId, status
 * brokerBalances: brokerAccountId, asOfDate, currency, liquidBalance, totalBalance
 */

import { db } from '../index';
import { brokerAccounts, brokerBalances, contacts, users } from '../schema';
import { eq } from 'drizzle-orm';
import { getRandomElement, getRandomDateOnly } from './helpers';

// Broker constants
const BROKERS = ['balanz', 'iol', 'ppi', 'bullmarket', 'ibkr'];
const ACCOUNT_STATUSES = ['active', 'closed'];
const CURRENCIES = ['USD', 'ARS'];

/**
 * Create broker account for a contact
 */
async function createBrokerAccount(
  contact: typeof contacts.$inferSelect,
  advisor: typeof users.$inferSelect
): Promise<typeof brokerAccounts.$inferSelect | null> {
  const broker = getRandomElement(BROKERS);
  const accountNumber = `${broker.toUpperCase()}-${contact.dni ?? Math.random().toString(36).substring(7)}`;

  const existing = await db()
    .select()
    .from(brokerAccounts)
    .where(eq(brokerAccounts.accountNumber, accountNumber))
    .limit(1);

  if (existing.length > 0) return null;

  const [account] = await db()
    .insert(brokerAccounts)
    .values({
      contactId: contact.id,
      broker,
      accountNumber,
      holderName: contact.fullName,
      status: 'active',
    })
    .returning();

  return account;
}

/**
 * Create balance for a broker account
 */
async function createAccountBalance(account: typeof brokerAccounts.$inferSelect): Promise<void> {
  const today = new Date().toISOString().split('T')[0]!;

  const existingBalance = await db()
    .select()
    .from(brokerBalances)
    .where(eq(brokerBalances.brokerAccountId, account.id))
    .limit(1);

  if (existingBalance.length > 0) return;

  const liquidBalance = (Math.random() * 100000 + 10000).toFixed(6);
  const totalBalance = (parseFloat(liquidBalance) * (1 + Math.random() * 0.5)).toFixed(6);

  await db()
    .insert(brokerBalances)
    .values({
      brokerAccountId: account.id,
      asOfDate: today,
      currency: getRandomElement(CURRENCIES),
      liquidBalance,
      totalBalance,
    })
    .onConflictDoNothing();
}

/**
 * Seed broker data (accounts, balances)
 */
export async function seedBrokerData(
  contactsList: (typeof contacts.$inferSelect)[],
  advisorUsers: (typeof users.$inferSelect)[]
) {
  // eslint-disable-next-line no-console
    console.log('🏦 Seeding broker data...');

  // Check existing accounts
  const existingAccounts = await db().select().from(brokerAccounts).limit(20);
  if (existingAccounts.length >= 15) {
    // eslint-disable-next-line no-console
    console.log(`  ⊙ Broker accounts already seeded: ${existingAccounts.length} accounts found\n`);
    return { accounts: existingAccounts };
  }

  const createdAccounts: (typeof brokerAccounts.$inferSelect)[] = [];

  // Create accounts for some contacts
  const clientContacts = contactsList.filter(() => Math.random() > 0.5).slice(0, 15);

  for (const contact of clientContacts) {
    const advisor =
      advisorUsers.find((a) => a.id === contact.assignedAdvisorId) ??
      getRandomElement(advisorUsers);

    const account = await createBrokerAccount(contact, advisor);
    if (account) {
      createdAccounts.push(account);
      await createAccountBalance(account);
      // eslint-disable-next-line no-console
    console.log(`  ✓ Created account ${account.accountNumber} for ${contact.fullName}`);
    }
  }

  // eslint-disable-next-line no-console
    console.log(`✅ Broker data seeded: ${createdAccounts.length} accounts\n`);
  return { accounts: createdAccounts };
}
