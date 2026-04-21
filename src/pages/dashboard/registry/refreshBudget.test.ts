import { describe, expect, it } from 'vitest';

import { resolveRegistryRefreshBudgetState } from './refreshBudget';

describe('resolveRegistryRefreshBudgetState', () => {
  it('keeps the stored count when the stored month matches the current month', () => {
    expect(resolveRegistryRefreshBudgetState({
      storedMonthKey: '2026-04',
      storedCount: 17,
      currentMonthKey: '2026-04',
    })).toEqual({
      monthKey: '2026-04',
      count: 17,
      shouldReset: false,
    });
  });

  it('resets the count when the stored month is stale', () => {
    expect(resolveRegistryRefreshBudgetState({
      storedMonthKey: '2026-03',
      storedCount: 42,
      currentMonthKey: '2026-04',
    })).toEqual({
      monthKey: '2026-04',
      count: 0,
      shouldReset: true,
    });
  });

  it('resets the count when there is no stored month yet', () => {
    expect(resolveRegistryRefreshBudgetState({
      storedMonthKey: null,
      storedCount: 9,
      currentMonthKey: '2026-04',
    })).toEqual({
      monthKey: '2026-04',
      count: 0,
      shouldReset: true,
    });
  });
});
