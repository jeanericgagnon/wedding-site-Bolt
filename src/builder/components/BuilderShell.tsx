import React, { useReducer, useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BuilderContext, initialBuilderState } from '../state/builderStore';
import { builderReducer } from '../state/builderReducer';
import { builderActions } from '../state/builderActions';
import { selectActivePage, selectSelectedSection } from '../state/builderSelectors';
import { BuilderTopBar, buildPublicPagePath } from './BuilderTopBar';
import { BuilderCanvas } from './BuilderCanvas';
import { BuilderInspectorPanel } from './BuilderInspectorPanel';
import { TemplateGalleryPanel } from './TemplateGalleryPanel';
import { MediaLibraryPanel } from './MediaLibraryPanel';
import { ThemePalettePanel } from './ThemePalettePanel';
import { BuilderProject } from '../../types/builder/project';
import type { BuilderPage } from '../../types/builder/project';
import { WeddingDataV1 } from '../../types/weddingData';
import { BUILDER_AUTOSAVE_INTERVAL_MS } from '../constants/builderCapabilities';
import { mediaService } from '../services/mediaService';
import { applyThemePreset, applyThemeTokens } from '../../lib/themePresets';
import { getPublishIssue, getPublishValidationError } from '../utils/publishReadiness';
import {
  shouldAutoPublishFromSearch,
  shouldOpenDesignPanelFromSearch,
  shouldOpenPublishChecklistFromSearch,
} from '../utils/publishUiHints';
import { getPublishNowAction } from '../utils/publishNowFlow';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { copyTextOrDownload } from '../../lib/copyText';
import { readBuilderCoachmarkSeen, writeBuilderCoachmarkSeen } from './builderCoachmarkStorage';
import { findBuilderSectionTargetByType, shouldFocusTravelSectionFromSearch } from '../utils/builderRouteState';
import { getSiteVisibilityState } from '../../lib/siteVisibilityState';

interface BuilderShellProps {
  initialProject: BuilderProject;
  initialWeddingData?: WeddingDataV1;
  projectName?: string;
  publicSiteSlug?: string | null;
  isDemoMode?: boolean;
  storageScope?: string | null;
  onSave?: (project: BuilderProject, weddingData?: WeddingDataV1 | null) => Promise<void>;
  onPublish?: (projectId: string) => Promise<{ version: number; publishedAt: string }>;
}

interface BuilderPageNotice {
  pageId: string;
  message: string;
  path: string | null;
}

function safeBuilderActionError(err: unknown, fallback: string): string {
  return customerSafeErrorMessage(err, fallback);
}

function getBuilderPageTitle(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value.trim();
  }
  return '';
}

export function getBuilderPageCreatedNotice(page: BuilderPage, publicSiteSlug?: string | null): BuilderPageNotice {
  const pageTitle = getBuilderPageTitle(page.title) || 'Untitled page';

  return {
    pageId: page.id,
    message: page.sections.length > 0
      ? `Moved ${pageTitle} into a dedicated page.`
      : `Created ${pageTitle}.`,
    path: buildPublicPagePath(publicSiteSlug, page),
  };
}

export const getPublishGuidance = (issue: ReturnType<typeof getPublishIssue>): { notice: string; error: string } | null => {
  if (!issue) return null;

  if (issue.kind === 'no-pages') {
    return {
      notice: 'Opened designs so you can add a starting point before sharing with guests.',
      error: `${issue.message} Choose a starting design or add a page first.`,
    };
  }

  if (issue.kind === 'no-enabled-sections') {
    return {
      notice: 'Selected the first section. Turn it on, then try again.',
      error: `${issue.message} Select a section and turn it on in the inspector.`,
    };
  }

  if (issue.kind === 'missing-couple-names') {
    return {
      notice: 'Open couple details in settings and add both names.',
      error: issue.message,
    };
  }

  if (issue.kind === 'missing-event-date') {
    return {
      notice: 'Add your wedding date in event settings.',
      error: issue.message,
    };
  }

  if (issue.kind === 'missing-venue') {
    return {
      notice: 'Add at least one venue before sharing with guests.',
      error: issue.message,
    };
  }

  if (issue.kind === 'rsvp-disabled') {
    return {
      notice: 'Turn RSVP on in settings or remove the RSVP button before sharing with guests.',
      error: issue.message,
    };
  }

  if (issue.kind === 'unsaved-changes') {
    return {
      notice: 'Save your latest draft changes, then try publish again.',
      error: issue.message,
    };
  }

  return null;
};

