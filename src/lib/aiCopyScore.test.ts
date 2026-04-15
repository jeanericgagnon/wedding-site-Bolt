import { describe, expect, it } from 'vitest';
import { scoreCopyLine } from './aiCopyScore';

describe('aiCopyScore', () => {
  it('penalizes obvious generic wedding filler', () => {
    expect(scoreCopyLine('Your presence is the greatest gift.')).toBeLessThan(70);
    expect(scoreCopyLine('Kindly let us know if you will join us.')).toBeLessThan(80);
  });

  it('scores cleaner concrete lines higher', () => {
    expect(scoreCopyLine('Join us in San Diego, CA on 2027-06-12')).toBeGreaterThan(80);
  });
});

