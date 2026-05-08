import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultQuotesCarouselData, quotesCarouselDefinition } from './carousel';
import { defaultQuotesFeaturedData, quotesFeaturedDefinition } from './featured';
import { defaultQuotesGridData, quotesGridDefinition } from './grid';
import { QUOTES_GUESTBOOK_RETENTION_MS, readLocalGuestbookEntries } from './guestbook';

const unsafeQuote = {
  id: 'unsafe',
  text: 'We love you.',
  author: 'Sam',
  role: 'Friend',
  photo: 'javascript:alert(1)',
};

describe('public quote media', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('drops unsafe quote grid photo URLs before render', () => {
    const { container } = render(
      <quotesGridDefinition.Component
        data={{
          ...defaultQuotesGridData,
          quotes: [unsafeQuote],
        }}
      />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('javascript:alert');
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('drops unsafe quote featured photo URLs before render', () => {
    const { container } = render(
      <quotesFeaturedDefinition.Component
        data={{
          ...defaultQuotesFeaturedData,
          quotes: [{ ...unsafeQuote, featured: true }],
        }}
      />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('javascript:alert');
  });

  it('keeps safe same-origin quote carousel photos', () => {
    const { container } = render(
      <quotesCarouselDefinition.Component
        data={{
          ...defaultQuotesCarouselData,
          autoplay: false,
          quotes: [{ ...unsafeQuote, photo: '/preview-photos/header-anchor.jpg' }],
        }}
      />,
    );

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/preview-photos/header-anchor.jpg');
  });

  it('migrates and bounds local public guestbook entries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:00:00.000Z'));
    const storageKey = 'dayof_guestbook_well_wishes';
    window.localStorage.setItem(storageKey, JSON.stringify([
      { id: 'entry-1', text: ` ${'a'.repeat(700)} `, author: ` ${'b'.repeat(100)} ` },
      { id: 'empty', text: '   ', author: 'Nobody' },
    ]));

    const entries = readLocalGuestbookEntries(storageKey);

    expect(entries).toHaveLength(1);
    expect(entries[0].text).toHaveLength(500);
    expect(entries[0].author).toHaveLength(80);
    expect(JSON.parse(window.localStorage.getItem(storageKey) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T21:00:00.000Z',
      entries: [entries[0]],
    });
  });

  it('clears stale or malformed local public guestbook entries', () => {
    const storageKey = 'dayof_guestbook_well_wishes';
    const staleDate = new Date(Date.now() - QUOTES_GUESTBOOK_RETENTION_MS - 1000).toISOString();
    window.localStorage.setItem(storageKey, JSON.stringify({
      savedAtISO: staleDate,
      entries: [{ id: 'entry-1', text: 'See you soon', author: 'Maya' }],
    }));

    expect(readLocalGuestbookEntries(storageKey)).toEqual([]);
    expect(window.localStorage.getItem(storageKey)).toBeNull();

    window.localStorage.setItem(storageKey, '{broken');
    expect(readLocalGuestbookEntries(storageKey)).toEqual([]);
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });
});
