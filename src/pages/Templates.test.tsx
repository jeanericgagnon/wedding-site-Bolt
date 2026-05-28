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

import { clearSetupDraft, selectSetupDraftTemplate } from '../lib/setupDraft';
import { Templates } from './Templates';

describe('Templates CTA routing', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    authState.user = null;
    window.localStorage.clear();
    clearSetupDraft();
  });

  it('keeps signed-out template actions on the setup path', () => {
    selectSetupDraftTemplate('modern-luxe');

    render(<Templates />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue setup' }));
    expect(navigateMock).toHaveBeenCalledWith('/setup/names');

    fireEvent.click(screen.getAllByRole('button', { name: 'Start with this' })[0]);
    expect(navigateMock).toHaveBeenLastCalledWith('/setup/names');
  });

  it('routes signed-in template actions into the builder instead of setup loops', () => {
    authState.user = { id: 'user-1' };
    selectSetupDraftTemplate('modern-luxe');

    render(<Templates />);

    fireEvent.click(screen.getByRole('button', { name: 'Open website builder' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder-guide');

    fireEvent.click(screen.getAllByRole('button', { name: 'Apply in builder' })[0]);
    expect(navigateMock).toHaveBeenLastCalledWith('/dashboard/builder-guide');
  });
});
