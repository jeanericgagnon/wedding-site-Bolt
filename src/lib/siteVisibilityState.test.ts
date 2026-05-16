import { describe, expect, it } from 'vitest';
import { getSiteVisibilityState, getVisibilityModeOptions } from './siteVisibilityState';

describe('getSiteVisibilityState', () => {
  it('returns draft when not published', () => {
    const result = getSiteVisibilityState({ isPublished: false, privacyMode: 'public', hideFromSearch: true });
    expect(result.state).toBe('draft');
    expect(result.isLive).toBe(false);
    expect(result.searchLabel).toBe('Hidden from search');
  });

  it('returns password-protected live state', () => {
    const result = getSiteVisibilityState({ isPublished: true, privacyMode: 'password_protected', hideFromSearch: true });
    expect(result.state).toBe('private_preview_password');
    expect(result.shortLabel).toBe('Protected live site');
    expect(result.isPrivatePreview).toBe(true);
  });

  it('returns invite-only live state', () => {
    const result = getSiteVisibilityState({ isPublished: true, privacyMode: 'invite_only', hideFromSearch: false });
    expect(result.state).toBe('private_preview_link');
    expect(result.isPrivatePreview).toBe(true);
    expect(result.searchLabel).toBe('Search visibility on');
  });

  it('returns public live state', () => {
    const result = getSiteVisibilityState({ isPublished: true, privacyMode: 'public', hideFromSearch: false });
    expect(result.state).toBe('live');
    expect(result.shortLabel).toBe('Live');
    expect(result.searchLabel).toBe('Search visibility on');
  });

  it('treats hidden published sites as owner-only preview state', () => {
    const result = getSiteVisibilityState({ isPublished: true, privacyMode: 'hidden', hideFromSearch: true });
    expect(result.state).toBe('draft');
    expect(result.shortLabel).toBe('Hidden');
    expect(result.isLive).toBe(false);
    expect(result.searchLabel).toBe('Hidden from guests');
  });
});

describe('getVisibilityModeOptions', () => {
  it('returns the supported live visibility modes', () => {
    const options = getVisibilityModeOptions();
    expect(options).toHaveLength(3);
    expect(options.map((option) => option.value)).toEqual(['public', 'password_protected', 'invite_only']);
  });
});
