import { describe, expect, it } from 'vitest';

import { resolveCurrentSearchParams } from './currentSearchParams';

describe('resolveCurrentSearchParams', () => {
  it('returns the provided search params unchanged when one is passed in', () => {
    const provided = new URLSearchParams('token=abc&invite_token=xyz');

    expect(resolveCurrentSearchParams(provided)).toBe(provided);
  });

  it('falls back to the current browser search string when no params are provided', () => {
    window.history.replaceState({}, '', '/guestbook/maya-and-leo?token=current-invite&invite_token=current-guest');

    const resolved = resolveCurrentSearchParams();

    expect(resolved.get('token')).toBe('current-invite');
    expect(resolved.get('invite_token')).toBe('current-guest');
  });
});
