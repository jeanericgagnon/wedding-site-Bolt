import { describe, expect, it } from 'vitest';
import { getAllSectionManifests } from './sectionManifests';

describe('section manifest launch guidance', () => {
  it('keeps every layout choice guided for normal couples', () => {
    for (const manifest of getAllSectionManifests()) {
      expect(
        manifest.variantMeta.every((variant) => variant.bestFor && variant.bestFor.length >= 24),
        `${manifest.type} should explain when each layout is best`,
      ).toBe(true);
      expect(
        manifest.variantMeta.every((variant) => variant.effort),
        `${manifest.type} should disclose setup effort for each layout`,
      ).toBe(true);
      expect(
        manifest.variantMeta.some((variant) => variant.recommended),
        `${manifest.type} should have a recommended default choice`,
      ).toBe(true);
    }
  });
});
