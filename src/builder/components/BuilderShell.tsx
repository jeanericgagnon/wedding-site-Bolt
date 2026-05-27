import React, { useReducer, useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { BuilderContext, initialBuilderState } from '../state/builderStore';
import { builderReducer } from '../state/builderReducer';
import { builderActions } from '../state/builderActions';
import { selectActivePage, selectSelectedSection } from '../state/builderSelectors';
import { BuilderTopBar } from './BuilderTopBar';
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
import { buildBuilderConciergeModel } from '../../lib/setupConcierge';
import { getPublishIssue, getPublishValidationError } from '../utils/publishReadiness';
import { shouldAutoPublishFromSearch } from '../utils/publishUiHints';
import { getPublishNowAction } from '../utils/publishNowFlow';
import { buildLaunchConfidence } from '../utils/launchConfidence';
import { getFlowStatusLabel } from '../../lib/flowLabels';
import { templateCatalog } from '../constants/templateCatalog';

interface BuilderShellProps {
  initialProject: BuilderProject;
  initialWeddingData?: WeddingDataV1;
  projectName?: string;
  isDemoMode?: boolean;
  onSave?: (project: BuilderProject, weddingData?: WeddingDataV1 | null) => Promise<void>;
  onPublish?: (projectId: string) => Promise<{ version: number; publishedAt: string }>;
}

export const getPublishGuidance = (issue: ReturnType<typeof getPublishIssue>): { notice: string; error: string } | null => {
  if (!issue) return null;

  if (issue.kind === 'no-pages') {
    return {
      notice: 'Opened designs so you can add a starting point before going live.',
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
      notice: 'Add at least one venue before going live.',
      error: issue.message,
    };
  }

  if (issue.kind === 'rsvp-disabled') {
    return {
      notice: 'Turn RSVP on in settings or remove the RSVP button before going live.',
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
  const [publishAttemptedAt, setPublishAttemptedAt] = useState<string | null>(null);
  const [showCoachmarks, setShowCoachmarks] = useState(false);
  const [inspectorHidden, setInspectorHidden] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const shouldAutoPublishRef = useRef(shouldAutoPublishFromSearch(window.location.search));

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
        dispatch(builderActions.setError('Could not load the media library. Your images may not appear right away.'));
      });
  }, [initialProject.weddingId, isDemoMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openTemplates') === '1') {
      dispatch(builderActions.openTemplateGallery());
    }
  }, []);

  useEffect(() => {
    const key = 'builder_coachmarks_seen_v1';
    try {
      const seen = window.localStorage.getItem(key);
      if (!seen) setShowCoachmarks(true);
    } catch {
      setShowCoachmarks(true);
    }
  }, []);

  const conciergePlan = useMemo(() => {
    if (!state.weddingData) return null;
    const templateName = templateCatalog.find((template) => template.id === state.project?.templateId)?.name ?? null;
    return buildBuilderConciergeModel(state.weddingData, { templateName });
  }, [state.project?.templateId, state.weddingData]);
  const launchConfidence = useMemo(() => {
    if (!state.project || !state.weddingData) return null;
    return buildLaunchConfidence(state.project, state.weddingData, { isDirty: state.isDirty });
  }, [state.isDirty, state.project, state.weddingData]);

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
    const issue = getPublishIssue(project, stateRef.current.weddingData, { isDirty: stateRef.current.isDirty });
    if (!issue) return;

    dispatch(builderActions.setMode('edit'));

    if (issue.kind === 'no-pages') {
      dispatch(builderActions.openTemplateGallery());
      setPublishNotice('Opened designs so you can add a starting point before going live.');
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
        setPublishError('Please resolve save errors before going live.');
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
      setPublishNotice(`Live site updated successfully (v${publishMeta.version})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to make the site live';
      setPublishError(msg);
      dispatch({ type: 'SET_PUBLISHING', payload: false });
    }
  }, [onPublish, handleSave]);

  const handleLaunchConfidenceAction = useCallback(() => {
    if (!launchConfidence) return;
    if (launchConfidence.primaryAction.kind === 'fix') {
      handleFixPublishBlockers();
      return;
    }
    if (launchConfidence.primaryAction.kind === 'preview') {
      dispatch(builderActions.setMode('preview'));
      setPublishNotice('Preview mode is open so you can verify the guest-facing flow before updating the live site.');
      return;
    }
    void handlePublish();
  }, [handleFixPublishBlockers, handlePublish, launchConfidence]);

  useEffect(() => {
    if (!shouldAutoPublishRef.current) return;
    if (!state.project) return;

    shouldAutoPublishRef.current = false;
    const params = new URLSearchParams(window.location.search);
    params.delete('publishNow');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);

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
  }, [state.project, handleFixPublishBlockers, handlePublish]);

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
          onSave={handleSave}
          onPublish={handlePublish}
          onFixPublishBlockers={handleFixPublishBlockers}
          projectName={projectName}
          saveError={saveError}
          publishError={publishError}
          publishAttemptedAt={publishAttemptedAt}
          publishValidationError={state.project ? getPublishValidationError(state.project, state.weddingData, { isDirty: state.isDirty }) : null}
          publishIssueKind={state.project ? getPublishIssue(state.project, state.weddingData, { isDirty: state.isDirty })?.kind ?? null : null}
          inspectorHidden={inspectorHidden}
          onToggleInspector={() => setInspectorHidden((v) => !v)}
        />

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden px-0 pt-0 pb-0 gap-0">
          <BuilderCanvas />

          {state.mode === 'edit' && !inspectorHidden && (
            <div className="hidden lg:block h-full min-h-0 shrink-0">
              <BuilderInspectorPanel />
            </div>
          )}
        </div>

        {conciergePlan && (
          <div className="border-t border-border/30 bg-white/90 px-4 py-3 shadow-[0_-6px_18px_rgba(15,23,42,0.04)]">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Builder concierge</p>
                  <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
                    {conciergePlan.confidenceLabel}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{conciergePlan.heading}</p>
                  <p className="mt-1 text-sm text-text-secondary">{conciergePlan.summary}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{conciergePlan.nextBestMove}</p>
                </div>
              </div>
              <div className="grid gap-3 text-sm lg:max-w-2xl">
                <p className="text-xs font-medium text-text-secondary">{conciergePlan.guestPromise}</p>
                <div className="grid gap-2 md:grid-cols-3">
                  {conciergePlan.launchSequence.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border-subtle bg-surface-subtle/40 px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{item.status}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          item.status === 'current'
                            ? 'border border-primary/20 bg-primary-light text-primary'
                            : item.status === 'next'
                              ? 'border border-warning/20 bg-warning-light text-warning'
                              : 'border border-border-subtle bg-white text-text-secondary'
                        }`}>
                          {getFlowStatusLabel(item.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-text-primary">{item.title}</p>
                      <p className="mt-1 text-[11px] leading-5 text-text-secondary">{item.detail}</p>
                    </div>
                  ))}
                </div>
                {conciergePlan.watchouts.map((watchout) => (
                  <p key={watchout} className="text-xs text-amber-700">{watchout}</p>
                ))}
                {launchConfidence && (
                  <div className="rounded-2xl border border-border-subtle bg-white px-4 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Launch confidence</p>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            launchConfidence.tone === 'ready'
                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border border-amber-200 bg-amber-50 text-amber-700'
                          }`}>
                            {launchConfidence.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-text-primary">{launchConfidence.summary}</p>
                        <p className="text-[11px] text-text-secondary">Current · {launchConfidence.current}</p>
                        <p className="text-[11px] text-text-secondary">Next · {launchConfidence.next}</p>
                      </div>
                      <div className="lg:pl-4">
                        <button
                          type="button"
                          onClick={handleLaunchConfidenceAction}
                          className={`rounded-lg px-3 py-2 text-sm font-medium ${
                            launchConfidence.primaryAction.kind === 'fix'
                              ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'bg-gray-900 text-white hover:bg-gray-800'
                          }`}
                        >
                          {launchConfidence.primaryAction.label}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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

        {showCoachmarks && (
          <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-5">
              <h3 className="text-lg font-semibold text-gray-900">{conciergePlan?.heading ?? 'Quick builder walkthrough'}</h3>
              <p className="mt-1 text-sm text-gray-600">
                {conciergePlan?.summary ?? 'Three fast checks so the builder feels straightforward right away.'}
              </p>
              <div className="mt-4 space-y-3">
                {(conciergePlan?.checklist ?? [
                  {
                    id: 'canvas',
                    title: 'Canvas first',
                    detail: 'Click any section to start editing without hunting for controls.',
                  },
                  {
                    id: 'inspector',
                    title: 'Right panel next',
                    detail: 'Use the right panel for the next useful action first, then open more controls only if needed.',
                  },
                  {
                    id: 'preview',
                    title: 'Preview before publish',
                    detail: 'Check desktop, tablet, and mobile before you go live.',
                  },
                ]).map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{index + 1}. {item.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCoachmarks(false);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Close for now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCoachmarks(false);
                    try {
                      window.localStorage.setItem('builder_coachmarks_seen_v1', '1');
                    } catch {
                      // Non-persistent environments can still dismiss the guide for this session.
                    }
                  }}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
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
