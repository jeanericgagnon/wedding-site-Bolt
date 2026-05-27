import { describe, expect, it } from 'vitest';
import { createEmptyWeddingData } from '../types/weddingData';
import { deriveWeddingDataFromBuilderV2Document, mergeWeddingDataWithBuilderV2Supplement } from './publicBuilderV2WeddingData';

describe('publicBuilderV2WeddingData', () => {
  it('derives guest-facing supplemental wedding data from visible builder v2 blocks', () => {
    const supplement = deriveWeddingDataFromBuilderV2Document({
      version: 'v2',
      updatedAtISO: '2026-05-28T00:00:00.000Z',
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              variant: 'default',
              enabled: true,
              title: 'Alex & Jordan',
              subtitle: 'September in Napa',
              blocks: [
                { id: 'p1', type: 'photo', data: { imageUrl: 'https://example.com/hero.jpg' } },
              ],
            },
            {
              id: 'schedule-1',
              type: 'schedule',
              variant: 'default',
              enabled: true,
              blocks: [
                { id: 'e1', type: 'event', data: { title: 'Ceremony', time: '4:00 PM', location: 'Main Lawn', note: 'Be seated by 3:45.' } },
              ],
            },
            {
              id: 'faq-1',
              type: 'faq',
              variant: 'default',
              enabled: true,
              blocks: [
                { id: 'f1', type: 'faqItem', data: { question: 'Parking?', answer: 'Yes, valet is available.' } },
              ],
            },
            {
              id: 'travel-1',
              type: 'travel',
              variant: 'default',
              enabled: true,
              blocks: [
                { id: 't1', type: 'travelTip', data: { title: 'Airport', note: 'Fly into SFO.' } },
              ],
            },
            {
              id: 'registry-1',
              type: 'registry',
              variant: 'default',
              enabled: true,
              blocks: [
                { id: 'r1', type: 'registryItem', data: { title: 'Honeymoon Fund', url: 'https://example.com/fund' } },
              ],
            },
          ],
        },
        {
          id: 'hidden',
          title: 'Hidden',
          slug: 'hidden',
          isHome: false,
          hidden: true,
          sections: [
            {
              id: 'faq-hidden',
              type: 'faq',
              variant: 'default',
              enabled: true,
              blocks: [
                { id: 'hf1', type: 'faqItem', data: { question: 'Hidden?', answer: 'Should not leak.' } },
              ],
            },
          ],
        },
      ],
    });

    expect(supplement.media?.heroImageUrl).toBe('https://example.com/hero.jpg');
    expect(supplement.venues).toEqual([{ id: 'schedule-1-venue-0', name: 'Main Lawn' }]);
    expect(supplement.schedule).toEqual([
      {
        id: 'schedule-1-event-0',
        label: 'Ceremony',
        venueId: 'schedule-1-venue-0',
        notes: 'Be seated by 3:45.',
        startTimeISO: '4:00 PM',
      },
    ]);
    expect(supplement.faq).toEqual([{ id: 'faq-1-faq-0', q: 'Parking?', a: 'Yes, valet is available.' }]);
    expect(supplement.travel?.notes).toBe('Airport: Fly into SFO.');
    expect(supplement.registry?.links).toEqual([{ id: 'registry-1-registry-0', label: 'Honeymoon Fund', url: 'https://example.com/fund' }]);
  });

  it('merges supplemental builder v2 wedding data only into thin public snapshots', () => {
    const base = createEmptyWeddingData();
    base.couple.partner1Name = 'Alex';
    base.couple.partner2Name = 'Jordan';
    base.faq = [{ id: 'live-faq', q: 'Live question?', a: 'Live answer.' }];
    base.media.heroImageUrl = 'https://example.com/live-hero.jpg';

    const merged = mergeWeddingDataWithBuilderV2Supplement(base, {
      faq: [{ id: 'v2-faq', q: 'V2 question?', a: 'V2 answer.' }],
      travel: { notes: 'Book early.' },
      registry: { links: [{ id: 'reg-1', label: 'Fund', url: 'https://example.com/fund' }] },
      media: { heroImageUrl: 'https://example.com/v2-hero.jpg', gallery: [] },
    });

    expect(merged.faq).toEqual([{ id: 'live-faq', q: 'Live question?', a: 'Live answer.' }]);
    expect(merged.travel.notes).toBe('Book early.');
    expect(merged.registry.links).toEqual([{ id: 'reg-1', label: 'Fund', url: 'https://example.com/fund' }]);
    expect(merged.media.heroImageUrl).toBe('https://example.com/live-hero.jpg');
  });
});
