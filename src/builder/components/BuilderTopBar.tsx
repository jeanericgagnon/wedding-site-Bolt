import React from 'react';
import {
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Save,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Files,
  FilePlus2,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { getSectionManifest } from '../registry/sectionManifests';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { getPublishBlockedHints, shouldOpenPhotoTipsFromSearch } from '../utils/publishUiHints';
import { selectUndoRedo, selectIsPreviewMode, selectPublishStatus, selectIsDirty } from '../state/builderSelectors';
import { getPublishStateDescriptor } from '../../lib/publishState';
import { SITE_VISIBILITY_COPY } from '../../lib/siteVisibilityState';
import { getFlowStatusLabel } from '../../lib/flowLabels';
import { BuilderPage } from '../../types/builder/project';
import { getBuilderPageEditingSummary } from './builderPageEditingSummary';
import { BuilderPageManagerAction, getBuilderPageManagerGuidance } from './builderPageManagerGuidance';
import { getBuilderPreviewReviewSummary } from './builderPreviewReviewSummary';
import {
  formatPublishedAt,
  formatSavedAt,
  getBuilderCommandCenterCopy,
  getPageManagerSummary,
  getPublishBlockerUiState,
  toValidTopBarTimestamp,
} from './builderTopBarModel';

interface BuilderTopBarProps {
  onSave: () => void;
  onPublish: () => void;
  onFixPublishBlockers?: () => void;
  projectName?: string;
  saveError?: string | null;
  publishError?: string | null;
  publishAttemptedAt?: string | null;
  publishValidationError?: string | null;
  publishIssueKind?: string | null;
  inspectorHidden?: boolean;
  onToggleInspector?: () => void;
}

function slugifyPage(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);
}

