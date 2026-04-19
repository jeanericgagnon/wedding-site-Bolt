import { describe, expect, it } from 'vitest';
import { canManageCoordinatorCheckIn, canManageCoordinatorQna, canManageCoordinatorTimeline, canScheduleCoordinatorAlerts, canSendImmediateCoordinatorAlerts } from './coordinatorRoleAccess';

describe('coordinatorRoleAccess', () => {
  it('keeps viewers read-only across live ops actions', () => {
    expect(canManageCoordinatorCheckIn('viewer')).toBe(false);
    expect(canManageCoordinatorTimeline('viewer')).toBe(false);
    expect(canManageCoordinatorQna('viewer')).toBe(false);
    expect(canSendImmediateCoordinatorAlerts('viewer')).toBe(false);
    expect(canScheduleCoordinatorAlerts('viewer')).toBe(false);
  });

  it('lets coordinators run live ops but not schedule future alerts', () => {
    expect(canManageCoordinatorCheckIn('coordinator')).toBe(true);
    expect(canManageCoordinatorTimeline('coordinator')).toBe(true);
    expect(canManageCoordinatorQna('coordinator')).toBe(true);
    expect(canSendImmediateCoordinatorAlerts('coordinator')).toBe(true);
    expect(canScheduleCoordinatorAlerts('coordinator')).toBe(false);
  });

  it('lets planners schedule alerts too', () => {
    expect(canScheduleCoordinatorAlerts('planner')).toBe(true);
    expect(canScheduleCoordinatorAlerts('owner')).toBe(true);
  });
});
