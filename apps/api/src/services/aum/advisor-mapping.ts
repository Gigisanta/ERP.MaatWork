/**
 * AUM Upsert - Advisor Account Mapping
 */

import { db, advisorAccountMapping } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger';

/**
 * Apply advisor-account mapping to rows before matching
 * Returns updated advisorRaw and matchedUserId if mapping exists
 */
export async function applyAdvisorAccountMapping(
  accountNumber: string
): Promise<{ advisorRaw: string | null; matchedUserId: string | null }> {
  const dbi = db();

  try {
    const result = await dbi
      .select()
      .from(advisorAccountMapping)
      .where(eq(advisorAccountMapping.accountNumber, accountNumber))
      .limit(1);

    if (result.length > 0) {
      const mapping = result[0];
      return {
        advisorRaw: mapping.advisorRaw,
        matchedUserId: mapping.matchedUserId
      };
    }
  } catch (error) {
    logger.warn({ err: error, accountNumber }, 'Error applying advisor mapping');
  }

  return {
    advisorRaw: null,
    matchedUserId: null
  };
}


