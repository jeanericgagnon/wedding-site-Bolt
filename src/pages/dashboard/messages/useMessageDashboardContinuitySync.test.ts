import { describe, expect, it } from 'vitest';
import { shouldRefreshForRsvpContinuityEvent } from './useMessageDashboardContinuitySync';

describe('shouldRefreshForRsvpContinuityEvent', () => {
  it('requires RSVP continuity custom events to match the active wedding scope', () => {
    const storageKey = 'dayof.rsvp.updatedAt:maya-leo';

    expect(shouldRefreshForRsvpContinuityEvent({ storageKey }, storageKey, 'maya-leo')).toBe(true);
    expect(shouldRefreshForRsvpContinuityEvent({ siteSlug: '  MAYA-LEO  ' }, storageKey, 'maya-leo')).toBe(true);
    expect(shouldRefreshForRsvpContinuityEvent({ storageKey: 'dayof.rsvp.updatedAt:other-site' }, storageKey, 'maya-leo')).toBe(false);
    expect(shouldRefreshForRsvpContinuityEvent({ siteSlug: 'other-site' }, storageKey, 'maya-leo')).toBe(false);
    expect(shouldRefreshForRsvpContinuityEvent({}, storageKey, 'maya-leo')).toBe(false);
  });

  it('keeps unscoped dashboards compatible with unscoped continuity events', () => {
    const storageKey = 'dayof.rsvp.updatedAt';

    expect(shouldRefreshForRsvpContinuityEvent({}, storageKey, null)).toBe(true);
    expect(shouldRefreshForRsvpContinuityEvent({ siteSlug: 'other-site' }, storageKey, null)).toBe(false);
  });
});
