import { describe, expect, it } from 'vitest';
import {
  createDemoFallbackPages,
  createDemoWeddingDataForSlug,
  deriveCoupleNamesFromPublicSlug,
} from './siteViewDemoFallback';

describe('siteViewDemoFallback', () => {
  it('derives couple names from public preview slugs with hyphens, underscores, and explicit and separators', () => {
    expect(deriveCoupleNamesFromPublicSlug('maya-and-leo')).toEqual({
      partner1Name: 'Maya',
      partner2Name: 'Leo',
      displayName: 'Maya and Leo',
    });
    expect(deriveCoupleNamesFromPublicSlug('maya_rose-and-leo-stone')).toEqual({
      partner1Name: 'Maya Rose',
      partner2Name: 'Leo Stone',
      displayName: 'Maya Rose and Leo Stone',
    });
    expect(deriveCoupleNamesFromPublicSlug('mayaandleo')).toEqual({
      partner1Name: 'Maya',
      partner2Name: 'Leo',
      displayName: 'Maya and Leo',
    });
  });

  it('falls back to the base demo couple when the slug is not a couple slug', () => {
    const data = createDemoWeddingDataForSlug('modern-luxe');

    expect(deriveCoupleNamesFromPublicSlug('modern-luxe')).toBeNull();
    expect(data.couple.displayName).toBe('Alex Thompson & Jordan Rivera');
  });

  it('builds multi-page local demo previews from launch templates', () => {
    const pages = createDemoFallbackPages('modern-luxe');

    expect(pages.map((page) => ({
      slug: page.slug,
      title: page.title,
      isHome: page.meta.isHome,
      sectionCount: page.sections.length,
    }))).toEqual([
      { slug: 'home', title: 'Home', isHome: true, sectionCount: 4 },
      { slug: 'schedule', title: 'Schedule', isHome: false, sectionCount: 1 },
      { slug: 'travel', title: 'Travel', isHome: false, sectionCount: 1 },
      { slug: 'rsvp', title: 'RSVP', isHome: false, sectionCount: 2 },
      { slug: 'registry', title: 'Registry', isHome: false, sectionCount: 1 },
    ]);
    expect(pages.flatMap((page) => page.sections).every((section) => section.enabled !== false)).toBe(true);
  });

  it('returns no pages for an unknown template id instead of inventing a blank public preview', () => {
    expect(createDemoFallbackPages('missing-template')).toEqual([]);
  });
});
