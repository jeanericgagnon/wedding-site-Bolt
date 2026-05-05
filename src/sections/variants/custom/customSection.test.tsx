import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { customSectionDefinition, defaultCustomSectionData } from './customSection';

const CustomSection = customSectionDefinition.Component;

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn();
    disconnect = vi.fn();
  });
});

describe('custom public section links and images', () => {
  it('sanitizes public custom buttons and images', () => {
    render(
      <CustomSection
        data={{
          ...defaultCustomSectionData,
          blocks: [
            { id: 'bad-image', type: 'image', imageUrl: 'javascript:alert(1)', imageAlt: 'Unsafe' },
            { id: 'safe-image', type: 'image', imageUrl: 'https://example.com/photo.jpg', imageAlt: 'Safe' },
            { id: 'bad-button', type: 'button', buttonLabel: 'Bad button', buttonUrl: 'javascript:alert(1)' },
            { id: 'anchor-button', type: 'button', buttonLabel: 'Anchor button', buttonUrl: '#rsvp' },
          ],
        }}
      />,
    );

    expect(screen.queryByAltText('Unsafe')).not.toBeInTheDocument();
    expect(screen.getByAltText('Safe')).toHaveAttribute('src', 'https://example.com/photo.jpg');
    expect(screen.getByRole('link', { name: 'Bad button' })).toHaveAttribute('href', '#');
    expect(screen.getByRole('link', { name: 'Anchor button' })).toHaveAttribute('href', '#rsvp');
  });
});
