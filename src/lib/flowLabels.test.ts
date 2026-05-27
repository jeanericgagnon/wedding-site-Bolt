import { describe, expect, it } from 'vitest';
import { getFlowStatusLabel, getJourneyStatusLabel } from './flowLabels';

describe('flowLabels', () => {
  it('keeps flow step labels calm and explicit', () => {
    expect(getFlowStatusLabel('current')).toBe('Right now');
    expect(getFlowStatusLabel('next')).toBe('Next up');
    expect(getFlowStatusLabel('then')).toBe('Keep warm');
  });

  it('keeps journey labels guest-friendly', () => {
    expect(getJourneyStatusLabel('done')).toBe('Done');
    expect(getJourneyStatusLabel('current')).toBe('Here now');
    expect(getJourneyStatusLabel('next')).toBe('Next up');
    expect(getJourneyStatusLabel('available')).toBe('Ready');
  });
});
