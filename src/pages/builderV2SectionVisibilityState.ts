type SectionLike = {
  id: string;
  enabled: boolean;
};

export type BuilderV2SectionVisibilityResult<TSection extends SectionLike, TBlock> = {
  sections: TSection[];
  sectionBlocks: Record<string, TBlock[]>;
  changedIds: string[];
};

export const applyBuilderV2SectionVisibility = <TSection extends SectionLike, TBlock>({
  sections,
  sectionBlocks,
  selectedIds,
  enabled,
}: {
  sections: TSection[];
  sectionBlocks: Record<string, TBlock[]>;
  selectedIds: string[];
  enabled: boolean;
}): BuilderV2SectionVisibilityResult<TSection, TBlock> => {
  const selectedSet = new Set(selectedIds);
  if (!selectedSet.size) {
    return {
      sections,
      sectionBlocks,
      changedIds: [],
    };
  }

  const changedIds = sections
    .filter((section) => selectedSet.has(section.id) && section.enabled !== enabled)
    .map((section) => section.id);

  if (!changedIds.length) {
    return {
      sections,
      sectionBlocks,
      changedIds: [],
    };
  }

  return {
    sections: sections.map((section) => (
      selectedSet.has(section.id) ? { ...section, enabled } : section
    )),
    sectionBlocks,
    changedIds,
  };
};
