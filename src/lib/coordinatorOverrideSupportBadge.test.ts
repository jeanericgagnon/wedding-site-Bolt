import { describe, expect, it } from 'vitest';
import { getCoordinatorOverrideSupportBadge } from './coordinatorOverrideSupportBadge';

describe('coordinatorOverrideSupportBadge', () => {
  it('returns structured badges for manual override support states', () => {
    expect(getCoordinatorOverrideSupportBadge({ panelFocus: 'check-in', kind: 'manual' })).toBe('Override · Guest');
    expect(getCoordinatorOverrideSupportBadge({ panelFocus: 'timeline', kind: 'manual' })).toBe('Override · Event');
    expect(getCoordinatorOverrideSupportBadge({ panelFocus: 'qna', kind: 'manual' })).toBe('Override · Question');
  });

  it('returns a clean alert override badge', () => {
    expect(getCoordinatorOverrideSupportBadge({ panelFocus: null, kind: 'alert' })).toBe('Alert override');
  });
});
