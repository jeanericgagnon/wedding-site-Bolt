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
              subtitle: 'Plan a little extra time on Friday.',
              blocks: [
                { id: 't1', type: 'travelTip', data: { title: 'Airport', note: 'Fly into SFO.' } },
                { id: 't2', type: 'travelTip', data: { title: 'Parking', note: 'Valet is available at the venue.' } },
              ],
            },
            {
              id: 'stay-1',
              type: 'accommodations',
              variant: 'default',
              enabled: true,
              blocks: [
                { id: 'h1', type: 'hotelCard', data: { title: 'River Inn', note: 'Use our room block.', url: 'https://example.com/river-inn' } },
              ],
            },
            {
              id: 'registry-1',
              type: 'registry',
              variant: 'default',
              enabled: true,
              subtitle: 'Your presence is enough, but we are grateful for any gift.',
              blocks: [
                { id: 'r1', type: 'registryItem', data: { title: 'Honeymoon Fund', url: 'https://example.com/fund' } },
                { id: 'r2', type: 'fundHighlight', data: { title: 'House fund', note: 'We are also saving for our next place.' } },
              ],
            },
            {
              id: 'story-1',
              type: 'story',
              variant: 'default',
              enabled: true,
              blocks: [
                { id: 's1', type: 'story', data: { text: 'We met on a rainy Tuesday.' } },
                { id: 's2', type: 'text', data: { text: 'Now we get to celebrate with everyone we love.' } },
              ],
            },
            {
              id: 'gallery-1',
              type: 'gallery',
              variant: 'default',
              enabled: true,
              blocks: [
                { id: 'g1', type: 'photo', data: { imageUrl: 'https://example.com/gallery-1.jpg', caption: 'Engagement session' } },
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
    expect(supplement.couple?.displayName).toBe('Alex & Jordan');
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
    expect(supplement.event).toBeUndefined();
    expect(supplement.rsvp?.enabled).toBe(false);
    expect(supplement.faq).toEqual([{ id: 'faq-1-faq-0', q: 'Parking?', a: 'Yes, valet is available.' }]);
    expect(supplement.travel).toEqual({
      notes: 'Plan a little extra time on Friday.',
      flightInfo: 'Airport: Fly into SFO.',
      parkingInfo: 'Parking: Valet is available at the venue.',
      hotelInfo: 'River Inn: Use our room block.',
    });
    expect(supplement.registry?.links).toEqual([{ id: 'registry-1-registry-0', label: 'Honeymoon Fund', url: 'https://example.com/fund' }]);
    expect(supplement.registry?.notes).toBe('Your presence is enough, but we are grateful for any gift.\nWe are also saving for our next place.');
    expect(supplement.couple?.story).toBe('We met on a rainy Tuesday.\n\nNow we get to celebrate with everyone we love.');
    expect(supplement.media?.gallery).toEqual([
      { id: 'gallery-0', url: 'https://example.com/hero.jpg', caption: undefined },
      { id: 'gallery-1', url: 'https://example.com/gallery-1.jpg', caption: 'Engagement session' },
    ]);
  });

  it('derives event-date and rsvp presence from visible builder v2 sections when the document carries them', () => {
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
              title: 'Morgan & Avery',
              blocks: [],
            },
            {
              id: 'schedule-1',
              type: 'schedule',
              variant: 'default',
              enabled: true,
              blocks: [
                {
                  id: 'e1',
                  type: 'event',
                  data: {
                    title: 'Ceremony',
                    time: '2027-09-14T16:00:00.000Z',
                    location: 'Garden Terrace',
                  },
                },
              ],
            },
            {
              id: 'rsvp-1',
              type: 'rsvp',
              variant: 'card',
              enabled: true,
              blocks: [
                { id: 'r1', type: 'rsvpNote', data: { note: 'Kindly reply once travel is booked.' } },
              ],
            },
          ],
        },
      ],
    });

    expect(supplement.couple?.displayName).toBe('Morgan & Avery');
    expect(supplement.event?.weddingDateISO).toBe('2027-09-14T16:00:00.000Z');
    expect(supplement.rsvp?.enabled).toBe(true);
  });

  it('merges supplemental builder v2 wedding data only into thin public snapshots', () => {
    const base = createEmptyWeddingData();
    base.couple.partner1Name = 'Alex';
    base.couple.partner2Name = 'Jordan';
    base.faq = [{ id: 'live-faq', q: 'Live question?', a: 'Live answer.' }];
    base.media.heroImageUrl = 'https://example.com/live-hero.jpg';

    const merged = mergeWeddingDataWithBuilderV2Supplement(base, {
      faq: [{ id: 'v2-faq', q: 'V2 question?', a: 'V2 answer.' }],
      travel: { notes: 'Book early.', hotelInfo: 'Stay downtown.' },
      registry: { links: [{ id: 'reg-1', label: 'Fund', url: 'https://example.com/fund' }] },
      media: { heroImageUrl: 'https://example.com/v2-hero.jpg', gallery: [{ id: 'g1', url: 'https://example.com/gallery.jpg', caption: 'Weekend' }] },
    });

    expect(merged.faq).toEqual([{ id: 'live-faq', q: 'Live question?', a: 'Live answer.' }]);
    expect(merged.travel.notes).toBe('Book early.');
    expect(merged.travel.hotelInfo).toBe('Stay downtown.');
    expect(merged.registry.links).toEqual([{ id: 'reg-1', label: 'Fund', url: 'https://example.com/fund' }]);
    expect(merged.media.heroImageUrl).toBe('https://example.com/live-hero.jpg');
    expect(merged.media.gallery).toEqual([{ id: 'g1', url: 'https://example.com/gallery.jpg', caption: 'Weekend' }]);
  });

  it('uses builder v2 event anchors when the public runtime has no saved wedding data snapshot yet', () => {
    const merged = mergeWeddingDataWithBuilderV2Supplement(null, {
      couple: { partner1Name: '', partner2Name: '', displayName: 'Morgan & Avery' },
      event: { weddingDateISO: '2027-09-14T16:00:00.000Z' },
      rsvp: { enabled: false },
      media: { heroImageUrl: 'https://example.com/hero.jpg', gallery: [] },
    });

    expect(merged.couple.displayName).toBe('Morgan & Avery');
    expect(merged.event.weddingDateISO).toBe('2027-09-14T16:00:00.000Z');
    expect(merged.rsvp.enabled).toBe(false);
    expect(merged.media.heroImageUrl).toBe('https://example.com/hero.jpg');
  });
});
