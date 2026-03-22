import { describe, it, expect } from 'vitest';
import { createEmptyWeddingData, normalizeWeddingData } from './weddingData';

describe('createEmptyWeddingData', () => {
  it('returns version 1', () => {
    expect(createEmptyWeddingData().version).toBe('1');
  });

  it('has empty partner names', () => {
    const data = createEmptyWeddingData();
    expect(data.couple.partner1Name).toBe('');
    expect(data.couple.partner2Name).toBe('');
  });

  it('has empty venues array', () => {
    expect(createEmptyWeddingData().venues).toEqual([]);
  });

  it('has empty schedule array', () => {
    expect(createEmptyWeddingData().schedule).toEqual([]);
  });

  it('has rsvp enabled by default', () => {
    expect(createEmptyWeddingData().rsvp.enabled).toBe(true);
  });

  it('has empty travel info', () => {
    const data = createEmptyWeddingData();
    expect(data.travel.notes).toBeUndefined();
  });

  it('has empty registry links', () => {
    expect(createEmptyWeddingData().registry.links).toEqual([]);
  });

  it('has empty faq array', () => {
    expect(createEmptyWeddingData().faq).toEqual([]);
  });

  it('has empty gallery', () => {
    expect(createEmptyWeddingData().media.gallery).toEqual([]);
  });

  it('has meta with timestamps', () => {
    const data = createEmptyWeddingData();
    expect(typeof data.meta.createdAtISO).toBe('string');
    expect(typeof data.meta.updatedAtISO).toBe('string');
  });
});

describe('normalizeWeddingData', () => {
  it('fills missing nested objects with safe defaults', () => {
    const normalized = normalizeWeddingData({ version: '1', event: { weddingDateISO: '2026-07-01' } });

    expect(normalized.couple.partner1Name).toBe('');
    expect(normalized.couple.partner2Name).toBe('');
    expect(normalized.event.weddingDateISO).toBe('2026-07-01');
    expect(normalized.registry.links).toEqual([]);
    expect(normalized.media.gallery).toEqual([]);
  });

  it('returns defaults for invalid input', () => {
    const normalized = normalizeWeddingData(null);
    expect(normalized.version).toBe('1');
    expect(normalized.couple.partner1Name).toBe('');
  });
});
