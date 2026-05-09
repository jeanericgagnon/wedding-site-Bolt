import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATE_USAGE_RETENTION_MS, bumpTemplateUsage, readTemplateUsage } from './TemplateGalleryPanel';

const TEMPLATE_USAGE_KEY = 'dayof_template_usage_v1';

describe('TemplateGalleryPanel template usage storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('writes template usage in a timestamped bounded envelope', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:22:00.000Z'));

    bumpTemplateUsage(' modern-luxe ');
    bumpTemplateUsage('modern-luxe');

    expect(readTemplateUsage()).toEqual({ 'modern-luxe': 2 });
    expect(JSON.parse(window.localStorage.getItem(TEMPLATE_USAGE_KEY) || '{}')).toEqual({
      savedAtISO: '2026-05-06T21:22:00.000Z',
      usage: { 'modern-luxe': 2 },
    });
  });

  it('migrates and bounds active legacy template usage maps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:23:00.000Z'));
    window.localStorage.setItem(TEMPLATE_USAGE_KEY, JSON.stringify({
      'modern-luxe': 3,
      'bad-count': -1,
      [Array.from({ length: 140 }, () => 'x').join('')]: 50000,
    }));

    const usage = readTemplateUsage();

    expect(usage['modern-luxe']).toBe(3);
    expect(Object.values(usage)).toContain(9999);
    expect(usage['bad-count']).toBeUndefined();
    expect(JSON.parse(window.localStorage.getItem(TEMPLATE_USAGE_KEY) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T21:23:00.000Z',
      usage,
    });
  });

  it('clears stale or malformed template usage storage', () => {
    const staleDate = new Date(Date.now() - TEMPLATE_USAGE_RETENTION_MS - 1000).toISOString();
    window.localStorage.setItem(TEMPLATE_USAGE_KEY, JSON.stringify({
      savedAtISO: staleDate,
      usage: { 'modern-luxe': 1 },
    }));

    expect(readTemplateUsage()).toEqual({});
    expect(window.localStorage.getItem(TEMPLATE_USAGE_KEY)).toBeNull();

    window.localStorage.setItem(TEMPLATE_USAGE_KEY, '{broken');
    expect(readTemplateUsage()).toEqual({});
    expect(window.localStorage.getItem(TEMPLATE_USAGE_KEY)).toBeNull();
  });
});
