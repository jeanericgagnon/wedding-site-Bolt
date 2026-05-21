import { describe, expect, it } from 'vitest';

import { getLaunchTemplatePacks, getTemplatePack, inferTemplatePages } from './builderTemplatePacks';
import { TEMPLATE_PAGE_GROUPS } from './templatePageGroups';
import type { TemplateSectionSlot } from '../../types/builder/template';
import type { BuilderSectionType } from '../../types/builder/section';

const slot = (type: TemplateSectionSlot['type']): TemplateSectionSlot => ({
  type,
  variant: 'default',
  enabled: true,
  locked: false,
  settings: {},
});

describe('builder template pack pages', () => {
  it('assigns every builder section type to a template page group', () => {
    const allSectionTypes: BuilderSectionType[] = [
      'hero',
      'story',
      'venue',
      'schedule',
      'travel',
      'registry',
      'faq',
      'rsvp',
      'gallery',
      'countdown',
      'wedding-party',
      'dress-code',
      'accommodations',
      'contact',
      'footer-cta',
      'custom',
      'quotes',
      'menu',
      'music',
      'directions',
      'video',
    ];
    const assignedSectionTypes = new Set(TEMPLATE_PAGE_GROUPS.flatMap((group) => group.sectionTypes));

    expect(Array.from(assignedSectionTypes).sort()).toEqual([...allSectionTypes].sort());
    expect(TEMPLATE_PAGE_GROUPS.filter((group) => group.isHome).map((group) => group.slug)).toEqual(['home']);
  });

  it('infers guest-friendly dedicated pages from section composition', () => {
    const pages = inferTemplatePages([
      slot('hero'),
      slot('story'),
      slot('schedule'),
      slot('travel'),
      slot('accommodations'),
      slot('dress-code'),
      slot('wedding-party'),
      slot('rsvp'),
      slot('faq'),
      slot('registry'),
    ]);

    expect(pages.map((page) => page.slug)).toEqual(['home', 'schedule', 'travel', 'details', 'rsvp', 'registry']);
    expect(pages[0].sectionComposition.map((section) => section.type)).toEqual(['hero', 'story']);
    expect(pages[1].sectionComposition.map((section) => section.type)).toEqual(['schedule']);
    expect(pages[2].sectionComposition.map((section) => section.type)).toEqual(['travel', 'accommodations']);
    expect(pages[3].sectionComposition.map((section) => section.type)).toEqual(['dress-code', 'wedding-party']);
    expect(pages[4].sectionComposition.map((section) => section.type)).toEqual(['rsvp', 'faq']);
  });

  it('returns launch templates with explicit page metadata', () => {
    const templates = getLaunchTemplatePacks();

    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((template) => Array.isArray(template.pages) && template.pages.length >= 1)).toBe(true);
    expect(getTemplatePack('modern-luxe')?.pages?.map((page) => page.slug)).toEqual(['home', 'schedule', 'travel', 'rsvp', 'registry']);
    expect(getTemplatePack('floral-garden')?.pages?.map((page) => page.slug)).toEqual(['home', 'schedule', 'travel', 'details', 'rsvp', 'registry']);
    expect(getTemplatePack('black-tie-ballroom')?.pages?.map((page) => page.slug)).toEqual(['home', 'schedule', 'travel', 'details', 'rsvp', 'registry']);
    expect(getTemplatePack('playful-color')?.pages?.map((page) => page.slug)).toEqual(['home', 'schedule', 'travel', 'details', 'rsvp', 'registry']);
  });

  it('keeps launch template page names guest-facing instead of generic fallbacks', () => {
    const genericPagePattern = /^page-\d+$|^Page \d+$/i;

    for (const template of getLaunchTemplatePacks()) {
      for (const page of template.pages ?? []) {
        expect(page.title, `${template.id} has a generic page title`).not.toMatch(genericPagePattern);
        expect(page.slug, `${template.id} has a generic page slug`).not.toMatch(genericPagePattern);
      }
    }
  });
});
