import { getRecommendedBlockTypes } from './builderV2SectionEditingModel';

export type BuilderV2SectionStarterSummary = {
  blockTypes: string[];
  headline: string;
  detail: string;
};

type StarterBlock<TData = unknown> = {
  id: string;
  type: string;
  content: string;
  data: TData;
};

type RestoreSectionLike = {
  id: string;
  type: string;
  title: string;
};

type RestoreStarterBlocksParams<TSection extends RestoreSectionLike, TBlock> = {
  sections: TSection[];
  sectionBlocks: Record<string, TBlock[]>;
  selectedIds: string[];
  availableBlockTypesBySection: Record<string, string[]>;
  buildStarterBlocks: (sectionId: string, sectionType: string) => TBlock[];
};

export type RestoreBuilderV2SectionStarterResult<TBlock> = {
  sectionBlocks: Record<string, TBlock[]>;
  restoredSectionIds: string[];
  restoredBlockCount: number;
};

const normalize = (value: string) => value.trim().toLowerCase();

const preferredStarterCounts: Record<string, number> = {
  hero: 3,
  story: 2,
  schedule: 2,
  travel: 2,
  registry: 2,
  rsvp: 2,
  faq: 2,
  gallery: 2,
  contact: 2,
  quotes: 2,
  menu: 3,
  music: 3,
  video: 2,
  custom: 2,
};

export const getBuilderV2StarterBlockTypes = (
  sectionType: string,
  availableBlockTypes: string[],
) => {
  const normalizedSectionType = normalize(sectionType);
  const recommended = getRecommendedBlockTypes(normalizedSectionType, availableBlockTypes);
  const preferredCount = preferredStarterCounts[normalizedSectionType] ?? 2;
  const starter = recommended.slice(0, preferredCount);

  if (starter.length > 0) {
    return starter;
  }

  return availableBlockTypes.slice(0, Math.min(2, availableBlockTypes.length));
};

export const buildBuilderV2StarterBlocks = <TData>({
  sectionId,
  sectionType,
  availableBlockTypes,
  labels,
  createDefaultData,
}: {
  sectionId: string;
  sectionType: string;
  availableBlockTypes: string[];
  labels: Record<string, string>;
  createDefaultData: (type: string) => TData;
}): StarterBlock<TData>[] => {
  const starterBlockTypes = getBuilderV2StarterBlockTypes(sectionType, availableBlockTypes);

  return starterBlockTypes.map((blockType, index) => ({
    id: `${sectionId}-${String(blockType)}-starter-${index + 1}`,
    type: blockType,
    content: labels[String(blockType)] ?? String(blockType),
    data: createDefaultData(blockType),
  }));
};

export const restoreBuilderV2SectionStarterBlocks = <TSection extends RestoreSectionLike, TBlock>({
  sections,
  sectionBlocks,
  selectedIds,
  availableBlockTypesBySection,
  buildStarterBlocks,
}: RestoreStarterBlocksParams<TSection, TBlock>): RestoreBuilderV2SectionStarterResult<TBlock> => {
  const selectedSet = new Set(selectedIds);
  const nextSectionBlocks = { ...sectionBlocks };
  const restoredSectionIds: string[] = [];
  let restoredBlockCount = 0;

  sections.forEach((section) => {
    if (!selectedSet.has(section.id)) return;

    const availableBlockTypes = availableBlockTypesBySection[section.type] ?? [];
    if (!availableBlockTypes.length) return;

    const starterBlocks = buildStarterBlocks(section.id, section.type);
    nextSectionBlocks[section.id] = starterBlocks;
    restoredSectionIds.push(section.id);
    restoredBlockCount += starterBlocks.length;
  });

  return {
    sectionBlocks: nextSectionBlocks,
    restoredSectionIds,
    restoredBlockCount,
  };
};

export const buildBuilderV2SectionStarterSummary = (
  sectionTitle: string,
  sectionType: string,
  availableBlockTypes: string[],
  labels: Record<string, string>,
): BuilderV2SectionStarterSummary => {
  const starterBlockTypes = getBuilderV2StarterBlockTypes(sectionType, availableBlockTypes);
  const labelList = starterBlockTypes.map((type) => labels[type] ?? type);

  if (!starterBlockTypes.length) {
    return {
      blockTypes: [],
      headline: `${sectionTitle} starts as an empty shell`,
      detail: 'You will build this lane manually after adding it, so choose it only if the structure really belongs.',
    };
  }

  return {
    blockTypes: starterBlockTypes,
    headline: `${sectionTitle} starts with ${labelList.join(' + ')}`,
    detail: 'The lab will seed a first readable spine so you can shape the lane in preview before adding extras.',
  };
};
