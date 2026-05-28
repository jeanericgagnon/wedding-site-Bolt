import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LinkProps } from 'react-router-dom';

const navigateMock = vi.fn();
const authState = {
  signIn: vi.fn(),
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

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

vi.mock('../components/marketing/Reveal', () => ({
  Reveal: ({ children }: React.PropsWithChildren) => <>{children}</>,
  HeroReveal: ({ children }: React.PropsWithChildren) => <>{children}</>,
  SlideReveal: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import { Home } from './Home';

describe('Home draft-first CTAs', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    authState.user = null;
  });

  it('sends anonymous visitors to signup when they start their draft', () => {
    render(<Home />);

    expect(screen.getByText('Travel, schedule, photo sharing, and latest updates remain easy to find from a phone.')).toBeInTheDocument();
    expect(screen.getByText('Build the wedding site, manage the guest list, run RSVP and guest updates, open photo sharing, and hand the day-of details to the right people from one place.')).toBeInTheDocument();
    expect(screen.getByText('Households, RSVP details, review-before-send updates, seating, and check-in stay connected.')).toBeInTheDocument();
    expect(screen.getByText('$49 flat fee for two years. Auto-renew stays off by default. You get the website, RSVP, guests, review-before-send messaging, seating, registry, itinerary, photo sharing, and day-of coordination in one place.')).toBeInTheDocument();
    expect(screen.getByText('Guest list, RSVP, message drafts, and seating')).toBeInTheDocument();
    expect(screen.getByText('Photo sharing, guestbook, registry, itinerary, and coordinator tools')).toBeInTheDocument();
    expect(screen.queryByText('Build the wedding site, manage the guest list, run RSVP and messages, collect photos, and hand the day-of details to the right people from one place.')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Start your wedding site draft' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/signup', {
      state: { returnTo: '/dashboard/builder' },
    });
    expect(screen.getAllByRole('button', { name: 'Start your wedding site draft' }).length).toBeGreaterThan(0);
    const anonymousFeatureLinks = screen.getAllByRole('link', { name: 'Explore this feature' });
    expect(anonymousFeatureLinks.find((link) => link.getAttribute('href') === '/product')).toBeTruthy();
    expect(anonymousFeatureLinks.find((link) => link.getAttribute('href') === '/features/guests')).toBeTruthy();
    expect(anonymousFeatureLinks.find((link) => link.getAttribute('href') === '/features/rsvp')).toBeTruthy();
    expect(anonymousFeatureLinks.find((link) => link.getAttribute('href') === '/features/messaging')).toBeTruthy();
    expect(anonymousFeatureLinks.find((link) => link.getAttribute('href') === '/features/travel')).toBeTruthy();
    expect(anonymousFeatureLinks.find((link) => link.getAttribute('href') === '/features/registry')).toBeTruthy();
    expect(anonymousFeatureLinks.find((link) => link.getAttribute('href') === '/features/seating')).toBeTruthy();
  });

  it('sends signed-in users straight to the builder when they start their draft', () => {
    authState.user = { id: 'user-1' };
    render(<Home />);

    expect(screen.getByText('Travel, schedule, photo sharing, and latest updates remain easy to find from a phone.')).toBeInTheDocument();
    expect(screen.getByText('Build the wedding site, manage the guest list, run RSVP and guest updates, open photo sharing, and hand the day-of details to the right people from one place.')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Review your wedding site draft' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');
    expect(screen.getAllByRole('button', { name: 'Review your wedding site draft' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Open website editor guide' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Open planner workspace' })).toHaveAttribute('href', '/dashboard/planning');
    expect(screen.getByRole('button', { name: 'Open your guest list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open message drafts' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open your guest list' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/guests');
    fireEvent.click(screen.getByRole('button', { name: 'Open message drafts' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/messages');
    fireEvent.click(screen.getAllByRole('link', { name: 'Open website editor guide' })[0]);
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');
    expect(screen.getByRole('link', { name: 'Open website editor guide' })).toHaveTextContent('Review editor options');
    expect(screen.getAllByRole('link', { name: 'Open website editor guide' })[0]).toHaveAttribute('href', '/dashboard/builder');
    const signedInFeatureLinks = screen.getAllByRole('link', { name: 'Explore this feature' });
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/guests')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/rsvp-board')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/messages')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/planning')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/coordinator')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/itinerary')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/registry')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/seating')).toBeTruthy();
  });
});
