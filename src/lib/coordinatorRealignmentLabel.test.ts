import { describe, expect, it } from 'vitest';
import { getCoordinatorRealignmentLabel } from './coordinatorRealignmentLabel';

describe('coordinatorRealignmentLabel', () => {
  it('returns panel-specific realignment copy', () => {
    expect(getCoordinatorRealignmentLabel('check-in')).toBe('Check-in re-aligned to board target');
    expect(getCoordinatorRealignmentLabel('timeline')).toBe('Timeline re-aligned to board target');
    expect(getCoordinatorRealignmentLabel('qna')).toBe('Q&A re-aligned to board target');
  });

  it('stays quiet when no realignment-capable panel is focused', () => {
    expect(getCoordinatorRealignmentLabel(null)).toBeNull();
  });
});
