import React, { useReducer, useMemo, useEffect, useCallback } from 'react';
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

interface BuilderShellProps {
  initialProject: BuilderProject;
  projectName?: string;
  onSave?: (project: BuilderProject) => Promise<void>;
  onPublish?: (projectId: string) => Promise<void>;
}

export const BuilderShell: React.FC<BuilderShellProps> = ({
  initialProject,
  projectName,
  onSave,
  onPublish,
}) => {
  const [state, dispatch] = useReducer(builderReducer, {
    ...initialBuilderState,
    project: initialProject,
    activePageId: initialProject.pages[0]?.id ?? null,
  });

  const activePage = useMemo(() => selectActivePage(state), [state]);
  const selectedSection = useMemo(() => selectSelectedSection(state), [state]);

  const contextValue = useMemo(
    () => ({ state, dispatch, activePage, selectedSection }),
    [state, dispatch, activePage, selectedSection]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (meta && e.key === 'p') {
        e.preventDefault();
        dispatch(builderActions.setMode(state.mode === 'preview' ? 'edit' : 'preview'));
      }
      if (e.key === 'Escape') {
        dispatch(builderActions.selectSection(null));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleSave = useCallback(async () => {
    if (!state.project || !onSave) return;
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      await onSave(state.project);
      dispatch(builderActions.markSaved(new Date().toISOString()));
    } catch {
      dispatch(builderActions.setError('Failed to save. Please try again.'));
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [state.project, onSave]);

  const handlePublish = useCallback(async () => {
    if (!state.project || !onPublish) return;
    dispatch({ type: 'SET_PUBLISHING', payload: true });
    try {
      await onPublish(state.project.id);
      dispatch(
        builderActions.markPublished(
          (state.project.publishedVersion ?? 0) + 1,
          new Date().toISOString()
        )
      );
    } catch {
      dispatch(builderActions.setError('Failed to publish. Please try again.'));
      dispatch({ type: 'SET_PUBLISHING', payload: false });
    }
  }, [state.project, onPublish]);

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
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 z-50">
            <span>{state.error}</span>
            <button onClick={() => dispatch(builderActions.setError(null))} className="ml-2 font-bold">
              ×
            </button>
          </div>
        )}

        <TemplateGalleryPanel />
        <MediaLibraryPanel />
      </div>
    </BuilderContext.Provider>
  );
};
