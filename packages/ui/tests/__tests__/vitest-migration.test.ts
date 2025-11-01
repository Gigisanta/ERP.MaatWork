import { describe, it, expect } from 'vitest';

describe('Vitest Migration', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should handle math operations', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    expect('hello' + ' ' + 'world').toBe('hello world');
  });
});

