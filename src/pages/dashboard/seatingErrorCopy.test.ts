import { describe, expect, it } from 'vitest';

import {
  mapSeatingDashboardError,
  SEATING_ADD_TABLE_RETRY_ERROR,
  SEATING_ASSIGN_GUEST_RETRY_ERROR,
  SEATING_AUTO_CREATE_TABLES_RETRY_ERROR,
  SEATING_AUTO_SEAT_RETRY_ERROR,
  SEATING_BULK_CHECKIN_RETRY_ERROR,
  SEATING_CHECKIN_RETRY_ERROR,
  SEATING_CLEAR_SEAT_RETRY_ERROR,
  SEATING_DATA_LOAD_RETRY_ERROR,
  SEATING_DELETE_TABLE_RETRY_ERROR,
  SEATING_DRIFT_CHECK_RETRY_ERROR,
  SEATING_EVENTS_LOAD_RETRY_ERROR,
  SEATING_RESET_RETRY_ERROR,
  SEATING_RESIZE_TABLE_RETRY_ERROR,
  SEATING_ROTATE_ITEM_RETRY_ERROR,
  SEATING_TABLE_POSITION_SAVE_RETRY_ERROR,
  SEATING_UNASSIGN_GUEST_RETRY_ERROR,
  SEATING_UPDATE_TABLE_RETRY_ERROR,
} from './seatingErrorCopy';

describe('seatingErrorCopy', () => {
  it('masks provider and backend errors behind calm seating copy', () => {
    expect(mapSeatingDashboardError(new Error('openai provider timeout token=abc'), SEATING_ASSIGN_GUEST_RETRY_ERROR)).toBe(
      SEATING_ASSIGN_GUEST_RETRY_ERROR,
    );
    expect(
      mapSeatingDashboardError(
        new Error('Supabase row-level security policy denied seating_assignments insert'),
        SEATING_DATA_LOAD_RETRY_ERROR,
      ),
    ).toBe(SEATING_DATA_LOAD_RETRY_ERROR);
  });

  it('uses the fallback when no readable message is available', () => {
    expect(mapSeatingDashboardError(null, SEATING_EVENTS_LOAD_RETRY_ERROR)).toBe(SEATING_EVENTS_LOAD_RETRY_ERROR);
  });

  it('keeps seating recovery copy calm and owner-safe', () => {
    expect(SEATING_EVENTS_LOAD_RETRY_ERROR).toBe('Could not load events right now. Please try again.');
    expect(SEATING_DATA_LOAD_RETRY_ERROR).toBe('Could not load seating data right now. Please try again.');
    expect(SEATING_CLEAR_SEAT_RETRY_ERROR).toBe('Could not clear that seat right now. Please try again.');
    expect(SEATING_ASSIGN_GUEST_RETRY_ERROR).toBe('Could not assign that guest right now. Please try again.');
    expect(SEATING_UNASSIGN_GUEST_RETRY_ERROR).toBe('Could not unassign that guest right now. Please try again.');
    expect(SEATING_ADD_TABLE_RETRY_ERROR).toBe('Could not add that table right now. Please try again.');
    expect(SEATING_UPDATE_TABLE_RETRY_ERROR).toBe('Could not update that table right now. Please try again.');
    expect(SEATING_RESIZE_TABLE_RETRY_ERROR).toBe('Could not resize that table right now. Please try again.');
    expect(SEATING_ROTATE_ITEM_RETRY_ERROR).toBe('Could not rotate this layout item right now. Please try again.');
    expect(SEATING_TABLE_POSITION_SAVE_RETRY_ERROR).toBe('Could not save that table position right now. Please try again.');
    expect(SEATING_DELETE_TABLE_RETRY_ERROR).toBe('Could not remove that table right now. Please try again.');
    expect(SEATING_RESET_RETRY_ERROR).toBe('Could not reset seating right now. Please try again.');
    expect(SEATING_AUTO_CREATE_TABLES_RETRY_ERROR).toBe('Could not auto-create tables right now. Please try again.');
    expect(SEATING_AUTO_SEAT_RETRY_ERROR).toBe('Could not auto-seat guests right now. Please try again.');
    expect(SEATING_DRIFT_CHECK_RETRY_ERROR).toBe('Could not run the seating check right now. Please try again.');
    expect(SEATING_CHECKIN_RETRY_ERROR).toBe('Could not update check-in right now. Please try again.');
    expect(SEATING_BULK_CHECKIN_RETRY_ERROR).toBe('Could not update those arrivals right now. Please try again.');
  });
});
