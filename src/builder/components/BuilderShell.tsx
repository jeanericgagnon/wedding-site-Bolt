import React, { useReducer, useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { BuilderContext, initialBuilderState } from '../state/builderStore';
import { builderReducer } from '../state/builderReducer';
import { builderActions } from '../state/builderActions';
import { selectActivePage, selectSelectedSection } from '../state/builderSelectors';
import { BuilderTopBar } from './BuilderTopBar';
import { BuilderSidebarLibrary } from './BuilderSidebarLibrary';
import { BuilderCanvas } from './BuilderCanvas';
import { BuilderInspectorPanel } from './BuilderInspectorPanel';
import { TemplateGalleryPanel } from './TemplateGalleryPanel';
import { MediaLibraryPanel } from './MediaLibraryPanel';
import { ThemePalettePanel } from './ThemePalettePanel';
import { BuilderProject } from '../../types/builder/project';
import { WeddingDataV1 } from '../../types/weddingData';
import { BUILDER_AUTOSAVE_INTERVAL_MS } from '../constants/builderCapabilities';
import { mediaService } from '../services/mediaService';
import { applyThemePreset, applyThemeTokens } from '../../lib/themePresets';

interface BuilderShellProps {
  initialProject: BuilderProject;
  initialWeddingData?: WeddingDataV1;
  projectName?: string;
  isDemoMode?: boolean;
  onSave?: (project: BuilderProject, weddingData?: WeddingDataV1 | null) => Promise<void>;
  onPublish?: (projectId: string) => Promise<{ version: number; publishedAt: string }>;
}

type PublishIssue =
  | { kind: 'no-pages'; message: string }
  | { kind: 'no-enabled-sections'; message: string; firstSectionId?: string; firstPageId?: string };

const getPublishIssue = (project: BuilderProject): PublishIssue | null => {
  if (!project.pages.length) {
    return { kind: 'no-pages', message: 'Add at least one page before publishing.' };
  }

  const firstSection = project.pages.flatMap((p) => p.sections.map((s) => ({ pageId: p.id, sectionId: s.id })))[0];
  const hasEnabledSection = project.pages.some((page) => page.sections.some((section) => section.enabled));
  if (!hasEnabledSection) {
    return {
      kind: 'no-enabled-sections',
      message: 'Enable at least one section before publishing.',
      firstSectionId: firstSection?.sectionId,
      firstPageId: firstSection?.pageId,
    };
  }

  return null;
};

const getPublishValidationError = (project: BuilderProject): string | null => getPublishIssue(project)?.message ?? null;

export const BuilderShell: React.FC<BuilderShellProps> = ({
  initialProject,
  initialWeddingData,
  projectName,
  isDemoMode = false,
  onSave,
  onPublish,
}) => {
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
    () => ({ state, dispatch, activePage, selectedSection }),
    [state, dispatch, activePage, selectedSection]
  );

  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const shouldAutoPublishRef = useRef(new URLSearchParams(window.location.search).get('publishNow') === '1');

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
        dispatch(builderActions.setError('Could not load media library. Your uploads may not appear.'));
      });
  }, [initialProject.weddingId, isDemoMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openTemplates') === '1') {
      dispatch(builderActions.openTemplateGallery());
    }
  }, []);

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
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setSaveError(msg);
      dispatch({ type: 'SET_SAVING', payload: false });
      return false;
    }
  }, [onSave]);

  const handleFixPublishBlockers = useCallback(() => {
    const project = stateRef.current.project;
    if (!project) return;
    const issue = getPublishIssue(project);
    if (!issue) return;

    dispatch(builderActions.setMode('edit'));

    if (issue.kind === 'no-pages') {
      dispatch(builderActions.openTemplateGallery());
      setPublishNotice('Opened Templates so you can add content before publishing.');
      setPublishError(`${issue.message} Choose a starter template or add a page first.`);
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
      setPublishNotice('Selected the first section. Enable it in inspector, then publish again.');
      setPublishError(`${issue.message} Select a section and toggle it on in the inspector.`);
    }
  }, []);

  const handlePublish = useCallback(async () => {
    const currentState = stateRef.current;
    if (!currentState.project || !onPublish) return;
    if (currentState.isSaving || currentState.isPublishing) return;
    setPublishError(null);
    setPublishNotice(null);

    const publishValidationError = getPublishValidationError(currentState.project);
    if (publishValidationError) {
      setPublishError(publishValidationError);
      return;
    }
    if (currentState.isDirty) {
      const saved = await handleSave();
      if (!saved) {
        setPublishError('Please resolve save errors before publishing.');
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
      setPublishNotice(`Published v${publishMeta.version} successfully`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to publish';
      setPublishError(msg);
      dispatch({ type: 'SET_PUBLISHING', payload: false });
    }
  }, [onPublish, handleSave]);

  useEffect(() => {
    if (!shouldAutoPublishRef.current) return;
    if (!state.project) return;

    shouldAutoPublishRef.current = false;
    const params = new URLSearchParams(window.location.search);
    params.delete('publishNow');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);

    window.setTimeout(() => {
      const issue = getPublishIssue(state.project!);
      if (issue) {
        handleFixPublishBlockers();
        return;
      }
      handlePublish();
    }, 0);
  }, [state.project, handleFixPublishBlockers, handlePublish]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (meta && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        dispatch(builderActions.setMode(stateRef.current.mode === 'preview' ? 'edit' : 'preview'));
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === 'p') {
        const target = e.target as HTMLElement | null;
        const isTyping = !!target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        );
        if (!isTyping) {
          e.preventDefault();
          handlePublish();
        }
      }
      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch(builderActions.undo());
      }
      if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        dispatch(builderActions.redo());
      }
      if (e.key === 'Escape') {
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
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        <BuilderTopBar
          onSave={handleSave}
          onPublish={handlePublish}
          onFixPublishBlockers={handleFixPublishBlockers}
          projectName={projectName}
          saveError={saveError}
          publishError={publishError}
          publishValidationError={state.project ? getPublishValidationError(state.project) : null}
        />

        <div className="flex-1 flex flex-col lg:flex-row overflow-auto lg:overflow-hidden">
          {state.mode === 'edit' && (
            <div className="hidden lg:block">
              <BuilderSidebarLibrary activePageId={state.activePageId} />
            </div>
          )}

          <BuilderCanvas />

          {state.mode === 'edit' && (
            <div className="hidden lg:block">
              <BuilderInspectorPanel />
            </div>
          )}
        </div>

        {publishNotice && (
          <div className="fixed bottom-4 left-4 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 z-50 max-w-sm">
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

        {state.error && (
          <div className="fixed bottom-4 right-4 bg-error text-text-inverse px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 z-50 max-w-sm">
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

        <TemplateGalleryPanel onSaveRequest={handleSave} />
        <MediaLibraryPanel />
        <ThemePalettePanel
          isOpen={state.themePanelOpen}
          onClose={() => dispatch(builderActions.closeThemePanel())}
        />
      </div>
    </BuilderContext.Provider>
  );
};
