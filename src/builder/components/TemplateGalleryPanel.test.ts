import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATE_USAGE_RETENTION_MS, buildTemplateUsageStorageKey, bumpTemplateUsage, readTemplateUsage } from './templateUsageStorage';
import {
  buildTemplatePageInstances,
  describeTemplateApplyPageMode,
  getRecommendedTemplateApplyPageMode,
  summarizeCollapsedTemplateAnchors,
  summarizeDedicatedTemplateRoutes,
  summarizeSinglePageTemplateSections,
  summarizeTemplateGuestDestinations,
  summarizeTemplatePages,
  templateMatchesPageStructure,
} from './TemplateGalleryPanel';
import { getTemplatePack } from '../constants/builderTemplatePacks';
import type { BuilderTemplateDefinition } from '../../types/builder/template';

const TEMPLATE_USAGE_KEY = 'dayof_template_usage_v1';

describe('TemplateGalleryPanel template usage storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('writes template usage in a timestamped bounded envelope', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:22:00.000Z'));

    bumpTemplateUsage(' modern-luxe ', 'user-a');
    bumpTemplateUsage('modern-luxe', 'user-a');

    expect(readTemplateUsage('user-a')).toEqual({ 'modern-luxe': 2 });
    expect(JSON.parse(window.localStorage.getItem(buildTemplateUsageStorageKey('user-a')) || '{}')).toEqual({
      savedAtISO: '2026-05-06T21:22:00.000Z',
      usage: { 'modern-luxe': 2 },
    });
    expect(window.localStorage.getItem(TEMPLATE_USAGE_KEY)).toBeNull();
  });

  it('migrates and bounds active legacy template usage maps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:23:00.000Z'));
    window.localStorage.setItem(TEMPLATE_USAGE_KEY, JSON.stringify({
      'modern-luxe': 3,
      'bad-count': -1,
      [Array.from({ length: 140 }, () => 'x').join('')]: 50000,
    }));

    const usage = readTemplateUsage('user-a');

    expect(usage['modern-luxe']).toBe(3);
    expect(Object.values(usage)).toContain(9999);
    expect(usage['bad-count']).toBeUndefined();
    expect(JSON.parse(window.localStorage.getItem(buildTemplateUsageStorageKey('user-a')) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T21:23:00.000Z',
      usage,
    });
    expect(window.localStorage.getItem(TEMPLATE_USAGE_KEY)).toBeNull();
  });

  it('clears stale or malformed template usage storage', () => {
    const staleDate = new Date(Date.now() - TEMPLATE_USAGE_RETENTION_MS - 1000).toISOString();
    window.localStorage.setItem(TEMPLATE_USAGE_KEY, JSON.stringify({
      savedAtISO: staleDate,
      usage: { 'modern-luxe': 1 },
    }));

    expect(readTemplateUsage('user-a')).toEqual({});
    expect(window.localStorage.getItem(buildTemplateUsageStorageKey('user-a'))).toBeNull();

    window.localStorage.setItem(buildTemplateUsageStorageKey('user-a'), '{broken');
    expect(readTemplateUsage('user-a')).toEqual({});
    expect(window.localStorage.getItem(buildTemplateUsageStorageKey('user-a'))).toBeNull();
  });
});

