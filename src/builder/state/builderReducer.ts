import { BuilderState, BuilderAction } from './builderStore';
import { BuilderPage } from '../../types/builder/project';
import { getDefaultSectionInstance } from '../registry/sectionManifests';

function updatePageSections(
  state: BuilderState,
  pageId: string,
  updater: (page: BuilderPage) => BuilderPage
): BuilderState {
  if (!state.project) return state;
  return {
    ...state,
    isDirty: true,
    project: {
      ...state.project,
      pages: state.project.pages.map(p => (p.id === pageId ? updater(p) : p)),
    },
  };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'LOAD_PROJECT':
      return {
        ...state,
        project: action.payload,
        activePageId: action.payload.pages[0]?.id ?? null,
        isDirty: false,
        error: null,
      };

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
      });

    case 'ADD_SECTION_TYPE': {
      const { pageId, sectionType, insertAfterIndex } = action.payload;
      const page = state.project?.pages.find(p => p.id === pageId);
      const orderIndex = insertAfterIndex !== undefined ? insertAfterIndex + 1 : (page?.sections.length ?? 0);
      const newSection = getDefaultSectionInstance(sectionType, undefined, orderIndex);
      return updatePageSections(state, pageId, pg => {
        const sections = [...pg.sections];
        sections.splice(orderIndex, 0, { ...newSection, orderIndex });
        return { ...pg, sections: sections.map((s, i) => ({ ...s, orderIndex: i })) };
      });
    }

    case 'REMOVE_SECTION':
      return updatePageSections(state, action.payload.pageId, page => ({
        ...page,
        sections: page.sections
          .filter(s => s.id !== action.payload.sectionId)
          .map((s, i) => ({ ...s, orderIndex: i })),
      }));

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
      });

    case 'UPDATE_SECTION':
      return updatePageSections(state, action.payload.pageId, page => ({
        ...page,
        sections: page.sections.map(s =>
          s.id === action.payload.sectionId
            ? { ...s, ...action.payload.patch, meta: { ...s.meta, updatedAtISO: new Date().toISOString() } }
            : s
        ),
      }));

    case 'TOGGLE_SECTION_VISIBILITY':
      return updatePageSections(state, action.payload.pageId, page => ({
        ...page,
        sections: page.sections.map(s =>
          s.id === action.payload.sectionId ? { ...s, enabled: !s.enabled } : s
        ),
      }));

    case 'APPLY_TEMPLATE':
      if (!state.project) return state;
      return {
        ...state,
        isDirty: true,
        project: {
          ...state.project,
          templateId: action.payload.templateId,
          pages: state.project.pages.map((p, i) =>
            i === 0 ? { ...p, sections: action.payload.sections } : p
          ),
        },
      };

    case 'APPLY_THEME':
      if (!state.project) return state;
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, themeId: action.payload },
      };

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
      return { ...state, mediaLibraryOpen: true, mediaPickerTargetSectionId: action.payload ?? null };

    case 'CLOSE_MEDIA_LIBRARY':
      return { ...state, mediaLibraryOpen: false, mediaPickerTargetSectionId: null };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
}
