import { describe, expect, it } from 'vitest';

import { getTemplateSupportManifest } from './templateSupportManifest';

describe('templateSupportManifest', () => {
  it('exposes multi-page readiness for builder-backed templates', () => {
    expect(getTemplateSupportManifest('black-tie-ballroom')).toMatchObject({
      templateExistsInBuilder: true,
      pageCount: 6,
      pageFlowLabel: '6 dedicated pages',
      guestRoutes: ['/', '/schedule', '/travel', '/details', '/rsvp', '/registry'],
      readinessScore: 100,
      readinessLabel: 'Guest-ready',
      readinessGaps: [],
      pageBlueprints: expect.arrayContaining([
        { title: 'Details', route: '/details', sections: ['Dress Code', 'Menu'] },
      ]),
    });
  });

  it('returns null for unknown templates', () => {
    expect(getTemplateSupportManifest('missing-template')).toBeNull();
  });
});
