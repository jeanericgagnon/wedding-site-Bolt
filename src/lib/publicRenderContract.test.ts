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

  it('normalizes contact form title aliases into the resolved public renderer fields', () => {
    const settings = sanitizePublicSectionSettings('contact', 'form', {
      title: 'Questions for us?',
      subtitle: 'We are happy to help.',
      introText: 'Reach out any time.',
      poll: { id: 'poll-secret' },
    });

    expect(settings).toEqual({
      showTitle: true,
      eyebrow: 'Need help?',
      emailSubject: 'Wedding Question',
      headline: 'Questions for us?',
      subheadline: 'We are happy to help.',
      introText: 'Reach out any time.',
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('subtitle');
    expect(settings).not.toHaveProperty('poll');
  });
});
