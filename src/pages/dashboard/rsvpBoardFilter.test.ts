import { describe, expect, it } from 'vitest';

import { filterRsvpBoardRows } from './rsvpBoardFilter';

describe('rsvp board filter', () => {
  const rows = [
    { rsvp_status: 'pending' },
    { rsvp_status: 'confirmed' },
    { rsvp_status: 'declined' },
    { rsvp_status: 'no_response' },
  ];

  it('keeps every row visible in all mode', () => {
    expect(filterRsvpBoardRows(rows, 'all')).toHaveLength(4);
  });

  it('only keeps repo-defined pending rows when pending focus is enabled', () => {
    expect(filterRsvpBoardRows(rows, 'pending')).toEqual([
      { rsvp_status: 'pending' },
    ]);
  });
});
