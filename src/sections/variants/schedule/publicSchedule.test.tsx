import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultScheduleAgendaCardsData, scheduleAgendaCardsDefinition } from './agendaCards';
import { defaultScheduleDayTabsData, scheduleDayTabsDefinition } from './dayTabs';
import { defaultScheduleTimelineData, scheduleTimelineDefinition } from './timeline';

describe('public schedule media', () => {
  it('drops unsafe schedule event image URLs before render', () => {
    const { container } = render(
      <scheduleAgendaCardsDefinition.Component
        data={{
          ...defaultScheduleAgendaCardsData,
          events: [
            {
              ...defaultScheduleAgendaCardsData.events[1],
              id: 'unsafe-schedule-image',
              image: 'javascript:alert(1)',
            },
            {
              ...defaultScheduleAgendaCardsData.events[2],
              id: 'unsafe-schedule-proxy',
              image: 'https://image.thum.io/get/https://example.com',
            },
          ],
        }}
      />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('javascript:alert');
    expect(container.innerHTML).not.toContain('image.thum.io');
  });

  it('keeps safe same-origin schedule event images', () => {
    const { container } = render(
      <scheduleAgendaCardsDefinition.Component
        data={{
          ...defaultScheduleAgendaCardsData,
          events: [
            {
              ...defaultScheduleAgendaCardsData.events[1],
              image: '/preview-photos/header-anchor.jpg',
            },
          ],
        }}
      />,
    );

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/preview-photos/header-anchor.jpg');
  });
});

describe('public schedule times', () => {
  it('omits blank agenda card times instead of rendering a fake midnight value', () => {
    render(
      <scheduleAgendaCardsDefinition.Component
        data={{
          ...defaultScheduleAgendaCardsData,
          events: [
            {
              ...defaultScheduleAgendaCardsData.events[0],
              id: 'agenda-no-time',
              time: '',
              endTime: '',
              label: 'Welcome Drinks',
            },
            {
              ...defaultScheduleAgendaCardsData.events[1],
              id: 'agenda-with-time',
              time: '4:30 PM',
              endTime: '5:00 PM',
              label: 'Ceremony',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Ceremony')).toBeInTheDocument();
    expect(screen.getByText('4:30 PM — 5:00 PM')).toBeInTheDocument();
    expect(screen.queryByText('12:00 AM')).not.toBeInTheDocument();
  });

  it('renders a single agenda-card time cleanly when only one side of the range exists', () => {
    render(
      <scheduleAgendaCardsDefinition.Component
        data={{
          ...defaultScheduleAgendaCardsData,
          events: [
            {
              ...defaultScheduleAgendaCardsData.events[0],
              id: 'agenda-end-only',
              time: '',
              endTime: '5:00 PM',
              label: 'Guest arrival window closes',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Guest arrival window closes')).toBeInTheDocument();
    expect(screen.getByText('5:00 PM')).toBeInTheDocument();
    expect(screen.queryByText('— 5:00 PM')).not.toBeInTheDocument();
  });

  it('omits blank timeline times instead of rendering a fake midnight value', () => {
    render(
      <scheduleTimelineDefinition.Component
        data={{
          ...defaultScheduleTimelineData,
          events: [
            {
              ...defaultScheduleTimelineData.events[0],
              id: 'timeline-no-time',
              time: '',
              label: 'Welcome Drinks',
            },
            {
              ...defaultScheduleTimelineData.events[1],
              id: 'timeline-with-time',
              time: '4:00 PM',
              label: 'Ceremony',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Ceremony')).toBeInTheDocument();
    expect(screen.getByText('4:00 PM')).toBeInTheDocument();
    expect(screen.queryByText('12:00 AM')).not.toBeInTheDocument();
  });

  it('omits blank day-tab times instead of rendering a fake midnight value', () => {
    render(
      <scheduleDayTabsDefinition.Component
        data={{
          ...defaultScheduleDayTabsData,
          days: [
            {
              ...defaultScheduleDayTabsData.days[0],
              id: 'fri',
              label: 'Friday',
              events: [
                {
                  ...defaultScheduleDayTabsData.days[0].events[0],
                  id: 'daytab-no-time',
                  time: '',
                  label: 'Welcome Drinks',
                },
                {
                  ...defaultScheduleDayTabsData.days[0].events[1],
                  id: 'daytab-with-time',
                  time: '8:00 PM',
                  label: 'Rehearsal Dinner',
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Rehearsal Dinner')).toBeInTheDocument();
    expect(screen.getByText('8:00 PM')).toBeInTheDocument();
    expect(screen.queryByText('12:00 AM')).not.toBeInTheDocument();
  });

  it('keeps day labels stable while untimed events stay untimed in day tabs', () => {
    render(
      <scheduleDayTabsDefinition.Component
        data={{
          ...defaultScheduleDayTabsData,
          days: [
            {
              ...defaultScheduleDayTabsData.days[0],
              id: 'fri',
              label: 'Friday',
              date: 'June 13',
              events: [
                {
                  ...defaultScheduleDayTabsData.days[0].events[0],
                  id: 'fri-no-time',
                  time: '',
                  label: 'Check-in',
                },
              ],
            },
            {
              ...defaultScheduleDayTabsData.days[1],
              id: 'sat',
              label: 'Saturday',
              date: 'June 14',
              events: [
                {
                  ...defaultScheduleDayTabsData.days[1].events[0],
                  id: 'sat-with-time',
                  time: '4:00 PM',
                  label: 'Ceremony',
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /Friday/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saturday/i })).toBeInTheDocument();
    expect(screen.getByText('June 13')).toBeInTheDocument();
    expect(screen.getByText('June 14')).toBeInTheDocument();
    expect(screen.getByText('Check-in')).toBeInTheDocument();
    expect(screen.queryByText('12:00 AM')).not.toBeInTheDocument();
  });

  it('does not leave empty visible time shells behind for untimed timeline and day-tab events', () => {
    const { container, rerender } = render(
      <scheduleTimelineDefinition.Component
        data={{
          ...defaultScheduleTimelineData,
          events: [
            {
              ...defaultScheduleTimelineData.events[0],
              id: 'timeline-untimed',
              time: '',
              label: 'Open house',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Open house')).toBeInTheDocument();
    expect(container.querySelector('.tabular-nums')).not.toBeInTheDocument();

    rerender(
      <scheduleDayTabsDefinition.Component
        data={{
          ...defaultScheduleDayTabsData,
          days: [
            {
              ...defaultScheduleDayTabsData.days[0],
              id: 'fri',
              events: [
                {
                  ...defaultScheduleDayTabsData.days[0].events[0],
                  id: 'daytab-untimed',
                  time: '',
                  label: 'Open house',
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Open house')).toBeInTheDocument();
    expect(container.querySelector('.tabular-nums')).not.toBeInTheDocument();
  });
});
