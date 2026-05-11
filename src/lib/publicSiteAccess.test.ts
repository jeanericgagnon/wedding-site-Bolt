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
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'hero-1',
            type: 'hero',
            variant: 'default',
            enabled: true,
            orderIndex: 0,
            settings: { headline: 'Welcome', hiddenCopy: 'should not survive' },
            bindings: { venueIds: ['venue-1'], mediaAssetIds: ['asset-private'] },
            styleOverrides: { backgroundColor: '#ffffff', fontFamily: 'private-font' },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: {
          couple: { displayName: 'Maya & Leo', adminEmail: 'hide@example.com' },
          registry: { links: [{ id: 'r1', label: 'Registry', url: 'https://registry.example.com', queueTargets: ['hide-me'] }] },
          meta: { createdAtISO: '2026-01-01T00:00:00.000Z', updatedAtISO: '2026-02-01T00:00:00.000Z', staffNotes: ['hide-me'] },
        },
        theme: { preset: 'romantic', tokens: { colorPrimary: '#123456', providerSecrets: 'hide-me' } },
      },
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
      couple_name_1: 'Maya',
      couple_name_2: 'Leo',
      wedding_date: '2026-09-12',
      venue_name: 'Garden Hall',
      wedding_location: 'Portland',
      template_id: 'modern-luxe',
      default_language: 'en',
      allow_search_indexing: false,
      render_model: {
        pages: [{
          id: 'home',
          slug: 'home',
          title: 'Home',
          orderIndex: 0,
          sections: [{
            id: 'hero-1',
            type: 'hero',
            variant: 'default',
            enabled: true,
            orderIndex: 0,
            settings: { headline: 'Welcome', showTitle: true, overlayOpacity: 40 },
            bindings: { venueIds: ['venue-1'] },
            styleOverrides: { backgroundColor: '#ffffff' },
          }],
          meta: { isHome: true },
        }],
        wedding: {
          couple: { displayName: 'Maya & Leo' },
          event: {},
          venues: [],
          schedule: [],
          rsvp: { enabled: true },
          travel: {},
          registry: { links: [{ id: 'r1', label: 'Registry', url: 'https://registry.example.com' }] },
          faq: [],
          theme: {},
          media: { gallery: [] },
        },
        theme: { preset: 'romantic', tokens: { colorPrimary: '#123456' } },
      },
    });
    expect(site?.render_model.pages).toEqual([{
      id: 'home',
      slug: 'home',
      title: 'Home',
      orderIndex: 0,
      sections: [{
        id: 'hero-1',
        type: 'hero',
        variant: 'default',
        enabled: true,
        orderIndex: 0,
        settings: { headline: 'Welcome', showTitle: true, overlayOpacity: 40 },
        bindings: { venueIds: ['venue-1'] },
        styleOverrides: { backgroundColor: '#ffffff' },
      }],
      meta: { isHome: true },
    }]);
    expect(site?.render_model.wedding).toEqual({
      couple: { displayName: 'Maya & Leo' },
      event: {},
      venues: [],
      schedule: [],
      rsvp: { enabled: true },
      travel: {},
      registry: { links: [{ id: 'r1', label: 'Registry', url: 'https://registry.example.com' }] },
      faq: [],
      theme: {},
      media: { gallery: [] },
    });
    expect(site?.render_model.theme).toEqual({ preset: 'romantic', tokens: { colorPrimary: '#123456' } });
    expect(JSON.stringify(site)).not.toContain('mediaAssetIds');
    expect(JSON.stringify(site)).not.toContain('fontFamily');
    expect(JSON.stringify(site)).not.toContain('adminEmail');
    expect(JSON.stringify(site)).not.toContain('queueTargets');
    expect(JSON.stringify(site)).not.toContain('providerSecrets');
    expect(JSON.stringify(site)).not.toContain('hiddenCopy');
    expect(site).not.toHaveProperty('site_password_hash');
    expect(site).not.toHaveProperty('guest_access_token');
    expect(site).not.toHaveProperty('user_id');
    expect(site).not.toHaveProperty('notification_prefs');
    expect(site).not.toHaveProperty('billing_customer_id');
    expect(site).not.toHaveProperty('privacy_mode');
    expect(site).not.toHaveProperty('hide_from_search');
    expect(site).not.toHaveProperty('site_json');
    expect(site).not.toHaveProperty('published_json');
    expect(site).not.toHaveProperty('wedding_data');
    expect(site).not.toHaveProperty('layout_config');
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
