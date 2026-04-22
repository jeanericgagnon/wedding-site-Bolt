import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const authState = {
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

    fireEvent.click(screen.getByRole('button', { name: 'Start your draft' }));

    expect(navigateMock).toHaveBeenCalledWith('/signup');
    expect(screen.getByRole('link', { name: 'See product tour' })).toHaveAttribute('href', '/product');
  });

  it('sends signed-in visitors to the builder from the trust CTA', () => {
    authState.user = { id: 'user-1' };
    render(<Trust />);

    fireEvent.click(screen.getByRole('button', { name: 'Review your draft' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');
    expect(screen.getByRole('link', { name: 'Open your builder' })).toHaveAttribute('href', '/dashboard/builder');
    fireEvent.click(screen.getByRole('button', { name: 'Open account settings' }));
    expect(navigateMock).toHaveBeenCalledWith('/settings');
  });
});
