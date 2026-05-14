import { describe, expect, it } from 'vitest';
import { buildNotificationPrefsPatch, normalizeNotificationPrefs } from './notificationPrefs';

describe('notificationPrefs', () => {
  it('keeps legacy digest booleans compatible while defaulting cadence safely', () => {
    expect(normalizeNotificationPrefs({ digest: true, photos: false })).toMatchObject({
      digest: true,
      digestCadence: 'weekly',
      photos: false,
      rsvp: true,
      updates: false,
    });

    expect(normalizeNotificationPrefs({ digest: false })).toMatchObject({
      digest: false,
      digestCadence: 'paused',
    });
  });

  it('preserves richer digest cadence, planner audience, and quiet labels', () => {
    expect(normalizeNotificationPrefs({
      digest: true,
      digest_cadence: 'daily',
      digest_include_planner: true,
      digest_quiet_until_label: 'after the rehearsal dinner',
    })).toMatchObject({
      digest: true,
      digestCadence: 'daily',
      digestIncludePlanner: true,
      digestQuietUntilLabel: 'after the rehearsal dinner',
    });
  });

  it('builds a stable settings patch shape for persistence', () => {
    expect(buildNotificationPrefsPatch({
      digest: true,
      digestCadence: 'weekly',
      digestIncludePlanner: true,
      digestQuietUntilLabel: 'Sunday morning',
      photos: true,
      rsvp: false,
      updates: true,
    })).toEqual({
      digest: true,
      digest_cadence: 'weekly',
      digest_include_planner: true,
      digest_quiet_until_label: 'Sunday morning',
      photos: true,
      rsvp: false,
      updates: true,
    });
  });
});
