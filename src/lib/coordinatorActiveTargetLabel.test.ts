import { describe, expect, it } from 'vitest';
import { getCoordinatorActiveTargetLabel } from './coordinatorActiveTargetLabel';

describe('coordinatorActiveTargetLabel', () => {
  it('returns consistent labels for active command objects', () => {
    expect(getCoordinatorActiveTargetLabel('guest')).toBe('Active guest');
    expect(getCoordinatorActiveTargetLabel('timeline')).toBe('Active event');
    expect(getCoordinatorActiveTargetLabel('qna')).toBe('Active question');
    expect(getCoordinatorActiveTargetLabel('alert')).toBe('Active update');
  });
});
