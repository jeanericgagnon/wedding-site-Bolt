import { render, screen } from '@testing-library/react';
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

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
  });

  it('keeps safe same-origin story images', () => {
    render(
      <storyCenteredDefinition.Component
        data={{
          ...defaultStoryTwoColumnData,
          presentation: 'centered',
          image: '/preview-photos/header-anchor.jpg',
        }}
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute('src', '/preview-photos/header-anchor.jpg');
  });
});
