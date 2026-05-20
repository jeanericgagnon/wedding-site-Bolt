import { describe, expect, it } from 'vitest';

import { getLaunchTemplatePacks, getTemplatePack, inferTemplatePages } from './builderTemplatePacks';
import type { TemplateSectionSlot } from '../../types/builder/template';

const slot = (type: TemplateSectionSlot['type']): TemplateSectionSlot => ({
  type,
  variant: 'default',
  enabled: true,
  locked: false,
  settings: {},
});

describe('builder template pack pages', () => {
  it('infers guest-friendly dedicated pages from section composition', () => {
    const pages = inferTemplatePages([
      slot('hero'),
      slot('story'),
      slot('travel'),
      slot('accommodations'),
      slot('rsvp'),
      slot('faq'),
      slot('registry'),
    ]);

    expect(pages.map((page) => page.slug)).toEqual(['home', 'travel', 'rsvp', 'registry']);
    expect(pages[0].sectionComposition.map((section) => section.type)).toEqual(['hero', 'story']);
    expect(pages[1].sectionComposition.map((section) => section.type)).toEqual(['travel', 'accommodations']);
    expect(pages[2].sectionComposition.map((section) => section.type)).toEqual(['rsvp', 'faq']);
  });

  it('returns launch templates with explicit page metadata', () => {
    const templates = getLaunchTemplatePacks();

    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((template) => Array.isArray(template.pages) && template.pages.length >= 1)).toBe(true);
    expect(getTemplatePack('modern-luxe')?.pages?.map((page) => page.slug)).toEqual(['home', 'travel', 'rsvp', 'registry']);
  });
});
