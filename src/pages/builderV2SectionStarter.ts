import { getRecommendedBlockTypes } from './builderV2SectionEditingModel';

export type BuilderV2SectionStarterSummary = {
  blockTypes: string[];
  headline: string;
  detail: string;
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
