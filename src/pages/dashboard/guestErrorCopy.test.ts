import { describe, expect, it } from 'vitest';

import {
  GUESTS_ADD_RETRY_ERROR,
  GUESTS_ASSISTED_RSVP_RETRY_ERROR,
  GUESTS_AUTO_REMINDER_SAVE_RETRY_ERROR,
  GUESTS_ITINERARY_DETAILS_LOAD_RETRY_ERROR,
  GUESTS_ITINERARY_FILTERS_LOAD_RETRY_ERROR,
  GUESTS_CHECKIN_UNDO_RETRY_ERROR,
  GUESTS_CHECKIN_STATUS_RETRY_ERROR,
  GUESTS_CONFLICT_RESOLVE_ALL_RETRY_ERROR,
  GUESTS_CONFLICT_RESOLVE_RETRY_ERROR,
  GUESTS_EVENT_INVITE_RETRY_ERROR,
  GUESTS_HOUSEHOLD_MERGE_RETRY_ERROR,
  GUESTS_HOUSEHOLD_REASSIGN_RETRY_ERROR,
  GUESTS_HOUSEHOLD_SPLIT_RETRY_ERROR,
  GUESTS_IMPORT_RETRY_ERROR,
  GUESTS_INVITATION_SEND_RETRY_ERROR,
  GUESTS_PARSE_FILE_RETRY_ERROR,
  GUESTS_RECORDS_LOAD_RETRY_ERROR,
  GUESTS_REMOVE_RETRY_ERROR,
  GUESTS_RSVP_AUDIT_LOAD_RETRY_ERROR,
  GUESTS_RSVP_CONFIG_RETRY_ERROR,
  GUESTS_SITE_SETTINGS_LOAD_RETRY_ERROR,
  GUESTS_THANK_YOU_STATUS_RETRY_ERROR,
  GUESTS_UPDATE_RETRY_ERROR,
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

  it('keeps guest-dashboard fallback copy calm and owner-safe', () => {
    expect(GUESTS_RSVP_CONFIG_RETRY_ERROR).toBe('Could not save RSVP settings right now.');
    expect(GUESTS_SITE_SETTINGS_LOAD_RETRY_ERROR).toBe('Could not load guest site settings right now. Please try again.');
    expect(GUESTS_RECORDS_LOAD_RETRY_ERROR).toBe('Could not load guest records right now. Please try again.');
    expect(GUESTS_ITINERARY_FILTERS_LOAD_RETRY_ERROR).toBe('Could not load itinerary filters right now. Please try again.');
    expect(GUESTS_RSVP_AUDIT_LOAD_RETRY_ERROR).toBe('Could not load RSVP audit history right now. Please try again.');
    expect(GUESTS_ITINERARY_DETAILS_LOAD_RETRY_ERROR).toBe('Could not load guest itinerary details right now. Please try again.');
    expect(GUESTS_PARSE_FILE_RETRY_ERROR).toBe('Could not read that guest file right now.');
    expect(GUESTS_IMPORT_RETRY_ERROR).toBe('Could not import that guest list right now. Please try again with a clean guest file.');
    expect(GUESTS_UPDATE_RETRY_ERROR).toBe('Could not update that guest right now. Please try again.');
    expect(GUESTS_THANK_YOU_STATUS_RETRY_ERROR).toBe('Could not update thank-you status right now.');
    expect(GUESTS_CHECKIN_STATUS_RETRY_ERROR).toBe('Could not update guest check-in right now.');
    expect(GUESTS_CHECKIN_UNDO_RETRY_ERROR).toBe('Could not undo that guest check-in right now.');
    expect(GUESTS_EVENT_INVITE_RETRY_ERROR).toBe('Could not update that event invitation right now.');
    expect(GUESTS_ASSISTED_RSVP_RETRY_ERROR).toBe('Could not save that assisted RSVP right now.');
    expect(GUESTS_AUTO_REMINDER_SAVE_RETRY_ERROR).toBe('Could not save auto reminder settings right now.');
    expect(GUESTS_CONFLICT_RESOLVE_RETRY_ERROR).toBe('Could not resolve that RSVP conflict right now.');
    expect(GUESTS_CONFLICT_RESOLVE_ALL_RETRY_ERROR).toBe('Could not resolve those RSVP conflicts right now.');
    expect(GUESTS_INVITATION_SEND_RETRY_ERROR).toBe('Could not send that invitation right now. Please try again.');
    expect(GUESTS_HOUSEHOLD_MERGE_RETRY_ERROR).toBe('Could not merge those guests into one household right now.');
    expect(GUESTS_HOUSEHOLD_SPLIT_RETRY_ERROR).toBe('Could not remove that guest from the household right now.');
    expect(GUESTS_HOUSEHOLD_REASSIGN_RETRY_ERROR).toBe('Could not move that guest to a different household right now.');
    expect(GUESTS_REMOVE_RETRY_ERROR).toBe('Could not remove that guest right now. Please try again.');
  });
});
