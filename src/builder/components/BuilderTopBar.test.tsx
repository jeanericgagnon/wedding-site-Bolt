import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createEmptyBuilderProject } from '../../types/builder/project';
import { createEmptyWeddingData } from '../../types/weddingData';
import { createEmptyHistoryState } from '../../types/builder/history';
import type { BuilderState } from '../state/builderStore';

const {
  navigateMock,
  stateRef,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
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
    dispatch: vi.fn(),
    activePage: stateRef.current?.project?.pages?.[0] ?? null,
    selectedSection: null,
  }),
}));

import { BuilderTopBar } from './BuilderTopBar';

describe('BuilderTopBar exit routes', () => {
  beforeEach(() => {
    navigateMock.mockReset();

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

    fireEvent.click(screen.getByTitle('Back to Dashboard'));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
    expect(navigateMock).not.toHaveBeenCalledWith('/dashboard');
  });

  it('sends leave-anyway confirmation to the overview workspace when edits are dirty', () => {
    stateRef.current = {
      ...stateRef.current,
      isDirty: true,
    };

    render(<BuilderTopBar onSave={() => undefined} onPublish={() => undefined} />);

    fireEvent.click(screen.getByTitle('Back to Dashboard'));
    expect(screen.getByText('Leave builder?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Leave anyway' }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview');
    expect(navigateMock).not.toHaveBeenCalledWith('/dashboard');
  });
});