describe('summarizeTemplatePages', () => {
  it('keeps fast discovery chips wired to searchable template metadata', () => {
    const source = readFileSync(join(process.cwd(), 'src/builder/components/TemplateGalleryPanel.tsx'), 'utf8');

    expect(source).toContain('TEMPLATE_QUICK_SEARCHES');
    expect(source).toContain('Fast find');
    expect(source).toContain('searchTokens.every');
    expect(source).toContain('t.structureFocus');
    expect(source).toContain('TEMPLATE_READINESS_LABELS');
    expect(source).toContain('templateCatalogSummary');
    expect(source).toContain('activeReadinessFilter');
    expect(source).toContain('TEMPLATE_SORT_OPTIONS');
    expect(source).toContain('activeSort');
    expect(source).toContain('readSetupDraft');
    expect(source).toContain('getRecommendedTemplateMatches');
    expect(source).toContain('recommendedTemplateReasonById');
    expect(source).toContain('catalogItem?.readinessLabel');
    expect(source).toContain('catalogItem?.pageBlueprints');
    expect(source).toContain('guest-ready');
    expect(source).toContain('Most pages');
    expect(source).toContain('Launch readiness');
    expect(source).toContain('Page blueprint');
    expect(source).toContain('Still refine');
    expect(source).toContain('catalogItem.readinessGaps');
  });

  it('summarizes template page structure for compare and confirm surfaces', () => {
    const template = getTemplatePack('modern-luxe');

    expect(template).toBeTruthy();
    expect(summarizeTemplatePages(template!)).toEqual([
      'Home: Hero, Our Story, Venue + 1 more',
      'Schedule: Schedule',
      'Travel: Travel & Hotels',
      'RSVP: RSVP, FAQ',
      'Registry: Registry',
    ]);
    expect(summarizeSinglePageTemplateSections(template!)).toBe('Home: Hero, Our Story, Venue, Schedule + 5 more');
  });

  it('matches templates by single-page or multi-page structure', () => {
    const template = getTemplatePack('modern-luxe');

    expect(template).toBeTruthy();
    expect(templateMatchesPageStructure(template!, 'all')).toBe(true);
    expect(templateMatchesPageStructure(template!, 'multi')).toBe(true);
    expect(templateMatchesPageStructure(template!, 'single')).toBe(false);
  });

  it('defaults multi-page templates to dedicated pages but can collapse them into one page', () => {
    const template = getTemplatePack('modern-luxe');

    expect(template).toBeTruthy();
    expect(getRecommendedTemplateApplyPageMode(template!)).toBe('multi');
    expect(describeTemplateApplyPageMode(template!, 'multi')).toBe('5 dedicated pages');
    expect(describeTemplateApplyPageMode(template!, 'single')).toBe('One page with anchor sections');
    expect(summarizeCollapsedTemplateAnchors(template!)).toEqual(['#schedule', '#travel', '#rsvp', '#registry']);
    expect(summarizeDedicatedTemplateRoutes(template!)).toEqual(['/', '/schedule', '/travel', '/rsvp', '/registry']);
    expect(summarizeTemplateGuestDestinations(template!, 'multi')).toEqual({
      label: 'Guest URLs',
      destinations: ['/', '/schedule', '/travel', '/rsvp', '/registry'],
    });
    expect(summarizeTemplateGuestDestinations(template!, 'single')).toEqual({
      label: 'Anchor links',
      destinations: ['#schedule', '#travel', '#rsvp', '#registry'],
    });

    const singlePage = buildTemplatePageInstances(template!, [], 'single');
    const multiPage = buildTemplatePageInstances(template!, [], 'multi');

    expect(singlePage).toHaveLength(1);
    expect(singlePage[0].slug).toBe('home');
    expect(singlePage[0].sections).toHaveLength(template!.sectionComposition.length);
    expect(singlePage[0].sections.map((section) => section.type)).toEqual([
      'hero',
      'story',
      'venue',
      'schedule',
      'travel',
      'rsvp',
      'gallery',
      'registry',
      'faq',
    ]);
    expect(singlePage[0].sections.find((section) => section.type === 'schedule')?.settings.anchorId).toBe('schedule');
    expect(singlePage[0].sections.find((section) => section.type === 'travel')?.settings.anchorId).toBe('travel');
    expect(singlePage[0].sections.find((section) => section.type === 'rsvp')?.settings.anchorId).toBe('rsvp');
    expect(singlePage[0].sections.find((section) => section.type === 'registry')?.settings.anchorId).toBe('registry');
    expect(multiPage.map((page) => page.slug)).toEqual(['home', 'schedule', 'travel', 'rsvp', 'registry']);
    expect(multiPage.find((page) => page.slug === 'schedule')?.sections[0]?.settings.anchorId).toBeUndefined();
    expect(multiPage.find((page) => page.slug === 'travel')?.sections[0]?.settings.anchorId).toBeUndefined();
    expect(multiPage.find((page) => page.slug === 'rsvp')?.sections[0]?.settings.anchorId).toBeUndefined();
  });

  it('normalizes duplicate template page slugs consistently for pages and collapsed anchors', () => {
    const template: BuilderTemplateDefinition = {
      ...getTemplatePack('modern-luxe')!,
      pages: [
        {
          title: 'Home',
          slug: 'home',
          isHome: true,
          sectionComposition: [{ type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: {} }],
        },
        {
          title: 'Travel Info',
          slug: 'Travel%20Info',
          sectionComposition: [{ type: 'travel', variant: 'cards', enabled: true, locked: false, settings: {} }],
        },
        {
          title: 'Travel Info',
          slug: '/travel_info/',
          sectionComposition: [{ type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: {} }],
        },
      ],
    };

    expect(summarizeCollapsedTemplateAnchors(template)).toEqual(['#travel-info', '#travel-info-2']);
    expect(summarizeDedicatedTemplateRoutes(template)).toEqual(['/', '/travel-info', '/travel-info-2']);

    const singlePage = buildTemplatePageInstances(template, [], 'single');
    const multiPage = buildTemplatePageInstances(template, [], 'multi');

    expect(singlePage[0].sections.map((section) => section.settings.anchorId)).toEqual([
      undefined,
      'travel-info',
      'travel-info-2',
    ]);
    expect(multiPage.map((page) => page.slug)).toEqual(['home', 'travel-info', 'travel-info-2']);
    expect(multiPage[1].sections[0].settings.anchorId).toBeUndefined();
    expect(multiPage[2].sections[0].settings.anchorId).toBeUndefined();
  });

  it('keeps the first imported template page as root and uniquifies later home-like pages', () => {
    const template: BuilderTemplateDefinition = {
      ...getTemplatePack('modern-luxe')!,
      pages: [
        {
          title: 'Welcome',
          slug: 'welcome',
          sectionComposition: [{ type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: {} }],
        },
        {
          title: 'Home',
          slug: 'home',
          sectionComposition: [{ type: 'story', variant: 'split', enabled: true, locked: false, settings: {} }],
        },
      ],
    };

    const pages = buildTemplatePageInstances(template, [], 'multi');

    expect(pages.map((page) => ({ title: page.title, slug: page.slug, isHome: page.meta.isHome }))).toEqual([
      { title: 'Welcome', slug: 'home', isHome: true },
      { title: 'Home', slug: 'home-2', isHome: false },
    ]);
  });

  it('preserves existing section content only once across multi-page templates', () => {
    const template: BuilderTemplateDefinition = {
      ...getTemplatePack('modern-luxe')!,
      pages: [
        {
          title: 'Home',
          slug: 'home',
          isHome: true,
          sectionComposition: [{ type: 'story', variant: 'split', enabled: true, locked: false, settings: {} }],
        },
        {
          title: 'Details',
          slug: 'details',
          sectionComposition: [{ type: 'story', variant: 'centered', enabled: true, locked: false, settings: {} }],
        },
      ],
    };
    const existingStory = buildTemplatePageInstances(getTemplatePack('modern-luxe')!, [], 'single')[0].sections
      .find((section) => section.type === 'story')!;
    const pages = buildTemplatePageInstances(template, [{ ...existingStory, id: 'existing-story' }], 'multi');

    const storyIds = pages.flatMap((page) => page.sections.filter((section) => section.type === 'story').map((section) => section.id));

    expect(storyIds.filter((id) => id === 'existing-story')).toHaveLength(1);
    expect(new Set(storyIds).size).toBe(storyIds.length);
  });

  it('keeps collapsed page anchors when preserving existing section settings', () => {
    const template = getTemplatePack('modern-luxe')!;
    const existingTravel = buildTemplatePageInstances(template, [], 'multi')
      .find((page) => page.slug === 'travel')?.sections[0];
    expect(existingTravel).toBeTruthy();

    const pages = buildTemplatePageInstances(template, [
      { ...existingTravel!, settings: { ...existingTravel!.settings, anchorId: 'hotel-blocks' } },
    ], 'single');

    expect(pages[0].sections.find((section) => section.type === 'travel')?.settings.anchorId).toBe('travel');
  });

  it('summarizes new launch templates as multi-page guest experiences', () => {
    const template = getTemplatePack('coastal-weekend');

    expect(template).toBeTruthy();
    expect(summarizeDedicatedTemplateRoutes(template!)).toEqual(['/', '/schedule', '/travel', '/rsvp']);
    expect(summarizeTemplatePages(template!)).toEqual([
      'Home: Hero, Venue, Gallery',
      'Schedule: Schedule',
      'Travel: Travel & Hotels, Accommodations, Directions',
      'RSVP: RSVP, FAQ',
    ]);
  });
});
