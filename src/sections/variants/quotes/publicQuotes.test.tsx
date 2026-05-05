import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultQuotesCarouselData, quotesCarouselDefinition } from './carousel';
import { defaultQuotesFeaturedData, quotesFeaturedDefinition } from './featured';
import { defaultQuotesGridData, quotesGridDefinition } from './grid';

const unsafeQuote = {
  id: 'unsafe',
  text: 'We love you.',
  author: 'Sam',
  role: 'Friend',
  photo: 'javascript:alert(1)',
};

describe('public quote media', () => {
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
});
