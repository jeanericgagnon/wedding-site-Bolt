import { render } from '@testing-library/react';
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

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('javascript:alert');
    expect(container.innerHTML).not.toContain('image.thum.io');
  });

  it('keeps safe same-origin mood-board images', () => {
    const { container } = render(
      <dressCodeMoodBoardDefinition.Component
        data={{
          ...defaultDressCodeMoodBoardData,
          moodImages: [
            { id: 'local-photo', url: '/preview-photos/header-anchor.jpg', alt: 'Local inspiration' },
          ],
        }}
      />,
    );

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/preview-photos/header-anchor.jpg');
  });
});
