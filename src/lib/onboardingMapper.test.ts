import { describe, expect, it } from 'vitest';
import { buildOnboardingUpdateData } from './onboardingMapper';

describe('buildOnboardingUpdateData', () => {
  it('drops invalid persisted date inputs instead of saving poison back into onboarding outputs', () => {
    const result = buildOnboardingUpdateData({
      coupleNames: { name1: 'Alex', name2: 'Jordan' },
      planningStatus: 'guided_setup_in_progress',
      template: 'modern',
      weddingDate: '2026-02-30',
      rsvpDeadline: 'not-a-date',
    });

    expect(result.wedding_date).toBeNull();
    expect(result.venue_date).toBeNull();
    expect(result.rsvp_deadline).toBeNull();
    const weddingData = result.wedding_data as {
      event?: { weddingDateISO?: string };
      rsvp?: { deadlineISO?: string };
    };

    expect(weddingData.event?.weddingDateISO).toBeUndefined();
    expect(weddingData.rsvp?.deadlineISO).toBeUndefined();
  });

  it('keeps valid onboarding date inputs intact', () => {
    const result = buildOnboardingUpdateData({
      coupleNames: { name1: 'Alex', name2: 'Jordan' },
      planningStatus: 'guided_setup_in_progress',
      template: 'modern',
      weddingDate: '2026-06-20',
      rsvpDeadline: '2026-05-15',
    });

    expect(result.wedding_date).toBe('2026-06-20');
    expect(result.venue_date).toBe('2026-06-20');
    expect(result.rsvp_deadline).toBe('2026-05-15');
    const weddingData = result.wedding_data as {
      event?: { weddingDateISO?: string };
      rsvp?: { deadlineISO?: string };
    };

    expect(weddingData.event?.weddingDateISO).toBe('2026-06-20');
    expect(weddingData.rsvp?.deadlineISO).toBe('2026-05-15');
  });
});
