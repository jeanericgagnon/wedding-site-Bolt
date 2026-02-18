import { describe, it, expect } from 'vitest';
import { createEmptyWeddingData } from './weddingData';

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
