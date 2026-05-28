import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createEmptyBuilderProject } from '../types/builder/project';
import { createEmptyWeddingData } from '../types/weddingData';

const {
  navigateMock,
  loadProjectMock,
  loadWeddingDataMock,
  saveUpgradeBridgeMock,
  maybeSingleMock,
  authState,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  loadProjectMock: vi.fn(),
  loadWeddingDataMock: vi.fn(),
  saveUpgradeBridgeMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  authState: {
    user: { id: 'user-1' },
    isDemoMode: false,
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

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

vi.mock('../builder/services/builderProjectService', () => ({
  builderProjectService: {
    loadProject: loadProjectMock,
    loadWeddingData: loadWeddingDataMock,
  },
}));

vi.mock('../builder-v2/upgradeBridge', () => ({
  saveBuilderV2UpgradeBridge: saveUpgradeBridgeMock,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import BuilderCutover from './BuilderCutover';
import {
  getBuilderGuideRoute,
  getBuilderV2Route,
  getBuilderV2IntentRoute,
  getBuilderLaunchChecklistRoute,
  getBuilderLaunchConfidenceRoute,
  getBuilderPhotoTipsRoute,
  getBuilderPolishRoute,
  getBuilderV2LabRoute,
  getLegacyBuilderRoute,
  hasBuilderV2Intent,
  hasLegacyBuilderIntent,
} from './builderCutoverRoute';

describe('BuilderCutover', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    loadProjectMock.mockReset();
    loadWeddingDataMock.mockReset();
    saveUpgradeBridgeMock.mockReset();
    maybeSingleMock.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('splits V2 launch intents from legacy-only fallback intents', () => {
    expect(hasBuilderV2Intent('?publishNow=1', '')).toBe(true);
    expect(hasBuilderV2Intent('', '#launch-confidence')).toBe(true);
    expect(hasLegacyBuilderIntent('?publishNow=1', '')).toBe(false);
    expect(hasLegacyBuilderIntent('?photoTips=1', '')).toBe(true);
    expect(hasLegacyBuilderIntent('', '#launch-confidence')).toBe(false);
    expect(hasLegacyBuilderIntent('', '#builder-concierge')).toBe(true);
    expect(hasLegacyBuilderIntent('', '')).toBe(false);
    expect(getBuilderGuideRoute()).toBe('/dashboard/builder-guide');
    expect(getBuilderV2Route()).toBe('/dashboard/builder');
    expect(getBuilderV2IntentRoute('?publishNow=1', '#launch-confidence')).toBe('/dashboard/builder?publishNow=1#launch-confidence');
    expect(getBuilderLaunchChecklistRoute()).toBe('/dashboard/builder?publishNow=1');
    expect(getBuilderPhotoTipsRoute()).toBe('/dashboard/builder-v1?photoTips=1');
    expect(getBuilderLaunchConfidenceRoute()).toBe('/dashboard/builder#launch-confidence');
    expect(getBuilderPolishRoute()).toBe('/dashboard/builder-v1#builder-concierge');
    expect(getBuilderV2LabRoute()).toBe('/builder-v2-lab');
    expect(getLegacyBuilderRoute('?publishNow=1', '#launch-confidence')).toBe('/dashboard/builder-v1?publishNow=1#launch-confidence');
  });

  it('forwards publish intents from the guide straight onto the Builder V2 primary route', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/builder-guide?publishNow=1']}>
        <BuilderCutover />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder?publishNow=1', { replace: true });
    });
    expect(loadProjectMock).not.toHaveBeenCalled();
  });

  it('still forwards legacy-only helper intents to the current editor route', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/builder-guide?photoTips=1']}>
        <BuilderCutover />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder-v1?photoTips=1', { replace: true });
    });
    expect(loadProjectMock).not.toHaveBeenCalled();
  });

  it('opens a working V2 copy with the current draft carried into the upgrade bridge', async () => {
    const project = createEmptyBuilderProject('site-1', 'modern-luxe');
    const weddingData = createEmptyWeddingData();
    weddingData.couple.partner1Name = 'Alex';
    weddingData.couple.partner2Name = 'Jordan';
    weddingData.couple.displayName = 'Alex & Jordan';

    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'site-1',
        couple_name_1: 'Alex',
        couple_name_2: 'Jordan',
      },
      error: null,
    });
    loadProjectMock.mockResolvedValue(project);
    loadWeddingDataMock.mockResolvedValue(weddingData);
    saveUpgradeBridgeMock.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/dashboard/builder-guide']}>
        <BuilderCutover />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Open Builder V2 working copy' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Builder V2 working copy' }));

    expect(saveUpgradeBridgeMock).toHaveBeenCalledWith({
      sourceName: 'Alex & Jordan builder upgrade',
      project,
      weddingData,
    });
    expect(navigateMock).toHaveBeenCalledWith(getBuilderV2Route());
  });

  it('keeps the legacy editor description honest about the workflows that still live there', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'site-1',
        couple_name_1: 'Alex',
        couple_name_2: 'Jordan',
      },
      error: null,
    });
    loadProjectMock.mockResolvedValue(createEmptyBuilderProject('site-1', 'modern-luxe'));
    loadWeddingDataMock.mockResolvedValue(createEmptyWeddingData());
    saveUpgradeBridgeMock.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/dashboard/builder-guide']}>
        <BuilderCutover />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/quick-edit, photo-tip, or polish workflows/i)).toBeInTheDocument();
    expect(screen.queryByText(/launch checklist/i)).not.toBeInTheDocument();
  });

  it('sends builder recovery back to the overview workspace instead of the generic dashboard route', async () => {
    maybeSingleMock.mockRejectedValue(new Error('Failed to fetch project data'));

    render(
      <MemoryRouter initialEntries={['/dashboard/builder-guide']}>
        <BuilderCutover />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Back to dashboard overview' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
    expect(navigateMock).not.toHaveBeenCalledWith('/dashboard');
  });
});
