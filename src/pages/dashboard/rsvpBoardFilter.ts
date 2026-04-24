import { isPendingRsvpStatus } from '../../lib/rsvpStatus';

type RsvpStatusRow = {
  rsvp_status: string;
};

export type RsvpBoardFilter = 'all' | 'pending';

export function filterRsvpBoardRows<T extends RsvpStatusRow>(rows: T[], filter: RsvpBoardFilter): T[] {
  if (filter === 'pending') {
    return rows.filter((row) => isPendingRsvpStatus(row.rsvp_status));
  }

  return rows;
}
