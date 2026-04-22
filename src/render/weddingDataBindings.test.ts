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
});
