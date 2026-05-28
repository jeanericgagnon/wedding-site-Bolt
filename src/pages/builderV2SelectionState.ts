export type BuilderV2SelectionState = {
  selectedId: string;
  lastSelectedId: string;
  multiSelectedIds: string[];
};

export const createBuilderV2PrimarySelectionState = (selectedId: string): BuilderV2SelectionState => ({
  selectedId,
  lastSelectedId: selectedId,
  multiSelectedIds: [],
});

export const createBuilderV2SelectAllState = (sectionIds: string[]): BuilderV2SelectionState | null => {
  if (!sectionIds.length) return null;

  return {
    selectedId: sectionIds[0],
    lastSelectedId: sectionIds[0],
    multiSelectedIds: sectionIds.slice(1),
  };
};

export const createBuilderV2InvertedSelectionState = ({
  sectionIds,
  selectedIds,
}: {
  sectionIds: string[];
  selectedIds: string[];
}): BuilderV2SelectionState | null => {
  if (!sectionIds.length) return null;

  const selectedSet = new Set(selectedIds);
  const invertedIds = sectionIds.filter((id) => !selectedSet.has(id));
  return createBuilderV2SelectAllState(invertedIds);
};
