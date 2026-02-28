import { BuilderState } from './builderStore';
import { BuilderPage } from '../../types/builder/project';
import { BuilderSectionInstance } from '../../types/builder/section';
import { getUndoRedoCapability, BuilderUndoRedoCapability } from '../../types/builder/history';

export function selectActivePage(state: BuilderState): BuilderPage | null {
  if (!state.project || !state.activePageId) return null;
  return state.project.pages.find(p => p.id === state.activePageId) ?? null;
}

export function selectSelectedSection(state: BuilderState): BuilderSectionInstance | null {
  const page = selectActivePage(state);
  if (!page || !state.selectedSectionId) return null;
  return page.sections.find(s => s.id === state.selectedSectionId) ?? null;
}

export function selectActivePageSections(state: BuilderState): BuilderSectionInstance[] {
  const page = selectActivePage(state);
  if (!page) return [];
  return [...page.sections].sort((a, b) => a.orderIndex - b.orderIndex);
}

export function selectEnabledSections(state: BuilderState): BuilderSectionInstance[] {
  return selectActivePageSections(state).filter(s => s.enabled);
}

export function selectUndoRedo(state: BuilderState): BuilderUndoRedoCapability {
  return getUndoRedoCapability(state.history);
}

export function selectIsPreviewMode(state: BuilderState): boolean {
  return state.mode === 'preview';
}

export function selectPreviewViewport(state: BuilderState): 'desktop' | 'tablet' | 'mobile' {
  return state.previewViewport;
}

export function selectPublishStatus(state: BuilderState) {
  return state.project?.publishStatus ?? 'draft';
}

export function selectIsDirty(state: BuilderState): boolean {
  return state.isDirty;
}
