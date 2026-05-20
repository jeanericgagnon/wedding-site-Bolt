import { describe, expect, it } from 'vitest';
import { resolvePlanningTabFromSearch } from './Planning';

describe('resolvePlanningTabFromSearch', () => {
  it('returns the requested planning tab when it is valid', () => {
    expect(resolvePlanningTabFromSearch('?tab=nameChange')).toBe('nameChange');
    expect(resolvePlanningTabFromSearch('?tab=vendors')).toBe('vendors');
  });

  it('falls back to null for unknown or missing tabs', () => {
    expect(resolvePlanningTabFromSearch('?tab=bogus')).toBeNull();
    expect(resolvePlanningTabFromSearch('')).toBeNull();
  });
});