export const BuilderTopBar: React.FC<BuilderTopBarProps> = ({
  onSave,
  onPublish,
  onFixPublishBlockers,
  projectName,
  saveError,
  publishError,
  publishAttemptedAt,
  publishValidationError,
  publishIssueKind,
  inspectorHidden = false,
  onToggleInspector,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useBuilderContext();
  const undoRedo = selectUndoRedo(state);
  const isPreview = selectIsPreviewMode(state);
  const publishStatus = selectPublishStatus(state);
  const isDirty = selectIsDirty(state);
  const previewViewport = state.previewViewport;

  const publishedAt = state.project?.lastPublishedAt ?? null;
  const publishedVersion = state.project?.publishedVersion ?? null;
  const isPublished = publishStatus === 'published';
  const projectPages = React.useMemo(() => state.project?.pages ?? [], [state.project?.pages]);
  const activePage = projectPages.find((p) => p.id === state.activePageId) ?? null;
  const {
    hasHardPublishBlocker,
    effectivePublishValidationError,
    canAutoSaveBeforePublish,
  } = getPublishBlockerUiState({ publishValidationError, publishIssueKind });
  const isPublishDisabled = state.isPublishing || state.isSaving || hasHardPublishBlocker;
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
  const [showBlockedDetails, setShowBlockedDetails] = React.useState(false);
  const [showPageManager, setShowPageManager] = React.useState(false);
  const [pagePendingDelete, setPagePendingDelete] = React.useState<BuilderPage | null>(null);
  const [newPageTitle, setNewPageTitle] = React.useState('');
  const [showPhotoTips, setShowPhotoTips] = React.useState(() => shouldOpenPhotoTipsFromSearch(location.search));
  const blockedHints = React.useMemo(() => getPublishBlockedHints(effectivePublishValidationError), [effectivePublishValidationError]);
  const [showPublishChecklist, setShowPublishChecklist] = React.useState(false);

  const checklistItems = React.useMemo(() => {
    const items: Array<{ label: string; done: boolean; detail?: string }> = [];
    items.push({ label: 'At least one page exists', done: projectPages.length > 0, detail: projectPages.length > 0 ? `${projectPages.length} page${projectPages.length === 1 ? '' : 's'}` : 'Add a page from Pages.' });
    items.push({
      label: 'Current page has at least one section',
      done: (activePage?.sections?.length ?? 0) > 0,
      detail: (activePage?.sections?.length ?? 0) > 0
        ? `${activePage?.sections?.length ?? 0} section(s) on ${activePage?.title ?? 'current page'}`
        : `No sections on ${activePage?.title ?? 'current page'} — add one from the right panel.`,
    });
    items.push({ label: 'No active go-live blockers', done: !hasHardPublishBlocker, detail: effectivePublishValidationError ?? 'Ready to go live.' });
    items.push({ label: 'Latest edits are saved', done: !isDirty, detail: isDirty ? 'Save your latest changes before going live.' : 'All changes saved.' });
    return items;
  }, [projectPages.length, activePage?.sections?.length, activePage?.title, hasHardPublishBlocker, effectivePublishValidationError, isDirty]);
  const checklistDoneCount = checklistItems.filter((i) => i.done).length;
  const publishState = getPublishStateDescriptor({
    isPublished,
    isPublishing: state.isPublishing,
    hasUnsavedChanges: isDirty,
    error: publishError || effectivePublishValidationError || null,
  });
  const publishToneClass = publishState.tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : publishState.tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : publishState.tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-gray-200 bg-gray-50 text-gray-700';
  const commandCenterCopy = getBuilderCommandCenterCopy({
    projectName,
    activePageTitle: activePage?.title ?? null,
    pageCount: projectPages.length,
    sectionCount: activePage?.sections?.length ?? 0,
    isDirty,
    hasHardPublishBlocker,
    publishValidationError: effectivePublishValidationError,
    canAutoSaveBeforePublish,
    isPublished,
    publishedVersion,
    publishAttemptedAt,
  });
  const pageManagerSummary = React.useMemo(
    () => getPageManagerSummary(projectPages, state.activePageId),
    [projectPages, state.activePageId],
  );
  const pageManagerGuidance = React.useMemo(
    () => getBuilderPageManagerGuidance(projectPages, state.activePageId),
    [projectPages, state.activePageId],
  );
  const activePageEditingSummary = React.useMemo(
    () => (activePage ? getBuilderPageEditingSummary(activePage.title, activePage.sections) : null),
    [activePage],
  );
  const previewReview = React.useMemo(
    () => (
      activePage
        ? getBuilderPreviewReviewSummary({
            activePageTitle: activePage.title,
            sectionCount: activePage.sections.length,
            previewViewport,
            hasHardPublishBlocker,
            canAutoSaveBeforePublish,
            isDirty,
            isPublished,
          })
        : null
    ),
    [activePage, canAutoSaveBeforePublish, hasHardPublishBlocker, isDirty, isPublished, previewViewport],
  );

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('photoTips') !== '1') return;
    setShowPhotoTips(true);
    params.delete('photoTips');
    navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${location.hash}`, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  React.useEffect(() => {
    if (!showPhotoTips) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPhotoTips(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPhotoTips]);

  React.useEffect(() => {
    if (!showPublishChecklist) return;
    if (checklistDoneCount === checklistItems.length) {
      const t = window.setTimeout(() => setShowPublishChecklist(false), 900);
      return () => window.clearTimeout(t);
    }
  }, [showPublishChecklist, checklistDoneCount, checklistItems.length]);

  const handlePageManagerAction = React.useCallback((action: BuilderPageManagerAction) => {
    switch (action.kind) {
      case 'add-page':
        dispatch(builderActions.addPage(projectPages.length === 0 ? 'Home' : undefined));
        return;
      case 'open-page':
        dispatch(builderActions.setActivePage(action.pageId));
        setShowPageManager(false);
        return;
      case 'fill-empty-page':
        dispatch(builderActions.setActivePage(action.pageId));
        dispatch(builderActions.addSectionByType(action.pageId, 'hero'));
        setShowPageManager(false);
        return;
      default:
        return;
    }
  }, [dispatch, projectPages.length]);

  const handlePreviewPrimaryAction = React.useCallback(() => {
    if (!previewReview) return;
    switch (previewReview.primaryAction.kind) {
      case 'switch-to-edit':
        dispatch(builderActions.setMode('edit'));
        return;
      case 'save-draft':
        onSave();
        return;
      case 'fix-blockers':
        onFixPublishBlockers?.();
        setShowPublishChecklist(true);
        setShowBlockedDetails(true);
        return;
      case 'publish':
        onPublish();
        return;
      case 'switch-viewport':
        if (previewReview.primaryAction.viewport) {
          dispatch(builderActions.setPreviewViewport(previewReview.primaryAction.viewport));
        }
        return;
      default:
        return;
    }
  }, [dispatch, onFixPublishBlockers, onPublish, onSave, previewReview]);

  return (
    <>
    <header className="min-h-[42px] bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)] flex items-center flex-wrap md:flex-nowrap px-2 md:px-2.5 py-1 gap-1 z-50 sticky top-0">
      <button
        onClick={() => {
          if (isDirty) {
            setShowLeaveConfirm(true);
            return;
          }
          navigate('/dashboard');
        }}
        title="Back to Dashboard"
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[12px] text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        <ArrowLeft size={15} />
        <span className="hidden sm:inline">Exit</span>
      </button>


      <button
        type="button"
        onClick={() => setShowPageManager(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
      >
        <Files size={13} />
        Pages · {projectPages.length}
      </button>

      <div className={`hidden min-w-0 md:flex md:max-w-[360px] md:flex-1 md:items-center md:gap-3 md:rounded-lg md:border md:px-3 md:py-1.5 ${publishToneClass}`}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold">{commandCenterCopy.title}</p>
          <p className="truncate text-[11px] opacity-80">{commandCenterCopy.summary}</p>
        </div>
        <div className="min-w-0 flex-[1.2] border-l border-current/15 pl-3">
          <p className="text-[11px] font-semibold">{commandCenterCopy.status}</p>
          <p className="truncate text-[11px] opacity-80">{commandCenterCopy.detail}</p>
        </div>
      </div>

      <div className="relative group">
        <button
          onClick={() => dispatch(builderActions.undo())}
          disabled={!undoRedo.canUndo}
          title={`Undo${undoRedo.undoLabel ? `: ${undoRedo.undoLabel}` : ''} (⌘Z)`}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors"
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => dispatch(builderActions.redo())}
          disabled={!undoRedo.canRedo}
          title={`Redo${undoRedo.redoLabel ? `: ${undoRedo.redoLabel}` : ''} (⌘⇧Z)`}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors"
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="flex-1" />

      <div className="ml-auto flex w-full sm:w-auto items-center justify-end gap-2">
        <div className="flex items-center gap-1.5">
          {state.isSaving ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-700">
              <Loader2 size={12} className="animate-spin" />
              Saving
            </span>
          ) : saveError ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700" title={saveError}>
              <XCircle size={12} />
              Save failed
            </span>
          ) : isDirty ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
              <AlertCircle size={12} />
              Unsaved
            </span>
          ) : state.lastSavedAt ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700" title={`Last saved: ${toValidTopBarTimestamp(state.lastSavedAt)?.toLocaleString() ?? 'Unknown time'}`}>
              <CheckCircle2 size={12} />
              {formatSavedAt(state.lastSavedAt)}
            </span>
          ) : null}
          {!state.isPublishing && !publishError && isPublished && publishedAt ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700" title={`Published: ${toValidTopBarTimestamp(publishedAt)?.toLocaleString() ?? 'Unknown time'}`}>
              <Clock size={12} />
              {formatPublishedAt(publishedAt)}
            </span>
          ) : null}
        </div>
        {onToggleInspector && (
          <button
            type="button"
            onClick={onToggleInspector}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-2 py-1 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
            title={inspectorHidden ? 'Exit full screen' : 'Full screen canvas'}
          >
            {inspectorHidden ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
            {inspectorHidden ? 'Show panel' : 'Full screen'}
          </button>
        )}
        <button
          type="button"
          onClick={() => dispatch(builderActions.setMode(isPreview ? 'edit' : 'preview'))}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[12px] font-medium transition-colors ${
            isPreview
              ? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {isPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          {isPreview ? 'Edit' : 'Preview'}
        </button>
        <button
          type="button"
          onClick={() => setShowPublishChecklist((value) => !value)}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[12px] font-medium transition-colors ${
            checklistDoneCount === checklistItems.length
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <CheckCircle2 size={13} />
          Launch check {checklistDoneCount}/{checklistItems.length}
        </button>
        <button
          onClick={() => {
            if (hasHardPublishBlocker) {
              setShowPublishChecklist(true);
              setShowBlockedDetails(true);
              return;
            }
            onPublish();
          }}
          disabled={isPublishDisabled}
          className="flex items-center gap-1 px-3 py-1 rounded-md text-[12px] font-medium bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state.isPublishing || state.isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Globe size={14} />
          )}
          {state.isPublishing ? 'Going live…' : 'Go live'}
          </button>
        </div>

        <div className={`w-full rounded-lg border px-3 py-2 text-[11px] md:hidden ${publishToneClass}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{commandCenterCopy.title}</p>
              <p className="truncate opacity-80">{commandCenterCopy.summary}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold">
              {commandCenterCopy.status}
            </span>
          </div>
          <p className="mt-1 opacity-90">{commandCenterCopy.detail}</p>
        </div>

        {(isPreview || showPublishChecklist || (showBlockedDetails && effectivePublishValidationError)) && (
          <div className="w-full space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            {isPreview && previewReview && (
              <div className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Preview rehearsal</p>
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800">
                        {previewReview.badge}
                      </span>
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                        {previewViewport === 'desktop' ? 'Desktop' : previewViewport === 'tablet' ? 'Tablet' : 'Mobile'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{previewReview.heading}</p>
                      <p className="mt-1 text-sm text-gray-600">{previewReview.summary}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handlePreviewPrimaryAction}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        previewReview.primaryAction.kind === 'publish'
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {previewReview.primaryAction.label}
                    </button>
                    {isPreview && (
                      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                        {[
                          { viewport: 'desktop' as const, label: 'Desktop', icon: Monitor },
                          { viewport: 'tablet' as const, label: 'Tablet', icon: Tablet },
                          { viewport: 'mobile' as const, label: 'Mobile', icon: Smartphone },
                        ].map((option) => {
                          const Icon = option.icon;
                          const active = previewViewport === option.viewport;
                          return (
                            <button
                              key={option.viewport}
                              type="button"
                              onClick={() => dispatch(builderActions.setPreviewViewport(option.viewport))}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                                active
                                  ? 'bg-gray-900 text-white'
                                  : 'text-gray-600 hover:bg-white'
                              }`}
                            >
                              <Icon size={12} />
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-900">Main focus</p>
                    <p className="mt-1 text-sm font-medium text-sky-950">{previewReview.focusTitle}</p>
                    <p className="mt-2 text-xs leading-5 text-sky-800">{previewReview.focusDetail}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Best next move</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{previewReview.bestNextMove}</p>
                    <p className="mt-3 text-xs leading-5 text-gray-600">
                      <span className="font-semibold text-gray-900">Decision rule:</span> {previewReview.decisionRule}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-gray-600">
                      <span className="font-semibold text-gray-900">Watchout:</span> {previewReview.watchout}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {previewReview.sequence.map((step) => (
                    <div key={`${step.status}-${step.label}`} className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-900">{step.label}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          step.status === 'current'
                            ? 'border border-primary/20 bg-primary-light text-primary'
                            : step.status === 'next'
                              ? 'border border-warning/20 bg-warning-light text-warning'
                              : 'border border-gray-200 bg-gray-50 text-gray-600'
                        }`}>
                          {getFlowStatusLabel(step.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-gray-600">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showBlockedDetails && effectivePublishValidationError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">{effectivePublishValidationError}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                  {blockedHints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              </div>
            )}

            {showPublishChecklist && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">What is left before guest-facing launch</p>
                    <p className="mt-1 text-xs text-gray-500">{SITE_VISIBILITY_COPY.draftExplainer} {SITE_VISIBILITY_COPY.publishedExplainer}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPublishChecklist(false)}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Hide checklist
                  </button>
                </div>
                <ul className="mt-3 space-y-2">
                  {checklistItems.map((item) => (
                    <li key={item.label} className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 ${item.done ? 'text-emerald-600' : 'text-amber-600'}`}>{item.done ? '✓' : '•'}</span>
                        <div className="text-xs leading-5">
                          <p className="font-medium text-gray-900">{item.label}</p>
                          {item.detail ? <p className={item.done ? 'text-gray-500' : 'text-amber-700'}>{item.detail}</p> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!item.done && item.label === 'Latest edits are saved' && (
                          <button onClick={() => { onSave(); setShowPublishChecklist(false); }} className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-100">Save now</button>
                        )}
                        {!item.done && item.label === 'No active go-live blockers' && onFixPublishBlockers && (
                          <button onClick={() => { onFixPublishBlockers(); setShowPublishChecklist(false); }} className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-100">Fix next</button>
                        )}
                        {!item.done && item.label === 'At least one page exists' && (
                          <button
                            onClick={() => {
                              dispatch(builderActions.addPage('Home'));
                              setShowPublishChecklist(false);
                            }}
                            className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
                          >
                            Add first page
                          </button>
                        )}
                        {!item.done && item.label === 'Current page has at least one section' && (
                          <button
                            onClick={() => {
                              const pageId = state.activePageId;
                              if (!pageId) {
                                setShowPageManager(true);
                                setShowPublishChecklist(false);
                                return;
                              }
                              dispatch(builderActions.addSectionByType(pageId, 'hero'));
                              setShowPublishChecklist(false);
                            }}
                            className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
                          >
                            Add first section
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      <div className="hidden">
        <div className="ml-auto flex w-full sm:w-auto items-center justify-end gap-2">
          <label htmlFor="mobile-section-nav" className="text-xs text-gray-500 whitespace-nowrap">Jump to section</label>
          <select
            id="mobile-section-nav"
            value={state.selectedSectionId ?? ''}
            onChange={(e) => {
              const sectionId = e.target.value || null;
              dispatch(builderActions.selectSection(sectionId));
              if (sectionId) {
                requestAnimationFrame(() => {
                  const el = document.querySelector(`[data-section-id="${sectionId}"]`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }
            }}
            className="w-full px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <option value="">Top of page</option>
            {(activePage?.sections ?? []).map((section, idx) => (
              <option key={section.id} value={section.id}>
                {idx + 1}. {getSectionManifest(section.type).label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden">
        {(activePage?.sections ?? []).slice(0, 8).map((section, idx) => {
          const isSelected = state.selectedSectionId === section.id;
          return (
            <button
              key={section.id}
              onClick={() => {
                dispatch(builderActions.selectSection(section.id));
                requestAnimationFrame(() => {
                  const el = document.querySelector(`[data-section-id="${section.id}"]`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              className={`px-2 py-1 rounded-md text-xs whitespace-nowrap border transition-colors ${
                isSelected
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              title={getSectionManifest(section.type).label}
            >
              {idx + 1}. {getSectionManifest(section.type).label}
            </button>
          );
        })}
      </div>

      <div className="hidden">
        {state.isSaving && (
          <span className="hidden sm:flex text-xs text-gray-500 items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            Saving…
          </span>
        )}
        {!state.isSaving && saveError && (
          <span className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 px-2 py-1 rounded-md" title={saveError}>
            <XCircle size={12} />
            Save failed — try again
          </span>
        )}
        {!state.isSaving && !saveError && state.lastSavedAt && !isDirty && (
          <span className="hidden sm:flex text-xs text-green-700 items-center gap-1.5 bg-green-50 border border-green-200 px-2 py-1 rounded-md" title={`Last saved: ${toValidTopBarTimestamp(state.lastSavedAt)?.toLocaleString() ?? 'Unknown time'}`}>
            <CheckCircle2 size={12} className="text-green-500" />
            {formatSavedAt(state.lastSavedAt)}
          </span>
        )}
        {!state.isSaving && !saveError && isDirty && (
          <span className="hidden sm:flex text-xs text-amber-600 items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
            <AlertCircle size={12} />
            Unsaved changes
          </span>
        )}

        {isPublished && publishedAt && !state.isPublishing && !publishError && (
          <span className="text-xs text-gray-500 flex items-center gap-1.5 border-l border-gray-200 pl-2" title={`Published: ${toValidTopBarTimestamp(publishedAt)?.toLocaleString() ?? 'Unknown time'}`}>
            <Clock size={11} />
            {formatPublishedAt(publishedAt)}
            {typeof publishedVersion === 'number' && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">v{publishedVersion}</span>
            )}
          </span>
        )}
        {publishError && !state.isPublishing && (
          <div className="flex items-center gap-2 border-l border-gray-200 pl-2">
            <span className="text-xs text-red-500 flex items-center gap-1.5" title={publishError}>
              <XCircle size={12} />
              Go-live failed
            </span>
            <button
              onClick={onPublish}
              disabled={isPublishDisabled}
              className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Retry
            </button>
          </div>
        )}

        {hasHardPublishBlocker && effectivePublishValidationError && !state.isPublishing && (
          <div className="items-center gap-1.5 hidden sm:flex">
            <span className="text-xs text-amber-700 items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md inline-flex" title={effectivePublishValidationError}>
              <AlertCircle size={12} />
              {SITE_VISIBILITY_COPY.draftBadge} still needs a few things
            </span>
            <button
              type="button"
              onClick={() => setShowBlockedDetails((v) => !v)}
              className="text-[11px] rounded border border-amber-300 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-50"
            >
              What is left?
            </button>
            {onFixPublishBlockers && (
              <button
                type="button"
                onClick={onFixPublishBlockers}
                className="text-[11px] rounded border border-amber-300 bg-amber-50 px-2 py-1 font-medium text-amber-800 hover:bg-amber-100"
              >
                Fix next
              </button>
            )}
          </div>
        )}

        {hasHardPublishBlocker && effectivePublishValidationError && !state.isPublishing && (
          <div className="sm:hidden w-full flex items-center justify-between rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
            <span className="truncate pr-2">{effectivePublishValidationError}</span>
            <button type="button" onClick={() => setShowBlockedDetails((v) => !v)} className="shrink-0 rounded border border-amber-300 bg-white px-1.5 py-0.5 font-medium">
              Left?
            </button>
            {onFixPublishBlockers && (
              <button type="button" onClick={onFixPublishBlockers} className="shrink-0 rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-50">
                Fix next
              </button>
            )}
          </div>
        )}

        {showBlockedDetails && effectivePublishValidationError && (
          <div className="w-full rounded border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-900">
            <p className="font-medium">{effectivePublishValidationError}</p>
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              {blockedHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowPublishChecklist((v) => !v)}
          className={`hidden inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium ${
            checklistDoneCount === checklistItems.length
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <CheckCircle2 size={12} />
          Go-live checklist {checklistDoneCount}/{checklistItems.length}
        </button>

        {showPublishChecklist && (
          <div className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 shadow-sm space-y-1 max-h-64 overflow-y-auto">
            <p className="font-semibold text-gray-800 mb-1">What is left before guest-facing launch</p>
            <p className="text-[11px] text-gray-500 mb-2">${SITE_VISIBILITY_COPY.draftExplainer} ${SITE_VISIBILITY_COPY.publishedExplainer}</p>
            <ul className="space-y-1">
              {checklistItems.map((item) => (
                <li key={item.label} className="flex items-start gap-1.5 justify-between">
                  <span className="flex items-start gap-1.5">
                    <span className={item.done ? 'text-emerald-600' : 'text-amber-600'}>{item.done ? '✓' : '•'}</span>
                    <span>
                      <span>{item.label}</span>
                      {item.detail ? <span className={item.done ? 'text-gray-500' : 'text-amber-700'}> — {item.detail}</span> : null}
                    </span>
                  </span>
                  {!item.done && item.label === 'Latest edits are saved' && (
                    <button onClick={() => { onSave(); setShowPublishChecklist(false); }} className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 transition-colors hover:bg-gray-100">Save now</button>
                  )}
                  {!item.done && item.label === 'No active go-live blockers' && onFixPublishBlockers && (
                    <button onClick={() => { onFixPublishBlockers(); setShowPublishChecklist(false); }} className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 transition-colors hover:bg-amber-100">Fix this</button>
                  )}
                  {!item.done && item.label === 'No active go-live blockers' && publishIssueKind === 'no-enabled-sections' && onFixPublishBlockers && (
                    <button onClick={() => { onFixPublishBlockers(); setShowPublishChecklist(false); }} className="rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 transition-colors hover:bg-sky-100">Open section</button>
                  )}
                  {!item.done && item.label === 'No active go-live blockers' && publishIssueKind === 'no-pages' && onFixPublishBlockers && (
                    <button onClick={() => { onFixPublishBlockers(); setShowPublishChecklist(false); }} className="rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 transition-colors hover:bg-sky-100">Choose a design</button>
                  )}
                  {!item.done && item.label === 'No active go-live blockers' && ['missing-couple-names', 'missing-event-date', 'missing-venue', 'rsvp-disabled'].includes(publishIssueKind ?? '') && onFixPublishBlockers && (
                    <button onClick={() => { onFixPublishBlockers(); setShowPublishChecklist(false); }} className="rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 transition-colors hover:bg-sky-100">Open guidance</button>
                  )}
                  {!item.done && item.label === 'At least one page exists' && (
                    <button
                      onClick={() => {
                        dispatch(builderActions.addPage('Home'));
                        setShowPublishChecklist(false);
                      }}
                      className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      Add first page
                    </button>
                  )}
                  {!item.done && item.label === 'Current page has at least one section' && (
                    <button
                      onClick={() => {
                        const pageId = state.activePageId;
                        if (!pageId) {
                          setShowPageManager(true);
                          setShowPublishChecklist(false);
                          return;
                        }
                        dispatch(builderActions.addSectionByType(pageId, 'hero'));
                        setShowPublishChecklist(false);
                      }}
                      className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      Add first section
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => dispatch(builderActions.setMode(isPreview ? 'edit' : 'preview'))}
          className={`hidden flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isPreview
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          {isPreview ? 'Exit preview' : 'Preview'}
        </button>

        {isPreview && (
          <div className="hidden">
            <button
              type="button"
              onClick={() => dispatch(builderActions.setPreviewViewport('desktop'))}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                previewViewport === 'desktop'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Monitor size={12} />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => dispatch(builderActions.setPreviewViewport('tablet'))}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                previewViewport === 'tablet'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Tablet size={12} />
              Tablet
            </button>
            <button
              type="button"
              onClick={() => dispatch(builderActions.setPreviewViewport('mobile'))}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                previewViewport === 'mobile'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Smartphone size={12} />
              Mobile
            </button>
          </div>
        )}

        <div className="hidden">
          <button
            onClick={onSave}
            disabled={state.isSaving || !isDirty}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              isDirty && !state.isSaving
                ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
                : 'bg-gray-100 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            aria-label="Save draft"
          >
            {state.isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {state.isSaving ? 'Saving…' : isDirty ? 'Save changes' : 'Saved'}
          </button>
          {!isDirty && !state.isSaving && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              All changes saved
            </div>
          )}
        </div>

        <div className="relative group">
          <button
            type="button"
            onClick={() => setShowPhotoTips((v) => !v)}
            aria-expanded={showPhotoTips}
            aria-controls="builder-photo-tips-panel"
            className="hidden inline-flex items-center rounded border border-sky-300 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-800 hover:bg-sky-100 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
            title="Show photo placement tips"
          >
            Photo tips
          </button>
          <button
            onClick={() => {
              if (hasHardPublishBlocker) {
                setShowPublishChecklist(true);
                setShowBlockedDetails(true);
                return;
              }
              onPublish();
            }}
            disabled={isPublishDisabled}
            aria-label={hasHardPublishBlocker && effectivePublishValidationError ? `Go live blocked: ${effectivePublishValidationError}` : canAutoSaveBeforePublish ? 'Save changes and go live' : 'Go live'}
              title={hasHardPublishBlocker && effectivePublishValidationError ? `${effectivePublishValidationError} (⌘⇧P)` : canAutoSaveBeforePublish ? 'Save your latest changes, then go live (⌘⇧P)' : 'Go live (⌘⇧P)'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {state.isPublishing || state.isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Globe size={14} />
            )}
            {state.isPublishing
              ? 'Going live…'
              : state.isSaving
                ? 'Waiting for save…'
                : isPublished
                  ? `Update guest-facing site${typeof publishedVersion === 'number' ? ` v${publishedVersion}` : ''}`
                  : 'Go live'}
          </button>
          <div className="absolute top-full right-0 mt-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 max-w-[260px] text-center">
            {hasHardPublishBlocker && effectivePublishValidationError
              ? effectivePublishValidationError
              : canAutoSaveBeforePublish
                ? 'Save your latest changes, then go live (⌘⇧P)'
                : isPublished
                ? 'Updates the live version guests can already see (⌘⇧P)'
                : 'Going live makes your site visible at your guest-facing DayOf URL (⌘⇧P)'}
          </div>
        </div>
      </div>
    </header>
    {showPageManager && (
      <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Pages</h3>
              <p className="text-[11px] text-gray-500 mt-1">Shape the site map, recover weak pages, and keep navigation honest before guests see it.</p>
            </div>
            <button type="button" onClick={() => setShowPageManager(false)} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Close</button>
          </div>

          <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)]">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Total pages</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{pageManagerSummary.totalPages}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Visible in nav</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{pageManagerSummary.visiblePages}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Hidden</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{pageManagerSummary.hiddenPages}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Empty pages</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{pageManagerSummary.emptyPages}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-900">Main focus</p>
                  <p className="mt-1 text-sm font-medium text-sky-950">{pageManagerGuidance.focusTitle}</p>
                  <p className="mt-1 text-xs text-sky-800">{pageManagerGuidance.focusDetail}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Best next move</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{pageManagerGuidance.bestNextMove}</p>
                  <p className="mt-2 text-xs text-gray-600">
                    <span className="font-semibold text-gray-900">Decision rule:</span> {pageManagerGuidance.decisionRule}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    <span className="font-semibold text-gray-900">Watchout:</span> {pageManagerGuidance.watchout}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageManagerAction(pageManagerGuidance.primaryAction)}
                      className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      {pageManagerGuidance.primaryAction.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageManagerAction(pageManagerGuidance.secondaryAction)}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {pageManagerGuidance.secondaryAction.label}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                {[
                  { label: 'Current', detail: pageManagerGuidance.currentStep },
                  { label: 'Next', detail: pageManagerGuidance.nextStep },
                  { label: 'Then', detail: pageManagerGuidance.thenStep },
                ].map((step) => (
                  <div key={step.label} className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">{step.label}</p>
                    <p className="mt-1 text-xs text-gray-600">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Current page brief</p>
              {activePage && activePageEditingSummary ? (
                <>
                  <p className="mt-1 text-sm font-medium text-gray-900">{activePageEditingSummary.focusTitle}</p>
                  <p className="mt-1 text-xs text-gray-600">{activePageEditingSummary.focusDetail}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-600">
                    <span className="rounded-full border border-gray-200 bg-white px-2 py-1 font-medium">{activePageEditingSummary.totalCount} sections</span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">{activePageEditingSummary.visibleCount} visible</span>
                    {activePageEditingSummary.hiddenCount > 0 && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700">{activePageEditingSummary.hiddenCount} hidden</span>
                    )}
                    {activePageEditingSummary.missingEssentialLabels.slice(0, 2).map((label) => (
                      <span key={label} className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 font-medium text-sky-800">Missing {label}</span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-gray-600">
                    <span className="font-semibold text-gray-900">Best next move:</span> {activePageEditingSummary.bestNextMove}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm font-medium text-gray-900">Choose a page to start shaping the site map.</p>
                  <p className="mt-1 text-xs text-gray-600">As soon as a page is active, this brief will call out its strongest next editing move.</p>
                </>
              )}
            </div>
          </div>

          <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex items-center gap-2">
              <input
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                placeholder="Page name"
                className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  dispatch(builderActions.addPage(newPageTitle || undefined));
                  setNewPageTitle('');
                }}
                className="inline-flex items-center gap-1 rounded bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
              >
                <FilePlus2 size={12} />
                Add page
              </button>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-gray-900">Page-map rule of thumb</p>
              <p className="mt-1 text-[11px] text-gray-600">Add pages when they answer a new guest question, not just when the nav still looks short.</p>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {projectPages.map((page, idx) => {
              const pageGuide = getBuilderPageEditingSummary(page.title, page.sections);

              return (
                <div key={page.id} className="px-3 py-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex-1 min-w-0 rounded-xl border px-3 py-3 ${state.activePageId === page.id ? 'border-rose-200 bg-rose-50/70' : 'border-gray-200 bg-white'}`}>
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              value={page.title}
                              onChange={(e) => {
                                const title = e.target.value;
                                dispatch(builderActions.updatePage(page.id, { title, slug: slugifyPage(title) || page.slug }));
                              }}
                              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none"
                              placeholder="Page title"
                            />
                            <button
                              type="button"
                              onClick={() => dispatch(builderActions.setActivePage(page.id))}
                              className={`rounded px-2 py-1 text-[11px] font-medium ${state.activePageId === page.id ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {state.activePageId === page.id ? 'Current' : 'Edit'}
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                            <label className="inline-flex min-w-[150px] items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 font-medium">
                              <span>/</span>
                              <input
                                value={page.slug}
                                onChange={(e) => dispatch(builderActions.updatePage(page.id, { slug: slugifyPage(e.target.value) || page.slug }))}
                                className="min-w-0 flex-1 bg-transparent outline-none"
                                placeholder="page-slug"
                              />
                            </label>
                            {page.meta.isHome ? <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 font-medium text-rose-700">Home</span> : null}
                            {page.meta.isHidden ? (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700">Hidden from nav</span>
                            ) : (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">In navigation</span>
                            )}
                            <span className="rounded-full border border-gray-200 bg-white px-2 py-1 font-medium">
                              {page.sections.length === 0 ? 'Empty page' : `${page.sections.length} section${page.sections.length === 1 ? '' : 's'}`}
                            </span>
                            {pageGuide.missingEssentialLabels.slice(0, 2).map((label) => (
                              <span key={`${page.id}-${label}`} className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 font-medium text-sky-800">
                                Missing {label}
                              </span>
                            ))}
                          </div>
                          <p className="mt-3 text-xs font-medium text-gray-900">{pageGuide.focusTitle}</p>
                          <p className="mt-1 text-xs text-gray-600">{pageGuide.bestNextMove}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:w-[220px] lg:justify-end">
                          <button
                            type="button"
                            onClick={() => dispatch(builderActions.setHomePage(page.id))}
                            disabled={page.meta.isHome}
                            className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                          >
                            {page.meta.isHome ? 'Home' : 'Make home'}
                          </button>
                          <button
                            type="button"
                            onClick={() => dispatch(builderActions.updatePage(page.id, { meta: { ...page.meta, isHidden: !page.meta.isHidden } }))}
                            className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
                          >
                            {page.meta.isHidden ? 'Show in nav' : 'Hide from nav'}
                          </button>
                          {page.sections.length === 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                dispatch(builderActions.setActivePage(page.id));
                                dispatch(builderActions.addSectionByType(page.id, 'hero'));
                                setShowPageManager(false);
                              }}
                              className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-100"
                            >
                              Add hero
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...projectPages];
                          if (idx === 0) return;
                          [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                          dispatch(builderActions.reorderPages(updated.map((p) => p.id)));
                        }}
                        disabled={idx === 0}
                        className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...projectPages];
                          if (idx === updated.length - 1) return;
                          [updated[idx + 1], updated[idx]] = [updated[idx], updated[idx + 1]];
                          dispatch(builderActions.reorderPages(updated.map((p) => p.id)));
                        }}
                        disabled={idx === projectPages.length - 1}
                        className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                      >
                        <ArrowDown size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => dispatch(builderActions.duplicatePage(page.id))}
                        className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPagePendingDelete(page)}
                        disabled={page.meta.isHome || projectPages.length <= 1}
                        className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
    {pagePendingDelete && (
      <div className="fixed inset-0 z-[75] bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Remove page?</h3>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium text-gray-800">{pagePendingDelete.title}</span> will be removed from this site map.
            {pagePendingDelete.sections.length > 0
              ? ` It currently has ${pagePendingDelete.sections.length} section${pagePendingDelete.sections.length === 1 ? '' : 's'}.`
              : ' It is currently empty.'}
          </p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPagePendingDelete(null)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch(builderActions.removePage(pagePendingDelete.id));
                setPagePendingDelete(null);
              }}
              className="rounded bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
            >
              Remove page
            </button>
          </div>
        </div>
      </div>
    )}
    {showLeaveConfirm && (
      <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Leave builder?</h3>
          <p className="mt-1 text-sm text-gray-600">You have unsaved changes. If you leave now, your latest edits may be lost.</p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Stay
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLeaveConfirm(false);
                navigate('/dashboard');
              }}
              className="rounded bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
            >
              Leave anyway
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
