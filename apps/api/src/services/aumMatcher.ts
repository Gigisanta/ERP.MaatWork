/**
 * AUM Matching Service
 * 
 * AI_DECISION: Extraer lógica de matching a servicio con batch queries y scores
 * Justificación: Evitar N+1 queries, separar responsabilidades, agregar confidence scores
 * Impacto: Mejor performance y claridad en lógica de matching
 */

import { db, contacts, brokerAccounts, users, advisorAliases } from '@cactus/db';
import { eq, sql } from 'drizzle-orm';
import { normalizeAdvisorAlias } from '../utils/aum-normalization';
import { AUM_LIMITS } from '../config/aum-limits';
import { logger } from '../utils/logger';

// ==========================================================
// Types
// ==========================================================

export interface ContactMatch {
  contactId: string;
  score: number;
  method: 'broker_account' | 'name_similarity' | 'name_exact';
}

export interface AdvisorMatch {
  userId: string;
  score: number;
  method: 'email' | 'alias';
}

export interface MatchResult {
  contactMatch: ContactMatch | null;
  advisorMatch: AdvisorMatch | null;
}

// ==========================================================
// Contact Matching Functions
// ==========================================================

/**
 * Match contact by broker account number (highest confidence)
 */
export async function matchContactByAccountNumber(
  broker: string,
  accountNumber: string
): Promise<ContactMatch | null> {
  const dbi = db();

  try {
    const result = await dbi
      .select({ contactId: brokerAccounts.contactId })
      .from(brokerAccounts)
      .where(eq(brokerAccounts.broker, broker as any))
      .where(eq(brokerAccounts.accountNumber, accountNumber))
      .limit(1);

    if (result.length > 0 && result[0].contactId) {
      return {
        contactId: result[0].contactId,
        score: 1.0, // Perfect match
        method: 'broker_account'
      };
    }
  } catch (error) {
    logger.warn({ err: error, accountNumber }, 'Error matching AUM row by account number');
  }

  return null;
}

/**
 * Match contact by holder name using similarity search
 */
export async function matchContactByHolderName(
  holderName: string
): Promise<ContactMatch | null> {
  const dbi = db();

  try {
    // Try pg_trgm similarity search first
    const result = await dbi.execute(sql`
      SELECT id, full_name,
             similarity(full_name, ${holderName}) as sim_score
      FROM contacts
      WHERE deleted_at IS NULL
        AND full_name % ${holderName}
      ORDER BY sim_score DESC
      LIMIT ${AUM_LIMITS.MAX_SIMILARITY_RESULTS}
    `);

    const rows = result.rows as Array<{ id: string; full_name: string; sim_score: number }>;

    if (rows.length > 0 && rows[0].sim_score > AUM_LIMITS.SIMILARITY_THRESHOLD) {
      return {
        contactId: rows[0].id,
        score: rows[0].sim_score,
        method: 'name_similarity'
      };
    }
  } catch (error) {
    // Fallback to exact match if pg_trgm extension not available
    try {
      const result = await dbi.execute(sql`
        SELECT id FROM contacts
        WHERE deleted_at IS NULL
          AND LOWER(TRIM(full_name)) = LOWER(TRIM(${holderName}))
        LIMIT 1
      `);

      const row = result.rows?.[0] as { id: string } | undefined;

      if (row?.id) {
        return {
          contactId: row.id,
          score: 1.0, // Exact match
          method: 'name_exact'
        };
      }
    } catch (exactError) {
      logger.warn({ err: exactError, holderName }, 'Error in exact name match fallback');
    }
  }

  return null;
}

/**
 * Batch match contacts by account numbers
 * Returns map of accountNumber -> contactId
 */
export async function batchMatchContactsByAccountNumber(
  broker: string,
  accountNumbers: string[]
): Promise<Map<string, ContactMatch>> {
  const dbi = db();
  const matches = new Map<string, ContactMatch>();

  if (accountNumbers.length === 0) {
    return matches;
  }

  try {
    // Query all account numbers in one go
    const result = await dbi.execute(sql`
      SELECT account_number, contact_id
      FROM broker_accounts
      WHERE broker = ${broker}
        AND account_number = ANY(${accountNumbers}::text[])
    `);

    const rows = result.rows as Array<{ account_number: string; contact_id: string }>;

    for (const row of rows) {
      if (row.contact_id) {
        matches.set(row.account_number, {
          contactId: row.contact_id,
          score: 1.0,
          method: 'broker_account'
        });
      }
    }
  } catch (error) {
    logger.warn({ err: error, accountNumbersCount: accountNumbers.length }, 'Error in batch account matching');
  }

  return matches;
}

// ==========================================================
// Advisor Matching Functions
// ==========================================================

/**
 * Check if value looks like an email
 */
function isEmailLike(value: string | null | undefined): boolean {
  if (!value) return false;
  return /@/.test(value);
}

/**
 * Match advisor by email
 */
export async function matchAdvisorByEmail(email: string): Promise<AdvisorMatch | null> {
  const dbi = db();

  try {
    const result = await dbi
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length > 0 && result[0].id) {
      return {
        userId: result[0].id,
        score: 1.0, // Perfect match
        method: 'email'
      };
    }
  } catch (error) {
    logger.warn({ err: error, email }, 'Error matching advisor by email');
  }

  return null;
}

/**
 * Match advisor by normalized alias
 */
