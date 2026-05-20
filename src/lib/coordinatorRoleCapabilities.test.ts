import { describe, expect, it } from 'vitest';
import { buildCoordinatorRoleCapabilities } from './coordinatorRoleCapabilities';

describe('coordinatorRoleCapabilities', () => {
  it('shows coordinators as live operators without scheduling access', () => {
    expect(buildCoordinatorRoleCapabilities('coordinator')).toEqual([
      {
        key: 'check-in',
        label: 'Check-in',
        enabled: true,
        detail: 'Can move guests through the door live.',
      },
      {
        key: 'timeline',
        label: 'Timeline',
        enabled: true,
        detail: 'Can move run-of-show events live, done, or back to up next.',
      },
      {
        key: 'qna',
        label: 'Guest Q&A',
        enabled: true,
        detail: 'Can answer guest questions and reopen unresolved ones.',
      },
      {
        key: 'alerts-now',
        label: 'Send now',
        enabled: true,
        detail: 'Can send live day-of updates right away.',
      },
      {
        key: 'alerts-later',
        label: 'Schedule',
        enabled: false,
        detail: 'Scheduling stays with planners or the couple.',
      },
    ]);
  });

  it('shows viewers as read-only across the board', () => {
    expect(buildCoordinatorRoleCapabilities('viewer').map((item) => item.enabled)).toEqual([false, false, false, false, false]);
  });

  it('honors explicit coordinator permission arrays in the visible capability board', () => {
    expect(buildCoordinatorRoleCapabilities('coordinator', ['guests']).map((item) => item.enabled)).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);

    expect(buildCoordinatorRoleCapabilities('planner', ['messages']).map((item) => item.enabled)).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
  });
});
