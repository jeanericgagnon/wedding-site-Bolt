import { BuilderProject } from './project';

export type HistoryActionType =
  | 'ADD_SECTION'
  | 'REMOVE_SECTION'
  | 'REORDER_SECTIONS'
  | 'UPDATE_SECTION_SETTINGS'
  | 'UPDATE_SECTION_VARIANT'
  | 'TOGGLE_SECTION_VISIBILITY'
  | 'APPLY_TEMPLATE'
  | 'APPLY_THEME'
  | 'UPDATE_BINDINGS';

export interface BuilderHistoryEntry {
  id: string;
  actionType: HistoryActionType;
  label: string;
  snapshot: BuilderProject;
  timestamp: string;
}

export interface BuilderHistoryState {
  entries: BuilderHistoryEntry[];
  currentIndex: number;
  maxEntries: number;
}

export interface BuilderUndoRedoCapability {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
}

export function createEmptyHistoryState(): BuilderHistoryState {
  return {
    entries: [],
    currentIndex: -1,
    maxEntries: 50,
  };
}

export function getUndoRedoCapability(state: BuilderHistoryState): BuilderUndoRedoCapability {
  return {
    canUndo: state.currentIndex > 0,
    canRedo: state.currentIndex < state.entries.length - 1,
    undoLabel: state.currentIndex > 0 ? state.entries[state.currentIndex].label : null,
    redoLabel:
      state.currentIndex < state.entries.length - 1
        ? state.entries[state.currentIndex + 1].label
        : null,
  };
}
