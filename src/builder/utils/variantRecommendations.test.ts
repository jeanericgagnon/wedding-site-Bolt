import { describe, expect, it } from 'vitest';
import { createEmptyWeddingData } from '../../types/weddingData';
import { getVariantRecommendation, sortVariantsByRecommendation } from './variantRecommendations';
import { getSectionManifest } from '../registry/sectionManifests';

describe('variant recommendations', () => {
  it('prioritizes day tabs when the schedule spans multiple days', () => {
    const weddingData = createEmptyWeddingData();
    weddingData.schedule = [
      { id: 'welcome', label: 'Welcome Party', startTimeISO: '2026-06-12T23:00:00.000Z' },
      { id: 'ceremony', label: 'Ceremony', startTimeISO: '2026-06-13T22:00:00.000Z' },
      { id: 'brunch', label: 'Farewell Brunch', startTimeISO: '2026-06-14T17:00:00.000Z' },
    ];

    const manifest = getSectionManifest('schedule');
    const sorted = sortVariantsByRecommendation('schedule', manifest.variantMeta, { weddingData });

    expect(sorted[0].id).toBe('dayTabs');
    expect(getVariantRecommendation('schedule', sorted[0], { weddingData }).reasons).toContain('Your schedule spans multiple days.');
  });

  it('prioritizes categorized or editorial galleries when there are many photos', () => {
    const weddingData = createEmptyWeddingData();
    weddingData.media.gallery = Array.from({ length: 12 }, (_, index) => ({
      id: `photo-${index}`,
      url: `https://example.com/${index}.jpg`,
    }));

    const manifest = getSectionManifest('gallery');
    const sorted = sortVariantsByRecommendation('gallery', manifest.variantMeta, { weddingData });
    const topIds = sorted.slice(0, 3).map((variant) => variant.id);

    expect(topIds).toEqual(expect.arrayContaining(['masonry', 'categorized', 'mosaic']));
  });

  it('prioritizes minimal hero when no hero image exists', () => {
    const weddingData = createEmptyWeddingData();
    weddingData.media.heroImageUrl = '';

    const manifest = getSectionManifest('hero');
    const sorted = sortVariantsByRecommendation('hero', manifest.variantMeta, { weddingData });

    expect(sorted[0].id).toBe('minimal');
  });

  it('uses theme language as a secondary recommendation signal', () => {
    const weddingData = createEmptyWeddingData();
    weddingData.theme.preset = 'black tie formal';

    const manifest = getSectionManifest('hero');
    const invitation = manifest.variantMeta.find((variant) => variant.id === 'invitation');
    expect(invitation).toBeTruthy();

    const recommendation = getVariantRecommendation('hero', invitation!, { weddingData });
    expect(recommendation.label).not.toBeNull();
    expect(recommendation.reasons).toContain('Matches a formal site style.');
  });
});
