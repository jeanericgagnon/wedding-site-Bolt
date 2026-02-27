import { describe, expect, it } from 'vitest';
import {
  buildPublishReadinessItems,
  buildSetupChecklist,
  getChecklistProgress,
  getFirstIncompleteChecklistItem,
  getIncompleteChecklistItems,
  getPublishBuilderRoute,
  type OverviewChecklistStats,
} from './overviewUtils';

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

  it('picks first incomplete checklist item for fix-next shortcut', () => {
    const items = buildPublishReadinessItems(base);
    const first = getFirstIncompleteChecklistItem(items);
    expect(first?.id).toBe('slug');

    const allDone = buildPublishReadinessItems({
      ...base,
      siteSlug: 'my-site',
      templateName: 'modern-luxe',
      weddingDate: '2026-09-12',
      isPublished: true,
    });
    expect(getFirstIncompleteChecklistItem(allDone)).toBeNull();
  });

  it('returns checklist progress counts', () => {
    const items = buildPublishReadinessItems({
      ...base,
      siteSlug: 'my-site',
      templateName: 'modern-luxe',
    });
    expect(getChecklistProgress(items)).toEqual({ done: 2, total: 4 });
  });

  it('returns incomplete items in order', () => {
    const items = buildPublishReadinessItems({
      ...base,
      siteSlug: 'my-site',
      templateName: 'modern-luxe',
    });
    const incomplete = getIncompleteChecklistItems(items);
    expect(incomplete.map((i) => i.id)).toEqual(['date', 'published']);
  });

  it('switches published readiness route/action once published toggles true', () => {
    const draftPublishedItem = buildPublishReadinessItems(base).find((i) => i.id === 'published');
    expect(draftPublishedItem?.actionLabel).toBe('Publish now');
    expect(draftPublishedItem?.route).toBe('/dashboard/builder?publishNow=1');

    const livePublishedItem = buildPublishReadinessItems({ ...base, isPublished: true }).find((i) => i.id === 'published');
    expect(livePublishedItem?.actionLabel).toBe('Open builder');
    expect(livePublishedItem?.route).toBe('/dashboard/builder');
  });
});
