import { describe, expect, it } from 'vitest';
import { SECTION_MANIFESTS } from '../builder/registry/sectionManifests';
import {
  PUBLIC_SECTION_SETTING_ALIAS_EXCEPTIONS,
  PUBLIC_SECTION_SETTINGS_ALLOWLIST,
  sanitizePublicSectionSettings,
} from './publicRenderContract';

describe('publicRenderContract', () => {
  it('keeps every public settings allowlist key anchored to a manifest field or explicit alias exception', () => {
    for (const [type, keys] of Object.entries(PUBLIC_SECTION_SETTINGS_ALLOWLIST)) {
      const manifest = SECTION_MANIFESTS[type as keyof typeof SECTION_MANIFESTS];
      expect(manifest, `${type} should map to a section manifest`).toBeDefined();

      const manifestKeys = new Set(manifest.settingsSchema.fields.map((field) => field.key));
      const aliasKeys = new Set(PUBLIC_SECTION_SETTING_ALIAS_EXCEPTIONS[type as keyof typeof PUBLIC_SECTION_SETTING_ALIAS_EXCEPTIONS] ?? []);

      for (const key of keys) {
        expect(
          manifestKeys.has(key) || aliasKeys.has(key),
          `${type}.${key} must be a real manifest field or documented public alias`,
        ).toBe(true);
      }
    }
  });

  it('normalizes footer CTA aliases into the strict public DTO without leaking the raw alias keys', () => {
    const settings = sanitizePublicSectionSettings('footer-cta', 'default', {
      ctaLabel: 'RSVP now',
      ctaHref: '#rsvp',
      adminEmail: 'private@example.com',
      monogram: 'K&E',
    });

    expect(settings).toEqual({
      headline: 'We hope to see you there',
      buttonLabel: 'RSVP now',
      rsvpUrl: '#rsvp',
    });
    expect(settings).not.toHaveProperty('ctaLabel');
    expect(settings).not.toHaveProperty('ctaHref');
    expect(settings).not.toHaveProperty('adminEmail');
    expect(settings).not.toHaveProperty('monogram');
  });

  it('normalizes hero legacy title/subtitle fields into the resolved public hero renderer contract', () => {
    const settings = sanitizePublicSectionSettings('hero', 'fullBleed', {
      title: 'We are getting married',
      subtitle: 'June 14, 2025 · The Grand Pavilion, New York',
      headline: 'Kara & Eric',
      ctaLabel: 'Send RSVP',
      ctaHref: '#rsvp',
      privateToken: 'secret',
    });

    expect(settings).toEqual({
      headline: 'Kara & Eric',
      eyebrow: 'We are getting married',
      subheadline: 'June 14, 2025 · The Grand Pavilion, New York',
      overlayOpacity: 40,
      ctaLabel: 'Send RSVP',
      ctaHref: '#rsvp',
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('subtitle');
    expect(settings).not.toHaveProperty('showTitle');
    expect(settings).not.toHaveProperty('privateToken');
  });

  it('normalizes story legacy fields into the resolved public story renderer contract', () => {
    const settings = sanitizePublicSectionSettings('story', 'timeline', {
      title: 'How we met',
      storyText: 'We met on a rainy Tuesday.',
      photo: 'https://example.com/couple.jpg',
      showTitle: false,
      plannerNotes: 'private',
    });

    expect(settings).toEqual({
      headline: 'How we met',
      body: 'We met on a rainy Tuesday.',
      image: 'https://example.com/couple.jpg',
      showDivider: false,
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('storyText');
    expect(settings).not.toHaveProperty('photo');
    expect(settings).not.toHaveProperty('showTitle');
    expect(settings).not.toHaveProperty('plannerNotes');
  });

  it('normalizes contact form title aliases into the resolved public renderer fields', () => {
    const settings = sanitizePublicSectionSettings('contact', 'form', {
      title: 'Questions for us?',
      subtitle: 'We are happy to help.',
      introText: 'Reach out any time.',
      contacts: [{
        id: 'planner-1',
        name: 'Avery Planner',
        role: 'Planner',
        email: 'avery@example.com',
        phone: '+1 212 555 1111',
        instagram: '@averyplans',
        adminEmail: 'private@example.com',
        billingStatus: 'past_due',
      }],
      poll: { id: 'poll-secret' },
    });

    expect(settings).toEqual({
      showTitle: true,
      eyebrow: 'Need help?',
      emailSubject: 'Wedding Question',
      headline: 'Questions for us?',
      subheadline: 'We are happy to help.',
      introText: 'Reach out any time.',
      contacts: [{
        id: 'planner-1',
        name: 'Avery Planner',
        role: 'Planner',
        email: 'avery@example.com',
        phone: '+1 212 555 1111',
        instagram: '@averyplans',
      }],
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('subtitle');
    expect(settings).not.toHaveProperty('poll');
  });

  it('normalizes travel title aliases and allowlists nested travel list entries', () => {
    const settings = sanitizePublicSectionSettings('travel', 'list', {
      title: 'Travel & Accommodations',
      showTitle: true,
      showTimezoneBadge: true,
      showIcsButton: true,
      showParking: true,
      flightInfo: 'Fly into SFO.',
      generalNote: 'Book early.',
      hotels: [{
        id: 'hotel-1',
        name: 'Harbor Hotel',
        distance: '0.3 miles',
        price: '$250',
        bookingCode: 'MAYALEO',
        phone: '+1 555 0101',
        url: 'https://example.com/stay',
        notes: 'Shuttle leaves at 4pm.',
        adminEmail: 'private@example.com',
        queueTargets: ['hide-me'],
      }],
      plannerNotes: 'private',
    });

    expect(settings).toEqual({
      headline: 'Travel & Accommodations',
      flightInfo: 'Fly into SFO.',
      generalNote: 'Book early.',
      hotels: [{
        id: 'hotel-1',
        name: 'Harbor Hotel',
        distance: '0.3 miles',
        price: '$250',
        bookingCode: 'MAYALEO',
        phone: '+1 555 0101',
        url: 'https://example.com/stay',
        notes: 'Shuttle leaves at 4pm.',
      }],
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('showTitle');
    expect(settings).not.toHaveProperty('showTimezoneBadge');
    expect(settings).not.toHaveProperty('showIcsButton');
    expect(settings).not.toHaveProperty('showParking');
    expect(JSON.stringify(settings)).not.toContain('adminEmail');
    expect(JSON.stringify(settings)).not.toContain('queueTargets');
    expect(JSON.stringify(settings)).not.toContain('plannerNotes');
  });

  it('normalizes gallery aliases and allowlists nested image entries', () => {
    const settings = sanitizePublicSectionSettings('gallery', 'masonry', {
      title: 'Weekend photos',
      showTitle: true,
      galleryImages: [
        {
          id: 'img-1',
          url: 'https://example.com/photo.jpg',
          caption: 'Ceremony',
          alt: 'Ceremony flowers',
          span: '2',
          adminEmail: 'hide@example.com',
        },
      ],
      autoplay: true,
      backgroundColor: '#fef9f0',
      providerSecret: 'hide-me',
    });

    expect(settings).toEqual({
      eyebrow: 'Our moments',
      headline: 'Weekend photos',
      animation: 'fade',
      showCaptions: true,
      enableLightbox: true,
      autoScroll: false,
      continuousGlide: true,
      glideSpeed: 42,
      images: [{
        id: 'img-1',
        url: 'https://example.com/photo.jpg',
        caption: 'Ceremony',
        alt: 'Ceremony flowers',
        span: '2',
      }],
      autoplay: true,
      backgroundColor: '#fef9f0',
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('showTitle');
    expect(settings).not.toHaveProperty('galleryImages');
    expect(JSON.stringify(settings)).not.toContain('adminEmail');
    expect(JSON.stringify(settings)).not.toContain('providerSecret');
  });
});
