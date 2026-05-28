import { describe, expect, it } from 'vitest';

import { getBuilderPageManagerGuidance } from './builderPageManagerGuidance';

describe('getBuilderPageManagerGuidance', () => {
  it('guides empty site maps toward a first page', () => {
    expect(getBuilderPageManagerGuidance([], null)).toMatchObject({
      focusTitle: 'The site map still needs a first page',
      primaryAction: {
        kind: 'add-page',
        label: 'Create first page',
      },
    });
  });

  it('prioritizes empty pages before more map churn', () => {
    const guidance = getBuilderPageManagerGuidance(
        [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            orderIndex: 0,
            sections: [{ id: 'hero' }] as never[],
            meta: { isHome: true, isHidden: false },
          },
          {
            id: 'travel',
            title: 'Travel',
            slug: 'travel',
            orderIndex: 1,
            sections: [],
            meta: { isHome: false, isHidden: false },
          },
        ] as never[],
        'travel',
      );

    expect(guidance).toMatchObject({
      focusTitle: 'Travel needs an anchor before the map grows',
      primaryAction: {
        kind: 'fill-empty-page',
        pageId: 'travel',
      },
    });
    expect(guidance.decisionRule).toContain('visible gap');
  });

  it('prioritizes restoring a hidden home page before broader map work', () => {
    expect(
      getBuilderPageManagerGuidance(
        [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            orderIndex: 0,
            sections: [{ id: 'hero' }] as never[],
            meta: { isHome: true, isHidden: true },
          },
          {
            id: 'travel',
            title: 'Travel',
            slug: 'travel',
            orderIndex: 1,
            sections: [{ id: 'trip' }] as never[],
            meta: { isHome: false, isHidden: false },
          },
        ] as never[],
        'travel',
      ),
    ).toMatchObject({
      focusTitle: 'Home is acting like home but missing from navigation',
      primaryAction: {
        kind: 'open-page',
        pageId: 'home',
      },
    });
  });

  it('surfaces duplicate guest-facing paths before normal page expansion', () => {
    const guidance = getBuilderPageManagerGuidance(
        [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            orderIndex: 0,
            sections: [{ id: 'hero' }] as never[],
            meta: { isHome: true, isHidden: false },
          },
          {
            id: 'story',
            title: 'Story',
            slug: 'travel',
            orderIndex: 1,
            sections: [{ id: 'story-hero' }] as never[],
            meta: { isHome: false, isHidden: false },
          },
          {
            id: 'travel',
            title: 'Travel',
            slug: 'travel',
            orderIndex: 2,
            sections: [{ id: 'trip' }] as never[],
            meta: { isHome: false, isHidden: false },
          },
        ] as never[],
        'travel',
      );

    expect(guidance).toMatchObject({
      focusTitle: 'Two pages are still fighting over /travel',
      primaryAction: {
        kind: 'open-page',
      },
    });
    expect(guidance.bestNextMove).toContain('visible page');
  });

  it('surfaces hidden pages before replacement work', () => {
    const guidance = getBuilderPageManagerGuidance(
        [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            orderIndex: 0,
            sections: [{ id: 'hero' }] as never[],
            meta: { isHome: true, isHidden: false },
          },
          {
            id: 'faq',
            title: 'FAQ',
            slug: 'faq',
            orderIndex: 1,
            sections: [{ id: 'qa' }] as never[],
            meta: { isHome: false, isHidden: true },
          },
        ] as never[],
        'home',
      );

    expect(guidance).toMatchObject({
      focusTitle: 'FAQ is already built but still offstage',
      primaryAction: {
        kind: 'open-page',
        pageId: 'faq',
      },
    });
    expect(guidance.watchout).toContain('visible pages');
  });

  it('keeps healthy maps focused on page quality instead of expansion', () => {
    expect(
      getBuilderPageManagerGuidance(
        [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            orderIndex: 0,
            sections: [{ id: 'hero' }, { id: 'story' }] as never[],
            meta: { isHome: true, isHidden: false },
          },
          {
            id: 'travel',
            title: 'Travel',
            slug: 'travel',
            orderIndex: 1,
            sections: [{ id: 'travel-hero' }] as never[],
            meta: { isHome: false, isHidden: false },
          },
        ] as never[],
        'travel',
      ),
    ).toMatchObject({
      focusTitle: 'Travel can lead the next page-quality pass',
      primaryAction: {
        kind: 'open-page',
        pageId: 'travel',
      },
      secondaryAction: {
        kind: 'add-page',
      },
    });
  });
});
