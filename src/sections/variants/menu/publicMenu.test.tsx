import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultMenuCardData, menuCardDefinition, menuCocktailDinnerDefinition } from './card';

describe('public menu media', () => {
  it('drops unsafe menu background image URLs before render', () => {
    const { container } = render(
      <menuCardDefinition.Component
        data={{
          ...defaultMenuCardData,
          backgroundImage: 'javascript:alert(1)',
        }}
      />,
    );

    expect(container.innerHTML).not.toContain('javascript:alert');
    expect(container.querySelector('[style*="background-image"]')).not.toBeInTheDocument();
  });

  it('keeps safe same-origin menu background images', () => {
    const { container } = render(
      <menuCocktailDinnerDefinition.Component
        data={{
          ...defaultMenuCardData,
          layoutStyle: 'cocktailDinner',
          backgroundImage: '/preview-photos/header-anchor.jpg',
        }}
      />,
    );

    expect(container.innerHTML).toContain('/preview-photos/header-anchor.jpg');
  });
});
