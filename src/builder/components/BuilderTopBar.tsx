import React from 'react';
import {
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Save,
  Globe,
  ChevronDown,
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

export const getPublishBlockerUiState = ({
  publishValidationError,
  publishIssueKind,
}: {
  publishValidationError?: string | null;
  publishIssueKind?: string | null;
}) => {
  const hasHardPublishBlocker = Boolean(publishValidationError) && publishIssueKind !== 'unsaved-changes';

  return {
    hasHardPublishBlocker,
    effectivePublishValidationError: hasHardPublishBlocker ? publishValidationError ?? null : null,
    canAutoSaveBeforePublish: Boolean(publishValidationError) && publishIssueKind === 'unsaved-changes',
  };
};

function slugifyPage(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);
}

function toValidTopBarDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatSavedAt(iso: string): string {
  const d = toValidTopBarDate(iso);
  if (!d) return 'Saved time unknown';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 0) return 'Saved just now';
  if (diffMin < 1) return 'Saved just now';
  if (diffMin === 1) return 'Saved 1 min ago';
  if (diffMin < 60) return `Saved ${diffMin} min ago`;
  return `Saved at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatPublishedAt(iso: string): string {
  const d = toValidTopBarDate(iso);
  if (!d) return 'Live since unknown time';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Live since ${time}`;
  return `Live since ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
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
  const projectPages = state.project?.pages ?? [];
  const activePage = projectPages.find((p) => p.id === state.activePageId) ?? null;
  const {
    hasHardPublishBlocker,
    effectivePublishValidationError,
    canAutoSaveBeforePublish,
  } = getPublishBlockerUiState({ publishValidationError, publishIssueKind });
  const isPublishDisabled = state.isPublishing || state.isSaving || hasHardPublishBlocker;
  const showPublishReady = !hasHardPublishBlocker && !state.isPublishing && !state.isSaving;
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
  const [showBlockedDetails, setShowBlockedDetails] = React.useState(false);
  const [showPageManager, setShowPageManager] = React.useState(false);
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
        className="hidden inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
      >
        <Files size={13} />
        Pages · {projectPages.length}
      </button>

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
          <span className="hidden sm:flex text-xs text-green-700 items-center gap-1.5 bg-green-50 border border-green-200 px-2 py-1 rounded-md" title={`Last saved: ${toValidTopBarDate(state.lastSavedAt)?.toLocaleString() ?? 'Unknown time'}`}>
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
          <span className="text-xs text-gray-500 flex items-center gap-1.5 border-l border-gray-200 pl-2" title={`Published: ${toValidTopBarDate(publishedAt)?.toLocaleString() ?? 'Unknown time'}`}>
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
        <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Pages</h3>
              <p className="text-[11px] text-gray-500 mt-1">Add pages, rename them, and choose what appears in navigation.</p>
            </div>
            <button type="button" onClick={() => setShowPageManager(false)} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Close</button>
          </div>

          <div className="flex items-center gap-2 mb-3">
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

          <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {projectPages.map((page, idx) => (
              <div key={page.id} className="px-3 py-2.5 flex items-center gap-2">
                <div className={`flex-1 min-w-0 rounded border px-2 py-1.5 ${state.activePageId === page.id ? 'border-rose-200 bg-rose-50' : 'border-gray-200 bg-white'}`}>
                  <div className="ml-auto flex w-full sm:w-auto items-center justify-end gap-2">
                    <input
                      value={page.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        dispatch(builderActions.updatePage(page.id, { title, slug: slugifyPage(title) || page.slug }));
                      }}
                      className="flex-1 min-w-0 bg-transparent text-sm font-medium text-gray-800 outline-none"
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
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                    <span>/</span>
                    <input
                      value={page.slug}
                      onChange={(e) => dispatch(builderActions.updatePage(page.id, { slug: slugifyPage(e.target.value) || page.slug }))}
                      className="bg-transparent outline-none flex-1 min-w-0"
                      placeholder="page-slug"
                    />
                    {page.meta.isHome ? <span>• Home</span> : null}
                    {page.meta.isHidden ? <span>• Hidden from navigation</span> : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => dispatch(builderActions.updatePage(page.id, { meta: { ...page.meta, isHidden: !page.meta.isHidden } }))}
                  className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
                >
                  {page.meta.isHidden ? 'Show in nav' : 'Hide from nav'}
                </button>

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
                  onClick={() => dispatch(builderActions.removePage(page.id))}
                  disabled={page.meta.isHome || projectPages.length <= 1}
                  className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
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
