import { customerSafeErrorMessage } from '../../lib/customerSafeError';

export const SEATING_EVENTS_LOAD_RETRY_ERROR = 'Could not load events right now. Please try again.';
export const SEATING_DATA_LOAD_RETRY_ERROR = 'Could not load seating data right now. Please try again.';
export const SEATING_CLEAR_SEAT_RETRY_ERROR = 'Could not clear that seat right now. Please try again.';
export const SEATING_ASSIGN_GUEST_RETRY_ERROR = 'Could not assign that guest right now. Please try again.';
export const SEATING_UNASSIGN_GUEST_RETRY_ERROR = 'Could not unassign that guest right now. Please try again.';
export const SEATING_ADD_TABLE_RETRY_ERROR = 'Could not add that table right now. Please try again.';
export const SEATING_UPDATE_TABLE_RETRY_ERROR = 'Could not update that table right now. Please try again.';
export const SEATING_RESIZE_TABLE_RETRY_ERROR = 'Could not resize that table right now. Please try again.';
export const SEATING_ROTATE_ITEM_RETRY_ERROR = 'Could not rotate this layout item right now. Please try again.';
export const SEATING_TABLE_POSITION_SAVE_RETRY_ERROR = 'Could not save that table position right now. Please try again.';
export const SEATING_DELETE_TABLE_RETRY_ERROR = 'Could not remove that table right now. Please try again.';
export const SEATING_RESET_RETRY_ERROR = 'Could not reset seating right now. Please try again.';
export const SEATING_AUTO_CREATE_TABLES_RETRY_ERROR = 'Could not auto-create tables right now. Please try again.';
export const SEATING_AUTO_SEAT_RETRY_ERROR = 'Could not auto-seat guests right now. Please try again.';
export const SEATING_DRIFT_CHECK_RETRY_ERROR = 'Could not run the seating check right now. Please try again.';
export const SEATING_CHECKIN_RETRY_ERROR = 'Could not update check-in right now. Please try again.';
export const SEATING_BULK_CHECKIN_RETRY_ERROR = 'Could not update those arrivals right now. Please try again.';

export function mapSeatingDashboardError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}
