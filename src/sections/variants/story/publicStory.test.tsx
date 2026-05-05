import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultStoryTwoColumnData, storyCenteredDefinition, storyTwoColumnDefinition } from './twoColumn';

describe('public story media', () => {
  it('drops unsafe story image URLs before render', () => {
    const { container } = render(
      <storyTwoColumnDefinition.Component
        data={{
          ...defaultStoryTwoColumnData,
          image: 'javascript:alert(1)',
        }}
      />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('javascript:alert');
  });

  it('keeps safe same-origin story images', () => {
    const { container } = render(
      <storyCenteredDefinition.Component
        data={{
          ...defaultStoryTwoColumnData,
          presentation: 'centered',
          image: '/preview-photos/header-anchor.jpg',
        }}
      />,
    );

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/preview-photos/header-anchor.jpg');
  });
});
