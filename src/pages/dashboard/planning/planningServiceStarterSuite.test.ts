import { describe, expect, it } from 'vitest';
import { buildStarterPlannerSuite } from './planningService';

describe('buildStarterPlannerSuite', () => {
  it('creates planner tasks, budget lines, and vendor placeholders from wedding context', () => {
    const suite = buildStarterPlannerSuite({
      weddingSiteId: 'site-1',
      weddingDateISO: '2026-10-10',
      venueName: 'The Foundry',
      guestCount: 120,
      destinationWedding: true,
    });

    expect(suite.tasks.map((task) => task.title)).toContain('Check travel and hotel guidance');
    expect(suite.tasks.every((task) => task.wedding_site_id === 'site-1')).toBe(true);
    expect(suite.tasks.find((task) => task.title === 'Confirm venue arrival details')?.due_date).toBe('2026-08-26');
    expect(suite.budgetItems.find((item) => item.item_name === 'Food and beverage')?.estimated_amount).toBe(19800);
    expect(suite.vendors.find((vendor) => vendor.vendor_type === 'Venue')?.name).toBe('The Foundry');
    expect(suite.timelineSeeds.map((seed) => seed.title)).toEqual(expect.arrayContaining(['Ceremony', 'Cocktail hour', 'Open dance floor']));
    expect(suite.rsvpQuestionSeeds.map((seed) => seed.label)).toContain('Which events will you attend?');
    expect(suite.travelFaqSeeds.map((seed) => seed.question)).toContain('What travel details should guests know?');
    expect(suite.photoBucketSeeds.map((seed) => seed.name)).toEqual(expect.arrayContaining(['Ceremony', 'Dance floor', 'Weekend events']));
    expect(suite.guestImportSuggestions.join(' ')).toContain('event access columns');
    expect(suite.rationale.join(' ')).not.toMatch(/AI|token|model|provider/i);
  });

  it('stays usable when date and guest count are not known yet', () => {
    const suite = buildStarterPlannerSuite({
      weddingSiteId: 'site-2',
      weddingDateISO: null,
      venueName: null,
      guestCount: null,
    });

    expect(suite.tasks.length).toBeGreaterThan(0);
    expect(suite.tasks.every((task) => task.due_date === null)).toBe(true);
    expect(suite.budgetItems.find((item) => item.item_name === 'Food and beverage')?.estimated_amount).toBe(16500);
    expect(suite.vendors.find((vendor) => vendor.vendor_type === 'Venue')?.name).toBe('Venue team');
    expect(suite.timelineSeeds.length).toBeGreaterThan(0);
    expect(suite.travelFaqSeeds.map((seed) => seed.question)).not.toContain('What travel details should guests know?');
  });
});
