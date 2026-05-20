import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { countdownPhotoDefinition, defaultCountdownSimpleData } from './simple';

describe('public countdown variants', () => {
  it('drops unsafe photo countdown image URLs before rendering', () => {
    const { container } = render(
      <countdownPhotoDefinition.Component
        data={{
          ...defaultCountdownSimpleData,
          layoutStyle: 'photo',
          imageUrl: 'javascript:alert(1)',
        }}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
  });

  it('preserves same-origin public photo countdown image URLs', () => {
    render(
      <countdownPhotoDefinition.Component
        data={{
          ...defaultCountdownSimpleData,
          layoutStyle: 'photo',
          imageUrl: '/preview-photos/header-anchor.jpg',
        }}
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute('src', '/preview-photos/header-anchor.jpg');
  });
});
