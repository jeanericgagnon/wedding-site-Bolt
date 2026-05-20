import { BuilderState, BuilderAction } from './builderStore';
import { BuilderPage, BuilderProject, generateBuilderId } from '../../types/builder/project';
import { BuilderHistoryEntry, BuilderHistoryState } from '../../types/builder/history';
import { getDefaultSectionInstance } from '../registry/sectionManifests';
import { getThemePreset } from '../../lib/themePresets';
import { assignUniqueSectionAnchor, normalizePageAnchorSlug, normalizeSectionAnchorId, stripRedundantPageSectionAnchor } from '../utils/sectionAnchors';

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

function slugifyPageTitle(input: string): string {
  return normalizePageAnchorSlug(input);
}

function titleizeSectionType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');
}

function getBuilderString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value;
  }
  return '';
}

function makeUniquePageSlug(baseSlug: string, pages: BuilderPage[], excludePageId?: string): string {
  const fallback = normalizePageAnchorSlug(baseSlug) || `page-${pages.length + 1}`;
  const existing = new Set(
    pages
      .filter((page) => page.id !== excludePageId)
      .flatMap((page) => [
        normalizePageAnchorSlug(page.slug),
        normalizePageAnchorSlug(page.id),
      ])
      .filter(Boolean)
  );
  if (!existing.has(fallback)) return fallback;

  let suffix = 2;
  while (existing.has(`${fallback}-${suffix}`)) {
    suffix += 1;
  }
  return `${fallback}-${suffix}`;
}

function getComparableOrderIndex(orderIndex: unknown, fallback: number): number {
  const numericOrderIndex = typeof orderIndex === 'number'
    ? orderIndex
    : typeof orderIndex === 'string' && orderIndex.trim()
      ? Number(orderIndex)
      : NaN;
  return Number.isFinite(numericOrderIndex) ? numericOrderIndex : fallback;
}

function compareOrderIndex<T extends { orderIndex?: unknown }>(items: T[]): T[] {
  return items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((a, b) => {
      const aOrder = getComparableOrderIndex(a.item.orderIndex, a.originalIndex);
      const bOrder = getComparableOrderIndex(b.item.orderIndex, b.originalIndex);
      return aOrder - bOrder || a.originalIndex - b.originalIndex;
    })
    .map(({ item }) => item);
}

function isHomeLikePage(page: BuilderPage): boolean {
  return page.meta?.isHome === true
    || normalizePageAnchorSlug(page.slug) === 'home'
    || normalizePageAnchorSlug(page.id) === 'home';
}

function normalizeBuilderPages(
  pages: BuilderPage[],
  options: { preferFirstPageAsHome: boolean }
): BuilderPage[] {
  const usedSlugs = new Set<string>();
  let orderedPages = compareOrderIndex(pages);
  const explicitHomeIndex = orderedPages.findIndex(isHomeLikePage);
  if (!options.preferFirstPageAsHome && explicitHomeIndex > 0) {
    orderedPages = [orderedPages[explicitHomeIndex], ...orderedPages.filter((_, index) => index !== explicitHomeIndex)];
  }
  return orderedPages.map((page, index) => {
    const normalizedSlug = normalizePageAnchorSlug(page.slug);
    const normalizedId = normalizePageAnchorSlug(page.id);
    const wantsHome = index === 0 || (options.preferFirstPageAsHome && isHomeLikePage(page));
    const isHome = wantsHome && !usedSlugs.has('home');
    const slug = isHome ? 'home' : (() => {
      const base = normalizedSlug || normalizedId || normalizePageAnchorSlug(getBuilderString(page.title)) || `page-${index + 1}`;
      if (!usedSlugs.has(base)) {
        usedSlugs.add(base);
        return base;
      }
      let suffix = 2;
      while (usedSlugs.has(`${base}-${suffix}`)) suffix += 1;
      const next = `${base}-${suffix}`;
      usedSlugs.add(next);
      return next;
    })();

    if (isHome) usedSlugs.add('home');

    const meta = {
      ...page.meta,
      isHome,
      isHidden: isHome ? false : page.meta?.isHidden === true,
    };
    const title = getBuilderString(page.title).trim() || (isHome ? 'Home' : `Page ${index + 1}`);
    const pageContext = {
      id: page.id,
      slug,
      title,
      meta,
    };

    return {
      ...page,
      title,
      slug,
      orderIndex: index,
      sections: compareOrderIndex(page.sections)
        .map((section) => stripRedundantPageSectionAnchor(section, pageContext))
        .map((section, sectionIndex) => ({ ...section, orderIndex: sectionIndex })),
      meta,
    };
  });
}

