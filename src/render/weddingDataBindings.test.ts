import { describe, expect, it } from 'vitest';
import { applyWeddingDataBindings } from './weddingDataBindings';
import { createEmptyWeddingData } from '../types/weddingData';

describe('applyWeddingDataBindings', () => {
  it('binds schedule events from wedding data for schedule sections', () => {
    const data = createEmptyWeddingData();
    data.event.weddingDateISO = '2026-05-09T16:00:00.000Z';
    data.venues = [{ id: 'v1', name: 'Main Hall', address: '123 Main' }];
    data.schedule = [
      { id: 's1', label: 'Ceremony', startTimeISO: '2026-05-09T16:00:00.000Z', venueId: 'v1' },
    ];

    const result = applyWeddingDataBindings({
      type: 'schedule',
      variant: 'agendaCards',
      data: { events: [] },
      bindings: { scheduleItemIds: ['s1'] },
    }, data);

    const events = result.events as Array<Record<string, unknown>>;
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('Ceremony');
    expect(events[0].location).toBe('Main Hall');
  });

  it('falls back to all schedule events when binding ids are stale', () => {
    const data = createEmptyWeddingData();
    data.schedule = [
      { id: 'live-1', label: 'Welcome Dinner', startTimeISO: '2026-05-08T23:00:00.000Z' },
    ];

    const result = applyWeddingDataBindings({
      type: 'schedule',
      variant: 'agendaCards',
      data: { events: [{ id: 'demo', label: 'Demo Event' }] },
      bindings: { scheduleItemIds: ['old-id-that-no-longer-exists'] },
    }, data);

    const events = result.events as Array<Record<string, unknown>>;
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('Welcome Dinner');
  });

  it('binds registry links from wedding data', () => {
    const data = createEmptyWeddingData();
    data.registry.links = [{ id: 'r1', label: 'Amazon', url: 'https://amazon.com/registry' }];

    const result = applyWeddingDataBindings({
      type: 'registry',
      variant: 'cards',
      data: { links: [{ id: 'x', store: 'Demo', url: '#' }] },
      bindings: { linkIds: ['r1'] },
    }, data);

    const links = result.links as Array<Record<string, unknown>>;
    expect(links).toHaveLength(1);
    expect(links[0].store).toBe('Amazon');
    expect(links[0].url).toBe('https://amazon.com/registry');
  });

  it('binds registry links from drifted registry section types', () => {
    const data = createEmptyWeddingData();
    data.registry.links = [{ id: 'r1', label: 'Amazon', url: 'https://amazon.com/registry' }];

    const result = applyWeddingDataBindings({
      type: 'registry-section',
      variant: 'cards',
      data: { links: [{ id: 'x', store: 'Demo', url: '#' }] },
      bindings: { linkIds: ['r1'] },
    }, data);

    const links = result.links as Array<Record<string, unknown>>;
    expect(links).toHaveLength(1);
    expect(links[0].store).toBe('Amazon');
    expect(links[0].url).toBe('https://amazon.com/registry');
  });

  it('falls back to live registry links when bound registry ids are stale', () => {
    const data = createEmptyWeddingData();
    data.registry.links = [{ id: 'r1', label: 'Amazon', url: 'https://amazon.com/registry' }];

    const result = applyWeddingDataBindings({
      type: 'registry',
      variant: 'cards',
      data: { links: [{ id: 'demo', store: 'Demo', url: '#' }] },
      bindings: { linkIds: ['missing-id'] },
    }, data);

    const links = result.links as Array<Record<string, unknown>>;
    expect(links).toHaveLength(1);
    expect(links[0].store).toBe('Amazon');
    expect(links[0].url).toBe('https://amazon.com/registry');
  });

  it('binds faq items from wedding data', () => {
    const data = createEmptyWeddingData();
    data.faq = [
      { id: 'f1', q: 'Can I bring kids?', a: 'Adults only, please.' },
      { id: 'f2', q: 'Is parking available?', a: 'Yes, valet is available.' },
    ];

    const result = applyWeddingDataBindings({
      type: 'faq',
      variant: 'accordion',
      data: { items: [{ id: 'demo', question: 'Demo?', answer: 'Demo.' }] },
      bindings: { faqIds: ['f2'] },
    }, data);

    const items = result.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0].question).toBe('Is parking available?');
    expect(items[0].answer).toBe('Yes, valet is available.');
  });

  it('falls back to live faq items when bound faq ids are stale', () => {
    const data = createEmptyWeddingData();
    data.faq = [
      { id: 'f1', q: 'What should I wear?', a: 'Cocktail attire.' },
    ];

    const result = applyWeddingDataBindings({
      type: 'faq',
      variant: 'accordion',
      data: { items: [{ id: 'demo', question: 'Demo?', answer: 'Demo.' }] },
      bindings: { faqIds: ['missing-id'] },
    }, data);

    const items = result.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0].question).toBe('What should I wear?');
    expect(items[0].answer).toBe('Cocktail attire.');
  });

  it('binds faq items from drifted faq section types', () => {
    const data = createEmptyWeddingData();
    data.faq = [
      { id: 'f1', q: 'Are plus ones included?', a: 'Only if listed on your invite.' },
    ];

    const result = applyWeddingDataBindings({
      type: 'FAQ Section',
      variant: 'accordion',
      data: { items: [] },
      bindings: { faqIds: ['f1'] },
    }, data);

    const items = result.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0].question).toBe('Are plus ones included?');
  });

  it('binds schedule items from drifted schedule section types', () => {
    const data = createEmptyWeddingData();
    data.schedule = [
      { id: 's1', label: 'Ceremony', startTimeISO: '2026-05-09T16:00:00.000Z' },
    ];

    const result = applyWeddingDataBindings({
      type: 'Schedule Section',
      variant: 'agendaCards',
      data: { events: [] },
      bindings: { scheduleItemIds: ['s1'] },
    }, data);

    const events = result.events as Array<Record<string, unknown>>;
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('Ceremony');
  });

  it('binds venue entries from drifted venue section types', () => {
    const data = createEmptyWeddingData();
    data.venues = [{ id: 'v1', name: 'The Grand Pavilion', address: '450 Park Ave' }];

    const result = applyWeddingDataBindings({
      type: 'Venue Section',
      variant: 'mapFirst',
      data: { venues: [] },
      bindings: { venueIds: ['v1'] },
    }, data);

    const venues = result.venues as Array<Record<string, unknown>>;
    expect(venues).toHaveLength(1);
    expect(venues[0].name).toBe('The Grand Pavilion');
  });

  it('binds venue entries from wedding data', () => {
    const data = createEmptyWeddingData();
    data.venues = [{ id: 'v1', name: 'The Grand Pavilion', address: '450 Park Ave' }];

    const result = applyWeddingDataBindings({
      type: 'venue',
      variant: 'mapFirst',
      data: { venues: [] },
      bindings: { venueIds: ['v1'] },
    }, data);

    const venues = result.venues as Array<Record<string, unknown>>;
    expect(venues).toHaveLength(1);
    expect(venues[0].name).toBe('The Grand Pavilion');
    expect(venues[0].address).toBe('450 Park Ave');
  });

  it('falls back to live venue entries when bound venue ids are stale', () => {
    const data = createEmptyWeddingData();
    data.venues = [{ id: 'v1', name: 'The Grand Pavilion', address: '450 Park Ave' }];

    const result = applyWeddingDataBindings({
      type: 'venue',
      variant: 'mapFirst',
      data: { venues: [{ id: 'demo', name: 'Demo Venue', address: 'Nowhere' }] },
      bindings: { venueIds: ['missing-id'] },
    }, data);

    const venues = result.venues as Array<Record<string, unknown>>;
    expect(venues).toHaveLength(1);
    expect(venues[0].name).toBe('The Grand Pavilion');
    expect(venues[0].address).toBe('450 Park Ave');
  });

  it('falls back to wedding data when common text fields are blank strings', () => {
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Avery';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2026-06-20T00:00:00.000Z';
    data.venues = [{ id: 'v1', name: 'The Grand Pavilion', address: '450 Park Ave' }];

    const result = applyWeddingDataBindings({
      type: 'hero',
      variant: 'fullbleed',
      data: {
        headline: '',
        title: '   ',
        subheadline: '',
        weddingDate: ' ',
        date: '',
        location: '   ',
        venueName: '',
        venueAddress: ' ',
      },
    }, data);

    expect(result.headline).toBe('Avery & Jordan');
    expect(result.title).toBe('Avery & Jordan');
    expect(result.subheadline).toBe(new Date(data.event.weddingDateISO).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }));
    expect(result.weddingDate).toBe(result.subheadline);
    expect(result.date).toBe(result.subheadline);
    expect(result.location).toBe('The Grand Pavilion · 450 Park Ave');
    expect(result.venueName).toBe('The Grand Pavilion');
    expect(result.venueAddress).toBe('450 Park Ave');
  });

  it('keeps bound common couple text truthful when one persisted partner name is whitespace only', () => {
    const data = createEmptyWeddingData();
    data.couple.partner1Name = '   ';
    data.couple.partner2Name = ' Alex ';

    const result = applyWeddingDataBindings({
      type: 'hero',
      variant: 'fullbleed',
      data: {
        headline: '',
        title: '',
      },
    }, data);

    expect(result.headline).toBe('Alex');
    expect(result.title).toBe('Alex');
  });

  it('falls back to wedding media when common image fields are blank or empty', () => {
    const data = createEmptyWeddingData();
    data.media.heroImageUrl = 'https://example.com/hero.jpg';
    data.media.gallery = [
      { id: 'g1', url: 'https://example.com/gallery-1.jpg', caption: 'First' },
      { id: 'g2', url: 'https://example.com/gallery-2.jpg', caption: 'Second' },
    ];

    const result = applyWeddingDataBindings({
      type: 'gallery',
      variant: 'grid',
      data: {
        heroImage: '',
        heroImageUrl: ' ',
        backgroundImage: '',
        image: '   ',
        coverImage: '',
        images: [],
        photos: [],
        galleryImages: [],
      },
    }, data);

    expect(result.heroImage).toBe('https://example.com/hero.jpg');
    expect(result.heroImageUrl).toBe('https://example.com/hero.jpg');
    expect(result.backgroundImage).toBe('https://example.com/hero.jpg');
    expect(result.image).toBe('https://example.com/hero.jpg');
    expect(result.coverImage).toBe('https://example.com/hero.jpg');
    expect(result.photos).toEqual([
      'https://example.com/gallery-1.jpg',
      'https://example.com/gallery-2.jpg',
    ]);
    expect(result.images).toEqual([
      { id: 'g1', url: 'https://example.com/gallery-1.jpg', caption: 'First', alt: 'First' },
      { id: 'g2', url: 'https://example.com/gallery-2.jpg', caption: 'Second', alt: 'Second' },
    ]);
    expect(result.galleryImages).toEqual([
      { id: 'g1', url: 'https://example.com/gallery-1.jpg', caption: 'First', alt: 'First' },
      { id: 'g2', url: 'https://example.com/gallery-2.jpg', caption: 'Second', alt: 'Second' },
    ]);
  });
});
