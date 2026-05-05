import { describe, expect, it } from 'vitest';
import { getCoordinatorRealignmentLabel } from './coordinatorRealignmentLabel';

describe('coordinatorRealignmentLabel', () => {
  it('returns panel-specific realignment copy', () => {
    expect(getCoordinatorRealignmentLabel('check-in')).toBe('Check-in returned to suggested guest');
    expect(getCoordinatorRealignmentLabel('timeline')).toBe('Timeline returned to suggested event');
    expect(getCoordinatorRealignmentLabel('qna')).toBe('Q&A returned to suggested question');
  });

  it('stays quiet when no realignment-capable panel is focused', () => {
    expect(getCoordinatorRealignmentLabel(null)).toBeNull();
  });
});
