import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScheduleDayTabs, ScheduleSection, ScheduleTimeline } from './ScheduleSection';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

function createWeddingData(schedule: WeddingDataV1['schedule'] = []): WeddingDataV1 {
  return {
    version: '1',
    couple: { partner1Name: '', partner2Name: '', displayName: '' },
    event: {},
    venues: [],
    schedule,
    rsvp: { enabled: true },
    travel: {},
    faq: [],
    weddingParty: [],
    registry: [],
    theme: {},
    media: { gallery: [] },
  } as unknown as WeddingDataV1;
}

function makeInstance(settings: SectionInstance['settings']): SectionInstance {
  return {
    id: 'schedule-1',
    type: 'schedule',
    enabled: true,
    variant: 'default',
    settings,
  } as unknown as SectionInstance;
}

describe('ScheduleSection', () => {
  it('shows default titles when showTitle is unset across schedule variants', () => {
    const emptyData = createWeddingData();

    const { rerender } = render(
      <ScheduleSection
        data={emptyData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Schedule')).toBeInTheDocument();

    rerender(
      <ScheduleTimeline
        data={emptyData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Schedule')).toBeInTheDocument();

    rerender(
      <ScheduleDayTabs
        data={emptyData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('keeps default titles visible when schedule items exist', () => {
    const populatedData = createWeddingData([
      { id: 'event-1', label: 'Ceremony', startTimeISO: '2026-06-20T21:00:00.000Z' },
    ]);

    const { rerender } = render(
      <ScheduleSection
        data={populatedData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Ceremony')).toBeInTheDocument();

    rerender(
      <ScheduleTimeline
        data={populatedData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('The plan')).toBeInTheDocument();

    rerender(
      <ScheduleDayTabs
        data={populatedData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Weekend schedule')).toBeInTheDocument();
  });

  it('guards invalid persisted day-tab dates instead of rendering Invalid Date', () => {
    const populatedData = createWeddingData([
      { id: 'event-1', label: 'Welcome Party', startTimeISO: 'not-a-dateT18:00:00' },
      { id: 'event-2', label: 'Ceremony', startTimeISO: '2026-06-20T21:00:00.000Z' },
    ]);

    render(
      <ScheduleDayTabs
        data={populatedData}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Wedding Day' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
  });
});
