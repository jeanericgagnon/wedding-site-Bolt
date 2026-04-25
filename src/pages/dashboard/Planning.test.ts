import { describe, expect, it, vi } from 'vitest';
import { ensurePlanningLocationEventsPatched, resolvePlanningTabFromSearch } from './Planning';

describe('resolvePlanningTabFromSearch', () => {
  it('returns the requested planning tab when it is valid', () => {
    expect(resolvePlanningTabFromSearch('?tab=nameChange')).toBe('nameChange');
    expect(resolvePlanningTabFromSearch('?tab=vendors')).toBe('vendors');
  });

  it('falls back to null for unknown or missing tabs', () => {
    expect(resolvePlanningTabFromSearch('?tab=bogus')).toBeNull();
    expect(resolvePlanningTabFromSearch('')).toBeNull();
  });

  it('dispatches a location change event when history state changes', () => {
    const listener = vi.fn();
    window.addEventListener('dayof:locationchange', listener);

    try {
      ensurePlanningLocationEventsPatched();
      window.history.pushState({}, '', '/dashboard/planning?tab=nameChange');
      window.history.replaceState({}, '', '/dashboard/planning?tab=overview');

      expect(listener).toHaveBeenCalledTimes(2);
    } finally {
      window.removeEventListener('dayof:locationchange', listener);
      window.history.replaceState({}, '', '/');
    }
  });
});
