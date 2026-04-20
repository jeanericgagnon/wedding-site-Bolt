import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandPriorityCtaTone } from './coordinatorCommandPriorityCtaTone';

describe('coordinatorCommandPriorityCtaTone', () => {
  it('marks in-focus priority ctas as passive and everything else as actionable', () => {
    expect(getCoordinatorCommandPriorityCtaTone('In focus')).toBe('passive');
    expect(getCoordinatorCommandPriorityCtaTone(null)).toBe('action');
    expect(getCoordinatorCommandPriorityCtaTone('Open door review')).toBe('action');
  });
});
