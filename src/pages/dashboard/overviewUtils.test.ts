import { describe, expect, it } from 'vitest';
import { buildPublishReadinessItems, buildSetupChecklist, getPublishBuilderRoute, type OverviewChecklistStats } from './overviewUtils';

const base: OverviewChecklistStats = {
  coupleName1: '',
  coupleName2: '',
  weddingDate: '',
  venueName: '',
  venueLocation: '',
  registryItemCount: 0,
  photoAlbumCount: 0,
  isPublished: false,
  siteSlug: '',
  templateName: '',
};

describe('overviewUtils', () => {
  it('uses publishNow route when draft', () => {
    expect(getPublishBuilderRoute(false)).toBe('/dashboard/builder?publishNow=1');
  });

  it('uses plain builder route when already published', () => {
    expect(getPublishBuilderRoute(true)).toBe('/dashboard/builder');
  });

  it('builds setup checklist publish item with correct action label/route', () => {
    const draftItems = buildSetupChecklist(base);
    const draftPublish = draftItems.find((i) => i.id === 'publish');
    expect(draftPublish?.actionLabel).toBe('Publish now');
    expect(draftPublish?.route).toBe('/dashboard/builder?publishNow=1');

    const liveItems = buildSetupChecklist({ ...base, isPublished: true });
    const livePublish = liveItems.find((i) => i.id === 'publish');
    expect(livePublish?.actionLabel).toBe('Open site builder');
    expect(livePublish?.route).toBe('/dashboard/builder');
  });

  it('builds publish readiness blockers in expected priority', () => {
    const blockers = buildPublishReadinessItems(base).filter((i) => !i.done);
    expect(blockers.map((b) => b.id)).toEqual(['slug', 'template', 'date', 'published']);
    expect(blockers[0].route).toBe('/dashboard/settings');
  });
});
