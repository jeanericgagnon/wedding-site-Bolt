import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { LinkProps } from 'react-router-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { templateCatalog } from '../builder/constants/templateCatalog';
import { clearSetupDraft } from '../lib/setupDraft';
import TemplateDetail from './TemplateDetail';

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
    useParams: () => ({ templateId: templateCatalog[0]?.id ?? 'modern-romance' }),
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

describe('TemplateDetail truth copy', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    authState.user = null;
    window.localStorage.clear();
    clearSetupDraft();
  });

  it('keeps template decision copy framed as preview and sharing, not ready-made live promises', () => {
    const templateId = templateCatalog[0]?.id ?? 'modern-romance';

    render(
      <MemoryRouter initialEntries={[`/templates/${templateId}`]}>
        <Routes>
          <Route path="/templates/:templateId" element={<TemplateDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Website + RSVP + Registry + Day-of sections')).toBeInTheDocument();
    expect(screen.getByText('Share when you’re ready')).toBeInTheDocument();
    expect(screen.getByTitle(/website preview/i)).toBeInTheDocument();
    expect(screen.getByText('Share when ready')).toBeInTheDocument();
    expect(screen.queryByText(/Day-of ready/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/live preview/i)).not.toBeInTheDocument();
  });

  it('keeps signed-out template apply actions on setup', () => {
    render(
      <MemoryRouter>
        <TemplateDetail />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Use this template' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/setup/names');
  });

  it('routes signed-in template apply actions into the builder', () => {
    authState.user = { id: 'user-1' };

    render(
      <MemoryRouter>
        <TemplateDetail />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('button', { name: 'Apply in builder' }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Apply in builder' })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder-guide');
  });
});
