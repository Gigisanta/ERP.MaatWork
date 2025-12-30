/**
 * Name Normalization Service
 *
 * Centralized logic for normalizing personal names for matching.
 * Handles accents, spacing, common prefixes/suffixes, and case.
 */

/**
 * Normalizes a full name for consistent matching.
 *
 * Rules:
 * 1. Convert to lowercase
 * 2. Remove accents/diacritics (NFD normalization)
 * 3. Remove non-alphanumeric characters (except spaces)
 * 4. Collapse multiple spaces to single space
 * 5. Trim whitespace
 * 6. Remove common business suffixes (S.A., S.R.L, etc) if configured (optional)
 *
 * @param name The raw name string
 * @returns Normalized name string
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';

  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Keep only alphanumeric and spaces
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim();
}

/**
 * Calculate similarity score (0-1) between two strings.
 * Uses Jaccard similarity on trigrams (simplified).
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  // Exact substring match check (high confidence)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    // If shorter string is significant part of longer string
    if (minLen > 3) {
      return 0.9;
    }
  }

  // Token-based matching (e.g. "Juan Perez" vs "Perez Juan")
  const tokens1 = new Set(norm1.split(' '));
  const tokens2 = new Set(norm2.split(' '));

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}
