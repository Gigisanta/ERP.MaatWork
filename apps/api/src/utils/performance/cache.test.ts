/**
 * Tests para cache utilities
 *
 * AI_DECISION: Tests unitarios para sistema de cache
 * Justificación: Validación crítica de funcionamiento de cache y invalidación
 * Impacto: Prevenir problemas de cache stale y verificar performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  pipelineStagesCache,
  instrumentsSearchCache,
  benchmarksCacheUtil,
  normalizeCacheKey,
} from './cache';

describe('Cache Utilities', () => {
  beforeEach(() => {
    // Limpiar cache antes de cada test
    pipelineStagesCache.clear();
    instrumentsSearchCache.clear();
    benchmarksCacheUtil.clear();
  });

  describe('pipelineStagesCache', () => {
    it('should store and retrieve values', () => {
      const key = 'pipeline:stages:all';
      const value = [{ id: '1', name: 'Stage 1' }];

      pipelineStagesCache.set(key, value);
      const retrieved = pipelineStagesCache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      const retrieved = pipelineStagesCache.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should delete specific keys', () => {
      const key = 'pipeline:stages:all';
      const value = [{ id: '1', name: 'Stage 1' }];

      pipelineStagesCache.set(key, value);
      pipelineStagesCache.delete(key);

      const retrieved = pipelineStagesCache.get(key);
      expect(retrieved).toBeUndefined();
    });

    it('should clear all keys', () => {
      pipelineStagesCache.set('key1', 'value1');
      pipelineStagesCache.set('key2', 'value2');

      pipelineStagesCache.clear();

      expect(pipelineStagesCache.get('key1')).toBeUndefined();
      expect(pipelineStagesCache.get('key2')).toBeUndefined();
    });

    it('should provide statistics', () => {
      pipelineStagesCache.set('key1', 'value1');
      pipelineStagesCache.get('key1'); // Hit
      pipelineStagesCache.get('key2'); // Miss

      const stats = pipelineStagesCache.getStats();
      expect(stats.hits).toBeGreaterThanOrEqual(1);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
      expect(stats.keys).toBeGreaterThanOrEqual(1);
    });
  });

  describe('instrumentsSearchCache', () => {
    it('should store and retrieve values', () => {
      const key = 'instruments:search:AAPL';
      const value = [{ symbol: 'AAPL', name: 'Apple Inc.' }];

      instrumentsSearchCache.set(key, value);
      const retrieved = instrumentsSearchCache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should not cache keys shorter than 3 characters', () => {
      const shortKey = 'ab';
      const value = [{ symbol: 'AB', name: 'Test' }];

      instrumentsSearchCache.set(shortKey, value);
      const retrieved = instrumentsSearchCache.get(shortKey);

      // Should not be cached
      expect(retrieved).toBeUndefined();
    });

    it('should cache keys with 3 or more characters', () => {
      const key = 'instruments:search:AAPL';
      const value = [{ symbol: 'AAPL', name: 'Apple Inc.' }];

      instrumentsSearchCache.set(key, value);
      const retrieved = instrumentsSearchCache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should clear all keys', () => {
      instrumentsSearchCache.set('key1', 'value1');
      instrumentsSearchCache.clear();

      expect(instrumentsSearchCache.get('key1')).toBeUndefined();
    });
  });

  describe('benchmarksCacheUtil', () => {
    it('should store and retrieve values', () => {
      const key = 'benchmarks:list:all';
      const value = [{ id: '1', name: 'Benchmark 1' }];

      benchmarksCacheUtil.set(key, value);
      const retrieved = benchmarksCacheUtil.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should clear all keys', () => {
      benchmarksCacheUtil.set('key1', 'value1');
      benchmarksCacheUtil.clear();

      expect(benchmarksCacheUtil.get('key1')).toBeUndefined();
    });

    it('should provide statistics', () => {
      benchmarksCacheUtil.set('key1', 'value1');
      benchmarksCacheUtil.get('key1');

      const stats = benchmarksCacheUtil.getStats();
      expect(stats.hits).toBeGreaterThanOrEqual(0);
      expect(stats.keys).toBeGreaterThanOrEqual(0);
    });
  });

  describe('normalizeCacheKey', () => {
    it('should normalize cache keys correctly', () => {
      const key = normalizeCacheKey('prefix', 'part1', 'part2');
      expect(key).toBe('prefix:part1:part2');
    });

    it('should handle null and undefined parts', () => {
      const key = normalizeCacheKey('prefix', 'part1', null, undefined, 'part2');
      expect(key).toBe('prefix:part1:part2');
    });

    it('should convert to lowercase and trim', () => {
      const key = normalizeCacheKey('prefix', '  PART1  ', 'Part2');
      expect(key).toBe('prefix:part1:part2');
    });

    it('should handle numbers', () => {
      const key = normalizeCacheKey('prefix', 'part1', 123);
      expect(key).toBe('prefix:part1:123');
    });

    it('should handle multiple parts', () => {
      const key = normalizeCacheKey('benchmarks', 'list', 'all', 'active');
      expect(key).toBe('benchmarks:list:all:active');
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate pipeline stages cache on clear', () => {
      pipelineStagesCache.set('pipeline:stages:all', [{ id: '1' }]);
      pipelineStagesCache.clear();

      expect(pipelineStagesCache.get('pipeline:stages:all')).toBeUndefined();
    });

    it('should invalidate instruments cache on clear', () => {
      instrumentsSearchCache.set('instruments:search:AAPL', [{ symbol: 'AAPL' }]);
      instrumentsSearchCache.clear();

      expect(instrumentsSearchCache.get('instruments:search:AAPL')).toBeUndefined();
    });

    it('should invalidate benchmarks cache on clear', () => {
      benchmarksCacheUtil.set('benchmarks:list:all', [{ id: '1' }]);
      benchmarksCacheUtil.clear();

      expect(benchmarksCacheUtil.get('benchmarks:list:all')).toBeUndefined();
    });
  });

  describe('Cache performance', () => {
    it('should handle multiple concurrent sets and gets', () => {
      const keys = Array.from({ length: 100 }, (_, i) => `key${i}`);
      const values = keys.map((key) => ({ id: key, data: 'test' }));

      // Set all values
      keys.forEach((key, i) => {
        pipelineStagesCache.set(key, values[i]);
      });

      // Get all values
      keys.forEach((key, i) => {
        const retrieved = pipelineStagesCache.get(key);
        expect(retrieved).toEqual(values[i]);
      });
    });

    it('should maintain cache statistics correctly', () => {
      pipelineStagesCache.set('key1', 'value1');
      pipelineStagesCache.set('key2', 'value2');

      pipelineStagesCache.get('key1'); // Hit
      pipelineStagesCache.get('key1'); // Hit
      pipelineStagesCache.get('key3'); // Miss

      const stats = pipelineStagesCache.getStats();
      expect(stats.hits).toBeGreaterThanOrEqual(2);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
      expect(stats.keys).toBe(2);
    });
  });
});
