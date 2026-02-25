import { describe, it, expect } from 'vitest';
import { normalizeName, calculateNameSimilarity } from './normalization';

describe('NameNormalizationService', () => {
  describe('normalizeName', () => {
    it('should handle empty or null inputs', () => {
      expect(normalizeName(null)).toBe('');
      expect(normalizeName(undefined)).toBe('');
      expect(normalizeName('')).toBe('');
    });

    it('should lowercase strings', () => {
      expect(normalizeName('JUAN')).toBe('juan');
      expect(normalizeName('Juan')).toBe('juan');
    });

    it('should remove accents', () => {
      expect(normalizeName('Pérez')).toBe('perez');
      expect(normalizeName('García')).toBe('garcia');
      expect(normalizeName('ÁÉÍÓÚáéíóú')).toBe('aeiouaeiou');
    });

    it('should remove non-alphanumeric characters', () => {
      expect(normalizeName('J. Perez')).toBe('j perez');
      expect(normalizeName("O'Connor")).toBe('oconnor');
      expect(normalizeName('Smith-Jones')).toBe('smithjones');
    });

    it('should normalize spaces', () => {
      expect(normalizeName('  Juan    Perez  ')).toBe('juan perez');
    });

    it('should handle complex cases', () => {
      expect(normalizeName('  M. José   García-Márquez  ')).toBe('m jose garciamarquez');
    });
  });

  describe('calculateNameSimilarity', () => {
    it('should return 1.0 for exact matches (normalized)', () => {
      expect(calculateNameSimilarity('Juan Perez', 'JUAN PEREZ')).toBe(1.0);
    });

    it('should return 0 for totally different strings', () => {
      expect(calculateNameSimilarity('Juan', 'Pedro')).toBe(0);
    });

    it('should handle substring matches', () => {
      // "Juan" is in "Juan Perez"
      expect(calculateNameSimilarity('Juan Perez', 'Juan')).toBe(0.9);
      expect(calculateNameSimilarity('Juan', 'Juan Perez')).toBe(0.9);
    });

    it('should handle token reordering', () => {
      // "Perez Juan" vs "Juan Perez" -> intersection 2, union 2 -> 1.0
      // Note: My simplified logic is Jaccard on tokens.
      expect(calculateNameSimilarity('Juan Perez', 'Perez Juan')).toBe(1.0);
    });

    it('should handle partial matches with tokens', () => {
      // "Juan Perez" vs "Juan Garcia"
      // tokens1: {juan, perez}, tokens2: {juan, garcia}
      // intersection: {juan} (1)
      // union: {juan, perez, garcia} (3)
      // score: 1/3 = 0.33
      const score = calculateNameSimilarity('Juan Perez', 'Juan Garcia');
      expect(score).toBeCloseTo(0.33, 2);
    });
  });
});
