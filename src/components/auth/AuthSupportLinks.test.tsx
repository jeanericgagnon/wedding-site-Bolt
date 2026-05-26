import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

import { AuthSupportLinks } from './AuthSupportLinks';

describe('AuthSupportLinks', () => {
  it('renders the support, legal, and refund links used on auth-adjacent pages', () => {
    render(<AuthSupportLinks />);

    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Refund' })).toHaveAttribute('href', '/refund');
  });
});
