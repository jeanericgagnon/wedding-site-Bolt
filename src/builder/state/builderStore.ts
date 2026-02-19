import { createContext, useContext } from 'react';
import { BuilderProject, BuilderPage } from '../../types/builder/project';
import { BuilderSectionInstance, BuilderSectionType } from '../../types/builder/section';
import { BuilderHistoryState, createEmptyHistoryState } from '../../types/builder/history';
import { BuilderMediaAsset, MediaUploadProgress } from '../../types/builder/media';
import { WeddingDataV1 } from '../../types/weddingData';

export type BuilderMode = 'edit' | 'preview';

export interface BuilderState {
  project: BuilderProject | null;
  weddingData: WeddingDataV1 | null;
  activePageId: string | null;
  selectedSectionId: string | null;
  hoveredSectionId: string | null;
  mode: BuilderMode;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  history: BuilderHistoryState;
  mediaAssets: BuilderMediaAsset[];
  uploadQueue: MediaUploadProgress[];
  templateGalleryOpen: boolean;
  mediaLibraryOpen: boolean;
  themePanelOpen: boolean;
  mediaPickerTargetSectionId: string | null;
  mediaPickerTargetField: 'settings' | 'sideImage' | 'customBlock' | null;
  mediaPickerTargetBlockPath: { blockId: string; columnIndex?: number; columnBlockId?: string } | null;
  mediaPickerTargetImageIndex: number | null;
  lastSavedAt: string | null;
  error: string | null;
}

export const initialBuilderState: BuilderState = {
  project: null,
  weddingData: null,
  activePageId: null,
  selectedSectionId: null,
  hoveredSectionId: null,
  mode: 'edit',
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
  mediaPickerTargetBlockPath: null,
  mediaPickerTargetImageIndex: null,
  lastSavedAt: null,
  error: null,
};

export interface BuilderContextValue {
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  activePage: BuilderPage | null;
  selectedSection: BuilderSectionInstance | null;
}

export const BuilderContext = createContext<BuilderContextValue>({
  state: initialBuilderState,
  dispatch: () => undefined,
  activePage: null,
  selectedSection: null,
});

export function useBuilderContext(): BuilderContextValue {
  return useContext(BuilderContext);
}

export type BuilderAction =
  | { type: 'LOAD_PROJECT'; payload: BuilderProject }
  | { type: 'SET_WEDDING_DATA'; payload: WeddingDataV1 }
  | { type: 'SET_ACTIVE_PAGE'; payload: string }
  | { type: 'SELECT_SECTION'; payload: string | null }
  | { type: 'HOVER_SECTION'; payload: string | null }
  | { type: 'SET_MODE'; payload: BuilderMode }
  | { type: 'ADD_SECTION'; payload: { pageId: string; section: BuilderSectionInstance; insertAfterIndex?: number } }
  | { type: 'REMOVE_SECTION'; payload: { pageId: string; sectionId: string } }
  | { type: 'REORDER_SECTIONS'; payload: { pageId: string; orderedIds: string[] } }
  | { type: 'UPDATE_SECTION'; payload: { pageId: string; sectionId: string; patch: Partial<BuilderSectionInstance> } }
  | { type: 'TOGGLE_SECTION_VISIBILITY'; payload: { pageId: string; sectionId: string } }
  | { type: 'DUPLICATE_SECTION'; payload: { pageId: string; sectionId: string } }
  | { type: 'APPLY_TEMPLATE'; payload: { templateId: string; sections: BuilderSectionInstance[] } }
  | { type: 'APPLY_THEME'; payload: string }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_PUBLISHING'; payload: boolean }
  | { type: 'MARK_SAVED'; payload: string }
  | { type: 'MARK_PUBLISHED'; payload: { version: number; publishedAt: string } }
  | { type: 'SET_MEDIA_ASSETS'; payload: BuilderMediaAsset[] }
  | { type: 'ADD_MEDIA_ASSET'; payload: BuilderMediaAsset }
  | { type: 'REMOVE_MEDIA_ASSET'; payload: string }
  | { type: 'UPDATE_UPLOAD_QUEUE'; payload: MediaUploadProgress }
  | { type: 'REMOVE_FROM_UPLOAD_QUEUE'; payload: string }
  | { type: 'OPEN_TEMPLATE_GALLERY' }
  | { type: 'CLOSE_TEMPLATE_GALLERY' }
  | { type: 'OPEN_MEDIA_LIBRARY'; payload?: { sectionId?: string; targetField?: 'settings' | 'sideImage' | 'customBlock' | 'imageArray'; blockPath?: { blockId: string; columnIndex?: number; columnBlockId?: string }; imageIndex?: number } }
  | { type: 'UPDATE_CUSTOM_BLOCK'; payload: { pageId: string; sectionId: string; blockId: string; patch: Record<string, unknown>; columnIndex?: number; columnBlockId?: string } }
  | { type: 'CLOSE_MEDIA_LIBRARY' }
  | { type: 'OPEN_THEME_PANEL' }
  | { type: 'CLOSE_THEME_PANEL' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'APPLY_THEME_TOKENS'; payload: { themeId: string; tokens: import('../../lib/themePresets').ThemeTokens } }
  | { type: 'ADD_SECTION_TYPE'; payload: { pageId: string; sectionType: BuilderSectionType; insertAfterIndex?: number; variant?: string } }
  | { type: 'UNDO' }
  | { type: 'REDO' };
