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
  projectName?: string;
  saveError?: string | null;
  publishError?: string | null;
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
  return `Live since ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export const BuilderTopBar: React.FC<BuilderTopBarProps> = ({
  onSave,
  onPublish,
  projectName,
  saveError,
  publishError,
}) => {
  const navigate = useNavigate();
  const { state, dispatch } = useBuilderContext();
  const undoRedo = selectUndoRedo(state);
  const isPreview = selectIsPreviewMode(state);
  const publishStatus = selectPublishStatus(state);
  const isDirty = selectIsDirty(state);

  const publishedAt = state.project?.lastPublishedAt ?? null;
  const isPublished = publishStatus === 'published';
  const projectPages = state.project?.pages ?? [];
  const activePage = projectPages.find((p) => p.id === state.activePageId) ?? null;
  const isThemePanelOpen = state.themePanelOpen;
  const activeThemeId = state.project?.themeId ?? 'romantic';
  const activeTheme = getAllThemePresets().find(p => p.id === activeThemeId);
  const themeSwatchColors = activeTheme
    ? [activeTheme.tokens.colorPrimary, activeTheme.tokens.colorAccent, activeTheme.tokens.colorSecondary]
    : ['#C0697B', '#E8A0A0', '#C89F56'];

  return (
    <header className="min-h-14 bg-white border-b border-gray-200 flex items-center flex-wrap md:flex-nowrap px-3 md:px-4 py-2 md:py-0 gap-2 md:gap-3 z-50 sticky top-0">
      <button
        onClick={() => navigate('/dashboard')}
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

      <div className="w-full lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="mobile-page-nav" className="text-xs text-gray-500 whitespace-nowrap">Page</label>
          <select
            id="mobile-page-nav"
            value={state.activePageId ?? ''}
            onChange={(e) => {
              dispatch(builderActions.setActivePage(e.target.value));
              dispatch(builderActions.selectSection(null));
            }}
            className="w-full px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            {projectPages.map((page) => (
              <option key={page.id} value={page.id}>{page.title}</option>
            ))}
          </select>
        </div>

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
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
          <span className="text-xs text-gray-400 flex items-center gap-1.5 border-l border-gray-200 pl-2" title={`Published: ${new Date(publishedAt).toLocaleString()}`}>
            <Clock size={11} />
            {formatPublishedAt(publishedAt)}
          </span>
        )}
        {publishError && !state.isPublishing && (
          <span className="text-xs text-red-500 flex items-center gap-1.5 border-l border-gray-200 pl-2" title={publishError}>
            <XCircle size={12} />
            Publish failed
          </span>
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
            disabled={state.isPublishing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {state.isPublishing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Globe size={14} />
            )}
            {state.isPublishing ? 'Publishing…' : isPublished ? 'Re-publish' : 'Publish'}
          </button>
          <div className="absolute top-full right-0 mt-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 max-w-[200px] text-center">
            {isPublished
              ? 'Updates your live public site'
              : 'Makes your site visible to guests'}
          </div>
        </div>
      </div>
    </header>
  );
};
