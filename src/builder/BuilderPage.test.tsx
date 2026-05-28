import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  navigateMock,
  maybeSingleMock,
  loadProjectMock,
  loadWeddingDataMock,
  authState,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  loadProjectMock: vi.fn(),
  loadWeddingDataMock: vi.fn(),
  authState: {
    user: { id: 'user-1' },
    isDemoMode: false,
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
    })),
  },
}));

vi.mock('./services/builderProjectService', () => ({
  builderProjectService: {
    loadProject: loadProjectMock,
    loadWeddingData: loadWeddingDataMock,
  },
}));

vi.mock('./services/publishService', () => ({
  publishService: {
    saveDraft: vi.fn(),
    publish: vi.fn(),
  },
}));

vi.mock('./components/BuilderShell', () => ({
  BuilderShell: () => <div>Builder shell</div>,
}));

import BuilderPage from './BuilderPage';

describe('BuilderPage recovery routes', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    maybeSingleMock.mockReset();
    loadProjectMock.mockReset();
    loadWeddingDataMock.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('uses the overview workspace as the no-site recovery target', async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/builder-v1']}>
        <BuilderPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(maybeSingleMock).toHaveBeenCalled();
    });
    expect(await screen.findByText('No website yet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard overview' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
    expect(navigateMock).not.toHaveBeenCalledWith('/dashboard');
  });

  it('uses the overview workspace as the error recovery target', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'site-1',
        couple_name_1: 'Alex',
        couple_name_2: 'Jordan',
      },
      error: null,
    });
    loadProjectMock.mockRejectedValue(new Error('Failed to fetch project data'));
    loadWeddingDataMock.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/dashboard/builder-v1']}>
        <BuilderPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(loadProjectMock).toHaveBeenCalled();
    });
    expect(await screen.findByText('Builder connection interrupted')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard overview' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
    expect(navigateMock).not.toHaveBeenCalledWith('/dashboard');
  });
});
