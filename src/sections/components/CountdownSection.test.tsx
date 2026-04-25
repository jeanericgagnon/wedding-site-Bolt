import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CountdownSection } from './CountdownSection';
import { createEmptyWeddingData } from '../../types/weddingData';
import type { SectionInstance } from '../../types/layoutConfig';

function makeInstance(settings: Record<string, unknown>): SectionInstance {
  return {
    id: 'countdown-1',
    type: 'countdown',
    variant: 'default',
    enabled: true,
    locked: false,
    settings,
    bindings: {},
    overrides: {},
  };
}

describe('CountdownSection', () => {
  it('falls back to a truthful couple title when names are missing', () => {
    const data = createEmptyWeddingData();

    render(
      <CountdownSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('The couple')).toBeInTheDocument();
    expect(screen.queryByText(' & ')).not.toBeInTheDocument();
    expect(screen.getByText('Set your wedding date to show the countdown here.')).toBeInTheDocument();
  });

  it('uses available partner names when displayName is blank', () => {
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';

    render(
      <CountdownSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Alex & Jordan')).toBeInTheDocument();
  });

  it('keeps the countdown title truthful when one persisted partner name is whitespace only', () => {
    const data = createEmptyWeddingData();
    data.couple.partner1Name = '   ';
    data.couple.partner2Name = ' Alex ';

    render(
      <CountdownSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.queryByText(/&/)).not.toBeInTheDocument();
  });

  it('falls back cleanly when the persisted wedding date is invalid', () => {
    const data = createEmptyWeddingData();
    data.event.weddingDateISO = 'not-a-date';

    render(
      <CountdownSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Set your wedding date to show the countdown here.')).toBeInTheDocument();
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
  });
});
