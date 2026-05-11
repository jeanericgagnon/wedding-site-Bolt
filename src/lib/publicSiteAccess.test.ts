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

  it('keeps bindings only for public section families that actually consume them', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-2',
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
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              variant: 'default',
              enabled: true,
              orderIndex: 0,
              settings: { headline: 'Welcome' },
              bindings: { venueIds: ['venue-1'], faqIds: ['faq-1'] },
            },
            {
              id: 'venue-1',
              type: 'venue',
              variant: 'default',
              enabled: true,
              orderIndex: 1,
              settings: { title: 'Venue', showTitle: true },
              bindings: { venueIds: ['venue-1'], faqIds: ['faq-1'] },
            },
            {
              id: 'schedule-1',
              type: 'schedule',
              variant: 'default',
              enabled: true,
              orderIndex: 2,
              settings: { title: 'Weekend', showTitle: true },
              bindings: { scheduleItemIds: ['schedule-1'], linkIds: ['registry-1'] },
            },
            {
              id: 'registry-1',
              type: 'registry',
              variant: 'cards',
              enabled: true,
              orderIndex: 3,
              settings: { title: 'Registry', showTitle: true },
              bindings: { linkIds: ['registry-1'], venueIds: ['venue-1'] },
            },
            {
              id: 'faq-1',
              type: 'faq',
              variant: 'accordion',
              enabled: true,
              orderIndex: 4,
              settings: { title: 'FAQ', showTitle: true },
              bindings: { faqIds: ['faq-1'], scheduleItemIds: ['schedule-1'] },
            },
          ],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    const sections = site?.render_model.pages[0]?.sections ?? [];
    expect(sections[0]?.bindings).toBeUndefined();
    expect(sections[1]?.bindings).toEqual({ venueIds: ['venue-1'] });
    expect(sections[2]?.bindings).toEqual({ scheduleItemIds: ['schedule-1'] });
    expect(sections[3]?.bindings).toEqual({ linkIds: ['registry-1'] });
    expect(sections[4]?.bindings).toEqual({ faqIds: ['faq-1'] });
  });

  it('normalizes footer cta aliases into the client-safe public footer contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-3',
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
            id: 'footer-1',
            type: 'footer-cta',
            variant: 'default',
            enabled: true,
            orderIndex: 0,
            settings: {
              headline: 'We hope to see you there',
              ctaLabel: 'Send RSVP',
              ctaHref: '/site/maya-leo#rsvp',
              monogram: 'M & L',
              photoUrl: 'https://example.com/photo.jpg',
              footerNote: 'Please RSVP by August 1',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    const settings = site?.render_model.pages[0]?.sections[0]?.settings ?? {};
    expect(settings).toMatchObject({
      headline: 'We hope to see you there',
      buttonLabel: 'Send RSVP',
      rsvpUrl: '/site/maya-leo#rsvp',
      footerNote: 'Please RSVP by August 1',
    });
    expect(settings).not.toHaveProperty('ctaLabel');
    expect(settings).not.toHaveProperty('ctaHref');
    expect(settings).not.toHaveProperty('monogram');
    expect(settings).not.toHaveProperty('photoUrl');
  });

  it('drops nested interactive contact payloads from the client-safe public contract', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-4',
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
            id: 'contact-1',
            type: 'contact',
            variant: 'interactiveHub',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Questions, polls & quizzes',
              eyebrow: 'Interactive corner',
              subtitle: 'Have fun with us while we plan the weekend.',
              introText: 'Share your ideas with us.',
              pollPrompt: 'What should our signature drink be?',
              pollOptions: 'French 75\nSpicy Margarita',
              quizPrompt: 'Who made the first move?',
              quizOptions: 'Maya\nLeo',
              correctQuizOption: 'Leo',
              suggestionPrompt: 'Song request',
              allowPublicResults: true,
              poll: { id: 'poll-secret', queueTargets: ['hide-me'] },
              quiz: { id: 'quiz-secret', staffNotes: 'hide-me' },
              suggestionPlaceholder: 'Type your idea...',
              contacts: [{ id: 'c1', phone: '+1 555-0101' }],
              contactInfo: 'private concierge',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    const settings = site?.render_model.pages[0]?.sections[0]?.settings ?? {};
    expect(settings).toMatchObject({
      title: 'Questions, polls & quizzes',
      eyebrow: 'Interactive corner',
      subtitle: 'Have fun with us while we plan the weekend.',
      introText: 'Share your ideas with us.',
      pollPrompt: 'What should our signature drink be?',
      pollOptions: 'French 75\nSpicy Margarita',
      quizPrompt: 'Who made the first move?',
      quizOptions: 'Maya\nLeo',
      correctQuizOption: 'Leo',
      suggestionPrompt: 'Song request',
      allowPublicResults: true,
    });
    expect(settings).not.toHaveProperty('poll');
    expect(settings).not.toHaveProperty('quiz');
    expect(settings).not.toHaveProperty('suggestionPlaceholder');
    expect(settings).not.toHaveProperty('contacts');
    expect(settings).not.toHaveProperty('contactInfo');

    const serialized = JSON.stringify(site);
    expect(serialized).not.toContain('poll-secret');
    expect(serialized).not.toContain('quiz-secret');
    expect(serialized).not.toContain('queueTargets');
    expect(serialized).not.toContain('staffNotes');
    expect(serialized).not.toContain('suggestionPlaceholder');
    expect(serialized).not.toContain('contactInfo');
  });

  it('normalizes contact form title aliases into the client-safe resolved renderer fields', () => {
    const site = sanitizePublicSiteSafeRow({
      id: 'site-5',
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
            id: 'contact-form-1',
            type: 'contact',
            variant: 'form',
            enabled: true,
            orderIndex: 0,
            settings: {
              title: 'Questions for us?',
              subtitle: 'We are happy to help.',
              introText: 'Reach out any time.',
              contacts: [{ id: 'c1', email: 'hide@example.com' }],
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
        wedding: null,
        theme: { preset: null, tokens: null },
      },
    });

    const settings = site?.render_model.pages[0]?.sections[0]?.settings ?? {};
    expect(settings).toMatchObject({
      headline: 'Questions for us?',
      subheadline: 'We are happy to help.',
      introText: 'Reach out any time.',
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('subtitle');
    expect(settings).not.toHaveProperty('contacts');

    const serialized = JSON.stringify(site);
    expect(serialized).not.toContain('"title":"Questions for us?"');
    expect(serialized).not.toContain('"subtitle":"We are happy to help."');
    expect(serialized).not.toContain('hide@example.com');
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
