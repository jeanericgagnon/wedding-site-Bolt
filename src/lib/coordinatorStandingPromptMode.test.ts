import { describe, expect, it } from 'vitest';
import { getCoordinatorStandingPromptMode } from './coordinatorStandingPromptMode';

describe('coordinatorStandingPromptMode', () => {
  it('uses a quieter secondary mode when a live signal is active', () => {
    expect(getCoordinatorStandingPromptMode(true)).toBe('secondary');
    expect(getCoordinatorStandingPromptMode(false)).toBe('full');
  });
});
