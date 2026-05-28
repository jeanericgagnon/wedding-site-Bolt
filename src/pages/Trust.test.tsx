import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { LinkProps } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const authState = {
  user: null as null | { id: string },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, ...props }: LinkProps) => <a href={to.toString()} {...props}>{children}</a>,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

import { Trust } from './Trust';

describe('Trust page draft-first CTA', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    authState.user = null;
  });

  it('sends anonymous visitors to signup from the trust CTA', () => {
    render(<Trust />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Start your draft' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/signup', {
      state: { returnTo: '/dashboard/builder-guide' },
    });
    expect(screen.getByRole('link', { name: 'See product tour' })).toHaveAttribute('href', '/product');
    fireEvent.click(screen.getAllByRole('button', { name: 'Start your draft' })[1]);
    expect(navigateMock).toHaveBeenCalledWith('/signup', {
      state: { returnTo: '/dashboard/builder-guide' },
    });
  });

  it('sends signed-in visitors to live trust workspaces from the trust CTA', () => {
    authState.user = { id: 'user-1' };
    render(<Trust />);

    fireEvent.click(screen.getByRole('button', { name: 'Review your draft' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder-guide');
    expect(screen.getByRole('link', { name: 'Open planner workspace' })).toHaveAttribute('href', '/dashboard/planning');
    fireEvent.click(screen.getByRole('button', { name: 'Open website editor guide' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder-guide');
    expect(screen.getByRole('button', { name: 'Open website editor guide' })).toHaveTextContent('Review editor options');
    fireEvent.click(screen.getByRole('button', { name: 'Open planner workspace' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/planning');
    fireEvent.click(screen.getByRole('button', { name: 'Open account settings' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/settings');
    fireEvent.click(screen.getByRole('button', { name: 'Open coordinator workspace' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/coordinator');
    fireEvent.click(screen.getByRole('button', { name: 'Open guest list' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/guests');
    fireEvent.click(screen.getByRole('button', { name: 'Open message drafts' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/messages');
    fireEvent.click(screen.getByRole('button', { name: 'Open RSVP board' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/rsvp-board');
    fireEvent.click(screen.getByRole('button', { name: 'Open your dashboard' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
  });

  it('keeps the trust matrix aligned with narrow product claims instead of broader launch theater', () => {
    render(<Trust />);

    expect(screen.getByText('dayof is not just a brochure page. The product is meant to carry the wedding website, RSVPs, guest management, review-before-send messaging, seating, travel details, and day-of coordination together, with limitations explained plainly instead of glossed over.')).toBeInTheDocument();
    expect(screen.getByText('Draft help stays reviewable')).toBeInTheDocument();
    expect(screen.getByText(/We should not imply external custom domains, advanced analytics, enterprise approval controls, or magical one-click automation unless those things are actually proven and available\./)).toBeInTheDocument();
    expect(screen.getByText('Texts stay locked until sender setup, consent, and delivery readiness are complete.')).toBeInTheDocument();
    expect(screen.getByText('Gift links editable')).toBeInTheDocument();
    expect(screen.getByText('Day-of support')).toBeInTheDocument();
    expect(screen.getByText(/Privacy and terms are published and reachable now\./)).toBeInTheDocument();
    expect(screen.queryByText('Texts stay locked until sender setup is complete.')).not.toBeInTheDocument();
  });
});
