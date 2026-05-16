import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardAuditLogs } from './AuditLogs';

const authState = {
  user: { id: 'user-1' },
  loading: false,
  isDemoMode: false,
};

const loadDashboardAuditLogs = vi.fn();

vi.mock('../../components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('./auditLogService', () => ({
  loadDashboardAuditLogs: (...args: unknown[]) => loadDashboardAuditLogs(...args),
}));

describe('DashboardAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces raw actor ids and vague labels with human-friendly owner-facing labels', async () => {
    loadDashboardAuditLogs.mockResolvedValue({
      guestRows: [
        {
          id: 'guest-log-1',
          action: 'update',
          changed_at: '2026-05-15T09:00:00.000Z',
          changed_by: '63d63e76-e944-4e45-9a7c-9cc09ca8ffa3',
          guest_id: 'guest-1',
          guest_name: '63d63e76-e944-4e45-9a7c-9cc09ca8ffa3',
        },
      ],
      actionRows: [
        {
          id: 'action-log-1',
          action_area: 'messages',
          summary: 'Saved draft',
          actor_user_id: 'someone',
          target_label: 'Campaign draft',
          created_at: '2026-05-15T10:00:00.000Z',
        },
        {
          id: 'action-log-2',
          action_area: 'settings',
          summary: 'Updated site visibility',
          actor_user_id: 'user-1',
          target_label: null,
          created_at: '2026-05-15T11:00:00.000Z',
        },
      ],
    });

    render(<DashboardAuditLogs />);

    expect(await screen.findByText('Activity history')).toBeInTheDocument();
    expect(screen.getByText('Guest record')).toBeInTheDocument();
    expect(screen.getAllByText(/Wedding team/).length).toBeGreaterThan(0);
    expect(screen.getByText(/You · settings/)).toBeInTheDocument();
    expect(screen.queryByText(/63d63e76-e944-4e45-9a7c-9cc09ca8ffa3/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Someone/)).not.toBeInTheDocument();
  });

  it('keeps the owner activity timeline readable when guest and action history are both present', async () => {
    loadDashboardAuditLogs.mockResolvedValue({
      guestRows: [
        {
          id: 'guest-log-2',
          action: 'create',
          changed_at: '2026-05-15T08:00:00.000Z',
          changed_by: 'coordinator-user',
          guest_id: 'guest-2',
          guest_name: 'Ari Gomez',
        },
      ],
      actionRows: [
        {
          id: 'action-log-3',
          action_area: 'registry',
          summary: 'Merged duplicate gifts',
          actor_user_id: 'user-1',
          target_label: 'KitchenAid Mixer',
          created_at: '2026-05-15T12:00:00.000Z',
        },
      ],
    });

    render(<DashboardAuditLogs />);

    expect(await screen.findByText('Activity history')).toBeInTheDocument();
    expect(screen.getByText(/Ari Gomez/)).toBeInTheDocument();
    expect(screen.getByText(/You · registry/)).toBeInTheDocument();
    expect(screen.getByText(/Merged duplicate gifts/)).toBeInTheDocument();
  });

  it('moves from loading to an empty owner-facing timeline when no activity exists yet', async () => {
    let resolveLogs: (value: { guestRows: never[]; actionRows: never[] }) => void = () => {};
    loadDashboardAuditLogs.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogs = resolve as typeof resolveLogs;
        }),
    );

    render(<DashboardAuditLogs />);

    expect(screen.getByText('Loading activity…')).toBeInTheDocument();

    resolveLogs({ guestRows: [], actionRows: [] });

    await screen.findByText('No activity yet.');
    expect(screen.queryByText('Loading activity…')).not.toBeInTheDocument();
  });

  it('shows a recoverable owner-facing error when activity history fails to load', async () => {
    loadDashboardAuditLogs.mockRejectedValue(new Error('temporary failure'));

    render(<DashboardAuditLogs />);

    expect(await screen.findByText('Couldn’t load activity history right now.')).toBeInTheDocument();
    expect(screen.queryByText('No activity yet.')).not.toBeInTheDocument();
  });

  it('clears loading and error states once activity rows load successfully again', async () => {
    let rejectLogs: (reason?: unknown) => void = () => {};
    loadDashboardAuditLogs.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectLogs = reject;
        }),
    );

    const { unmount } = render(<DashboardAuditLogs />);

    expect(screen.getByText('Loading activity…')).toBeInTheDocument();
    rejectLogs(new Error('temporary failure'));

    expect(await screen.findByText('Couldn’t load activity history right now.')).toBeInTheDocument();

    loadDashboardAuditLogs.mockResolvedValueOnce({
      guestRows: [],
      actionRows: [
        {
          id: 'action-log-4',
          action_area: 'photos',
          summary: 'Reviewed new uploads',
          actor_user_id: 'user-1',
          target_label: null,
          created_at: '2026-05-15T13:00:00.000Z',
        },
      ],
    });

    unmount();
    render(<DashboardAuditLogs />);

    await waitFor(() => expect(screen.getByText(/You · photos/)).toBeInTheDocument());
    expect(screen.queryByText('Couldn’t load activity history right now.')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading activity…')).not.toBeInTheDocument();
  });

  it('humanizes underscored wedding-tool areas instead of exposing raw area tokens', async () => {
    loadDashboardAuditLogs.mockResolvedValue({
      guestRows: [],
      actionRows: [
        {
          id: 'action-log-5',
          action_area: 'guest_photos',
          summary: 'Published recap',
          actor_user_id: 'user-1',
          target_label: 'Weekend recap',
          created_at: '2026-05-15T14:00:00.000Z',
        },
      ],
    });

    render(<DashboardAuditLogs />);

    expect(await screen.findByText(/You · guest photos/)).toBeInTheDocument();
    expect(screen.queryByText(/You · guest_photos/)).not.toBeInTheDocument();
  });
});
