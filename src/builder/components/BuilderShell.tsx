import React, { useReducer, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { BuilderProject } from '../../types/builder/project';
import { WeddingDataV1 } from '../../types/weddingData';
import { BUILDER_AUTOSAVE_INTERVAL_MS } from '../constants/builderCapabilities';
import { mediaService } from '../services/mediaService';

interface BuilderShellProps {
  initialProject: BuilderProject;
  initialWeddingData?: WeddingDataV1;
  projectName?: string;
  onSave?: (project: BuilderProject) => Promise<void>;
  onPublish?: (projectId: string) => Promise<void>;
}

export const BuilderShell: React.FC<BuilderShellProps> = ({
  initialProject,
  initialWeddingData,
  projectName,
  onSave,
  onPublish,
}) => {
  const [state, dispatch] = useReducer(builderReducer, {
    ...initialBuilderState,
    weddingData: initialWeddingData ?? null,
  });

  useEffect(() => {
    dispatch({ type: 'LOAD_PROJECT', payload: initialProject });
  // intentionally fires once on mount — LOAD_PROJECT is idempotent and sets baseline history
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePage = useMemo(() => selectActivePage(state), [state]);
  const selectedSection = useMemo(() => selectSelectedSection(state), [state]);

  const contextValue = useMemo(
    () => ({ state, dispatch, activePage, selectedSection }),
    [state, dispatch, activePage, selectedSection]
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const weddingId = initialProject.weddingId;
    if (!weddingId) return;
    mediaService.listAssets(weddingId)
      .then(assets => { dispatch(builderActions.setMediaAssets(assets)); })
      .catch(() => { dispatch(builderActions.setError('Could not load media library. Your uploads may not appear.')); });
  }, [initialProject.weddingId]);

  const handleSave = useCallback(async () => {
    const currentState = stateRef.current;
    if (!currentState.project || !onSave) return;
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      await onSave(currentState.project);
      dispatch(builderActions.markSaved(new Date().toISOString()));
    } catch {
      dispatch(builderActions.setError('Failed to save. Please try again.'));
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [onSave]);

  const handlePublish = useCallback(async () => {
    const currentState = stateRef.current;
    if (!currentState.project || !onPublish) return;
    if (currentState.isSaving || currentState.isPublishing) return;
    if (currentState.isDirty) {
      await handleSave();
    }
    dispatch({ type: 'SET_PUBLISHING', payload: true });
    try {
      await onPublish(currentState.project.id);
      dispatch(
        builderActions.markPublished(
          (currentState.project.publishedVersion ?? 0) + 1,
          new Date().toISOString()
        )
      );
    } catch {
      dispatch(builderActions.setError('Failed to publish. Please try again.'));
      dispatch({ type: 'SET_PUBLISHING', payload: false });
    }
  }, [onPublish, handleSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (meta && e.key === 'p') {
        e.preventDefault();
        dispatch(builderActions.setMode(stateRef.current.mode === 'preview' ? 'edit' : 'preview'));
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
  }, [handleSave]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (stateRef.current.isDirty && !stateRef.current.isSaving && onSave) {
        handleSave();
      }
    }, BUILDER_AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [handleSave, onSave]);

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
          projectName={projectName}
        />

        <div className="flex-1 flex overflow-hidden">
          {state.mode === 'edit' && (
            <BuilderSidebarLibrary activePageId={state.activePageId} />
          )}

          <BuilderCanvas />

          {state.mode === 'edit' && <BuilderInspectorPanel />}
        </div>

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
      </div>
    </BuilderContext.Provider>
  );
};
