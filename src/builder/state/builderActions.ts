import { BuilderAction } from './builderStore';
import { BuilderSectionInstance, BuilderSectionType } from '../../types/builder/section';
import { BuilderProject } from '../../types/builder/project';
import { BuilderMediaAsset } from '../../types/builder/media';
import { WeddingDataV1 } from '../../types/weddingData';
import { ThemeTokens } from '../../lib/themePresets';

export const builderActions = {
  loadProject: (project: BuilderProject): BuilderAction => ({ type: 'LOAD_PROJECT', payload: project }),
  setWeddingData: (data: WeddingDataV1): BuilderAction => ({ type: 'SET_WEDDING_DATA', payload: data }),
  setActivePage: (pageId: string): BuilderAction => ({ type: 'SET_ACTIVE_PAGE', payload: pageId }),
  selectSection: (sectionId: string | null): BuilderAction => ({ type: 'SELECT_SECTION', payload: sectionId }),
  hoverSection: (sectionId: string | null): BuilderAction => ({ type: 'HOVER_SECTION', payload: sectionId }),
  setMode: (mode: 'edit' | 'preview'): BuilderAction => ({ type: 'SET_MODE', payload: mode }),

  addSection: (pageId: string, section: BuilderSectionInstance, insertAfterIndex?: number): BuilderAction => ({
    type: 'ADD_SECTION',
    payload: { pageId, section, insertAfterIndex },
  }),

  addSectionByType: (pageId: string, sectionType: BuilderSectionType, insertAfterIndex?: number, variant?: string): BuilderAction => ({
    type: 'ADD_SECTION_TYPE',
    payload: { pageId, sectionType, insertAfterIndex, variant },
  }),

  removeSection: (pageId: string, sectionId: string): BuilderAction => ({
    type: 'REMOVE_SECTION',
    payload: { pageId, sectionId },
  }),

  duplicateSection: (pageId: string, sectionId: string): BuilderAction => ({
    type: 'DUPLICATE_SECTION',
    payload: { pageId, sectionId },
  }),

  reorderSections: (pageId: string, orderedIds: string[]): BuilderAction => ({
    type: 'REORDER_SECTIONS',
    payload: { pageId, orderedIds },
  }),

  updateSection: (pageId: string, sectionId: string, patch: Partial<BuilderSectionInstance>): BuilderAction => ({
    type: 'UPDATE_SECTION',
    payload: { pageId, sectionId, patch },
  }),

  toggleSectionVisibility: (pageId: string, sectionId: string): BuilderAction => ({
    type: 'TOGGLE_SECTION_VISIBILITY',
    payload: { pageId, sectionId },
  }),

  applyTemplate: (templateId: string, sections: BuilderSectionInstance[]): BuilderAction => ({
    type: 'APPLY_TEMPLATE',
    payload: { templateId, sections },
  }),

  applyTheme: (themeId: string): BuilderAction => ({ type: 'APPLY_THEME', payload: themeId }),
  applyThemeTokens: (themeId: string, tokens: ThemeTokens): BuilderAction => ({ type: 'APPLY_THEME_TOKENS', payload: { themeId, tokens } }),

  undo: (): BuilderAction => ({ type: 'UNDO' }),
  redo: (): BuilderAction => ({ type: 'REDO' }),

  openTemplateGallery: (): BuilderAction => ({ type: 'OPEN_TEMPLATE_GALLERY' }),
  closeTemplateGallery: (): BuilderAction => ({ type: 'CLOSE_TEMPLATE_GALLERY' }),

  openMediaLibrary: (targetSectionId?: string): BuilderAction => ({
    type: 'OPEN_MEDIA_LIBRARY',
    payload: targetSectionId ? { sectionId: targetSectionId, targetField: 'settings' } : undefined,
  }),
  openSideImagePicker: (sectionId: string): BuilderAction => ({
    type: 'OPEN_MEDIA_LIBRARY',
    payload: { sectionId, targetField: 'sideImage' },
  }),
  openCustomBlockImagePicker: (
    sectionId: string,
    blockPath: { blockId: string; columnIndex?: number; columnBlockId?: string }
  ): BuilderAction => ({
    type: 'OPEN_MEDIA_LIBRARY',
    payload: { sectionId, targetField: 'customBlock', blockPath },
  }),
  updateCustomBlock: (
    pageId: string,
    sectionId: string,
    blockId: string,
    patch: Record<string, unknown>,
    columnIndex?: number,
    columnBlockId?: string
  ): BuilderAction => ({
    type: 'UPDATE_CUSTOM_BLOCK',
    payload: { pageId, sectionId, blockId, patch, columnIndex, columnBlockId },
  }),
  closeMediaLibrary: (): BuilderAction => ({ type: 'CLOSE_MEDIA_LIBRARY' }),

  openThemePanel: (): BuilderAction => ({ type: 'OPEN_THEME_PANEL' }),
  closeThemePanel: (): BuilderAction => ({ type: 'CLOSE_THEME_PANEL' }),

  setMediaAssets: (assets: BuilderMediaAsset[]): BuilderAction => ({
    type: 'SET_MEDIA_ASSETS',
    payload: assets,
  }),

  addMediaAsset: (asset: BuilderMediaAsset): BuilderAction => ({
    type: 'ADD_MEDIA_ASSET',
    payload: asset,
  }),

  removeMediaAsset: (assetId: string): BuilderAction => ({
    type: 'REMOVE_MEDIA_ASSET',
    payload: assetId,
  }),

  markSaved: (timestamp: string): BuilderAction => ({ type: 'MARK_SAVED', payload: timestamp }),

  markPublished: (version: number, publishedAt: string): BuilderAction => ({
    type: 'MARK_PUBLISHED',
    payload: { version, publishedAt },
  }),

  setError: (error: string | null): BuilderAction => ({ type: 'SET_ERROR', payload: error }),
};
