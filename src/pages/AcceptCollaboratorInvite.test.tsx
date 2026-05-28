import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const inviteRowsQueue: Array<{ data: unknown; error: unknown }> = [];
const siteRowsQueue: Array<{ data: unknown; error?: unknown }> = [];
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => {
          if (table === 'wedding_site_collaborator_invites') {
            return Promise.resolve(inviteRowsQueue.shift() ?? { data: [], error: null });
          }
          if (table === 'wedding_sites') {
            return {
              maybeSingle: () => Promise.resolve(siteRowsQueue.shift() ?? { data: null, error: null }),
            };
          }
          throw new Error(`Unexpected table ${table}`);
        },
      }),
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    signOut: vi.fn(),
  }),
}));

vi.mock('../components/ui', () => ({
  Button: ({ children, fullWidth, ...props }: { fullWidth?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    void fullWidth;
    return <button {...props}>{children}</button>;
  },
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  Input: ({ label, helperText, ...props }: { label?: string; helperText?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label>
      <span>{label}</span>
      <input {...props} />
      {helperText ? <span>{helperText}</span> : null}
    </label>
  ),
}));

import AcceptCollaboratorInvite from './AcceptCollaboratorInvite';

describe('AcceptCollaboratorInvite guest-safe boundary', () => {
  beforeEach(() => {
    inviteRowsQueue.length = 0;
    siteRowsQueue.length = 0;
    navigateMock.mockReset();
  });

  it('shows a generic invalid-invite message without debug details when no invite row matches', async () => {
    inviteRowsQueue.push({ data: [], error: null });

    render(
      <MemoryRouter initialEntries={['/accept-collaborator-invite?token=bad-token']}>
        <AcceptCollaboratorInvite />
      </MemoryRouter>,
    );

    expect(await screen.findByText('This invite could not be found. Double-check the link or ask for a fresh invite.')).toBeInTheDocument();
    expect(screen.queryByText(/Debug:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rows=/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/inviteState=/i)).not.toBeInTheDocument();
  });

  it('does not render debug flags during a valid invite flow', async () => {
    inviteRowsQueue.push({
      data: [{
        id: 'invite-1',
        wedding_site_id: 'site-1',
        invite_email: 'planner@example.com',
        invite_name: 'Alex Planner',
        role: 'planner',
        status: 'pending',
        expires_at: '2099-05-01T00:00:00.000Z',
      }],
      error: null,
    });
    siteRowsQueue.push({
      data: {
        site_slug: 'alex-and-sam',
        couple_name_1: 'Alex',
        couple_name_2: 'Sam',
      },
    });

    render(
      <MemoryRouter initialEntries={['/accept-collaborator-invite?token=good-token']}>
        <AcceptCollaboratorInvite />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Invited for Planner access.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Debug:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/inviteState=/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/authLoading=/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/claiming=/i)).not.toBeInTheDocument();
    });
  });

  it('accepts the invite_token parameter for backward-compatible collaborator links', async () => {
    inviteRowsQueue.push({ data: [], error: null });

    render(
      <MemoryRouter initialEntries={['/accept-collaborator-invite?invite_token=compat-token']}>
        <AcceptCollaboratorInvite />
      </MemoryRouter>,
    );

    expect(await screen.findByText('This invite could not be found. Double-check the link or ask for a fresh invite.')).toBeInTheDocument();
  });

  it('keeps the accepted invite CTA anchored to the dashboard overview workspace', async () => {
    inviteRowsQueue.push({
      data: [{
        id: 'invite-1',
        wedding_site_id: 'site-1',
        invite_email: 'planner@example.com',
        invite_name: 'Alex Planner',
        role: 'planner',
        status: 'accepted',
        expires_at: '2099-05-01T00:00:00.000Z',
      }],
      error: null,
    });
    siteRowsQueue.push({
      data: {
        site_slug: 'alex-and-sam',
        couple_name_1: 'Alex',
        couple_name_2: 'Sam',
      },
    });

    render(
      <MemoryRouter initialEntries={['/accept-collaborator-invite?token=accepted-token']}>
        <AcceptCollaboratorInvite />
      </MemoryRouter>,
    );

    const button = await screen.findByRole('button', { name: 'Open dashboard overview' });
    expect(screen.queryByRole('button', { name: 'Go to dashboard' })).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
  });
});
