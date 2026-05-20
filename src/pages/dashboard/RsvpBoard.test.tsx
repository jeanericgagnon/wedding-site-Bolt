import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authState, loadRsvpBoardRowsMock, resolveRsvpBoardSiteIdMock } = vi.hoisted(() => ({
  authState: {
    isDemoMode: false,
    user: { id: 'user-1' },
  } as { isDemoMode: boolean; user: { id: string } | null },
  loadRsvpBoardRowsMock: vi.fn(),
  resolveRsvpBoardSiteIdMock: vi.fn(),
}));

vi.mock('../../components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('./rsvpBoardService', () => ({
  loadRsvpBoardRows: loadRsvpBoardRowsMock,
  resolveRsvpBoardSiteId: resolveRsvpBoardSiteIdMock,
}));

import { DashboardRsvpBoard } from './RsvpBoard';
import type { RsvpBoardGuestRow } from './rsvpBoardService';

function createRow(id: string, status: RsvpBoardGuestRow['rsvp_status']): RsvpBoardGuestRow {
  return {
    id,
    checked_in_at: null,
    email: `${id}@example.com`,
    invited_to_ceremony: true,
    invited_to_reception: true,
    phone: null,
    rsvp_status: status,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('DashboardRsvpBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isDemoMode = false;
    authState.user = { id: 'user-1' };
  });

  it('ignores stale RSVP board rows after a newer site loads', async () => {
    const firstRows = deferred<RsvpBoardGuestRow[]>();
    resolveRsvpBoardSiteIdMock
      .mockResolvedValueOnce('site-1')
      .mockResolvedValueOnce('site-2');
    loadRsvpBoardRowsMock
      .mockReturnValueOnce(firstRows.promise)
      .mockResolvedValueOnce([createRow('current', 'confirmed')]);

    const { rerender } = render(
      <MemoryRouter>
        <DashboardRsvpBoard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadRsvpBoardRowsMock).toHaveBeenCalledWith('site-1'));

    authState.user = { id: 'user-2' };
    rerender(
      <MemoryRouter>
        <DashboardRsvpBoard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Confirmed').nextElementSibling).toHaveTextContent('1'));

    firstRows.resolve([
      createRow('stale-a', 'pending'),
      createRow('stale-b', 'pending'),
      createRow('stale-c', 'pending'),
    ]);

    await waitFor(() => expect(screen.getByText('Total').nextElementSibling).toHaveTextContent('1'));
    expect(screen.getByText('Pending').nextElementSibling).toHaveTextContent('0');
  });
});
