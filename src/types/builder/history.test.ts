import { describe, it, expect } from 'vitest';
import { createEmptyHistoryState, getUndoRedoCapability } from './history';

describe('createEmptyHistoryState', () => {
  it('starts with no entries', () => {
    expect(createEmptyHistoryState().entries).toHaveLength(0);
  });

  it('starts at index -1', () => {
    expect(createEmptyHistoryState().currentIndex).toBe(-1);
  });

  it('has maxEntries of 50', () => {
    expect(createEmptyHistoryState().maxEntries).toBe(50);
  });
});

describe('getUndoRedoCapability', () => {
  it('cannot undo or redo with empty history', () => {
    const state = createEmptyHistoryState();
    const cap = getUndoRedoCapability(state);
    expect(cap.canUndo).toBe(false);
    expect(cap.canRedo).toBe(false);
    expect(cap.undoLabel).toBeNull();
    expect(cap.redoLabel).toBeNull();
  });

  it('cannot undo at index 0', () => {
    const state = {
      ...createEmptyHistoryState(),
      entries: [{ id: '1', actionType: 'ADD_SECTION' as const, label: 'Add', snapshot: {} as never, timestamp: '' }],
      currentIndex: 0,
    };
    expect(getUndoRedoCapability(state).canUndo).toBe(false);
  });

  it('can undo when index > 0', () => {
    const entry = { id: '1', actionType: 'ADD_SECTION' as const, label: 'Add', snapshot: {} as never, timestamp: '' };
    const state = {
      ...createEmptyHistoryState(),
      entries: [entry, entry],
      currentIndex: 1,
    };
    expect(getUndoRedoCapability(state).canUndo).toBe(true);
  });

  it('can redo when not at latest', () => {
    const entry = { id: '1', actionType: 'ADD_SECTION' as const, label: 'Add', snapshot: {} as never, timestamp: '' };
    const state = {
      ...createEmptyHistoryState(),
      entries: [entry, entry],
      currentIndex: 0,
    };
    expect(getUndoRedoCapability(state).canRedo).toBe(true);
  });
});
