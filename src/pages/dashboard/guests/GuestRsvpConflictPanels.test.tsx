import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestRsvpConflictPanels } from './GuestRsvpConflictPanels';

const conflict = {
  id: 'conflict-1',
  guest_id: 'guest-1',
  conflict_code: 'meal_missing',
  message: 'Missing meal choice',
  severity: 'error',
  created_at: new Date().toISOString(),
  resolved: false,
  resolved_at: null,
};

const baseProps = {
  conflictFilter: 'all' as const,
  guests: [
    {
      id: 'guest-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: null,
      plus_one_allowed: false,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      invite_token: 'token-1',
      rsvp_status: 'confirmed',
      rsvp_received_at: null,
      household_id: null,
    },
  ],
  isGuestsReadOnly: false,
  resolvingConflictId: null,
  rsvpConflicts: [conflict],
  rsvpConflictStats: {
    openNow: 1,
    opened24h: 1,
    resolved24h: 0,
    unresolvedOver24h: 0,
    unresolvedOver72h: 0,
    topCodes: [],
  },
  showConflictDetails: false,
  visibleRsvpConflicts: [conflict],
  onResolveAllVisibleConflicts: vi.fn(),
  onResolveConflict: vi.fn(),
  onReviewPending: vi.fn(),
  onSetConflictFilter: vi.fn(),
  onToggleConflictDetails: vi.fn(),
};

describe('GuestRsvpConflictPanels', () => {
  it('keeps conflict resolve write actions disabled for read-only collaborators', () => {
    render(<GuestRsvpConflictPanels {...baseProps} isGuestsReadOnly />);

    expect(screen.getByRole('button', { name: /resolve 1/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^resolve$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /view details/i })).toBeEnabled();
  });
});
