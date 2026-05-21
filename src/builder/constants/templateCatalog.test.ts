import { describe, expect, it } from 'vitest';

import { templateCatalog, templateCatalogSummary, templateColorwayFacets, templateUseCaseFacets } from './templateCatalog';
import { getTemplatePack } from './builderTemplatePacks';
import { TEMPLATE_USE_CASE_PACKS } from './templateUseCasePacks';

describe('templateCatalog', () => {
  it('exposes guest routes and page counts for the multi-page catalog surface', () => {
    const coastal = templateCatalog.find((template) => template.id === 'coastal-weekend');
    const blackTie = templateCatalog.find((template) => template.id === 'black-tie-ballroom');

    expect(coastal).toMatchObject({
      pageCount: 4,
      guestRoutes: ['/', '/schedule', '/travel', '/rsvp'],
      colorwayId: 'seafoam-sand',
      useCaseIds: expect.arrayContaining(['destination', 'weekend']),
      readinessScore: 100,
      readinessLabel: 'Guest-ready',
      readinessGaps: [],
      pageBlueprints: [
        { title: 'Home', route: '/', sections: ['Hero', 'Venue', 'Gallery'] },
        { title: 'Schedule', route: '/schedule', sections: ['Schedule'] },
        { title: 'Travel', route: '/travel', sections: ['Travel', 'Accommodations', 'Directions'] },
        { title: 'RSVP', route: '/rsvp', sections: ['Rsvp', 'Faq'] },
      ],
    });
    expect(blackTie).toMatchObject({
      pageCount: 6,
      guestRoutes: ['/', '/schedule', '/travel', '/details', '/rsvp', '/registry'],
      colorwayId: 'ivory-black-gold',
      useCaseIds: expect.arrayContaining(['black-tie', 'weekend']),
    });
  });

  it('keeps catalog page routes aligned with builder template pages', () => {
    for (const catalogItem of templateCatalog) {
      const template = getTemplatePack(catalogItem.id);

      expect(template, catalogItem.id).toBeTruthy();
      expect(catalogItem.pageCount).toBe(template?.pages?.filter((page) => page.isHidden !== true).length);
      expect(catalogItem.guestRoutes[0], catalogItem.id).toBe('/');
      expect(catalogItem.guestRoutes).toHaveLength(catalogItem.pageCount);
      expect(catalogItem.pageBlueprints.map((page) => page.route)).toEqual(catalogItem.guestRoutes);
      expect(catalogItem.pageBlueprints.every((page) => page.sections.length > 0), catalogItem.id).toBe(true);
      expect(catalogItem.readinessScore, catalogItem.id).toBeGreaterThanOrEqual(75);
      expect(['Guest-ready', 'Strong draft']).toContain(catalogItem.readinessLabel);
    }
  });

  it('adds focused use-case packs beyond the original discovery set', () => {
    expect(TEMPLATE_USE_CASE_PACKS.map((pack) => pack.id)).toEqual([
      'destination',
      'bilingual',
      'interfaith',
      'black-tie',
      'weekend',
      'guest-interactive',
    ]);
    expect(templateColorwayFacets).toEqual(expect.arrayContaining(['seafoam-sand', 'terracotta-cream', 'ivory-black-gold']));
    expect(templateUseCaseFacets).toEqual(expect.arrayContaining(['destination', 'weekend', 'black-tie', 'guest-interactive']));
  });

  it('summarizes catalog readiness and multi-page coverage', () => {
    expect(templateCatalogSummary.totalTemplates).toBe(templateCatalog.length);
    expect(templateCatalogSummary.guestReadyTemplates).toBeGreaterThan(0);
    expect(templateCatalogSummary.multiPageTemplates).toBe(templateCatalog.length);
    expect(templateCatalogSummary.averageReadinessScore).toBeGreaterThanOrEqual(75);
    expect(templateCatalogSummary.useCaseCounts.destination).toBeGreaterThan(0);
    expect(templateCatalogSummary.useCaseCounts.weekend).toBeGreaterThan(0);
  });
});
