import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('builder browser storage scope audit', () => {
  it('keeps builder local storage limited to scoped helpers', () => {
    const versionHistory = readFileSync(join(process.cwd(), 'src/builder/services/versionHistory.ts'), 'utf8');
    const coachmarks = readFileSync(join(process.cwd(), 'src/builder/components/builderCoachmarkStorage.ts'), 'utf8');
    const templateGallery = readFileSync(join(process.cwd(), 'src/builder/components/TemplateGalleryPanel.tsx'), 'utf8');
    const templateUsageStorage = readFileSync(join(process.cwd(), 'src/builder/components/templateUsageStorage.ts'), 'utf8');

    expect(versionHistory).toContain('return `builder:revisions:${weddingId}`;');
    expect(versionHistory).toContain('normalizeRevisions(parsed, weddingId)');
    expect(versionHistory).toContain('normalizeRevisions(parsed?.revisions, weddingId)');
    expect(versionHistory).toContain('normalizeRevisions(revisions, weddingId)');

    expect(coachmarks).toContain('buildBuilderCoachmarkStorageKey');
    expect(coachmarks).toContain('BUILDER_COACHMARK_STORAGE_SCOPE_SEPARATOR');
    expect(coachmarks).toContain('if (scopedStorageKey !== storageKey) window.localStorage.removeItem(storageKey)');

    expect(templateGallery).toContain("from './templateUsageStorage'");
    expect(templateGallery).toContain('readTemplateUsage(storageScope)');
    expect(templateGallery).toContain('bumpTemplateUsage(template.id, storageScope)');
    expect(templateUsageStorage).toContain('buildTemplateUsageStorageKey');
    expect(templateUsageStorage).toContain('TEMPLATE_USAGE_SCOPE_SEPARATOR');
    expect(templateUsageStorage).toContain('if (scopedStorageKey !== TEMPLATE_USAGE_KEY) localStorage.removeItem(TEMPLATE_USAGE_KEY)');
  });
});
