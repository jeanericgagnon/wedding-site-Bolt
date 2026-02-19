import { BuilderState, BuilderAction } from './builderStore';
import { BuilderPage, BuilderProject, generateBuilderId } from '../../types/builder/project';
import { BuilderHistoryEntry, BuilderHistoryState } from '../../types/builder/history';
import { getDefaultSectionInstance } from '../registry/sectionManifests';

function pushHistory(
  history: BuilderHistoryState,
  project: BuilderProject,
  label: string,
  actionType: BuilderHistoryEntry['actionType']
): BuilderHistoryState {
  const newEntry: BuilderHistoryEntry = {
    id: generateBuilderId(),
    actionType,
    label,
    snapshot: project,
    timestamp: new Date().toISOString(),
  };
  const trimmed = history.entries.slice(0, history.currentIndex + 1);
  const newEntries = [...trimmed, newEntry].slice(-history.maxEntries);
  return {
    ...history,
    entries: newEntries,
    currentIndex: newEntries.length - 1,
  };
}

function updatePageSections(
  state: BuilderState,
  pageId: string,
  updater: (page: BuilderPage) => BuilderPage,
  historyLabel: string,
  historyAction: BuilderHistoryEntry['actionType']
): BuilderState {
  if (!state.project) return state;
  const newHistory = pushHistory(state.history, state.project, historyLabel, historyAction);
  return {
    ...state,
    isDirty: true,
    history: newHistory,
    project: {
      ...state.project,
      pages: state.project.pages.map(p => (p.id === pageId ? updater(p) : p)),
    },
  };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'LOAD_PROJECT': {
      const baselineHistory = pushHistory(
        state.history,
        action.payload,
        'Initial state',
        'ADD_SECTION'
      );
      return {
        ...state,
        project: action.payload,
        activePageId: action.payload.pages[0]?.id ?? null,
        isDirty: false,
        error: null,
        history: baselineHistory,
      };
    }

    case 'SET_WEDDING_DATA':
      return { ...state, weddingData: action.payload };

    case 'SET_ACTIVE_PAGE':
      return { ...state, activePageId: action.payload, selectedSectionId: null };

    case 'SELECT_SECTION':
      return { ...state, selectedSectionId: action.payload };

    case 'HOVER_SECTION':
      return { ...state, hoveredSectionId: action.payload };

    case 'SET_MODE':
      return { ...state, mode: action.payload, selectedSectionId: null };

    case 'ADD_SECTION':
      return updatePageSections(state, action.payload.pageId, page => {
        const { section, insertAfterIndex } = action.payload;
        const sections = [...page.sections];
        const idx = insertAfterIndex !== undefined ? insertAfterIndex + 1 : sections.length;
        sections.splice(idx, 0, { ...section, orderIndex: idx });
        return { ...page, sections: sections.map((s, i) => ({ ...s, orderIndex: i })) };
      }, `Add ${action.payload.section.type}`, 'ADD_SECTION');

    case 'ADD_SECTION_TYPE': {
      const { pageId, sectionType, insertAfterIndex, variant } = action.payload;
      const page = state.project?.pages.find(p => p.id === pageId);
      const orderIndex = insertAfterIndex !== undefined ? insertAfterIndex + 1 : (page?.sections.length ?? 0);
      const newSection = getDefaultSectionInstance(sectionType, variant, orderIndex);
      return updatePageSections(state, pageId, pg => {
        const sections = [...pg.sections];
        sections.splice(orderIndex, 0, { ...newSection, orderIndex });
        return { ...pg, sections: sections.map((s, i) => ({ ...s, orderIndex: i })) };
      }, `Add ${sectionType}`, 'ADD_SECTION');
    }

    case 'REMOVE_SECTION':
      return updatePageSections(state, action.payload.pageId, page => ({
        ...page,
        sections: page.sections
          .filter(s => s.id !== action.payload.sectionId)
          .map((s, i) => ({ ...s, orderIndex: i })),
      }), 'Remove section', 'REMOVE_SECTION');

    case 'DUPLICATE_SECTION':
      return updatePageSections(state, action.payload.pageId, page => {
        const idx = page.sections.findIndex(s => s.id === action.payload.sectionId);
        if (idx === -1) return page;
        const original = page.sections[idx];
        const now = new Date().toISOString();
        const copy = {
          ...original,
          id: generateBuilderId(),
          meta: { createdAtISO: now, updatedAtISO: now },
        };
        const sections = [...page.sections];
        sections.splice(idx + 1, 0, copy);
        return { ...page, sections: sections.map((s, i) => ({ ...s, orderIndex: i })) };
      }, 'Duplicate section', 'ADD_SECTION');

    case 'REORDER_SECTIONS':
      return updatePageSections(state, action.payload.pageId, page => {
        const idMap = new Map(page.sections.map(s => [s.id, s]));
        const reordered = action.payload.orderedIds
          .map((id, index) => {
            const sec = idMap.get(id);
            return sec ? { ...sec, orderIndex: index } : null;
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);
        return { ...page, sections: reordered };
      }, 'Reorder sections', 'REORDER_SECTIONS');

    case 'UPDATE_SECTION':
      return updatePageSections(state, action.payload.pageId, page => ({
        ...page,
        sections: page.sections.map(s =>
          s.id === action.payload.sectionId
            ? { ...s, ...action.payload.patch, meta: { ...s.meta, updatedAtISO: new Date().toISOString() } }
            : s
        ),
      }), 'Edit section', 'UPDATE_SECTION_SETTINGS');

    case 'TOGGLE_SECTION_VISIBILITY':
      return updatePageSections(state, action.payload.pageId, page => ({
        ...page,
        sections: page.sections.map(s =>
          s.id === action.payload.sectionId ? { ...s, enabled: !s.enabled } : s
        ),
      }), 'Toggle visibility', 'TOGGLE_SECTION_VISIBILITY');

    case 'APPLY_TEMPLATE': {
      if (!state.project) return state;
      const newHistory = pushHistory(state.history, state.project, `Apply template`, 'APPLY_TEMPLATE');
      return {
        ...state,
        isDirty: true,
        history: newHistory,
        project: {
          ...state.project,
          templateId: action.payload.templateId,
          pages: state.project.pages.map((p, i) =>
            i === 0 ? { ...p, sections: action.payload.sections } : p
          ),
        },
      };
    }

    case 'APPLY_THEME': {
      if (!state.project) return state;
      const newHistory = pushHistory(state.history, state.project, `Apply theme`, 'APPLY_THEME');
      return {
        ...state,
        isDirty: true,
        history: newHistory,
        project: { ...state.project, themeId: action.payload },
      };
    }

    case 'UNDO': {
      const { history, project } = state;
      if (!project || history.currentIndex <= 0) return state;
      const prevEntry = history.entries[history.currentIndex - 1];
      return {
        ...state,
        project: { ...prevEntry.snapshot, weddingId: project.weddingId },
        history: { ...history, currentIndex: history.currentIndex - 1 },
        isDirty: true,
      };
    }

    case 'REDO': {
      const { history, project } = state;
      if (!project || history.currentIndex >= history.entries.length - 1) return state;
      const nextEntry = history.entries[history.currentIndex + 1];
      return {
        ...state,
        project: { ...nextEntry.snapshot, weddingId: project.weddingId },
        history: { ...history, currentIndex: history.currentIndex + 1 },
        isDirty: true,
      };
    }

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };

    case 'SET_PUBLISHING':
      return { ...state, isPublishing: action.payload };

    case 'MARK_SAVED':
      return { ...state, isSaving: false, isDirty: false, lastSavedAt: action.payload };

    case 'MARK_PUBLISHED':
      if (!state.project) return state;
      return {
        ...state,
        isPublishing: false,
        project: {
          ...state.project,
          publishedVersion: action.payload.version,
          publishStatus: 'published',
          lastPublishedAt: action.payload.publishedAt,
        },
      };

    case 'SET_MEDIA_ASSETS':
      return { ...state, mediaAssets: action.payload };

    case 'ADD_MEDIA_ASSET':
      return { ...state, mediaAssets: [action.payload, ...state.mediaAssets] };

    case 'REMOVE_MEDIA_ASSET':
      return { ...state, mediaAssets: state.mediaAssets.filter(a => a.id !== action.payload) };

    case 'UPDATE_UPLOAD_QUEUE':
      return {
        ...state,
        uploadQueue: state.uploadQueue.some(u => u.assetId === action.payload.assetId)
          ? state.uploadQueue.map(u => (u.assetId === action.payload.assetId ? action.payload : u))
          : [...state.uploadQueue, action.payload],
      };

    case 'REMOVE_FROM_UPLOAD_QUEUE':
      return { ...state, uploadQueue: state.uploadQueue.filter(u => u.assetId !== action.payload) };

    case 'OPEN_TEMPLATE_GALLERY':
      return { ...state, templateGalleryOpen: true };

    case 'CLOSE_TEMPLATE_GALLERY':
      return { ...state, templateGalleryOpen: false };

    case 'OPEN_MEDIA_LIBRARY':
      return {
        ...state,
        mediaLibraryOpen: true,
        mediaPickerTargetSectionId: action.payload?.sectionId ?? null,
        mediaPickerTargetField: action.payload?.targetField ?? null,
      };

    case 'CLOSE_MEDIA_LIBRARY':
      return { ...state, mediaLibraryOpen: false, mediaPickerTargetSectionId: null, mediaPickerTargetField: null };

    case 'OPEN_THEME_PANEL':
      return { ...state, themePanelOpen: true };

    case 'CLOSE_THEME_PANEL':
      return { ...state, themePanelOpen: false };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
}
