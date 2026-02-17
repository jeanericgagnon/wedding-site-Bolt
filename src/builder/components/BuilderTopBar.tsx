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
} from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { selectUndoRedo, selectIsPreviewMode, selectPublishStatus, selectIsDirty } from '../state/builderSelectors';

interface BuilderTopBarProps {
  onSave: () => void;
  onPublish: () => void;
  projectName?: string;
}

export const BuilderTopBar: React.FC<BuilderTopBarProps> = ({ onSave, onPublish, projectName }) => {
  const { state, dispatch } = useBuilderContext();
  const undoRedo = selectUndoRedo(state);
  const isPreview = selectIsPreviewMode(state);
  const publishStatus = selectPublishStatus(state);
  const isDirty = selectIsDirty(state);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 z-50 sticky top-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 bg-rose-600 rounded-md flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">W</span>
        </div>
        <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">
          {projectName ?? 'Wedding Site Builder'}
        </span>
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </div>

      <div className="h-5 w-px bg-gray-200 mx-1" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => {}}
          disabled={!undoRedo.canUndo}
          title={`Undo${undoRedo.undoLabel ? `: ${undoRedo.undoLabel}` : ''} (⌘Z)`}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => {}}
          disabled={!undoRedo.canRedo}
          title={`Redo${undoRedo.redoLabel ? `: ${undoRedo.redoLabel}` : ''} (⌘⇧Z)`}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {state.lastSavedAt && !isDirty && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-green-500" />
            Saved
          </span>
        )}
        {isDirty && !state.isSaving && (
          <span className="text-xs text-amber-500 flex items-center gap-1">
            <AlertCircle size={12} />
            Unsaved changes
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

        <button
          onClick={onSave}
          disabled={state.isSaving || !isDirty}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state.isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>

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
          {publishStatus === 'published' ? 'Re-publish' : 'Publish'}
        </button>
      </div>
    </header>
  );
};
