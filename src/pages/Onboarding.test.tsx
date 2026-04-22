import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(''), vi.fn()],
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isDemoMode: false }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

vi.mock('../components/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Input: (props: any) => <input {...props} />,
  Textarea: (props: any) => <textarea {...props} />,
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

import { Onboarding } from './Onboarding';

describe('Onboarding starter draft wording truth', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('frames quick setup as a starter draft that still needs dashboard refinement before publish', () => {
    render(<Onboarding />);

    expect(screen.getByText('Starter draft only (fastest)')).toBeInTheDocument();
    expect(screen.getByText('Answer a few questions and we will generate a strong starting draft. You can keep refining it in the dashboard before you decide to publish.')).toBeInTheDocument();
    expect(screen.queryByText(/ready to publish/i)).not.toBeInTheDocument();
  });
});
