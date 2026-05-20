import { describe, expect, it } from 'vitest';
import { getTemplatePack } from '../constants/builderTemplatePacks';
import type { BuilderTemplateDefinition } from '../../types/builder/template';
import { buildTemplatePageInstances, normalizeTemplatePageSlots } from './templatePages';

describe('template page utilities', () => {
  it('builds dedicated pages with unique slugs and without redundant section anchors', () => {
    const template = getTemplatePack('modern-luxe');
    expect(template).toBeTruthy();

    const pages = buildTemplatePageInstances(template!, 'multi');

    expect(pages.map((page) => ({ slug: page.slug, isHome: page.meta.isHome }))).toEqual([
      { slug: 'home', isHome: true },
      { slug: 'travel', isHome: false },
      { slug: 'rsvp', isHome: false },
      { slug: 'registry', isHome: false },
    ]);
    expect(pages.find((page) => page.slug === 'travel')?.sections[0]?.settings.anchorId).toBeUndefined();
    expect(pages.find((page) => page.slug === 'rsvp')?.sections[0]?.settings.anchorId).toBeUndefined();
    expect(pages.find((page) => page.slug === 'registry')?.sections[0]?.settings.anchorId).toBeUndefined();
  });

  it('keeps explicit lead section anchors on dedicated template pages', () => {
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
          slug: 'travel-info',
          sectionComposition: [{ type: 'travel', variant: 'cards', enabled: true, locked: false, settings: { anchorId: 'hotel-blocks' } }],
        },
      ],
    };

    const pages = buildTemplatePageInstances(template, 'multi');

    expect(pages.find((page) => page.slug === 'travel-info')?.sections[0]?.settings.anchorId).toBe('hotel-blocks');
  });

  it('collapses multi-page templates into home sections with page anchors', () => {
    const template = getTemplatePack('modern-luxe');
    expect(template).toBeTruthy();

    const pages = buildTemplatePageInstances(template!, 'single');

    expect(pages).toHaveLength(1);
    expect(pages[0].sections.find((section) => section.type === 'travel')?.settings.anchorId).toBe('travel');
    expect(pages[0].sections.find((section) => section.type === 'rsvp')?.settings.anchorId).toBe('rsvp');
    expect(pages[0].sections.find((section) => section.type === 'registry')?.settings.anchorId).toBe('registry');
  });

  it('keeps collapsed page boundary anchors even when preserving old section settings', () => {
    const template = getTemplatePack('modern-luxe');
    expect(template).toBeTruthy();

    const pages = buildTemplatePageInstances(template!, 'single', (sections) =>
      sections.map((section) => section.type === 'travel'
        ? { ...section, settings: { ...section.settings, anchorId: 'hotel-blocks' } }
        : section)
    );

    expect(pages[0].sections.find((section) => section.type === 'travel')?.settings.anchorId).toBe('travel');
  });

  it('keeps the first template page as home and uniquifies later home-like pages', () => {
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

    const pages = buildTemplatePageInstances(template, 'multi');

    expect(pages.map((page) => ({ title: page.title, slug: page.slug, isHome: page.meta.isHome }))).toEqual([
      { title: 'Welcome', slug: 'home', isHome: true },
      { title: 'Home', slug: 'home-2', isHome: false },
    ]);
  });

  it('infers page slots when older templates only provide section composition', () => {
    const template = getTemplatePack('modern-luxe');
    expect(template).toBeTruthy();
    const legacyTemplate = {
      ...template!,
      pages: undefined,
    };

    expect(normalizeTemplatePageSlots(legacyTemplate).map((page) => page.slug)).toEqual(['home', 'travel', 'rsvp', 'registry']);
  });

  it('unwraps builder value page slot titles and slugs before previewing or applying templates', () => {
    const template: BuilderTemplateDefinition = {
      ...getTemplatePack('modern-luxe')!,
      pages: [
        {
          title: { value: 'Welcome', source: 'template' } as unknown as string,
          slug: { value: 'Home', source: 'template' } as unknown as string,
          isHome: true,
          sectionComposition: [{ type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: {} }],
        },
        {
          title: { value: 'Guest Travel', source: 'template' } as unknown as string,
          slug: { value: 'Guest Travel!', source: 'template' } as unknown as string,
          sectionComposition: [{ type: 'travel', variant: 'cards', enabled: true, locked: false, settings: {} }],
        },
      ],
    };

    expect(normalizeTemplatePageSlots(template).map((page) => ({ title: page.title, slug: page.slug }))).toEqual([
      { title: 'Welcome', slug: 'Home' },
      { title: 'Guest Travel', slug: 'Guest Travel!' },
    ]);
    expect(buildTemplatePageInstances(template, 'multi').map((page) => ({ title: page.title, slug: page.slug }))).toEqual([
      { title: 'Welcome', slug: 'home' },
      { title: 'Guest Travel', slug: 'guest-travel' },
    ]);
  });
});
