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

    const backgroundLayer = container.querySelector('div[style]');
    expect(backgroundLayer).toBeNull();
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

    const backgroundLayer = container.querySelector('div[style]') as HTMLDivElement | null;
    expect(backgroundLayer).not.toBeNull();
    expect(backgroundLayer?.style.backgroundImage).toContain('/preview-photos/header-anchor.jpg');
  });
});
