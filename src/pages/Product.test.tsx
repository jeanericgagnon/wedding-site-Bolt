import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_MODE } from '../config/env';

const navigateMock = vi.fn();
const authState = {
  signIn: vi.fn(),
  user: null as null | { id: string },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: React.PropsWithChildren<{ to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
      <a href={to} {...props}>{children}</a>
    ),
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
  HeroReveal: ({ children }: React.PropsWithChildren) => <>{children}</>,
  SlideReveal: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import { Product } from './Product';

describe('Product starter draft truth', () => {
  beforeEach(() => {
    window.localStorage.clear();
    navigateMock.mockReset();
    authState.user = null;
  });

  it('keeps the launch step framed as a starter draft that is reviewed before sharing with guests', () => {
    render(<Product />);

    expect(screen.getAllByText('Build a site draft you’ll be proud to share').length).toBeGreaterThan(0);
    expect(screen.getByText('Template: Modern Luxe • Website: starter draft is ready to review before sharing it with guests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review draft privacy + share settings' })).toBeInTheDocument();
    expect(screen.queryByText(/launch settings/i)).not.toBeInTheDocument();
  });

  it('keeps messaging framed as a review-before-send step instead of a fire-and-forget claim', () => {
    render(<Product />);

    fireEvent.click(screen.getByRole('button', { name: /message everyone/i }));

    expect(screen.getByText('Review the right update before sending it to the right group.')).toBeInTheDocument();
    expect(screen.getByText('Stop copy/pasting from spreadsheets to email tools while keeping send decisions in your hands.')).toBeInTheDocument();
    expect(screen.getByText('Draft prepared for review')).toBeInTheDocument();
    expect(screen.getByText('Keep guests synced with review-before-send drafts instead of duct tape.')).toBeInTheDocument();
  });

  it('replaces the fake planner invite button with a real collaboration settings path', () => {
    authState.user = { id: 'user-1' };
    render(<Product />);

    fireEvent.click(screen.getByRole('button', { name: 'Step 6 Execute day-of' }));
    expect(screen.getAllByRole('button', { name: 'Open collaboration settings' }).length).toBe(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Open collaboration settings' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/settings');
    expect(screen.queryByRole('button', { name: 'Invite planner' })).not.toBeInTheDocument();
  });

  it('keeps public experience controls framed around privacy and guest access instead of launch theater', () => {
    render(<Product />);

    expect(screen.getByText('Privacy + guest-access controls that match the story')).toBeInTheDocument();
    expect(screen.queryByText('Launch/privacy controls that match the story')).not.toBeInTheDocument();
  });

  it('keeps product-level messaging summaries aligned with review-before-send and sender-ready texting truth', () => {
    render(<Product />);

    expect(screen.getByText('Review-before-send guest messaging')).toBeInTheDocument();
    expect(screen.getByText('Handle core wedding messaging with review-before-send control instead of bouncing between spreadsheets and email tools')).toBeInTheDocument();
    expect(screen.getByText('Drafts, scheduled sends, and message history are there with review-before-send control.')).toBeInTheDocument();
    expect(screen.getByText('Texts stay locked until sender setup, consent, and delivery readiness are complete.')).toBeInTheDocument();
    expect(screen.queryByText('Guest messaging')).not.toBeInTheDocument();
    expect(screen.queryByText('Handle core wedding messaging without bouncing between spreadsheets and email tools')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft/schedule/history surface is there.')).not.toBeInTheDocument();
    expect(screen.queryByText('Texts stay locked until sender setup is complete.')).not.toBeInTheDocument();
  });

  it('keeps the launch story framed around a starter draft instead of a fully launched site', () => {
    render(<Product />);

    expect(screen.getByText((_, node) => node?.textContent === 'Archive mode, photo return paths, and anniversary-style memories are real product direction. They are not the current bar DayOf should ask couples to trust first. The launch story is starter draft + guest ops + calm execution.')).toBeInTheDocument();
    expect(screen.queryByText('The launch story is website + guest ops + calm execution.')).not.toBeInTheDocument();
  });

  it('keeps primary product signup CTAs framed around starting a draft instead of implying a finished site', () => {
    render(<Product />);

    expect(screen.getAllByRole('button', { name: 'Start your draft' }).length).toBe(2);
    expect(screen.queryByRole('button', { name: 'Start your site' })).not.toBeInTheDocument();
  });

  it('sends anonymous visitors to signup when they review draft privacy and share settings', () => {
    render(<Product />);

    fireEvent.click(screen.getByRole('button', { name: 'Review draft privacy + share settings' }));

    expect(navigateMock).toHaveBeenCalledWith('/signup');
  });

  it('sends signed-in users straight to the builder when they review draft privacy and share settings', () => {
    authState.user = { id: 'user-1' };
    render(<Product />);

    fireEvent.click(screen.getByRole('button', { name: 'Review draft privacy + share settings' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');
  });

  it('personalizes product draft-start CTAs for signed-in users', () => {
    authState.user = { id: 'user-1' };
    render(<Product />);

    expect(screen.getAllByRole('button', { name: 'Review your draft' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Start your draft' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Open your builder' }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ready to keep shaping your (draft|wedding)\?/i)).toBeInTheDocument();
    expect(screen.queryByText('Want to see the full flow in action?')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Open your builder' })[0]).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try full demo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open your dashboard' })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Review your draft' })[0]);
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');

    fireEvent.click(screen.getAllByRole('button', { name: 'Open your builder' })[0]);
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');
    fireEvent.click(screen.getByRole('button', { name: 'Open guest list' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/guests');
    fireEvent.click(screen.getByRole('button', { name: 'Open message drafts' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/messages');
    fireEvent.click(screen.getByRole('button', { name: 'Open RSVP board' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/rsvp-board');
  });

  it('keeps the product demo banner in demo mode for signed-out visitors', () => {
    render(<Product />);

    if (DEMO_MODE) {
      expect(screen.getByText('Want to see the full flow in action?')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Try product demo' }).length).toBe(2);
      expect(screen.getByRole('button', { name: 'Try full demo' })).toBeInTheDocument();
    } else {
      expect(screen.queryByText('Want to see the full flow in action?')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Try product demo' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Try full demo' })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Open your dashboard' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See collaboration trust notes' })).toHaveAttribute('href', '/trust');
    expect(screen.getByRole('link', { name: 'browse templates' })).toHaveAttribute('href', '/templates');
  });

  it('gives signed-in couples a direct collaboration settings shortcut', () => {
    authState.user = { id: 'user-1' };
    render(<Product />);

    fireEvent.click(screen.getByRole('button', { name: 'Open collaboration settings' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/settings');
  });

  it('gives signed-in couples a planner shortcut inside the command preview', () => {
    authState.user = { id: 'user-1' };
    render(<Product />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Open planner workspace' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/planning');
  });

  it('gives signed-in couples a direct planner workspace shortcut', () => {
    authState.user = { id: 'user-1' };
    render(<Product />);

    fireEvent.click(screen.getByRole('button', { name: 'Open planner workspace' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/planning');
  });

  it('gives signed-in couples a direct coordinator workspace shortcut', () => {
    authState.user = { id: 'user-1' };
    render(<Product />);

    fireEvent.click(screen.getByRole('button', { name: 'Open coordinator workspace' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/coordinator');
  });
});
