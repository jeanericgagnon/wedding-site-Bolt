import { describe, expect, it } from 'vitest';

import {
  GUESTS_ADD_RETRY_ERROR,
  GUESTS_IMPORT_RETRY_ERROR,
  GUESTS_RSVP_CONFIG_RETRY_ERROR,
  mapGuestDashboardError,
} from './guestErrorCopy';

describe('guestErrorCopy', () => {
  it('keeps local guest-validation guidance readable for owners', () => {
    expect(mapGuestDashboardError(new Error('Meal choices need at least 2 options when enabled.'), GUESTS_RSVP_CONFIG_RETRY_ERROR)).toBe(
      'Meal choices need at least 2 options when enabled.',
    );
    expect(mapGuestDashboardError(new Error('Choice question "Shuttle stop" needs at least 2 options.'), GUESTS_RSVP_CONFIG_RETRY_ERROR)).toBe(
      'Choice question "Shuttle stop" needs at least 2 options.',
    );
  });

  it('masks provider and backend guest failures behind calm owner copy', () => {
    expect(mapGuestDashboardError(new Error('functions/v1/guest-import provider timeout with token=abc'), GUESTS_IMPORT_RETRY_ERROR)).toBe(
      GUESTS_IMPORT_RETRY_ERROR,
    );
    expect(mapGuestDashboardError(new Error('Supabase duplicate key violates row-level security policy'), GUESTS_ADD_RETRY_ERROR)).toBe(
      GUESTS_ADD_RETRY_ERROR,
    );
  });
});
