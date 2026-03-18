import { describe, expect, it } from 'vitest';
import { getAllSectionManifests } from '../builder/registry/sectionManifests';
import { resolveAndParse } from './registry';

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
});
