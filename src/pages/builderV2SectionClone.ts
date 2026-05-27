type Density = 'compact' | 'comfortable';

type SectionLike = {
  id: string;
  type: string;
  title: string;
  variant: string;
  enabled: boolean;
  subtitle?: string;
  density?: Density;
};

type BlockData = Record<string, unknown> | undefined;

type BlockLike = {
  id: string;
  type: string;
  content: string;
  data?: BlockData;
};

export type BuilderV2CloneResult<TSection extends SectionLike = SectionLike, TBlock extends BlockLike = BlockLike> = {
  sections: TSection[];
  sectionBlocks: Record<string, TBlock[]>;
  duplicatedIds: string[];
};

type Params<TSection extends SectionLike = SectionLike, TBlock extends BlockLike = BlockLike> = {
  sections: TSection[];
  sectionBlocks: Record<string, TBlock[]>;
  selectedIds: string[];
};

const slugToken = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const makeUniqueSectionId = (base: string, taken: Set<string>) => {
  let next = base;
  let counter = 2;
  while (taken.has(next)) {
    next = `${base}-${counter}`;
    counter += 1;
  }
  taken.add(next);
  return next;
};

const makeUniqueBlockId = (base: string, taken: Set<string>) => {
  let next = base;
  let counter = 2;
  while (taken.has(next)) {
    next = `${base}-${counter}`;
    counter += 1;
  }
  taken.add(next);
  return next;
};

const makeCopyTitle = (title: string, existingTitles: Set<string>) => {
  const trimmedTitle = title.trim() || 'Section';
  let next = `${trimmedTitle} Copy`;
  let counter = 2;
  while (existingTitles.has(next.toLowerCase())) {
    next = `${trimmedTitle} Copy ${counter}`;
    counter += 1;
  }
  existingTitles.add(next.toLowerCase());
  return next;
};

export const cloneBuilderV2Sections = <TSection extends SectionLike, TBlock extends BlockLike>({
  sections,
  sectionBlocks,
  selectedIds,
}: Params<TSection, TBlock>): BuilderV2CloneResult<TSection, TBlock> => {
  const selectedSet = new Set(selectedIds);
  if (!selectedSet.size) {
    return {
      sections,
      sectionBlocks,
      duplicatedIds: [],
    };
  }

  const selectedSections = sections.filter((section) => selectedSet.has(section.id));
  if (!selectedSections.length) {
    return {
      sections,
      sectionBlocks,
      duplicatedIds: [],
    };
  }

  const lastSelectedIndex = sections.reduce((maxIndex, section, index) => (
    selectedSet.has(section.id) ? index : maxIndex
  ), -1);

  const takenSectionIds = new Set(sections.map((section) => section.id));
  const existingTitles = new Set(sections.map((section) => section.title.trim().toLowerCase()).filter(Boolean));
  const takenBlockIds = new Set(
    Object.values(sectionBlocks).flatMap((blocks) => blocks.map((block) => block.id)),
  );

  const duplicatedSections = selectedSections.map((section) => {
    const baseId = `${slugToken(section.title || section.type || 'section') || 'section'}-copy`;
    const nextId = makeUniqueSectionId(baseId, takenSectionIds);
    return {
      ...section,
      id: nextId,
      title: makeCopyTitle(section.title, existingTitles),
    };
  });

  const nextBlocks = { ...sectionBlocks };
  duplicatedSections.forEach((duplicatedSection, index) => {
    const sourceSection = selectedSections[index];
    const sourceBlocks = sectionBlocks[sourceSection.id] ?? [];
    nextBlocks[duplicatedSection.id] = sourceBlocks.map((block) => {
      const baseBlockId = `${duplicatedSection.id}-${slugToken(block.type || 'block') || 'block'}`;
      const nextBlockId = makeUniqueBlockId(baseBlockId, takenBlockIds);
      return {
        ...block,
        id: nextBlockId,
        data: block.data ? { ...block.data } : block.data,
      };
    });
  });

  const nextSections = [...sections];
  nextSections.splice(lastSelectedIndex + 1, 0, ...duplicatedSections);

  return {
    sections: nextSections,
    sectionBlocks: nextBlocks,
    duplicatedIds: duplicatedSections.map((section) => section.id),
  };
};
