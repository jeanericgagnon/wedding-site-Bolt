import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardErrorLogs } from './ErrorLogs';

const authState = {
  user: { id: 'user-1' },
  loading: false,
  isDemoMode: false,
};

const isErrorLogAdmin = vi.fn();
const loadDashboardErrorLogs = vi.fn();
const copyTextOrDownload = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('../../components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../lib/copyText', () => ({
  copyTextOrDownload: (...args: unknown[]) => copyTextOrDownload(...args),
}));

vi.mock('./errorLogService', () => ({
  isErrorLogAdmin: (...args: unknown[]) => isErrorLogAdmin(...args),
  loadDashboardErrorLogs: (...args: unknown[]) => loadDashboardErrorLogs(...args),
}));

describe('DashboardErrorLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isErrorLogAdmin.mockResolvedValue(true);
    loadDashboardErrorLogs.mockResolvedValue([
      {
        id: 'error-1',
        created_at: '2026-05-18T12:00:00.000Z',
        severity: 'error',
        source: 'planner',
        route: '/dashboard/planning',
        message: 'Planner save failed',
        fingerprint: 'planner-save-failed',
      },
    ]);
  });

  it('shows a retry message when copying an error-log value fails', async () => {
    copyTextOrDownload.mockRejectedValueOnce(new Error('copy failed'));

    render(<DashboardErrorLogs />);

    expect(await screen.findByText('Admin · Error Logs')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /details/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy fingerprint/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t copy that value right now.');
    });
    expect(screen.getByRole('button', { name: /retry fingerprint/i })).toBeInTheDocument();
    expect(copyTextOrDownload).toHaveBeenCalledTimes(1);
  });

  it('keeps access in loading state while admin verification is pending', () => {
    isErrorLogAdmin.mockReturnValueOnce(new Promise(() => {}));

    render(<DashboardErrorLogs />);

    expect(screen.getByText('Checking access…')).toBeInTheDocument();
    expect(screen.queryByText('Restricted')).not.toBeInTheDocument();
    expect(screen.queryByText('No recent errors found.')).not.toBeInTheDocument();
  });

  it('ignores stale admin verification responses after the signed-in user changes', async () => {
    let resolveFirstAdmin: (value: boolean) => void = () => {};
    isErrorLogAdmin
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirstAdmin = resolve; }))
      .mockResolvedValueOnce(false);

    const { rerender } = render(
      <MemoryRouter>
        <DashboardErrorLogs />
      </MemoryRouter>,
    );

    expect(screen.getByText('Checking access…')).toBeInTheDocument();
    expect(isErrorLogAdmin).toHaveBeenCalledWith('user-1');

    authState.user = { id: 'user-2' };
    rerender(
      <MemoryRouter>
        <DashboardErrorLogs />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Restricted')).toBeInTheDocument();
    expect(isErrorLogAdmin).toHaveBeenCalledWith('user-2');

    await act(async () => {
      resolveFirstAdmin(true);
    });

    await waitFor(() => expect(screen.getByText('Restricted')).toBeInTheDocument());
    expect(screen.queryByText('Admin · Error Logs')).not.toBeInTheDocument();
    expect(loadDashboardErrorLogs).not.toHaveBeenCalled();
    authState.user = { id: 'user-1' };
  });

  it('shows downloaded fallback labels when clipboard copy falls back', async () => {
    copyTextOrDownload.mockResolvedValueOnce('downloaded');

    render(<DashboardErrorLogs />);

    expect(await screen.findByText('Admin · Error Logs')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /details/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy fingerprint/i }));

    expect(await screen.findByRole('button', { name: /downloaded fingerprint/i })).toBeInTheDocument();
  });

  it('ignores stale copy completions after access resets', async () => {
    let finishCopy: ((value: 'copied') => void) | undefined;
    copyTextOrDownload.mockReturnValueOnce(new Promise<'copied'>((resolve) => {
      finishCopy = resolve;
    }));

    const { rerender } = render(
      <MemoryRouter>
        <DashboardErrorLogs />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Admin · Error Logs')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /details/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy fingerprint/i }));

    authState.isDemoMode = true;
    rerender(
      <MemoryRouter>
        <DashboardErrorLogs />
      </MemoryRouter>,
    );

    await act(async () => {
      finishCopy?.('copied');
    });

    expect(screen.queryByRole('button', { name: /copied fingerprint/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    authState.isDemoMode = false;
  });
});
