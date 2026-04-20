import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandJumpLabel } from './coordinatorCommandJumpLabel';

describe('coordinatorCommandJumpLabel', () => {
  it('returns operator-facing context for summary-strip jumps', () => {
    expect(getCoordinatorCommandJumpLabel('Check-in')).toBe('Jumped from live summary to door review');
    expect(getCoordinatorCommandJumpLabel('Timeline')).toBe('Jumped from live summary to timeline focus');
    expect(getCoordinatorCommandJumpLabel('Q&A')).toBe('Jumped from live summary to guest question');
    expect(getCoordinatorCommandJumpLabel('Alerting')).toBe('Jumped from live summary to alert draft');
  });
});
