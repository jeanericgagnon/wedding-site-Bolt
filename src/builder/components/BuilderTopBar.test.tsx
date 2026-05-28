import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createEmptyBuilderProject } from '../../types/builder/project';
import { createEmptyWeddingData } from '../../types/weddingData';
import { createEmptyHistoryState } from '../../types/builder/history';
import { getBuilderV2Route } from '../../pages/builderCutoverRoute';
import type { BuilderState } from '../state/builderStore';

const {
  navigateMock,
  dispatchMock,
  stateRef,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  dispatchMock: vi.fn(),
  stateRef: {
    current: null as BuilderState | null,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: '/dashboard/builder-v1', search: '', hash: '' }),
  };
});

vi.mock('../state/builderStore', () => ({
  useBuilderContext: () => ({
    state: stateRef.current,
    dispatch: dispatchMock,
    activePage: stateRef.current?.project?.pages?.[0] ?? null,
    selectedSection: null,
  }),
}));

import { BuilderTopBar } from './BuilderTopBar';

describe('BuilderTopBar exit routes', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    dispatchMock.mockReset();

    const project = createEmptyBuilderProject('site-1', 'modern-luxe');
    const weddingData = createEmptyWeddingData();
    weddingData.couple.displayName = 'Alex & Jordan';

    stateRef.current = {
      project,
      weddingData,
      activePageId: project.pages[0]?.id ?? null,
      selectedSectionId: null,
      hoveredSectionId: null,
      mode: 'edit',
      previewViewport: 'desktop',
      isDirty: false,
      isSaving: false,
      isPublishing: false,
      history: createEmptyHistoryState(),
      mediaAssets: [],
      uploadQueue: [],
      templateGalleryOpen: false,
      mediaLibraryOpen: false,
      themePanelOpen: false,
      mediaPickerTargetSectionId: null,
      mediaPickerTargetField: null,
      mediaPickerTargetSettingKey: null,
      mediaPickerTargetBlockPath: null,
      mediaPickerTargetImageIndex: null,
      lastSavedAt: null,
      error: null,
    };
  });

  it('sends a clean builder exit to the overview workspace', () => {
    render(<BuilderTopBar onSave={() => undefined} onPublish={() => undefined} />);

    expect(screen.getByRole('button', { name: /Share checklist/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Back to Dashboard'));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
    expect(navigateMock).not.toHaveBeenCalledWith('/dashboard');
  });

  it('sends leave-anyway confirmation to the overview workspace when edits are dirty', () => {
    stateRef.current = {
      ...stateRef.current!,
      isDirty: true,
    };

    render(<BuilderTopBar onSave={() => undefined} onPublish={() => undefined} />);

    fireEvent.click(screen.getByTitle('Back to Dashboard'));
    expect(screen.getByText('Leave builder?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Leave anyway' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
    expect(navigateMock).not.toHaveBeenCalledWith('/dashboard');
  });

  it('opens the dashboard Builder V2 route from the upgrade review handoff', () => {
    render(<BuilderTopBar onSave={() => undefined} onPublish={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'V2 upgrade' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open working V2 copy' }));

    expect(navigateMock).toHaveBeenCalledWith(getBuilderV2Route());
    expect(navigateMock).not.toHaveBeenCalledWith('/builder-v2-lab');
  });

  it('uses share-ready publish labels for unpublished drafts', () => {
    render(<BuilderTopBar onSave={() => undefined} onPublish={() => undefined} />);

    expect(screen.getByTitle('Share with guests (⌘⇧P)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Launch check /i })).toBeInTheDocument();
  });

  it('shows the repaired checklist action for adding a first page', () => {
    const project = createEmptyBuilderProject('site-1', 'modern-luxe');
    project.pages = [];
    const weddingData = createEmptyWeddingData();
    weddingData.couple.displayName = 'Alex & Jordan';

    stateRef.current = {
      ...stateRef.current!,
      project,
      weddingData,
      activePageId: null,
    };

    render(<BuilderTopBar onSave={() => undefined} onPublish={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /Share checklist/i }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Add first page' }).at(-1)!);

    expect(dispatchMock).toHaveBeenCalled();
  });
});
