import { describe, expect, it } from 'vitest';
import { buildCoordinatorStablePrompt } from './coordinatorStablePrompt';

describe('coordinatorStablePrompt', () => {
  it('builds a concise fallback operator prompt from the current top priority', () => {
    expect(buildCoordinatorStablePrompt({
      priority: 'Check-in',
      reason: 'door review is waiting on Alex Rivera',
      cta: 'Open door review',
    })).toEqual({
      badge: 'Priority · Check-in',
      label: 'door review is waiting on Alex Rivera — Open door review',
    });
  });
});
