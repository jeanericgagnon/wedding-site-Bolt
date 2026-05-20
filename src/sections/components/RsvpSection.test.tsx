import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RsvpInline, RsvpSection } from './RsvpSection';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

vi.mock('../../lib/supabase', () => ({
  supabase: {},
}));

function createWeddingData(): WeddingDataV1 {
  return {
    version: '1',
    couple: { partner1Name: 'Alex', partner2Name: 'Jordan', displayName: '' },
    event: {},
    venues: [],
    schedule: [],
    travel: {},
    faq: [],
    weddingParty: [],
    registry: [],
    rsvp: { enabled: true },
    theme: {},
    media: { gallery: [] },
  } as unknown as WeddingDataV1;
}

function makeInstance(settings: SectionInstance['settings']): SectionInstance {
  return {
    id: 'rsvp-1',
    type: 'rsvp',
    enabled: true,
    variant: 'default',
    settings,
  } as unknown as SectionInstance;
}

describe('RsvpSection', () => {
  it('shows default RSVP titles when showTitle is unset in both variants', () => {
    const data = createWeddingData();

    const { rerender } = render(
      <RsvpSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Kindly reply')).toBeInTheDocument();
    expect(screen.getByText('RSVP')).toBeInTheDocument();

    rerender(
      <RsvpInline
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('You’re invited')).toBeInTheDocument();
    expect(screen.getByText('RSVP')).toBeInTheDocument();
    expect(screen.getByText('Join Alex & Jordan in celebrating their wedding')).toBeInTheDocument();
  });

  it('keeps inline RSVP couple copy truthful when one persisted partner name is whitespace only', () => {
    const data = createWeddingData();
    data.couple.partner1Name = '   ';
    data.couple.partner2Name = ' Alex ';

    render(
      <RsvpInline
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Join Alex in celebrating their wedding')).toBeInTheDocument();
  });

  it('guards invalid persisted RSVP deadlines across both variants', () => {
    const data = createWeddingData();
    data.rsvp.deadlineISO = 'not-a-date';

    const { rerender } = render(
      <RsvpSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
    expect(screen.queryByText(/Kindly respond by/)).not.toBeInTheDocument();

    rerender(
      <RsvpInline
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
    expect(screen.queryByText(/Kindly respond by/)).not.toBeInTheDocument();
  });
});
