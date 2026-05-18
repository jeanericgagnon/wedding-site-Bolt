import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const authState = {
  signIn: vi.fn(),
  user: null as null | { id: string },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
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
  Reveal: ({ children }: any) => <>{children}</>,
  HeroReveal: ({ children }: any) => <>{children}</>,
  SlideReveal: ({ children }: any) => <>{children}</>,
}));

import { Home } from './Home';

describe('Home draft-first CTAs', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    authState.user = null;
  });

  it('sends anonymous visitors to signup when they start their draft', () => {
    render(<Home />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Start your wedding site draft' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/signup');
    expect(screen.getAllByRole('button', { name: 'Start your wedding site draft' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /a calmer wedding operating system/i })).toBeInTheDocument();
    expect(screen.getByText(/most wedding websites stop at publish/i)).toBeInTheDocument();
    const anonymousFeatureLinks = screen.getAllByRole('link', { name: 'Explore this feature' });
    expect(anonymousFeatureLinks.find((link) => link.getAttribute('href') === '/product')).toBeTruthy();
    expect(anonymousFeatureLinks.find((link) => link.getAttribute('href') === '/templates')).toBeTruthy();
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

    fireEvent.click(screen.getAllByRole('button', { name: 'Continue your wedding site' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');
    expect(screen.getAllByRole('button', { name: 'Continue your wedding site' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Edit your site' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Continue planning' })).toHaveAttribute('href', '/dashboard/planning');
    expect(screen.getByRole('button', { name: 'Manage guests' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guest messages' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manage guests' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/guests');
    fireEvent.click(screen.getByRole('button', { name: 'Guest messages' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/messages');
    fireEvent.click(screen.getAllByRole('link', { name: 'Edit your site' })[0]);
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');
    expect(screen.getAllByRole('link', { name: 'Edit your site' })[0]).toHaveAttribute('href', '/dashboard/builder');
    const signedInFeatureLinks = screen.getAllByRole('link', { name: 'Explore this feature' });
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/guests')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/rsvp-board')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/messages')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/coordinator')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/itinerary')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/registry')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/seating')).toBeTruthy();
    expect(signedInFeatureLinks.find((link) => link.getAttribute('href') === '/dashboard/photos')).toBeTruthy();
  });
});
