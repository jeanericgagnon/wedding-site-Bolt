import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ signIn: vi.fn() }),
}));

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

vi.mock('../components/marketing/Reveal', () => ({
  HeroReveal: ({ children }: any) => <>{children}</>,
  SlideReveal: ({ children }: any) => <>{children}</>,
}));

import { Product } from './Product';

describe('Product starter draft truth', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
});
