import { describe, expect, it } from 'vitest';
import { buildCoupleDisplayName } from './coupleDisplayName';

describe('buildCoupleDisplayName', () => {
  it('joins both names when both are present', () => {
    expect(buildCoupleDisplayName('Alex', 'Jordan')).toBe('Alex & Jordan');
  });

  it('keeps a single available partner name truthful', () => {
    expect(buildCoupleDisplayName('Alex', '')).toBe('Alex');
    expect(buildCoupleDisplayName('', 'Jordan')).toBe('Jordan');
  });

  it('trims whitespace before joining names', () => {
    expect(buildCoupleDisplayName('  Alex  ', '  Jordan  ')).toBe('Alex & Jordan');
  });

  it('falls back when both names are blank', () => {
    expect(buildCoupleDisplayName(' ', undefined, 'My Wedding')).toBe('My Wedding');
  });
});
