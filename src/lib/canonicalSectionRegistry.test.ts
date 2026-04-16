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
});