function normalizeIncomingTemplatePages(pages: BuilderPage[]): BuilderPage[] {
  return normalizeBuilderPages(pages, { preferFirstPageAsHome: true });
}

function normalizeLoadedProject(project: BuilderProject): BuilderProject {
  return {
    ...project,
    pages: normalizeBuilderPages(project.pages, { preferFirstPageAsHome: false }),
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
      const project = normalizeLoadedProject(action.payload);
      const baselineHistory = pushHistory(
        state.history,
        project,
        'Initial state',
        'ADD_SECTION'
      );
      return {
        ...state,
        project,
        activePageId: project.pages[0]?.id ?? null,
        isDirty: false,
        error: null,
        history: baselineHistory,
      };
    }

    case 'SET_WEDDING_DATA':
      return { ...state, weddingData: action.payload };

    case 'SET_ACTIVE_PAGE':
      return { ...state, activePageId: action.payload, selectedSectionId: null };

    case 'ADD_PAGE': {
      if (!state.project) return state;
      const newHistory = pushHistory(state.history, state.project, 'Add page', 'ADD_SECTION');
      const nextIndex = state.project.pages.length;
      const titleBase = getBuilderString(action.payload.title).trim() || `Page ${nextIndex + 1}`;
      const slug = makeUniquePageSlug(slugifyPageTitle(titleBase), state.project.pages);
      const now = new Date().toISOString();
      const newPage: BuilderPage = {
        id: generateBuilderId(),
        title: titleBase,
        slug,
        orderIndex: nextIndex,
        sections: [],
        meta: { isHome: false, isHidden: false },
      };
      return {
        ...state,
        isDirty: true,
        history: newHistory,
        activePageId: newPage.id,
        selectedSectionId: null,
        project: {
          ...state.project,
          meta: { ...state.project.meta, updatedAtISO: now },
          pages: [...state.project.pages, newPage],
        },
      };
    }

    case 'UPDATE_PAGE': {
      if (!state.project) return state;
      const newHistory = pushHistory(state.history, state.project, 'Update page', 'UPDATE_SECTION_SETTINGS');
      const now = new Date().toISOString();
      const patch = { ...action.payload.patch };
      const targetPage = state.project.pages.find((page) => page.id === action.payload.pageId);
      if ('title' in patch) {
        patch.title = getBuilderString(patch.title).trim();
      }
      if ('slug' in patch) {
        const requestedSlug = getBuilderString(patch.slug);
        patch.slug = targetPage?.meta.isHome === true
          ? 'home'
          : makeUniquePageSlug(requestedSlug, state.project.pages, action.payload.pageId);
      }
      if (patch.meta) {
        const existingMeta = targetPage?.meta ?? { isHome: false, isHidden: false };
        patch.meta = targetPage?.meta.isHome === true
          ? { ...existingMeta, ...patch.meta, isHome: true, isHidden: false }
          : { ...existingMeta, ...patch.meta, isHome: false };
      }
      return {
        ...state,
        isDirty: true,
        history: newHistory,
        project: {
          ...state.project,
          meta: { ...state.project.meta, updatedAtISO: now },
          pages: state.project.pages.map((p) => p.id === action.payload.pageId ? { ...p, ...patch } : p),
        },
      };
    }

    case 'DUPLICATE_PAGE': {
      if (!state.project) return state;
      const source = state.project.pages.find((p) => p.id === action.payload.pageId);
      if (!source) return state;
      const newHistory = pushHistory(state.history, state.project, 'Duplicate page', 'ADD_SECTION');
      const now = new Date().toISOString();
      const copyId = generateBuilderId();
      const copiedPage: BuilderPage = {
        ...source,
        id: copyId,
        title: `${source.title} Copy`,
        slug: makeUniquePageSlug(`${source.slug}-copy`, state.project.pages),
        orderIndex: state.project.pages.length,
        sections: source.sections.map((s, i) => ({
          ...s,
          id: generateBuilderId(),
          orderIndex: i,
          meta: { createdAtISO: now, updatedAtISO: now },
        })),
        meta: { ...source.meta, isHome: false },
      };
      return {
        ...state,
        isDirty: true,
        history: newHistory,
        activePageId: copyId,
        selectedSectionId: null,
        project: {
          ...state.project,
          meta: { ...state.project.meta, updatedAtISO: now },
          pages: [...state.project.pages, copiedPage],
        },
      };
    }

    case 'REMOVE_PAGE': {
      if (!state.project) return state;
      if (state.project.pages.length <= 1) return state;
      const target = state.project.pages.find((p) => p.id === action.payload.pageId);
      if (!target || target.meta.isHome) return state;
      const newHistory = pushHistory(state.history, state.project, 'Remove page', 'REMOVE_SECTION');
      const remaining = state.project.pages
        .filter((p) => p.id !== action.payload.pageId)
        .map((p, idx) => ({ ...p, orderIndex: idx }));
      const fallbackActive = state.activePageId === action.payload.pageId ? remaining[0]?.id ?? null : state.activePageId;
      return {
        ...state,
        isDirty: true,
        history: newHistory,
        activePageId: fallbackActive,
        selectedSectionId: null,
        project: {
          ...state.project,
          pages: remaining,
          meta: { ...state.project.meta, updatedAtISO: new Date().toISOString() },
        },
      };
    }

    case 'REORDER_PAGES': {
      if (!state.project) return state;
      const newHistory = pushHistory(state.history, state.project, 'Reorder pages', 'REORDER_SECTIONS');
      const pageMap = new Map(state.project.pages.map((p) => [p.id, p]));
      const orderedIds = Array.from(new Set(action.payload.orderedIds.filter((id) => pageMap.has(id))));
      const omittedIds = state.project.pages
        .map((page) => page.id)
        .filter((id) => !orderedIds.includes(id));
      const reordered = [...orderedIds, ...omittedIds]
        .map((id) => {
          const page = pageMap.get(id);
          return page ?? null;
        })
        .filter((p): p is BuilderPage => Boolean(p));
      const homeIndex = reordered.findIndex((page) => page.meta.isHome === true);
      const homeFirst = homeIndex > 0
        ? [reordered[homeIndex], ...reordered.filter((_, index) => index !== homeIndex)]
        : reordered;
      const ordered = homeFirst.map((page, idx) => ({ ...page, orderIndex: idx }));
      return {
        ...state,
        isDirty: true,
        history: newHistory,
        project: {
          ...state.project,
          pages: ordered,
          meta: { ...state.project.meta, updatedAtISO: new Date().toISOString() },
        },
      };
    }

    case 'SELECT_SECTION':
      return { ...state, selectedSectionId: action.payload };

    case 'HOVER_SECTION':
      return { ...state, hoveredSectionId: action.payload };

    case 'SET_MODE':
      return { ...state, mode: action.payload, selectedSectionId: null };

    case 'SET_PREVIEW_VIEWPORT':
      return { ...state, previewViewport: action.payload };

    case 'ADD_SECTION':
      return updatePageSections(state, action.payload.pageId, page => {
        const { section, insertAfterIndex } = action.payload;
        const sections = [...page.sections];
        const idx = insertAfterIndex !== undefined ? insertAfterIndex + 1 : sections.length;
        sections.splice(idx, 0, { ...assignUniqueSectionAnchor(section, sections), orderIndex: idx });
        return { ...page, sections: sections.map((s, i) => ({ ...s, orderIndex: i })) };
      }, `Add ${action.payload.section.type}`, 'ADD_SECTION');

    case 'ADD_SECTION_TYPE': {
      const { pageId, sectionType, insertAfterIndex, variant } = action.payload;
      const page = state.project?.pages.find(p => p.id === pageId);
      const orderIndex = insertAfterIndex !== undefined ? insertAfterIndex + 1 : (page?.sections.length ?? 0);
      const newSection = getDefaultSectionInstance(sectionType, variant, orderIndex);
      return updatePageSections(state, pageId, pg => {
        const sections = [...pg.sections];
        sections.splice(orderIndex, 0, { ...assignUniqueSectionAnchor(newSection, sections), orderIndex });
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

    case 'CREATE_PAGE_FROM_SECTION': {
      if (!state.project) return state;
      const sourcePage = state.project.pages.find((page) => page.id === action.payload.pageId);
      const sourceSection = sourcePage?.sections.find((section) => section.id === action.payload.sectionId);
      if (!sourcePage || !sourceSection) return state;
      if (sourcePage.sections.length <= 1) return state;

      const titleBase = action.payload.title?.trim() || titleizeSectionType(sourceSection.type);
      const slug = makeUniquePageSlug(slugifyPageTitle(titleBase), state.project.pages);
      const pageId = generateBuilderId();
      const now = new Date().toISOString();
      const newHistory = pushHistory(state.history, state.project, `Make ${titleBase} page`, 'ADD_SECTION');
      const movedSection = stripRedundantPageSectionAnchor(sourceSection, {
        slug,
        title: titleBase,
        meta: { isHome: false },
      });
      const newPage: BuilderPage = {
        id: pageId,
        title: titleBase,
        slug,
        orderIndex: state.project.pages.length,
        sections: [{ ...movedSection, orderIndex: 0, meta: { ...movedSection.meta, updatedAtISO: now } }],
        meta: { isHome: false, isHidden: false },
      };

      const pages = state.project.pages
        .map((page) => page.id === sourcePage.id
          ? {
              ...page,
              sections: page.sections
                .filter((section) => section.id !== sourceSection.id)
                .map((section, index) => ({ ...section, orderIndex: index })),
            }
          : page)
        .concat(newPage)
        .map((page, index) => ({ ...page, orderIndex: index }));

      return {
        ...state,
        isDirty: true,
        history: newHistory,
        activePageId: pageId,
        selectedSectionId: sourceSection.id,
        project: {
          ...state.project,
          meta: { ...state.project.meta, updatedAtISO: now },
          pages,
        },
      };
    }

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
        sections.splice(idx + 1, 0, assignUniqueSectionAnchor(copy, sections));
        return { ...page, sections: sections.map((s, i) => ({ ...s, orderIndex: i })) };
      }, 'Duplicate section', 'ADD_SECTION');

    case 'REORDER_SECTIONS':
      return updatePageSections(state, action.payload.pageId, page => {
        const idMap = new Map(page.sections.map(s => [s.id, s]));
        const orderedIds = Array.from(new Set(action.payload.orderedIds.filter((id) => idMap.has(id))));
        const omittedIds = page.sections
          .map((section) => section.id)
          .filter((id) => !orderedIds.includes(id));
        const reordered = [...orderedIds, ...omittedIds]
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
        sections: page.sections.map(s => {
          if (s.id !== action.payload.sectionId) return s;
          const updatedSection = { ...s, ...action.payload.patch, meta: { ...s.meta, updatedAtISO: new Date().toISOString() } };
          if (!action.payload.patch.settings || !Object.prototype.hasOwnProperty.call(action.payload.patch.settings, 'anchorId')) {
            return updatedSection;
          }

          const normalizedAnchorId = normalizeSectionAnchorId(updatedSection.settings.anchorId);
          if (!normalizedAnchorId) {
            return { ...updatedSection, settings: { ...updatedSection.settings, anchorId: '' } };
          }

          return assignUniqueSectionAnchor(
            { ...updatedSection, settings: { ...updatedSection.settings, anchorId: normalizedAnchorId } },
            page.sections.filter((section) => section.id !== s.id),
          );
        }),
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
      const nextPages = action.payload.pages && action.payload.pages.length > 0
        ? normalizeIncomingTemplatePages(action.payload.pages)
        : state.project.pages.map((p, i) =>
          i === 0 ? { ...p, sections: action.payload.sections.map((section, index) => ({ ...section, orderIndex: index })) } : p
        );
      return {
        ...state,
        isDirty: true,
        history: newHistory,
        activePageId: nextPages[0]?.id ?? state.activePageId,
        selectedSectionId: null,
        project: {
          ...state.project,
          templateId: action.payload.templateId,
          pages: nextPages,
          meta: { ...state.project.meta, updatedAtISO: new Date().toISOString() },
        },
      };
    }

    case 'APPLY_THEME': {
      if (!state.project) return state;
      const preset = getThemePreset(action.payload);
      const newHistory = pushHistory(state.history, state.project, `Apply theme`, 'APPLY_THEME');
      return {
        ...state,
        isDirty: true,
        history: newHistory,
        project: { ...state.project, themeId: action.payload, themeTokens: preset.tokens },
      };
    }

    case 'APPLY_THEME_TOKENS': {
      if (!state.project) return state;
      const newHistory = pushHistory(state.history, state.project, `Apply custom palette`, 'APPLY_THEME');
      return {
        ...state,
        isDirty: true,
        history: newHistory,
        project: { ...state.project, themeId: action.payload.themeId, themeTokens: action.payload.tokens },
      };
    }

    case 'SET_GLOBAL_ANIMATION_PRESET': {
      if (!state.project) return state;
      const newHistory = pushHistory(state.history, state.project, `Set global motion`, 'APPLY_THEME');
      return {
        ...state,
        isDirty: true,
        history: newHistory,
        project: {
          ...state.project,
          globalAnimationPreset: action.payload ?? undefined,
        },
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
        mediaPickerTargetSettingKey: action.payload?.targetSettingKey ?? null,
        mediaPickerTargetBlockPath: action.payload?.blockPath ?? null,
        mediaPickerTargetImageIndex: action.payload?.imageIndex ?? null,
      };

    case 'CLOSE_MEDIA_LIBRARY':
      return {
        ...state,
        mediaLibraryOpen: false,
        mediaPickerTargetSectionId: null,
        mediaPickerTargetField: null,
        mediaPickerTargetSettingKey: null,
        mediaPickerTargetBlockPath: null,
        mediaPickerTargetImageIndex: null,
      };

    case 'UPDATE_CUSTOM_BLOCK': {
      const { pageId, sectionId, blockId, patch, columnIndex, columnBlockId } = action.payload;
      return updatePageSections(state, pageId, page => ({
        ...page,
        sections: page.sections.map(sec => {
          if (sec.id !== sectionId) return sec;
          const blocks = (sec.settings.blocks ?? []) as Record<string, unknown>[];
          const updatedBlocks = blocks.map(block => {
            if (block.id !== blockId) return block;
            if (columnIndex !== undefined && columnBlockId !== undefined) {
              const cols = (block.columns ?? []) as Record<string, unknown>[][];
              const updatedCols = cols.map((col, ci) => {
                if (ci !== columnIndex) return col;
                return col.map(cb => (cb.id === columnBlockId ? { ...cb, ...patch } : cb));
              });
              return { ...block, columns: updatedCols };
            }
            return { ...block, ...patch };
          });
          return { ...sec, settings: { ...sec.settings, blocks: updatedBlocks } };
        }),
      }), 'Edit custom block', 'UPDATE_SECTION_SETTINGS');
    }

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
