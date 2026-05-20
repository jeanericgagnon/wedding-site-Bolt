import { describe, expect, it } from 'vitest';

import {
  assignDefaultSectionAnchor,
  assignDefaultSectionAnchors,
  assignUniqueSectionAnchor,
  getDefaultSectionAnchorId,
  isSectionAnchorRedundantWithPage,
  normalizePageAnchorSlug,
  normalizeSectionAnchorId,
  stripRedundantPageSectionAnchor,
} from './sectionAnchors';
import type { BuilderSectionInstance } from '../../types/builder/section';

const makeSection = (
  type: BuilderSectionInstance['type'],
  settings: Record<string, unknown> = {},
): BuilderSectionInstance => ({
  id: `section-${type}-${Math.random().toString(36).slice(2, 6)}`,
  type,
  variant: 'default',
  enabled: true,
  locked: false,
  orderIndex: 0,
  settings,
  bindings: {},
  styleOverrides: {},
  meta: { createdAtISO: '2026-05-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
});

describe('section anchor defaults', () => {
  it('defaults task-oriented guest sections and leaves story sections quiet', () => {
    expect(getDefaultSectionAnchorId('schedule')).toBe('schedule');
    expect(getDefaultSectionAnchorId('travel')).toBe('travel');
    expect(getDefaultSectionAnchorId('accommodations')).toBe('accommodations');
    expect(getDefaultSectionAnchorId('directions')).toBe('directions');
    expect(getDefaultSectionAnchorId('rsvp')).toBe('rsvp');
    expect(getDefaultSectionAnchorId('registry')).toBe('registry');
    expect(getDefaultSectionAnchorId('contact')).toBe('contact');
    expect(getDefaultSectionAnchorId('menu')).toBe('menu');
    expect(getDefaultSectionAnchorId('music')).toBe('music');
    expect(getDefaultSectionAnchorId('story')).toBeNull();
  });

  it('assigns unique default anchors without overriding explicit anchors', () => {
    const anchored = assignDefaultSectionAnchors([
      makeSection('schedule'),
      makeSection('schedule'),
      makeSection('travel', { anchorId: 'hotel-blocks' }),
      makeSection('story'),
      makeSection('rsvp', { anchorId: { value: 'guest-reply' } }),
    ]);

    expect(anchored.map((section) => section.settings.anchorId)).toEqual([
      'schedule',
      'schedule-2',
      'hotel-blocks',
      undefined,
      'guest-reply',
    ]);
  });

  it('respects explicitly cleared anchor settings instead of restoring defaults', () => {
    const anchored = assignDefaultSectionAnchors([
      makeSection('rsvp', { anchorId: '' }),
      makeSection('travel'),
    ]);

    expect(anchored.map((section) => section.settings.anchorId)).toEqual([
      '',
      'travel',
    ]);
    expect(assignDefaultSectionAnchor(
      makeSection('registry', { anchorId: '' }),
      [],
    ).settings.anchorId).toBe('');
    expect(assignUniqueSectionAnchor(
      makeSection('faq', { anchorId: '' }),
      [makeSection('faq', { anchorId: 'faq' })],
    ).settings.anchorId).toBe('');
  });

  it('normalizes explicit anchors before checking collisions', () => {
    const anchored = assignDefaultSectionAnchors([
      makeSection('schedule', { anchorId: ' Schedule! ' }),
      makeSection('schedule'),
      makeSection('rsvp', { anchorId: { value: 'RSVP' } }),
      makeSection('rsvp'),
    ]);

    expect(anchored.map((section) => section.settings.anchorId)).toEqual([
      'schedule',
      'schedule-2',
      'rsvp',
      'rsvp-2',
    ]);
  });

  it('normalizes duplicate explicit anchors and makes them unique', () => {
    const anchored = assignDefaultSectionAnchors([
      makeSection('travel', { anchorId: 'Hotel Blocks' }),
      makeSection('travel', { anchorId: 'Hotel Blocks!' }),
      makeSection('travel', { anchorId: { value: 'Hotel Blocks' } }),
    ]);

    expect(anchored.map((section) => section.settings.anchorId)).toEqual([
      'hotel-blocks',
      'hotel-blocks-2',
      'hotel-blocks-3',
    ]);
  });

  it('normalizes anchor ids the same way default assignment checks collisions', () => {
    expect(normalizeSectionAnchorId(' Registry Gifts! ')).toBe('registry-gifts');
    expect(normalizeSectionAnchorId('Travel%20Info')).toBe('travel-info');
    expect(normalizeSectionAnchorId({ value: 'Meal Choice' })).toBe('meal-choice');
    expect(normalizeSectionAnchorId(null)).toBe('');
  });

  it('normalizes page slugs for public page and anchor comparisons', () => {
    expect(normalizePageAnchorSlug('/Travel%20Info/')).toBe('travel-info');
    expect(normalizePageAnchorSlug(' Travel Info! ')).toBe('travel-info');
    expect(normalizePageAnchorSlug({ value: 'RSVP Details!' })).toBe('rsvp-details');
  });

  it('detects and strips anchors that are redundant with a dedicated page', () => {
    const section = makeSection('travel', { anchorId: 'Travel' });

    expect(isSectionAnchorRedundantWithPage(section.settings.anchorId, {
      slug: 'travel',
      title: 'Travel',
      meta: { isHome: false },
    })).toBe(true);
    expect(stripRedundantPageSectionAnchor(section, {
      slug: 'travel',
      title: 'Travel',
      meta: { isHome: false },
    }).settings.anchorId).toBeUndefined();
  });

  it('keeps custom anchors and home-page anchors', () => {
    expect(isSectionAnchorRedundantWithPage('Meal Choice', {
      slug: 'rsvp',
      title: 'RSVP',
      meta: { isHome: false },
    })).toBe(false);
    expect(isSectionAnchorRedundantWithPage('home', {
      slug: 'home',
      title: 'Home',
      meta: { isHome: true },
    })).toBe(false);
  });

  it('uses page id fallback when page slug is blank', () => {
    expect(isSectionAnchorRedundantWithPage('Travel Page', {
      id: 'travel-page',
      slug: '   ',
      title: 'Travel',
      meta: { isHome: false },
    })).toBe(true);
  });

  it('detects redundant anchors against provenance-wrapped page titles', () => {
    expect(isSectionAnchorRedundantWithPage('Guest Travel', {
      slug: '',
      title: { value: 'Guest Travel' } as unknown as string,
      meta: { isHome: false },
    })).toBe(true);
  });

  it('treats underscore and hyphen variants as redundant with the same page', () => {
    expect(isSectionAnchorRedundantWithPage('travel_info', {
      slug: 'travel-info',
      title: 'Travel Info',
      meta: { isHome: false },
    })).toBe(true);
  });

  it('assigns one new section against existing sibling anchors', () => {
    const section = assignDefaultSectionAnchor(
      makeSection('rsvp'),
      [
        makeSection('rsvp', { anchorId: 'RSVP' }),
        makeSection('travel', { anchorId: 'travel' }),
      ],
    );

    expect(section.settings.anchorId).toBe('rsvp-2');
  });

  it('makes copied or inserted section anchors unique against siblings', () => {
    expect(assignUniqueSectionAnchor(
      makeSection('travel', { anchorId: 'Travel!' }),
      [makeSection('travel', { anchorId: 'travel' })],
    ).settings.anchorId).toBe('travel-2');

    expect(assignUniqueSectionAnchor(
      makeSection('faq'),
      [makeSection('faq', { anchorId: 'faq' })],
    ).settings.anchorId).toBe('faq-2');
  });
});
