import { describe, expect, it } from 'vitest';

import {
  createBuilderV2InvertedSelectionState,
  createBuilderV2PrimarySelectionState,
  createBuilderV2SelectAllState,
} from './builderV2SelectionState';

describe('builderV2SelectionState', () => {
  it('builds a primary selection with a reset anchor', () => {
    expect(createBuilderV2PrimarySelectionState('story')).toEqual({
      selectedId: 'story',
      lastSelectedId: 'story',
      multiSelectedIds: [],
    });
  });

  it('builds a select-all state with the first section as the anchor', () => {
    expect(createBuilderV2SelectAllState(['hero', 'story', 'travel'])).toEqual({
      selectedId: 'hero',
      lastSelectedId: 'hero',
      multiSelectedIds: ['story', 'travel'],
    });
  });

  it('returns null for empty select-all input', () => {
    expect(createBuilderV2SelectAllState([])).toBeNull();
  });

  it('inverts selection and resets the anchor to the first remaining section', () => {
    expect(createBuilderV2InvertedSelectionState({
      sectionIds: ['hero', 'story', 'travel', 'faq'],
      selectedIds: ['story', 'faq'],
    })).toEqual({
      selectedId: 'hero',
      lastSelectedId: 'hero',
      multiSelectedIds: ['travel'],
    });
  });

  it('returns null when inversion leaves nothing selected', () => {
    expect(createBuilderV2InvertedSelectionState({
      sectionIds: ['hero', 'story'],
      selectedIds: ['hero', 'story'],
    })).toBeNull();
  });
});
