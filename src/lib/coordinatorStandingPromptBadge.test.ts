import { describe, expect, it } from 'vitest';
import { getCoordinatorStandingPromptBadge } from './coordinatorStandingPromptBadge';

describe('coordinatorStandingPromptBadge', () => {
  it('keeps the full badge in full mode', () => {
    expect(getCoordinatorStandingPromptBadge({
      mode: 'full',
      badge: 'Priority · Check-in',
    })).toBe('Priority · Check-in');
  });

  it('turns the badge into queued-next language in secondary mode', () => {
    expect(getCoordinatorStandingPromptBadge({
      mode: 'secondary',
      badge: 'Priority · Timeline',
    })).toBe('Queued next · Timeline');
  });
});
