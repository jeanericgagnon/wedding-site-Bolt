import { describe, expect, it } from 'vitest';
import { getTemplateGallerySummary } from './templateGallerySummary';
import type { BuilderTemplateDefinition } from '../../types/builder/template';

function makeTemplate(overrides: Partial<BuilderTemplateDefinition>): BuilderTemplateDefinition {
  return {
    id: overrides.id ?? 'template-1',
    displayName: overrides.displayName ?? 'Template One',
    description: overrides.description ?? 'A wedding template',
    moodTags: overrides.moodTags ?? ['modern'],
    previewThumbnailPath: overrides.previewThumbnailPath ?? '/preview.jpg',
    defaultThemeId: overrides.defaultThemeId ?? 'romantic',
    suggestedFonts: overrides.suggestedFonts ?? { heading: 'Playfair Display', body: 'Inter' },
    sectionComposition: overrides.sectionComposition ?? [{ type: 'hero', variant: 'default', enabled: true, locked: false, settings: {} }],
    sectionVariantMap: overrides.sectionVariantMap ?? { hero: 'default' },
    spacingProfile: overrides.spacingProfile ?? 'balanced',
    isPremium: overrides.isPremium ?? false,
    isNew: overrides.isNew ?? false,
  };
}

describe('getTemplateGallerySummary', () => {
  it('summarizes current draft status and compare readiness', () => {
    const templates = [
      makeTemplate({ id: 'current', displayName: 'Current One' }),
      makeTemplate({ id: 'other', displayName: 'Other One', moodTags: ['editorial', 'photo'], sectionComposition: [{ type: 'hero', variant: 'default', enabled: true, locked: false, settings: {} }, { type: 'story', variant: 'default', enabled: true, locked: false, settings: {} }] }),
    ];

    const summary = getTemplateGallerySummary({
      templates,
      filtered: templates,
      currentTemplateId: 'current',
      compareTemplateIds: ['current', 'other'],
      pageCount: 2,
      sectionCount: 8,
      currentPageSectionCount: 5,
    });

    expect(summary.currentTemplateName).toBe('Current One');
    expect(summary.compareReady).toBe(true);
    expect(summary.compareMessage).toContain('Ready to compare');
  });

  it('highlights the strongest filtered option when matches remain', () => {
    const templates = [
      makeTemplate({ id: 'baseline', displayName: 'Baseline', moodTags: ['minimal'] }),
      makeTemplate({ id: 'best', displayName: 'Best Fit', moodTags: ['editorial', 'photo'], isPremium: true, isNew: true, sectionComposition: new Array(4).fill(null).map(() => ({ type: 'hero', variant: 'default', enabled: true, locked: false, settings: {} })) }),
    ];

    const summary = getTemplateGallerySummary({
      templates,
      filtered: templates,
      currentTemplateId: null,
      compareTemplateIds: [],
      pageCount: 1,
      sectionCount: 0,
      currentPageSectionCount: 0,
    });

    expect(summary.strongestFilteredTemplate?.id).toBe('best');
    expect(summary.filteredDetail).toContain('Best Fit');
  });
});
