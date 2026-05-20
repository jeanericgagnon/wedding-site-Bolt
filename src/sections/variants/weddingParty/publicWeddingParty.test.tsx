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

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
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

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
  });

  it('keeps safe same-origin scroll member photos', () => {
    render(
      <weddingPartyScrollDefinition.Component
        data={{
          ...defaultWeddingPartyScrollData,
          members: [{ ...unsafeMember, photo: '/preview-photos/header-anchor.jpg' }],
        }}
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute('src', '/preview-photos/header-anchor.jpg');
  });
});
