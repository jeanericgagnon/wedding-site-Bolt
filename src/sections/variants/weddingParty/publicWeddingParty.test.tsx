import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultWeddingPartyGridData, weddingPartyGridDefinition } from './grid';
import { defaultWeddingPartyScrollData, weddingPartyScrollDefinition } from './scroll';
import { defaultWeddingPartyStoryBiosData, weddingPartyStoryBiosDefinition } from './storyBios';

const unsafeMember = {
  id: 'unsafe',
  name: 'Sam',
  role: 'Maid of Honor',
  photo: 'javascript:alert(1)',
  note: '',
  side: 'partner1' as const,
};

describe('public wedding party media', () => {
  it('drops unsafe grid member photo URLs before render', () => {
    const { container } = render(
      <weddingPartyGridDefinition.Component
        data={{
          ...defaultWeddingPartyGridData,
          members: [unsafeMember],
        }}
      />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('javascript:alert');
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('drops unsafe story-bio member photo URLs before render', () => {
    const { container } = render(
      <weddingPartyStoryBiosDefinition.Component
        data={{
          ...defaultWeddingPartyStoryBiosData,
          members: [unsafeMember],
        }}
      />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('javascript:alert');
  });

  it('keeps safe same-origin scroll member photos', () => {
    const { container } = render(
      <weddingPartyScrollDefinition.Component
        data={{
          ...defaultWeddingPartyScrollData,
          members: [{ ...unsafeMember, photo: '/preview-photos/header-anchor.jpg' }],
        }}
      />,
    );

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/preview-photos/header-anchor.jpg');
  });
});
