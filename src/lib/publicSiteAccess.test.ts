import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { safePublicSiteAccessError, sanitizePublicSiteSafeRow } from './publicSiteAccess';

describe('public site access client contract', () => {
  it('keeps only the explicit public-safe site fields from resolver payloads', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-1',
      site_slug: 'maya-leo',
      site_url: 'maya-leo',
      is_published: true,
      site_json: { theme: 'classic' },
      published_json: { sections: [] },
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      wedding_data: { story: 'Safe public story' },
      layout_config: { sections: [] },
      default_language: 'en',
      allow_search_indexing: false,
      site_password_hash: 'never-send-this',
      guest_access_token: 'never-send-this-either',
      user_id: 'owner-id',
      notification_prefs: { rsvp: true },
      billing_customer_id: 'cus_private',
      privacy_mode: 'password',
      hide_from_search: true,
    });

    expect(site).toEqual({
      id: 'site-1',
      site_slug: 'maya-leo',
      site_url: 'maya-leo',
      is_published: true,
      site_json: { theme: 'classic' },
      published_json: { sections: [] },
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      wedding_data: { story: 'Safe public story' },
      layout_config: { sections: [] },
      default_language: 'en',
      allow_search_indexing: false,
    });
    expect(site).not.toHaveProperty('site_password_hash');
    expect(site).not.toHaveProperty('guest_access_token');
    expect(site).not.toHaveProperty('user_id');
    expect(site).not.toHaveProperty('notification_prefs');
    expect(site).not.toHaveProperty('billing_customer_id');
    expect(site).not.toHaveProperty('privacy_mode');
    expect(site).not.toHaveProperty('hide_from_search');
  });

  it('rejects malformed public site payloads instead of passing them through', () => {
    expect(sanitizePublicSiteSafeRow(null)).toBeNull();
    expect(sanitizePublicSiteSafeRow([])).toBeNull();
    expect(sanitizePublicSiteSafeRow({ site_slug: 'missing-id' })).toBeNull();
  });

  it('hides raw public access backend errors', () => {
    expect(safePublicSiteAccessError('Supabase policy denied access to site_password_hash token')).toBe(
      'Could not check this wedding site right now. Please try again.',
    );
    expect(safePublicSiteAccessError('Too many password attempts. Please wait a minute and try again.')).toBe(
      'Too many password attempts. Please wait a minute and try again.',
    );
  });

  it('keeps public-site gate artifacts in session storage only', () => {
    const siteView = readFileSync('src/pages/SiteView.tsx', 'utf8');
    const artifacts = readFileSync('src/lib/publicAccessArtifacts.ts', 'utf8');

    expect(artifacts).toContain('sessionStorage.getItem(getPublicInviteTokenStorageKey(slug))');
    expect(artifacts).toContain('sessionStorage.getItem(getPublicPasswordSessionStorageKey(slug))');
    expect(artifacts).toContain('sessionStorage.setItem(getPublicInviteTokenStorageKey(slug), token)');
    expect(artifacts).toContain('sessionStorage.setItem(getPublicPasswordSessionStorageKey(slug), value)');
    expect(siteView).toContain('clearStoredPublicInviteToken(resolvedSlug)');
    expect(artifacts).toContain('passwordSession: readStoredPublicPasswordSession(slug)');
    expect(siteView).toContain('writeStoredPublicPasswordSession(resolvedSlug, result.passwordSession)');
    expect(`${siteView}\n${artifacts}`).not.toContain('localStorage.getItem(INVITE_TOKEN_KEY)');
    expect(`${siteView}\n${artifacts}`).not.toContain('localStorage.setItem(INVITE_TOKEN_KEY');
    expect(`${siteView}\n${artifacts}`).not.toContain('localStorage.getItem(PASSWORD_SESSION_KEY)');
    expect(`${siteView}\n${artifacts}`).not.toContain('localStorage.setItem(PASSWORD_SESSION_KEY');
  });
});
