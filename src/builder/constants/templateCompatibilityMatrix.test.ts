import { describe, expect, it } from 'vitest';

import { templateCatalog } from './templateCatalog';
import { getTemplateCompatibilityReport } from './templateCompatibilityMatrix';

describe('templateCompatibilityMatrix', () => {
  it('keeps every shipped template compatible with builder seed, runtime, and public rendering', () => {
    for (const template of templateCatalog) {
      const report = getTemplateCompatibilityReport(template.id);

      expect(report.sectionCount, `missing sections for ${template.id}`).toBeGreaterThan(0);
      expect(report.builderSeedStatus, `builder seed risk for ${template.id}`).toBe('verified');
      expect(report.runtimeStatus, `runtime risk for ${template.id}`).toBe('verified');
      expect(report.publicRuntimeStatus, `public runtime risk for ${template.id}`).toBe('verified');
      expect(report.overallStatus, `overall compatibility risk for ${template.id}`).not.toBe('risk');
    }
  });

  it('surfaces when a template relies on variant normalization during V2 seed', () => {
    const report = getTemplateCompatibilityReport('destination-adventure');

    expect(report.overallStatus).toBe('normalized');
    expect(report.normalizedVariantCount).toBeGreaterThan(0);
    expect(report.sectionRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'hero', sourceVariant: 'split', builderVariant: 'fullbleed', normalized: true }),
      expect.objectContaining({ type: 'travel', sourceVariant: 'map', builderVariant: 'cards', normalized: true }),
    ]));
  });
});
