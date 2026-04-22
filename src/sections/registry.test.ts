import { describe, expect, it } from 'vitest';
import { getAllSectionManifests, getSectionManifest } from '../builder/registry/sectionManifests';
import { resolveAndParse } from './registry';
import { getAllTemplates } from '../templates/registry';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSectionComponent, getSectionVariants } from './sectionRegistry';
import { RegistryFundHighlight, RegistryGrid, RegistrySection } from './components/RegistrySection';

const EXPECTED_ALIAS_TARGETS: Array<{ type: string; variant: string; expectedResolvedVariant: string }> = [
  { type: 'venue', variant: 'banner', expectedResolvedVariant: 'splitMap' },
  { type: 'venue', variant: 'stacked', expectedResolvedVariant: 'detailsFirst' },
  { type: 'venue', variant: 'minimal', expectedResolvedVariant: 'card' },
  { type: 'directions', variant: 'illustrated', expectedResolvedVariant: 'split' },
  { type: 'directions', variant: 'multiVenue', expectedResolvedVariant: 'split' },
  { type: 'directions', variant: 'transport', expectedResolvedVariant: 'pin' },
  { type: 'directions', variant: 'fromHotel', expectedResolvedVariant: 'pin' },
  { type: 'registry', variant: 'fundHighlight', expectedResolvedVariant: 'featured' },
  { type: 'registry', variant: 'honeymoon', expectedResolvedVariant: 'featured' },
  { type: 'registry', variant: 'tabs', expectedResolvedVariant: 'cards' },
  { type: 'registry', variant: 'illustrated', expectedResolvedVariant: 'cards' },
  { type: 'registry', variant: 'minimal', expectedResolvedVariant: 'cards' },
  { type: 'registry', variant: 'experiences', expectedResolvedVariant: 'featured' },
  { type: 'registry', variant: 'luxury', expectedResolvedVariant: 'featured' },
];

describe('sections registry resolution', () => {
  it('resolves all supported variants for high-risk section types touched by recent fixes', () => {
    const guardedTypes = new Set(['gallery', 'venue', 'directions', 'registry']);
    const manifests = getAllSectionManifests().filter((m) => guardedTypes.has(m.type));

    for (const manifest of manifests) {
      for (const variant of manifest.supportedVariants) {
        const resolved = resolveAndParse(manifest.type, variant, {});
        expect(resolved, `unresolved ${manifest.type}:${variant}`).not.toBeNull();
      }
    }
  });

  it('keeps explicit alias fallback mappings stable for critical variants', () => {
    for (const { type, variant, expectedResolvedVariant } of EXPECTED_ALIAS_TARGETS) {
      const resolved = resolveAndParse(type, variant, {});
      expect(resolved, `unresolved alias ${type}:${variant}`).not.toBeNull();
      expect(resolved?.def.variant).toBe(expectedResolvedVariant);
    }
  });

  it('keeps strict variant rendering compatible with registry template aliases', () => {
    for (const { type, variant, expectedResolvedVariant } of EXPECTED_ALIAS_TARGETS.filter((entry) => entry.type === 'registry')) {
      const resolved = resolveAndParse(type, variant, {}, { strictVariant: true });
      expect(resolved, `strict unresolved alias ${type}:${variant}`).not.toBeNull();
      expect(resolved?.def.variant).toBe(expectedResolvedVariant);
    }
  });

  it('exposes template-backed registry aliases to the builder manifest', () => {
    const registryManifest = getSectionManifest('registry');
    expect(registryManifest?.supportedVariants).toEqual(expect.arrayContaining(['classic', 'luxury', 'experiences', 'modern', 'playful']));
  });

  it('supports every registry variant used by shipped templates', () => {
    const registryManifest = getSectionManifest('registry');
    const templateVariants = Array.from(new Set(
      getAllTemplates()
        .flatMap((template) => template.defaultLayout.sections)
        .filter((section) => section.type === 'registry')
        .map((section) => section.variant)
    ));

    expect(registryManifest?.supportedVariants).toEqual(expect.arrayContaining(templateVariants));
  });

  it('keeps the builder lab registry variant picker aligned with shipped template aliases', () => {
    const builderLab = readFileSync(resolve(__dirname, '../pages/BuilderV2Lab.tsx'), 'utf8');
    expect(builderLab).toContain("registry: ['default', 'fundHighlight', 'classic', 'luxury', 'experiences', 'modern', 'playful']");
  });

  it('keeps the builder lab variant commands aligned with shipped registry aliases', () => {
    const builderLab = readFileSync(resolve(__dirname, '../pages/BuilderV2Lab.tsx'), 'utf8');
    expect(builderLab).toContain("['default', 'countdown', 'timeline', 'dayTabs', 'localGuide', 'iconGrid', 'fundHighlight', 'classic', 'luxury', 'experiences', 'modern', 'playful']");
  });

  it('keeps legacy section registry aligned with public registry aliases', () => {
    expect(getSectionVariants('registry')).toEqual(expect.arrayContaining(['cards', 'featured', 'minimal', 'honeymoon', 'tabs', 'illustrated', 'classic', 'luxury', 'experiences', 'modern', 'playful']));
    expect(getSectionComponent('registry', 'classic')).toBe(RegistryGrid);
    expect(getSectionComponent('registry', 'luxury')).toBe(RegistryFundHighlight);
    expect(getSectionComponent('registry', 'cards')).toBe(RegistrySection);
  });
});
