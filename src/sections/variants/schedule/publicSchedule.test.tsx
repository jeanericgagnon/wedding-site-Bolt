import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultScheduleAgendaCardsData, scheduleAgendaCardsDefinition } from './agendaCards';

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
