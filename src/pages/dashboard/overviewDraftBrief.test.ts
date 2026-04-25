import { describe, expect, it } from 'vitest';
import { getOverviewFallbackCoupleValue } from './overviewDraftBrief';

describe('getOverviewFallbackCoupleValue', () => {
  it('keeps owner-facing overview fallback couple names truthful when one persisted name is whitespace only', () => {
    expect(getOverviewFallbackCoupleValue('   ', ' Alex ')).toBe('Alex');
  });

  it('drops the fallback couple row when both persisted names are blank', () => {
    expect(getOverviewFallbackCoupleValue('   ', '')).toBeNull();
  });
});
