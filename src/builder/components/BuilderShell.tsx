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
import { getBuilderWorkbenchGuidance } from './builderWorkbenchGuidance';
import { getBuilderPageEditingSummary } from './builderPageEditingSummary';
import { getPublishGuidance } from './builderPublishGuidance';
import { buildBuilderDraftContinuityModel } from './builderDraftContinuity';
import { runBuilderPageEditingAction } from './builderPageEditingActions';
import { builderProjectService } from '../services/builderProjectService';

interface BuilderShellProps {
  initialProject: BuilderProject;
  initialWeddingData?: WeddingDataV1;
  projectName?: string;
  isDemoMode?: boolean;
  onSave?: (project: BuilderProject, weddingData?: WeddingDataV1 | null) => Promise<BuilderProject>;
  onPublish?: (projectId: string) => Promise<{ version: number; publishedAt: string }>;
  onRestoreRevision?: (revisionId: string) => Promise<{ project: BuilderProject; weddingData?: WeddingDataV1 | null } | null>;
}

export const BuilderShell: React.FC<BuilderShellProps> = ({ 
  initialProject,
  initialWeddingData,
  projectName,
  isDemoMode = false,
  onSave,
  onPublish,
  onRestoreRevision,
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
  const [revisions, setRevisions] = useState(() => builderProjectService.listProjectRevisions(initialProject.weddingId));
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const shouldAutoPublishRef = useRef(shouldAutoPublishFromSearch(window.location.search));

  const refreshRevisionHistory = useCallback(() => {
    setRevisions(builderProjectService.listProjectRevisions(initialProject.weddingId));
  }, [initialProject.weddingId]);

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
  const activePageEditingSummary = useMemo(
    () => (activePage ? getBuilderPageEditingSummary(activePage.title, activePage.sections) : null),
    [activePage],
  );
  const workbenchGuidance = useMemo(
    () => getBuilderWorkbenchGuidance({
      activePageTitle: activePage?.title ?? null,
      sectionCount: activePage?.sections.length ?? 0,
      selectedSectionLabel: selectedSection ? `${selectedSection.type.charAt(0).toUpperCase()}${selectedSection.type.slice(1)}` : null,
      pageRecoveryState: !selectedSection
        ? (activePageEditingSummary?.missingEssentialLabels.length ?? 0) > 0
          ? 'missing-essentials'
          : (activePageEditingSummary?.hiddenCount ?? 0) > 0
            ? 'hidden-recovery'
            : (activePageEditingSummary?.totalCount ?? 0) === 0
              ? 'empty'
              : 'refine'
        : 'refine',
      pagePrimaryActionLabel: !selectedSection ? activePageEditingSummary?.primaryAction.label ?? null : null,
      missingEssentialLabel: !selectedSection ? activePageEditingSummary?.missingEssentialLabels[0] ?? null : null,
      hiddenSectionLabel: !selectedSection && activePageEditingSummary?.primaryAction.kind === 'select-section'
        ? activePageEditingSummary.primaryAction.label.replace(/^Review hidden /, '')
        : null,
      mode: state.mode,
      inspectorHidden,
      isDirty: state.isDirty,
    }),
    [activePage?.sections.length, activePage?.title, activePageEditingSummary, inspectorHidden, selectedSection, state.isDirty, state.mode],
  );
  const draftContinuity = useMemo(
    () => buildBuilderDraftContinuityModel({
      revisions,
      isDirty: state.isDirty,
      isSaving: state.isSaving,
      isPublishing: state.isPublishing,
      publishedVersion: state.project?.publishedVersion ?? null,
    }),
    [revisions, state.isDirty, state.isPublishing, state.isSaving, state.project?.publishedVersion],
  );

  const handleSave = useCallback(async (): Promise<boolean> => {
    const currentState = stateRef.current;
    if (!currentState.project || !onSave) return true;
    setSaveError(null);
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      const savedProject = await onSave(currentState.project, currentState.weddingData);
      dispatch(builderActions.markSaved(savedProject.meta.updatedAtISO ?? new Date().toISOString(), savedProject));
      refreshRevisionHistory();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setSaveError(msg);
      dispatch({ type: 'SET_SAVING', payload: false });
      return false;
    }
  }, [onSave, refreshRevisionHistory]);

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
      refreshRevisionHistory();
      setPublishNotice(`Live site updated successfully (v${publishMeta.version})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to make the site live';
      setPublishError(msg);
      dispatch({ type: 'SET_PUBLISHING', payload: false });
    }
  }, [onPublish, handleSave, refreshRevisionHistory]);

  const handleRestoreRevision = useCallback(async (revisionId: string) => {
    if (!onRestoreRevision || restoringRevisionId) return;
    setRestoringRevisionId(revisionId);
    setPublishError(null);
    setSaveError(null);
    try {
      const restored = await onRestoreRevision(revisionId);
      if (!restored?.project) {
        setPublishError('That local checkpoint is no longer available.');
        return;
      }

      dispatch({ type: 'LOAD_PROJECT', payload: restored.project });
      if (restored.weddingData) {
        dispatch({ type: 'SET_WEDDING_DATA', payload: restored.weddingData });
      }
      dispatch(builderActions.setMode('edit'));
      dispatch(builderActions.selectSection(null));
      dispatch(builderActions.markSaved(restored.project.meta.updatedAtISO ?? new Date().toISOString(), restored.project));
      refreshRevisionHistory();
      setPublishNotice('Restored a local Builder checkpoint. Review the draft, then keep going from this steadier base.');
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Could not restore that local checkpoint.');
    } finally {
      setRestoringRevisionId(null);
    }
  }, [onRestoreRevision, refreshRevisionHistory, restoringRevisionId]);

  const handleLaunchConfidenceAction = useCallback(() => {
    if (!launchConfidence) return;
    if (launchConfidence.primaryAction.kind === 'fix') {
      if (launchConfidence.primaryAction.target === 'itinerary') {
        window.location.assign('/dashboard/itinerary#itinerary-readiness');
        return;
      }
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

  const handleDraftContinuityAction = useCallback(async () => {
    if (draftContinuity.primaryAction.kind === 'save') {
      await handleSave();
      return;
    }
    if (draftContinuity.primaryAction.kind === 'publish') {
      await handlePublish();
      return;
    }
    if (draftContinuity.primaryAction.kind === 'restore' && draftContinuity.primaryAction.revisionId) {
      await handleRestoreRevision(draftContinuity.primaryAction.revisionId);
    }
  }, [draftContinuity.primaryAction, handlePublish, handleRestoreRevision, handleSave]);

  const handleWorkbenchAction = useCallback(async () => {
    switch (workbenchGuidance.primaryAction.kind) {
      case 'switch-to-edit':
        dispatch(builderActions.setMode('edit'));
        return;
      case 'switch-to-preview':
        dispatch(builderActions.setMode('preview'));
        setPublishNotice('Preview mode is open so you can verify the guest-facing read before making more edits.');
        return;
      case 'show-inspector':
        setInspectorHidden(false);
        return;
      case 'save-draft':
        await handleSave();
        return;
      case 'select-first-section': {
        const firstSection = activePage?.sections
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .find((section) => section.enabled) ?? activePage?.sections
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)[0];

        if (!firstSection) return;
        dispatch(builderActions.selectSection(firstSection.id));
        setInspectorHidden(false);
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-section-id="${firstSection.id}"]`);
          if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
      }
      case 'apply-page-recovery': {
        if (!activePage || !activePageEditingSummary) return;
        runBuilderPageEditingAction({
          action: activePageEditingSummary.primaryAction,
          activePageId: activePage.id,
          dispatch,
          revealInspector: () => setInspectorHidden(false),
        });
        return;
      }
    }
  }, [activePage, activePageEditingSummary, dispatch, handleSave, workbenchGuidance.primaryAction.kind]);

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
  }, [state.isDirty, state.project, state.weddingData, handleFixPublishBlockers, handlePublish]);

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
          <div id="builder-concierge" className="border-t border-border/30 bg-white/90 px-4 py-3 shadow-[0_-6px_18px_rgba(15,23,42,0.04)]">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Builder concierge</p>
                  <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
                    {conciergePlan.confidenceLabel}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{conciergePlan.heading}</p>
                  <p className="mt-1 text-sm text-text-secondary">{conciergePlan.summary}</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Workbench status</p>
                    <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
                      {workbenchGuidance.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-text-primary">{workbenchGuidance.heading}</p>
                  <p className="mt-1 text-sm text-text-secondary">{workbenchGuidance.summary}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Main focus</p>
                    <p className="mt-1 text-sm font-medium text-text-primary">{workbenchGuidance.focusTitle}</p>
                    <p className="mt-2 text-xs leading-5 text-text-secondary">{workbenchGuidance.focusDetail}</p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Best next move</p>
                    <p className="mt-1 text-sm font-medium text-text-primary">{workbenchGuidance.bestNextMove}</p>
                    <div className="mt-3 border-t border-border-subtle pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Decision rule</p>
                      <p className="mt-1 text-sm leading-5 text-text-secondary">{workbenchGuidance.decisionRule}</p>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Watchout</p>
                      <p className="mt-1 text-sm leading-5 text-text-secondary">{workbenchGuidance.watchout}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleWorkbenchAction();
                    }}
                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    {workbenchGuidance.primaryAction.label}
                  </button>
                  <span className="text-xs text-text-tertiary">{conciergePlan.guestPromise}</span>
                </div>
              </div>
              <div className="grid gap-3 text-sm lg:max-w-2xl">
                <div className="grid gap-2 md:grid-cols-3">
                  {[
                    { id: 'current', title: 'Current', detail: workbenchGuidance.currentStep, status: 'current' as const },
                    { id: 'next', title: 'Next', detail: workbenchGuidance.nextStep, status: 'next' as const },
                    { id: 'then', title: 'Then', detail: workbenchGuidance.thenStep, status: 'then' as const },
                  ].map((item) => (
                    <div key={item.id} className="rounded-xl border border-border-subtle bg-surface-subtle/40 px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-text-primary">{item.title}</p>
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
                      <p className="mt-2 text-[11px] leading-5 text-text-secondary">{item.detail}</p>
                    </div>
                  ))}
                </div>
                {conciergePlan.watchouts.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Guest promise guardrails</p>
                    <div className="mt-2 space-y-1.5">
                      {conciergePlan.watchouts.map((watchout) => (
                        <p key={watchout} className="text-xs leading-5 text-amber-800">{watchout}</p>
                      ))}
                    </div>
                  </div>
                )}
                {launchConfidence && (
                  <div id="launch-confidence" className="rounded-2xl border border-border-subtle bg-white px-4 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
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
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Main focus</p>
                            <p className="mt-1 text-sm font-medium text-text-primary">{launchConfidence.current}</p>
                          </div>
                          <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Best next move</p>
                            <p className="mt-1 text-sm font-medium text-text-primary">{launchConfidence.next}</p>
                            <div className="mt-3 border-t border-border-subtle pt-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Decision rule</p>
                              <p className="mt-1 text-sm leading-5 text-text-secondary">{launchConfidence.decisionRule}</p>
                              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Watchout</p>
                              <p className="mt-1 text-sm leading-5 text-text-secondary">{launchConfidence.watchout}</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                          {launchConfidence.sequence.map((step) => (
                            <div key={`${step.status}-${step.label}`} className="rounded-xl border border-border-subtle bg-surface-subtle/40 px-3 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-text-primary">{step.label}</p>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  step.status === 'current'
                                    ? 'border border-primary/20 bg-primary-light text-primary'
                                    : step.status === 'next'
                                      ? 'border border-warning/20 bg-warning-light text-warning'
                                      : 'border border-border-subtle bg-white text-text-secondary'
                                }`}>
                                  {getFlowStatusLabel(step.status)}
                                </span>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
                            </div>
                          ))}
                        </div>
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
                <div id="draft-continuity" className="rounded-2xl border border-border-subtle bg-white px-4 py-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Draft continuity</p>
                        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
                          {draftContinuity.badge}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-text-primary">{draftContinuity.heading}</p>
                      <p className="text-sm text-text-secondary">{draftContinuity.summary}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Main focus</p>
                          <p className="mt-1 text-sm font-medium text-text-primary">{draftContinuity.focusTitle}</p>
                          <p className="mt-2 text-xs leading-5 text-text-secondary">{draftContinuity.focusDetail}</p>
                        </div>
                        <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Best next move</p>
                          <p className="mt-1 text-sm font-medium text-text-primary">{draftContinuity.bestNextMove}</p>
                          <div className="mt-3 border-t border-border-subtle pt-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Decision rule</p>
                            <p className="mt-1 text-sm leading-5 text-text-secondary">{draftContinuity.decisionRule}</p>
                            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Watchout</p>
                            <p className="mt-1 text-sm leading-5 text-text-secondary">{draftContinuity.watchout}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2 md:grid-cols-3">
                        {[
                          { title: 'Current', detail: draftContinuity.currentStep, status: 'current' as const },
                          { title: 'Next', detail: draftContinuity.nextStep, status: 'next' as const },
                          { title: 'Then', detail: draftContinuity.thenStep, status: 'then' as const },
                        ].map((step) => (
                          <div key={`${step.status}-${step.title}`} className="rounded-xl border border-border-subtle bg-surface-subtle/40 px-3 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-text-primary">{step.title}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                step.status === 'current'
                                  ? 'border border-primary/20 bg-primary-light text-primary'
                                  : step.status === 'next'
                                    ? 'border border-warning/20 bg-warning-light text-warning'
                                    : 'border border-border-subtle bg-white text-text-secondary'
                              }`}>
                                {getFlowStatusLabel(step.status)}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="lg:pl-4">
                      {draftContinuity.primaryAction.kind !== 'none' && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleDraftContinuityAction();
                          }}
                          disabled={restoringRevisionId !== null}
                          className={`rounded-lg px-3 py-2 text-sm font-medium ${
                            draftContinuity.primaryAction.kind === 'restore'
                              ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'bg-gray-900 text-white hover:bg-gray-800'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {restoringRevisionId && draftContinuity.primaryAction.kind === 'restore'
                            ? 'Restoring…'
                            : draftContinuity.primaryAction.label}
                        </button>
                      )}
                    </div>
                  </div>
                  {draftContinuity.events.length > 0 && (
                    <div className="mt-4 grid gap-2">
                      {draftContinuity.events.map((event) => (
                        <div key={event.id} className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-text-primary">{event.title}</p>
                                <span className="rounded-full border border-border-subtle bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                                  {event.badge}
                                </span>
                              </div>
                              <p className="mt-1 text-xs leading-5 text-text-secondary">{event.detail}</p>
                            </div>
                            <button
                              type="button"
                              disabled={!event.canRestore || !onRestoreRevision || restoringRevisionId !== null}
                              onClick={() => {
                                if (!event.canRestore) return;
                                void handleRestoreRevision(event.id);
                              }}
                              className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {restoringRevisionId === event.id ? 'Restoring…' : event.restoreLabel}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{workbenchGuidance.heading}</h3>
                <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
                  {workbenchGuidance.badge}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {workbenchGuidance.summary}
              </p>
              <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-900">Main focus</p>
                <p className="mt-1 text-sm font-medium text-sky-950">{workbenchGuidance.focusTitle}</p>
                <p className="mt-1 text-sm text-sky-800">{workbenchGuidance.focusDetail}</p>
              </div>
              <div className="mt-4 space-y-3">
                {workbenchGuidance.checklist.map((item, index) => (
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
                    void handleWorkbenchAction();
                    setShowCoachmarks(false);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {workbenchGuidance.primaryAction.label}
                </button>
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
