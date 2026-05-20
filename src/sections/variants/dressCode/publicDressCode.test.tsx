import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultDressCodeMoodBoardData, dressCodeMoodBoardDefinition } from './moodBoard';

describe('public dress-code media', () => {
  it('drops unsafe mood-board image URLs before render', () => {
    const { container } = render(
      <dressCodeMoodBoardDefinition.Component
        data={{
          ...defaultDressCodeMoodBoardData,
          moodImages: [
            { id: 'unsafe-script', url: 'javascript:alert(1)', alt: 'Unsafe script' },
            { id: 'unsafe-proxy', url: 'https://image.thum.io/get/https://example.com', alt: 'Unsafe proxy' },
          ],
        }}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('img[src*="image.thum.io"]')).toBeNull();
  });

  it('keeps safe same-origin mood-board images', () => {
    render(
      <dressCodeMoodBoardDefinition.Component
        data={{
          ...defaultDressCodeMoodBoardData,
          moodImages: [
            { id: 'local-photo', url: '/preview-photos/header-anchor.jpg', alt: 'Local inspiration' },
          ],
        }}
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute('src', '/preview-photos/header-anchor.jpg');
  });
});
