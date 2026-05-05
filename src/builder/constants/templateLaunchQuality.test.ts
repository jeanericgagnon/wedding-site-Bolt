import { describe, expect, it } from 'vitest';
import { getLaunchTemplatePacks, getTemplatePack } from './builderTemplatePacks';
import {
  LAUNCH_FLAGSHIP_TEMPLATE_IDS,
  LAUNCH_SECONDARY_TEMPLATE_IDS,
  getTemplateLaunchTier,
  isLaunchVisibleTemplateId,
} from './templateLaunchQuality';
import { resolveAndParse } from '../../sections/registry';

describe('launch template quality gate', () => {
  it('keeps the launch catalog focused on proven flagship and secondary templates', () => {
    const templates = getLaunchTemplatePacks();
    const ids = templates.map((template) => template.id);

    expect(ids).toEqual([
      ...LAUNCH_FLAGSHIP_TEMPLATE_IDS,
      ...LAUNCH_SECONDARY_TEMPLATE_IDS,
    ]);
    expect(templates.every((template) => template.launchTier === 'flagship' || template.launchTier === 'secondary')).toBe(true);
    expect(isLaunchVisibleTemplateId('editorial-impact')).toBe(false);
    expect(getTemplateLaunchTier('editorial-impact')).toBe('hidden');
  });

  it('keeps hidden legacy templates addressable for saved sites without showing them in launch choice surfaces', () => {
    const hiddenLegacyTemplate = getTemplatePack('editorial-impact');

    expect(hiddenLegacyTemplate).toBeTruthy();
    expect(hiddenLegacyTemplate?.launchTier).toBe('hidden');
  });

  it('proves every visible launch template section resolves through the rich public registry', () => {
    for (const template of getLaunchTemplatePacks()) {
      const enabledSections = template.sectionComposition.filter((section) => section.enabled);
      expect(enabledSections.length, `${template.id} should ship with real sections`).toBeGreaterThanOrEqual(8);

      for (const section of enabledSections) {
        const resolved = resolveAndParse(section.type, section.variant, section.settings ?? {});
        expect(resolved, `${template.id} ${section.type}:${section.variant}`).not.toBeNull();
      }
    }
  });

  it('keeps each flagship above-the-fold composition distinct and guest-complete', () => {
    const requiredTypes = ['hero', 'venue', 'schedule', 'travel', 'rsvp'] as const;
    const heroSignatures = new Set<string>();

    for (const templateId of LAUNCH_FLAGSHIP_TEMPLATE_IDS) {
      const template = getTemplatePack(templateId);
      expect(template, templateId).toBeTruthy();
      const enabledSections = template?.sectionComposition.filter((section) => section.enabled) ?? [];
      const enabledTypes = new Set(enabledSections.map((section) => section.type));

      for (const requiredType of requiredTypes) {
        expect(enabledTypes.has(requiredType), `${templateId} should include ${requiredType}`).toBe(true);
      }

      expect(
        enabledTypes.has('story') || enabledTypes.has('gallery'),
        `${templateId} should include an emotional story or photo moment`,
      ).toBe(true);
      expect(
        enabledTypes.has('faq') || enabledTypes.has('registry') || enabledTypes.has('accommodations'),
        `${templateId} should include a practical guest follow-up section`,
      ).toBe(true);

      const hero = enabledSections.find((section) => section.type === 'hero');
      expect(hero, `${templateId} should start with a hero`).toBeTruthy();
      expect(enabledSections[0]?.type, `${templateId} first section`).toBe('hero');
      const signature = `${hero?.variant}:${String(hero?.settings?.layoutStyle ?? 'default')}:${String(hero?.settings?.textAlign ?? 'center')}`;
      heroSignatures.add(signature);
    }

    expect(heroSignatures.size).toBeGreaterThanOrEqual(5);
  });

  it('keeps launch template travel defaults out of stale placeholder geography', () => {
    const staleTerms = [
      /JFK/i,
      /Newark/i,
      /Manhattan/i,
      /Park Avenue/i,
      /The Lowell/i,
      /Baccarat/i,
      /Benjamin/i,
      /Sonesta/i,
      /SMITH2025/i,
      /WEDDING25/i,
      /Cityline/i,
      /May 1(?:st)?, 2025/i,
    ];

    for (const template of getLaunchTemplatePacks()) {
      const travelSections = template.sectionComposition.filter((section) => (
        section.type === 'travel' || section.type === 'accommodations'
      ));
      expect(travelSections.length, `${template.id} should keep guest logistics explicit`).toBeGreaterThan(0);

      for (const section of travelSections) {
        const settingsText = JSON.stringify(section.settings ?? {});
        for (const staleTerm of staleTerms) {
          expect(settingsText, `${template.id} ${section.type}:${section.variant} should not include ${staleTerm}`).not.toMatch(staleTerm);
        }
      }
    }
  });
});
