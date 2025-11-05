import { describe, it, expect } from 'vitest';
import { computeMatchStatus } from './aum';

describe('AUM match helpers', () => {
  it('computeMatchStatus returns matched when contactId present', () => {
    expect(computeMatchStatus('c1')).toBe('matched');
  });
  it('computeMatchStatus returns unmatched when contactId null', () => {
    expect(computeMatchStatus(null)).toBe('unmatched');
  });
});







