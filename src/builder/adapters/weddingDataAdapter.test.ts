import { describe, it, expect } from 'vitest';
import { fromWeddingDataToBuilderBindings, applyWeddingDataBindingsToSections } from './weddingDataAdapter';
import { createEmptyWeddingData } from '../../types/weddingData';
import { BuilderSectionInstance } from '../../types/builder/section';

function makeSection(type: BuilderSectionInstance['type'], id = 's1'): BuilderSectionInstance {
  const now = new Date().toISOString();
  return {
    id,
    type,
    variant: 'default',
    enabled: true,
    locked: false,
    orderIndex: 0,
    settings: {},
    bindings: {},
    styleOverrides: {},
    meta: { createdAtISO: now, updatedAtISO: now },
  };
}

describe('fromWeddingDataToBuilderBindings', () => {
  it('extracts empty arrays from empty wedding data', () => {
    const bindings = fromWeddingDataToBuilderBindings(createEmptyWeddingData());
    expect(bindings.venueIds).toEqual([]);
    expect(bindings.scheduleItemIds).toEqual([]);
    expect(bindings.linkIds).toEqual([]);
    expect(bindings.faqIds).toEqual([]);
    expect(bindings.galleryAssetUrls).toEqual([]);
  });

  it('extracts venue ids', () => {
    const data = createEmptyWeddingData();
    data.venues.push({ id: 'v1', name: 'Church' });
    const bindings = fromWeddingDataToBuilderBindings(data);
    expect(bindings.venueIds).toEqual(['v1']);
  });

  it('extracts hero image url', () => {
    const data = createEmptyWeddingData();
    data.media.heroImageUrl = 'https://example.com/hero.jpg';
    const bindings = fromWeddingDataToBuilderBindings(data);
    expect(bindings.heroImageUrl).toBe('https://example.com/hero.jpg');
  });
});

describe('applyWeddingDataBindingsToSections', () => {
  it('applies venue ids to venue section', () => {
    const data = createEmptyWeddingData();
    data.venues.push({ id: 'v1' });
    const sections = [makeSection('venue')];
    const result = applyWeddingDataBindingsToSections(sections, data);
    expect(result[0].bindings.venueIds).toEqual(['v1']);
  });

  it('applies schedule ids to schedule section', () => {
    const data = createEmptyWeddingData();
    data.schedule.push({ id: 'ev1', label: 'Ceremony' });
    const sections = [makeSection('schedule')];
    const result = applyWeddingDataBindingsToSections(sections, data);
    expect(result[0].bindings.scheduleItemIds).toEqual(['ev1']);
  });

  it('does not modify hero section', () => {
    const data = createEmptyWeddingData();
    data.venues.push({ id: 'v1' });
    const sections = [makeSection('hero')];
    const result = applyWeddingDataBindingsToSections(sections, data);
    expect(result[0].bindings).toEqual({});
  });

  it('applies faq ids to faq section', () => {
    const data = createEmptyWeddingData();
    data.faq.push({ id: 'f1', q: 'Q?', a: 'A.' });
    const sections = [makeSection('faq')];
    const result = applyWeddingDataBindingsToSections(sections, data);
    expect(result[0].bindings.faqIds).toEqual(['f1']);
  });

  it('applies registry link ids to registry section', () => {
    const data = createEmptyWeddingData();
    data.registry.links.push({ id: 'r1', url: 'https://amazon.com' });
    const sections = [makeSection('registry')];
    const result = applyWeddingDataBindingsToSections(sections, data);
    expect(result[0].bindings.linkIds).toEqual(['r1']);
  });
});