export const BuilderShell: React.FC<BuilderShellProps> = ({
  initialProject,
  initialWeddingData,
  projectName,
  publicSiteSlug,
  isDemoMode = false,
  storageScope,
  onSave,
  onPublish,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(builderReducer, {
    ...initialBuilderState,
    weddingData: initialWeddingData ?? null,
  });

  useEffect(() => {
    dispatch({ type: 'LOAD_PROJECT', payload: initialProject });
    if (initialProject.themeTokens) {
      applyThemeTokens(initialProject.themeTokens);
    } else {
      applyThemePreset(initialProject.themeId ?? 'romantic');
    }
  // intentionally fires once on mount — LOAD_PROJECT is idempotent and sets baseline history
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const themeId = state.project?.themeId;
    const tokens = state.project?.themeTokens;
    if (!themeId) return;
    if (tokens) {
      applyThemeTokens(tokens);
    } else if (themeId !== 'custom') {
      applyThemePreset(themeId);
    }
  }, [state.project?.themeId, state.project?.themeTokens]);

  const activePage = useMemo(() => selectActivePage(state), [state]);
  const selectedSection = useMemo(() => selectSelectedSection(state), [state]);

  const contextValue = useMemo(
    () => ({ state, dispatch, activePage, selectedSection, publicSiteSlug: publicSiteSlug ?? null }),
    [state, dispatch, activePage, selectedSection, publicSiteSlug]
  );

  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<BuilderPageNotice | null>(null);
  const [pageNoticeCopyMode, setPageNoticeCopyMode] = useState<'copied' | 'downloaded' | null>(null);
  const [publishAttemptedAt, setPublishAttemptedAt] = useState<string | null>(null);
  const [showCoachmarks, setShowCoachmarks] = useState(false);
  const [inspectorHidden, setInspectorHidden] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const knownPageIdsRef = useRef<Set<string> | null>(null);
  const shouldAutoPublishRef = useRef(false);
  const travelRouteInjectedRef = useRef(false);
  const travelRoutePendingRef = useRef(false);
  const pageNoticeCopyRequestIdRef = useRef(0);

  const consumeBuilderRouteHint = useCallback((key: string, value?: string) => {
    const params = new URLSearchParams(location.search);
    if (!params.has(key)) return;
    if (value != null && params.get(key) !== value) return;
    params.delete(key);
    navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${location.hash}`, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (shouldAutoPublishFromSearch(location.search)) {
      shouldAutoPublishRef.current = true;
    }
  }, [location.search]);

  useEffect(() => {
    const shouldFocusTravel = shouldFocusTravelSectionFromSearch(location.search);
    travelRoutePendingRef.current = shouldFocusTravel;
    if (shouldFocusTravel) {
      travelRouteInjectedRef.current = false;
    }
  }, [location.search]);

  useEffect(() => {
    const weddingId = initialProject.weddingId;
    if (!weddingId || isDemoMode) {
      dispatch(builderActions.setMediaAssets([]));
      return;
    }
    mediaService.listAssets(weddingId)
      .then(assets => { dispatch(builderActions.setMediaAssets(assets)); })
      .catch((err) => {
        const message =
          err instanceof Error
            ? err.message
            : typeof (err as { message?: unknown })?.message === 'string'
              ? ((err as { message: string }).message)
              : '';

        // Gracefully degrade when media table is not present in older envs.
        if (message.includes('builder_media_assets') || message.includes('relation') || message.includes('404')) {
          dispatch(builderActions.setMediaAssets([]));
          return;
        }
        dispatch(builderActions.setError('Couldn’t load the media library. Your images may appear in a moment.'));
      });
  }, [initialProject.weddingId, isDemoMode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openTemplates') === '1') {
      dispatch(builderActions.openTemplateGallery());
      consumeBuilderRouteHint('openTemplates', '1');
    }
  }, [consumeBuilderRouteHint, location.search]);

  useEffect(() => {
    if (shouldOpenDesignPanelFromSearch(location.search)) {
      dispatch(builderActions.openThemePanel());
      consumeBuilderRouteHint('panel', 'design');
    }
  }, [consumeBuilderRouteHint, location.search]);

  useEffect(() => {
    if (!travelRoutePendingRef.current || !state.project) return;

    const existingTravelTarget = findBuilderSectionTargetByType(state.project, 'travel');
    if (existingTravelTarget) {
      dispatch(builderActions.setMode('edit'));
      dispatch(builderActions.setActivePage(existingTravelTarget.pageId));
      dispatch(builderActions.selectSection(existingTravelTarget.sectionId));
      travelRoutePendingRef.current = false;
      consumeBuilderRouteHint('tool', 'travel');
      consumeBuilderRouteHint('tool', 'hotel-block');
      return;
    }

    if (travelRouteInjectedRef.current) return;

    const targetPageId = state.activePageId ?? state.project.pages[0]?.id ?? null;
    if (!targetPageId) return;

    dispatch(builderActions.setMode('edit'));
    dispatch(builderActions.setActivePage(targetPageId));
    dispatch(builderActions.addSectionByType(targetPageId, 'travel'));
    travelRouteInjectedRef.current = true;
    consumeBuilderRouteHint('tool', 'travel');
    consumeBuilderRouteHint('tool', 'hotel-block');
  }, [consumeBuilderRouteHint, dispatch, state.activePageId, state.project]);

  useEffect(() => {
    const key = 'builder_coachmarks_seen_v1';
    const params = new URLSearchParams(location.search);
    if (params.get('builderTour') === '1') {
      setShowCoachmarks(true);
      params.delete('builderTour');
      navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${location.hash}`, { replace: true });
      return;
    }
    try {
      const seen = readBuilderCoachmarkSeen(key, storageScope);
      if (!seen) writeBuilderCoachmarkSeen(key, true, storageScope);
    } catch {
      // Keep the editor open even if storage is blocked.
    }
  }, [location.hash, location.pathname, location.search, navigate, storageScope]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    const currentState = stateRef.current;
    if (!currentState.project || !onSave) return true;
    setSaveError(null);
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      await onSave(currentState.project, currentState.weddingData);
      dispatch(builderActions.markSaved(new Date().toISOString()));
      return true;
    } catch (err) {
      const msg = safeBuilderActionError(err, 'Couldn’t save yet. Please try again.');
      setSaveError(msg);
      dispatch({ type: 'SET_SAVING', payload: false });
      return false;
    }
  }, [onSave]);

  const handleFixPublishBlockers = useCallback(() => {
    const project = stateRef.current.project;
    if (!project) return;
    const issue = getPublishIssue(project, stateRef.current.weddingData, { isDirty: stateRef.current.isDirty });
    if (!issue) return;

    dispatch(builderActions.setMode('edit'));

    if (issue.kind === 'no-pages') {
      dispatch(builderActions.openTemplateGallery());
      setPublishNotice('Opened designs so you can add a starting point before sharing with guests.');
      setPublishError(`${issue.message} Choose a starting design or add a page first.`);
      return;
    }

    if (issue.kind === 'no-enabled-sections') {
      if (issue.firstPageId) dispatch(builderActions.setActivePage(issue.firstPageId));
      if (issue.firstSectionId) {
        dispatch(builderActions.selectSection(issue.firstSectionId));
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-section-id="${issue.firstSectionId}"]`);
          if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      setPublishNotice('Selected the first section. Turn it on, then try again.');
      setPublishError(`${issue.message} Select a section and turn it on in the inspector.`);
      return;
    }

    const guidance = getPublishGuidance(issue);
    if (!guidance) return;
    setPublishNotice(guidance.notice);
    setPublishError(guidance.error);
  }, []);

  const handlePublish = useCallback(async () => {
    const currentState = stateRef.current;
    if (!currentState.project || !onPublish) return;
    if (currentState.isSaving || currentState.isPublishing) return;
    setPublishError(null);
    setPublishNotice(null);
    setPublishAttemptedAt(new Date().toISOString());

    const publishValidationError = getPublishValidationError(currentState.project, currentState.weddingData, { isDirty: currentState.isDirty });
    if (publishValidationError) {
      setPublishError(publishValidationError);
      return;
    }
    if (currentState.isDirty) {
      const saved = await handleSave();
      if (!saved) {
        setPublishError('Please retry the save before sharing with guests.');
        return;
      }
    }
    dispatch({ type: 'SET_PUBLISHING', payload: true });
    try {
      const publishMeta = await onPublish(currentState.project.id);
      dispatch(
        builderActions.markPublished(
          publishMeta.version,
          publishMeta.publishedAt
        )
      );
      setPublishNotice(`Live site updated. Version ${publishMeta.version}`);
    } catch (err) {
      const msg = safeBuilderActionError(err, 'Couldn’t share the site yet. Please try again.');
      setPublishError(msg);
      dispatch({ type: 'SET_PUBLISHING', payload: false });
    }
  }, [onPublish, handleSave]);

  const siteVisibility = React.useMemo(
    () =>
      getSiteVisibilityState({
        isPublished: state.project?.publishedVersion ? true : false,
        isGuestFacingReady: Boolean(state.project && !getPublishIssue(state.project, state.weddingData, { isDirty: false })),
        privacyMode: state.weddingData?.event?.privacyMode ?? state.weddingData?.site?.privacyMode,
        hideFromSearch: Boolean(state.weddingData?.event?.hideFromSearch ?? state.weddingData?.site?.hideFromSearch),
      }),
    [state.project, state.weddingData]
  );
  const siteHiddenFromSearch = Boolean(state.weddingData?.event?.hideFromSearch ?? state.weddingData?.site?.hideFromSearch);

  const registryCount = React.useMemo(() => {
    const links = state.weddingData?.registry?.links?.length ?? 0;
    const items = state.weddingData?.registry?.items?.length ?? 0;
    return links + items;
  }, [state.weddingData]);

  const reviewItems = React.useMemo(() => {
    const items: Array<{ action: () => void; cta: string; detail: string; title: string }> = [];
    const publishIssue = state.project ? getPublishIssue(state.project, state.weddingData, { isDirty: state.isDirty }) : null;

    if (publishIssue?.kind === 'missing-couple-names' || publishIssue?.kind === 'missing-event-date' || publishIssue?.kind === 'missing-venue') {
      items.push({
        title: 'Check the welcome section.',
        detail: 'Names, date, and location should feel finished before guests arrive.',
        cta: 'Edit welcome',
        action: () => {
          dispatch(builderActions.setMode('edit'));
          dispatch(builderActions.openThemePanel());
        },
      });
    }

    if (!siteHiddenFromSearch) {
      items.push({
        title: 'Confirm privacy.',
        detail: 'Decide whether the site should stay hidden from search before you share it widely.',
        cta: 'Manage privacy',
        action: () => {
          navigate('/dashboard/settings?tab=privacy');
        },
      });
    }

    const travelTarget = findBuilderSectionTargetByType(state.project ?? null, 'travel');
    if (!travelTarget) {
      items.push({
        title: 'Add travel and stay details.',
        detail: 'Hotel block notes, parking, and shuttle details help guests land confidently.',
        cta: 'Update travel',
        action: () => {
          dispatch(builderActions.setMode('edit'));
          const targetPageId = state.activePageId ?? state.project?.pages[0]?.id ?? null;
          if (!targetPageId) return;
          dispatch(builderActions.setActivePage(targetPageId));
          dispatch(builderActions.addSectionByType(targetPageId, 'travel'));
        },
      });
    }

    return items.slice(0, 2);
  }, [dispatch, siteHiddenFromSearch, state.activePageId, state.isDirty, state.project, state.weddingData]);

  useEffect(() => {
    if (!shouldAutoPublishRef.current) return;
    if (!state.project) return;

    shouldAutoPublishRef.current = false;
    const params = new URLSearchParams(location.search);
    params.delete('publishNow');
    const next = `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${location.hash}`;
    navigate(next, { replace: true });

    window.setTimeout(() => {
      const action = getPublishNowAction(true, state.project, state.weddingData, { isDirty: state.isDirty });
      if (action === 'fix-blockers') {
        handleFixPublishBlockers();
        return;
      }
      if (action === 'publish') {
        handlePublish();
      }
    }, 0);
  }, [location.hash, location.pathname, location.search, navigate, state.project, handleFixPublishBlockers, handlePublish]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const isTyping = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      if (meta && e.key === 's' && !isTyping) {
        e.preventDefault();
        handleSave();
      }
      if (meta && e.key === 'p' && !e.shiftKey && !isTyping) {
        e.preventDefault();
        dispatch(builderActions.setMode(stateRef.current.mode === 'preview' ? 'edit' : 'preview'));
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === 'p' && !isTyping) {
        e.preventDefault();
        handlePublish();
      }
      if (meta && e.key === 'z' && !e.shiftKey && !isTyping) {
        e.preventDefault();
        dispatch(builderActions.undo());
      }
      if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !isTyping) {
        e.preventDefault();
        dispatch(builderActions.redo());
      }
      if (e.key === 'Escape' && !isTyping) {
        dispatch(builderActions.selectSection(null));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handlePublish]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (stateRef.current.isDirty && !stateRef.current.isSaving && onSave) {
        handleSave();
      }
    }, BUILDER_AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [handleSave, onSave]);

  useEffect(() => {
    if (!publishNotice) return;
    const timeout = window.setTimeout(() => setPublishNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [publishNotice]);

  useEffect(() => {
    if (!pageNotice) return;
    setPageNoticeCopyMode(null);
    const timeout = window.setTimeout(() => setPageNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [pageNotice]);

  const copyPageNoticeLink = async () => {
    if (!pageNotice?.path) return;
    const requestId = ++pageNoticeCopyRequestIdRef.current;
    const url = new URL(pageNotice.path, window.location.origin).toString();
    try {
      const result = await copyTextOrDownload(url, 'dayof-builder-page-link.txt');
      if (requestId === pageNoticeCopyRequestIdRef.current) {
        setPageNoticeCopyMode(result);
      }
    } catch {
      if (requestId === pageNoticeCopyRequestIdRef.current) {
        dispatch(builderActions.setError('Couldn’t copy that page link right now.'));
      }
    }
  };

  useEffect(() => {
    const pages = state.project?.pages ?? [];
    const nextPageIds = new Set(pages.map((page) => page.id));

    if (!knownPageIdsRef.current) {
      knownPageIdsRef.current = nextPageIds;
      return;
    }

    const previousPageIds = knownPageIdsRef.current;
    const newPages = pages.filter((page) => !previousPageIds.has(page.id));
    knownPageIdsRef.current = nextPageIds;

    if (newPages.length === 0) return;

    const activeNewPage = newPages.find((page) => page.id === state.activePageId) ?? newPages[0];
    setPageNotice(getBuilderPageCreatedNotice(activeNewPage, publicSiteSlug));
  }, [publicSiteSlug, state.activePageId, state.project?.pages]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stateRef.current.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <BuilderContext.Provider value={contextValue}>
      <div className="h-screen flex flex-col bg-[var(--color-surface-subtle)] overflow-hidden">
        <BuilderTopBar
          initialPublishChecklistOpen={shouldOpenPublishChecklistFromSearch(location.search)}
          onSave={handleSave}
          onPublish={handlePublish}
          onFixPublishBlockers={handleFixPublishBlockers}
          projectName={projectName}
          saveError={saveError}
          publishError={publishError}
          publishAttemptedAt={publishAttemptedAt}
          publishValidationError={state.project ? getPublishValidationError(state.project, state.weddingData, { isDirty: state.isDirty }) : null}
          publishIssueKind={state.project ? getPublishIssue(state.project, state.weddingData, { isDirty: state.isDirty })?.kind ?? null : null}
          publicSiteSlug={publicSiteSlug}
          inspectorHidden={inspectorHidden}
          onToggleInspector={() => setInspectorHidden((v) => !v)}
        />

        {state.mode === 'edit' && (
          <section className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-4 md:px-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_360px]">
              <article className="rounded-[1.75rem] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/60 p-4 md:p-5">
                <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
                  <div className="overflow-hidden rounded-[1.4rem] border border-[var(--color-border-subtle)] bg-white shadow-sm">
                    <div className="bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">Guest site</p>
                      <p className="mt-1 font-serif text-xl text-[var(--color-text-primary)]">{state.weddingData?.couple?.displayName || projectName || 'Your wedding site'}</p>
                    </div>
                    <div className="min-h-[180px] bg-[linear-gradient(135deg,#f8f5f0_0%,#ffffff_45%,#f1ece4_100%)] px-4 py-5">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-accent,#9c6b30)]">
                        {state.weddingData?.event?.weddingDateISO ? new Date(state.weddingData.event.weddingDateISO).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date to come'}
                      </p>
                      <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-text-primary)]">Guests have a clear place to land.</h2>
                      <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">Welcome, schedule, RSVP, travel, registry, and photos stay easy to find.</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-white px-3 py-1 text-[var(--color-text-primary)] ring-1 ring-[var(--color-border-subtle)]">RSVP</span>
                        <span className="rounded-full bg-white px-3 py-1 text-[var(--color-text-primary)] ring-1 ring-[var(--color-border-subtle)]">Schedule</span>
                        <span className="rounded-full bg-white px-3 py-1 text-[var(--color-text-primary)] ring-1 ring-[var(--color-border-subtle)]">Registry</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent,#9c6b30)]">Guest view workflow</p>
                    <h2 className="mt-3 font-serif text-2xl text-[var(--color-text-primary)]">Preview, edit, then publish with confidence.</h2>
                    <div className="mt-5 space-y-3">
                      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-white p-4">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">1. Preview guest view</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">See the site exactly as guests will before you share it.</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-white p-4">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">2. Edit details</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">Update welcome, schedule, travel, RSVP, and registry sections from the editor.</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-white p-4">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">3. Share</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">Copy the site link or open QR/share tools when the guest flow feels ready.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <aside className="rounded-[1.75rem] border border-[var(--color-border-subtle)] bg-white p-5 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent,#9c6b30)]">Publishing</p>
                    <h2 className="mt-2 font-serif text-2xl text-[var(--color-text-primary)]">
                      {siteVisibility.isLive ? 'Guests currently see the live site.' : 'The guest site is still being prepared.'}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                      Privacy: {siteHiddenFromSearch ? 'hidden from search' : 'visible to search engines'}.
                      {' '}Registry: {registryCount > 0 ? 'included for guests' : 'ready to add'}.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/40 p-4">
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Guest site</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">{siteVisibility.isLive ? 'Live' : siteVisibility.shortLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/40 p-4">
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">RSVP</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                        {state.weddingData?.rsvp?.enabled === false ? 'Needs review' : 'Live'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/40 p-4">
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Registry</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                        {registryCount > 0 ? 'Shown on the site' : 'Needs review'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent,#9c6b30)]">Needs review</p>
                    {reviewItems.length === 0 ? (
                      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/40 p-4">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Nothing urgent is waiting.</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">You can keep refining the guest view or open Preview / Share when you are ready.</p>
                      </div>
                    ) : (
                      reviewItems.map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          onClick={item.action}
                          className="w-full rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/40 p-4 text-left transition hover:border-[var(--color-accent,#9c6b30)]/35 hover:shadow-sm"
                        >
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{item.detail}</p>
                          <p className="mt-4 text-sm font-semibold text-[var(--color-accent,#9c6b30)]">{item.cta}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden px-0 pt-0 pb-0 gap-0">
          <BuilderCanvas />

          {state.mode === 'edit' && !inspectorHidden && (
            <div className="hidden lg:block h-full min-h-0 shrink-0">
              <BuilderInspectorPanel />
            </div>
          )}
        </div>

        {publishNotice && (
          <div className="fixed bottom-4 left-4 bg-primary text-white px-4 py-3 rounded-xl shadow-md text-sm flex items-center gap-2 z-50 max-w-sm">
            <span className="flex-1">{publishNotice}</span>
            <button
              onClick={() => setPublishNotice(null)}
              className="ml-2 font-bold text-lg leading-none opacity-80 hover:opacity-100"
              aria-label="Dismiss publish notice"
            >
              ×
            </button>
          </div>
        )}

        {pageNotice && (
          <div
            className={`fixed left-4 ${publishNotice ? 'bottom-20' : 'bottom-4'} z-50 max-w-sm rounded-xl border border-[var(--color-border-subtle)] bg-white px-4 py-3 text-sm text-[var(--color-text-primary)] shadow-md`}
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{pageNotice.message}</span>
                {pageNotice.path && (
                  <span className="mt-1 block truncate font-mono text-[11px] text-[var(--color-text-secondary)]">{pageNotice.path}</span>
                )}
              </span>
              <button
                onClick={() => setPageNotice(null)}
                className="text-lg font-bold leading-none text-[var(--color-text-tertiary)] opacity-80 hover:opacity-100"
                aria-label="Dismiss page notice"
              >
                ×
              </button>
            </div>
            {pageNotice.path && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!pageNotice.path) return;
                    const url = new URL(pageNotice.path, window.location.origin).toString();
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="rounded-xl border border-[var(--color-border-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
                >
                  Open page
                </button>
                <button
                  type="button"
                  onClick={() => void copyPageNoticeLink()}
                  className="rounded-xl border border-[var(--color-border-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
                >
                  {pageNoticeCopyMode === 'downloaded' ? 'Downloaded link' : pageNoticeCopyMode === 'copied' ? 'Copied link' : 'Copy link'}
                </button>
              </div>
            )}
          </div>
        )}

        {state.error && (
          <div className="fixed bottom-4 right-4 bg-error text-text-inverse px-4 py-3 rounded-xl shadow-md text-sm flex items-center gap-2 z-50 max-w-sm">
            <span className="flex-1">{state.error}</span>
            <button
              onClick={() => dispatch(builderActions.setError(null))}
              className="ml-2 font-bold text-lg leading-none opacity-80 hover:opacity-100"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <TemplateGalleryPanel onSaveRequest={handleSave} storageScope={storageScope} />
        <MediaLibraryPanel />
        <ThemePalettePanel
          isOpen={state.themePanelOpen}
          onClose={() => dispatch(builderActions.closeThemePanel())}
        />

        {showCoachmarks && (
          <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-xl bg-white shadow-sm border border-border-subtle p-5">
              <h3 className="text-lg font-semibold text-gray-900">Quick site editor walkthrough</h3>
              <p className="mt-1 text-sm text-gray-600">Three fast checks so the editor feels straightforward right away.</p>
              <ol className="mt-4 space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li><span className="font-medium">Canvas first:</span> click any section to start editing without hunting for controls.</li>
                <li><span className="font-medium">Right panel:</span> use the right panel for the next useful action first, then open more controls only if needed.</li>
                <li><span className="font-medium">Top bar:</span> check desktop, tablet, and mobile before you share.</li>
              </ol>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCoachmarks(false);
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Close for now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCoachmarks(false);
                    try { writeBuilderCoachmarkSeen('builder_coachmarks_seen_v1', true, storageScope); } catch {}
                  }}
                  className="rounded-xl bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BuilderContext.Provider>
  );
};
