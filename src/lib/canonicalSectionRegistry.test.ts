import { describe, expect, it } from 'vitest';
import { manifestToCanonicalSectionDefinition } from './canonicalSectionRegistry';

describe('manifestToCanonicalSectionDefinition', () => {
  it('converts builder manifest variants and field defaults into canonical registry shape', () => {
    const canonical = manifestToCanonicalSectionDefinition({
      type: 'hero',
      defaultVariant: 'default',
      supportedVariants: ['default', 'split'],
      variantMeta: [
        { id: 'default', label: 'Classic', description: 'Main hero' },
        { id: 'split', label: 'Split', description: 'Two-column hero' },
      ],
      settingsSchema: {
        fields: [
          { key: 'showTitle', defaultValue: true },
          { key: 'overlayOpacity', defaultValue: 40 },
          { key: 'headline' },
        ],
      },
    });

    expect(canonical).toEqual({
      type: 'hero',
      defaultVariant: 'default',
      variants: {
        default: {
          componentKey: 'hero:default',
          schemaKey: 'hero:settings',
          defaults: { showTitle: true, overlayOpacity: 40 },
          label: 'Classic',
          description: 'Main hero',
        },
        split: {
          componentKey: 'hero:split',
          schemaKey: 'hero:settings',
          defaults: { showTitle: true, overlayOpacity: 40 },
          label: 'Split',
          description: 'Two-column hero',
        },
      },
    });
  });

  it('preserves registry template aliases in canonical section validation', () => {
    const canonical = manifestToCanonicalSectionDefinition({
      type: 'registry',
      defaultVariant: 'cards',
      supportedVariants: ['cards', 'featured'],
      variantMeta: [
        { id: 'cards', label: 'Store Links', description: 'Cards' },
        { id: 'featured', label: 'Featured Gifts', description: 'Featured' },
      ],
      settingsSchema: { fields: [{ key: 'showTitle', defaultValue: true }] },
    });

    expect(canonical.variants.classic).toEqual(canonical.variants.cards);
    expect(canonical.variants.luxury).toEqual(canonical.variants.featured);
    expect(canonical.variants.experiences).toEqual(canonical.variants.featured);
    expect(canonical.variants.honeymoon).toEqual(canonical.variants.featured);
  });
});
