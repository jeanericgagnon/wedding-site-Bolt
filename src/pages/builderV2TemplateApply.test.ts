import { describe, expect, it } from 'vitest';

import type { LabPage } from './builderV2PageState';
import { buildBuilderV2TemplateApplyPlan } from './builderV2TemplateApply';

const currentPages: LabPage[] = [
  {
    id: 'home',
    title: 'Home',
    slug: 'home',
    isHome: true,
    hidden: false,
    sections: [
      { id: 'hero-1', type: 'hero', title: 'Hero', variant: 'default', enabled: true, density: 'comfortable' },
      { id: 'story-1', type: 'story', title: 'Story', variant: 'default', enabled: true, density: 'comfortable' },
      { id: 'gallery-1', type: 'gallery', title: 'Gallery', variant: 'default', enabled: true, density: 'comfortable' },
      { id: 'travel-1', type: 'travel', title: 'Travel', variant: 'default', enabled: true, density: 'comfortable' },
      { id: 'faq-1', type: 'faq', title: 'FAQ', variant: 'default', enabled: true, density: 'comfortable' },
    ],
  },
];

describe('builderV2TemplateApply', () => {
  it('builds an honest template apply summary against the current draft', () => {
    const plan = buildBuilderV2TemplateApplyPlan('destination-adventure', currentPages, {
      'story-1': [{ id: 'block-1' }, { id: 'block-2' }],
      'travel-1': [{ id: 'block-3' }],
    });

    expect(plan.templateId).toBe('destination-adventure');
    expect(plan.currentSectionCount).toBe(5);
    expect(plan.nextSectionCount).toBeGreaterThan(plan.currentSectionCount);
    expect(plan.authoredBlockCount).toBe(3);
    expect(plan.authoredSectionCount).toBe(2);
    expect(plan.sharedSectionTypes).toEqual(expect.arrayContaining(['hero', 'story', 'gallery', 'travel', 'faq']));
    expect(plan.addedSectionTypes).toEqual(expect.arrayContaining(['venue', 'accommodations', 'schedule', 'rsvp', 'footer-cta']));
    expect(plan.removedSectionTypes).toEqual([]);
    expect(plan.currentPageSummaries[0]).toMatch(/Home: Hero -> Story -> Gallery -> Travel -> Faq/i);
    expect(plan.watchout).toMatch(/clears authored content/i);
    expect(plan.keyStats).toContain('Resets 3 blocks');
  });

  it('treats close structure matches as a lighter reset decision', () => {
    const plan = buildBuilderV2TemplateApplyPlan('modern-clean', [
      {
        id: 'home',
        title: 'Home',
        slug: 'home',
        isHome: true,
        hidden: false,
        sections: [
          { id: 'hero-1', type: 'hero', title: 'Hero', variant: 'default', enabled: true, density: 'comfortable' },
          { id: 'countdown-1', type: 'countdown', title: 'Countdown', variant: 'default', enabled: true, density: 'comfortable' },
          { id: 'story-1', type: 'story', title: 'Story', variant: 'default', enabled: true, density: 'comfortable' },
          { id: 'venue-1', type: 'venue', title: 'Venue', variant: 'default', enabled: true, density: 'comfortable' },
          { id: 'gallery-1', type: 'gallery', title: 'Gallery', variant: 'default', enabled: true, density: 'comfortable' },
          { id: 'schedule-1', type: 'schedule', title: 'Schedule', variant: 'default', enabled: true, density: 'comfortable' },
          { id: 'rsvp-1', type: 'rsvp', title: 'RSVP', variant: 'default', enabled: true, density: 'comfortable' },
          { id: 'footer-cta-1', type: 'footer-cta', title: 'Footer CTA', variant: 'default', enabled: true, density: 'comfortable' },
        ],
      },
    ]);

    expect(plan.addedSectionTypes).toHaveLength(0);
    expect(plan.removedSectionTypes).toHaveLength(0);
    expect(plan.authoredBlockCount).toBe(0);
    expect(plan.title).toMatch(/keeps the current section shape fairly steady/i);
    expect(plan.bestNextMove).toMatch(/cleaner starter structure/i);
  });
});