export async function matchAdvisorByAlias(alias: string): Promise<AdvisorMatch | null> {
  const dbi = db();
  const normalizedAlias = normalizeAdvisorAlias(alias);

  try {
    const result = await dbi
      .select({ userId: advisorAliases.userId })
      .from(advisorAliases)
      .where(eq(advisorAliases.aliasNormalized, normalizedAlias))
      .limit(1);

    if (result.length > 0 && result[0].userId) {
      return {
        userId: result[0].userId,
        score: 1.0, // Perfect match
        method: 'alias'
      };
    }
  } catch (error) {
    logger.warn({ err: error, alias: normalizedAlias }, 'Error matching advisor by alias');
  }

  return null;
}

/**
 * Match advisor (tries email first if email-like, then alias)
 */
export async function matchAdvisor(advisorRaw: string | null | undefined): Promise<AdvisorMatch | null> {
  if (!advisorRaw) {
    return null;
  }

  // Try email match if value looks like email
  if (isEmailLike(advisorRaw)) {
    return matchAdvisorByEmail(advisorRaw);
  }

  // Try alias match
  return matchAdvisorByAlias(advisorRaw);
}

/**
 * Batch match advisors by aliases
 * Returns map of normalizedAlias -> userId
 */
export async function batchMatchAdvisorsByAlias(
  aliases: string[]
): Promise<Map<string, AdvisorMatch>> {
  const dbi = db();
  const matches = new Map<string, AdvisorMatch>();

  if (aliases.length === 0) {
    return matches;
  }

  // Normalize all aliases
  const normalizedAliases = aliases.map(normalizeAdvisorAlias);

  try {
    // Query all aliases in one go
    const result = await dbi.execute(sql`
      SELECT alias_normalized, user_id
      FROM advisor_aliases
      WHERE alias_normalized = ANY(${normalizedAliases}::text[])
    `);

    const rows = result.rows as Array<{ alias_normalized: string; user_id: string }>;

    for (const row of rows) {
      if (row.user_id) {
        matches.set(row.alias_normalized, {
          userId: row.user_id,
          score: 1.0,
          method: 'alias'
        });
      }
    }
  } catch (error) {
    logger.warn({ err: error, aliasesCount: aliases.length }, 'Error in batch alias matching');
  }

  return matches;
}

// ==========================================================
// Combined Matching Pipeline
// ==========================================================

/**
 * Match both contact and advisor for a single row
 * Pipeline: broker_account -> name_similarity -> name_exact
 */
export async function matchRow(
  broker: string,
  accountNumber: string | null,
  holderName: string | null,
  advisorRaw: string | null
): Promise<MatchResult> {
  let contactMatch: ContactMatch | null = null;
  let advisorMatch: AdvisorMatch | null = null;

  // Match contact
  if (accountNumber) {
    contactMatch = await matchContactByAccountNumber(broker, accountNumber);
  }

  if (!contactMatch && holderName) {
    contactMatch = await matchContactByHolderName(holderName);
  }

  // Match advisor
  if (advisorRaw) {
    advisorMatch = await matchAdvisor(advisorRaw);
  }

  return {
    contactMatch,
    advisorMatch
  };
}

/**
 * Detect duplicate rows based on account number
 * Returns set of account numbers that have conflicts
 */
export async function detectDuplicates(): Promise<Set<string>> {
  const dbi = db();
  const duplicates = new Set<string>();

  try {
    const result = await dbi.execute(sql`
      SELECT account_number, holder_name, advisor_raw, file_id, created_at
      FROM aum_import_rows
      WHERE account_number IS NOT NULL
    `);

    const rows = result.rows as Array<{
      account_number: string;
      holder_name: string | null;
      advisor_raw: string | null;
      file_id: string;
      created_at: Date;
    }>;

    // Group by account number
    const accountGroups = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!accountGroups.has(row.account_number)) {
        accountGroups.set(row.account_number, []);
      }
      accountGroups.get(row.account_number)!.push(row);
    }

    // Check for conflicts (different holder_name or advisor_raw)
    for (const [accountNumber, group] of accountGroups) {
      if (group.length > 1) {
        const hasConflict = group.some((row, i) =>
          group.slice(i + 1).some(other =>
            row.holder_name !== other.holder_name || row.advisor_raw !== other.advisor_raw
          )
        );

        if (hasConflict) {
          duplicates.add(accountNumber);
        }
      }
    }
  } catch (error) {
    logger.warn({ err: error }, 'Error detecting duplicates');
  }

  return duplicates;
}

// ==========================================================
// Name Similarity Functions
// ==========================================================

/**
 * Normalize name for comparison (remove spaces, lowercase, remove accents)
 */
function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate simple similarity between two names (0-1)
 * Uses substring comparison and length
 * Returns >0.8 if names are very similar
 */
export function calculateNameSimilarity(name1: string | null, name2: string | null): number {
  if (!name1 || !name2) return 0;

  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  if (norm1 === norm2) return 1.0;

  // If one contains the other, high similarity
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const longer = Math.max(norm1.length, norm2.length);
    const shorter = Math.min(norm1.length, norm2.length);
    return shorter / longer;
  }

  // Calculate common characters
  const chars1 = new Set(norm1.split(''));
  const chars2 = new Set(norm2.split(''));
  const common = new Set([...chars1].filter(c => chars2.has(c)));
  const total = new Set([...chars1, ...chars2]);

  if (total.size === 0) return 0;

  return common.size / total.size;
}

/**
 * Determine if two names are sufficiently similar (>80%)
 */
export function isNameSimilarityHigh(name1: string | null, name2: string | null): boolean {
  return calculateNameSimilarity(name1, name2) > 0.8;
}

/**
 * Compute match status based on matched contact ID
 */
export function computeMatchStatus(matchedContactId: string | null | undefined): 'matched' | 'unmatched' {
  return matchedContactId ? 'matched' : 'unmatched';
}

