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
  Palette,
  ArrowLeft,
} from 'lucide-react';
import { getSectionManifest } from '../registry/sectionManifests';
import { useNavigate } from 'react-router-dom';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { selectUndoRedo, selectIsPreviewMode, selectPublishStatus, selectIsDirty } from '../state/builderSelectors';
import { getAllThemePresets } from '../../lib/themePresets';

interface BuilderTopBarProps {
  onSave: () => void;
  onPublish: () => void;
  onFixPublishBlockers?: () => void;
  projectName?: string;
  saveError?: string | null;
  publishError?: string | null;
  publishValidationError?: string | null;
}

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Saved just now';
  if (diffMin === 1) return 'Saved 1 min ago';
  if (diffMin < 60) return `Saved ${diffMin} min ago`;
  return `Saved at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function formatPublishedAt(iso: string): string {
  const d = new Date(iso);
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
  publishValidationError,
}) => {
  const navigate = useNavigate();
  const { state, dispatch } = useBuilderContext();
  const undoRedo = selectUndoRedo(state);
  const isPreview = selectIsPreviewMode(state);
  const publishStatus = selectPublishStatus(state);
  const isDirty = selectIsDirty(state);

  const publishedAt = state.project?.lastPublishedAt ?? null;
  const publishedVersion = state.project?.publishedVersion ?? null;
  const isPublished = publishStatus === 'published';
  const projectPages = state.project?.pages ?? [];
  const activePage = projectPages.find((p) => p.id === state.activePageId) ?? null;
  const isPublishDisabled = state.isPublishing || state.isSaving || !!publishValidationError;
  const isThemePanelOpen = state.themePanelOpen;
  const activeThemeId = state.project?.themeId ?? 'romantic';
  const activeTheme = getAllThemePresets().find(p => p.id === activeThemeId);
  const themeSwatchColors = activeTheme
    ? [activeTheme.tokens.colorPrimary, activeTheme.tokens.colorAccent, activeTheme.tokens.colorSecondary]
    : ['#C0697B', '#E8A0A0', '#C89F56'];
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
  const [showBlockedDetails, setShowBlockedDetails] = React.useState(false);
  const blockedHints = React.useMemo(() => {
    if (!publishValidationError) return [] as string[];
    if (publishValidationError.includes('page')) {
      return ['Open Templates and apply a starter layout.', 'Or add a page/section from the Add panel.'];
    }
    if (publishValidationError.includes('Enable at least one section')) {
      return ['Select any section on canvas.', 'Enable it in the inspector panel.'];
    }
    return ['Use Fix blockers to jump to the right place.'];
  }, [publishValidationError]);

  return (
    <>
    <header className="min-h-14 bg-white border-b border-gray-200 flex items-center flex-wrap md:flex-nowrap px-3 md:px-4 py-2 md:py-0 gap-2 md:gap-3 z-50 sticky top-0">
      <button
        onClick={() => {
          if (isDirty) {
            setShowLeaveConfirm(true);
            return;
          }
          navigate('/dashboard');
        }}
        title="Back to Dashboard"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        <ArrowLeft size={15} />
        <span className="hidden sm:inline">Dashboard</span>
      </button>

      <div className="hidden sm:block h-5 w-px bg-gray-200 flex-shrink-0" />

      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 bg-rose-600 rounded-md flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">W</span>
        </div>
        <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">
          {projectName ?? 'Wedding Site Builder'}
        </span>
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </div>

      <div className="hidden md:block h-5 w-px bg-gray-200 mx-1" />

      <div className="hidden sm:flex items-center gap-1">
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

      <div className="hidden md:block h-5 w-px bg-gray-200 mx-1" />

      <div className="hidden 2xl:flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1">
        <span>⌘S Save</span>
        <span>•</span>
        <span>⌘P Preview</span>
        <span>•</span>
        <span>⌘⇧P Publish</span>
      </div>

      <button
        onClick={() =>
          dispatch(isThemePanelOpen ? builderActions.closeThemePanel() : builderActions.openThemePanel())
        }
        title="Color palette"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isThemePanelOpen
            ? 'bg-gray-900 text-white'
            : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Palette size={14} />
        <div className="flex gap-0.5">
          {themeSwatchColors.map((c, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full border border-black/10"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </button>

      <div className="flex-1" />

      <div className="w-full lg:hidden">
        <div className="flex items-center gap-2">
          <label htmlFor="mobile-section-nav" className="text-xs text-gray-500 whitespace-nowrap">Section</label>
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

      <div className="hidden xl:flex items-center gap-1.5 max-w-[520px] overflow-x-auto pr-2">
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

      <div className="w-full md:w-auto flex items-center justify-end gap-2 flex-wrap">
        {state.isSaving && (
          <span className="hidden sm:flex text-xs text-gray-500 items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            Saving…
          </span>
        )}
        {!state.isSaving && saveError && (
          <span className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 px-2 py-1 rounded-md" title={saveError}>
            <XCircle size={12} />
            Save failed — retry
          </span>
        )}
        {!state.isSaving && !saveError && state.lastSavedAt && !isDirty && (
          <span className="hidden sm:flex text-xs text-green-700 items-center gap-1.5 bg-green-50 border border-green-200 px-2 py-1 rounded-md" title={`Last saved: ${new Date(state.lastSavedAt).toLocaleString()}`}>
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
          <span className="text-xs text-gray-500 flex items-center gap-1.5 border-l border-gray-200 pl-2" title={`Published: ${new Date(publishedAt).toLocaleString()}`}>
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
              Publish failed
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

        {publishValidationError && !state.isPublishing && (
          <div className="items-center gap-1.5 hidden sm:flex">
            <span className="text-xs text-amber-700 items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md inline-flex" title={publishValidationError}>
              <AlertCircle size={12} />
              Not ready to publish
            </span>
            <button
              type="button"
              onClick={() => setShowBlockedDetails((v) => !v)}
              className="text-[11px] rounded border border-amber-300 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-50"
            >
              Why blocked?
            </button>
            {onFixPublishBlockers && (
              <button
                type="button"
                onClick={onFixPublishBlockers}
                className="text-[11px] rounded border border-amber-300 bg-amber-50 px-2 py-1 font-medium text-amber-800 hover:bg-amber-100"
              >
                Fix blockers
              </button>
            )}
          </div>
        )}

        {publishValidationError && !state.isPublishing && (
          <div className="sm:hidden w-full flex items-center justify-between rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
            <span className="truncate pr-2">{publishValidationError}</span>
            <button type="button" onClick={() => setShowBlockedDetails((v) => !v)} className="shrink-0 rounded border border-amber-300 bg-white px-1.5 py-0.5 font-medium">
              Why?
            </button>
            {onFixPublishBlockers && (
              <button type="button" onClick={onFixPublishBlockers} className="shrink-0 rounded border border-amber-300 bg-white px-1.5 py-0.5 font-medium">
                Fix
              </button>
            )}
          </div>
        )}

        {showBlockedDetails && publishValidationError && (
          <div className="w-full rounded border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-900">
            <p className="font-medium">{publishValidationError}</p>
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              {blockedHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => dispatch(builderActions.setMode(isPreview ? 'edit' : 'preview'))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isPreview
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          {isPreview ? 'Exit Preview' : 'Preview'}
        </button>

        <div className="relative group">
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
            {state.isSaving ? 'Saving…' : 'Save'}
          </button>
          {!isDirty && !state.isSaving && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              All changes saved
            </div>
          )}
        </div>

        <div className="relative group">
          <button
            onClick={onPublish}
            disabled={isPublishDisabled}
            aria-label={publishValidationError ? `Publish blocked: ${publishValidationError}` : 'Publish site'}
            title={publishValidationError ? `${publishValidationError} (⌘⇧P)` : 'Publish site (⌘⇧P)'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {state.isPublishing || state.isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Globe size={14} />
            )}
            {state.isPublishing
              ? 'Publishing…'
              : state.isSaving
                ? 'Waiting for save…'
                : isPublished
                  ? `Re-publish${typeof publishedVersion === 'number' ? ` v${publishedVersion}` : ''}`
                  : 'Publish'}
          </button>
          <div className="absolute top-full right-0 mt-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 max-w-[260px] text-center">
            {publishValidationError
              ? publishValidationError
              : isPublished
                ? 'Updates your live public site (⌘⇧P)'
                : 'First publish makes your site visible to guests (⌘⇧P)'}
          </div>
        </div>
      </div>
    </header>
    {showLeaveConfirm && (
      <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Leave builder?</h3>
          <p className="mt-1 text-sm text-gray-600">You have unsaved changes. If you leave now, recent edits may be lost.</p>
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
