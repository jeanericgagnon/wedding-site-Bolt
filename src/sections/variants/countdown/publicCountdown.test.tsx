import { render } from '@testing-library/react';
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

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('javascript:alert');
  });

  it('preserves same-origin public photo countdown image URLs', () => {
    const { container } = render(
      <countdownPhotoDefinition.Component
        data={{
          ...defaultCountdownSimpleData,
          layoutStyle: 'photo',
          imageUrl: '/preview-photos/header-anchor.jpg',
        }}
      />,
    );

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/preview-photos/header-anchor.jpg');
  });
});
