import { isPendingRsvpStatus } from '../../lib/rsvpStatus';

type GuestRow = {
  rsvp_status: string;
};

export type RsvpBoardFilter = 'all' | 'pending';

export function filterRsvpBoardRows(rows: GuestRow[], filter: RsvpBoardFilter): GuestRow[] {
  if (filter === 'pending') {
    return rows.filter((row) => isPendingRsvpStatus(row.rsvp_status));
  }

  return rows;
}
