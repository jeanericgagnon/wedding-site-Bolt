import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RegistryFundHighlight, RegistryGrid, RegistrySection } from './RegistrySection';
import type { SectionInstance } from '../../types/layoutConfig';
import { createEmptyWeddingData } from '../../types/weddingData';

function makeInstance(settings: SectionInstance['settings'], bindings?: SectionInstance['bindings']): SectionInstance {
  return {
    id: 'registry-1',
    type: 'registry',
    enabled: true,
    variant: 'default',
    settings,
    bindings,
  };
}

describe('RegistrySection', () => {
  it('renders registry fallback content without bindings present across variants', () => {
    const data = createEmptyWeddingData();
    data.registry = {
      links: [
        { id: 'registry-link-1', label: 'Crate & Barrel', url: 'https://example.com/registry' },
      ],
      notes: 'Your love and support means the world.',
    };

    const { rerender } = render(
      <RegistrySection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Registry')).toBeInTheDocument();
    expect(screen.getByText('Crate & Barrel')).toBeInTheDocument();

    rerender(
      <RegistryGrid
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getAllByText('Registry').length).toBeGreaterThan(0);
    expect(screen.getByText('Open registry')).toBeInTheDocument();

    rerender(
      <RegistryFundHighlight
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getAllByText('Registry').length).toBeGreaterThan(0);
    expect(screen.getByText('Featured fund')).toBeInTheDocument();
  });

  it('keeps default titles visible when no registry links exist', () => {
    const data = createEmptyWeddingData();

    const { rerender } = render(
      <RegistrySection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Registry')).toBeInTheDocument();

    rerender(
      <RegistryGrid
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Registry')).toBeInTheDocument();

    rerender(
      <RegistryFundHighlight
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Registry')).toBeInTheDocument();
  });
});
