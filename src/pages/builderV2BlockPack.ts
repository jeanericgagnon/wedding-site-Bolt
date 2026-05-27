import { getRecommendedBlockTypes } from './builderV2SectionEditingModel';

type ExistingBlockLike = {
  id: string;
  type: string;
};

type PackedBlock<TData = unknown> = {
  id: string;
  type: string;
  content: string;
  data: TData;
};

export type BuilderV2BlockPackSummary = {
  missingRecommendedTypes: string[];
  buildableTypes: string[];
  blockedTypes: string[];
  headline: string;
  detail: string;
  bestNextMove: string;
};

type BuildSummaryParams = {
  sectionTitle: string;
  sectionType: string;
  currentBlocks: ExistingBlockLike[];
  availableBlockTypes: string[];
  labels: Record<string, string>;
  availability: Record<string, { ok: boolean; reason: string }>;
};

type BuildBlocksParams<TData> = {
  sectionId: string;
  sectionType: string;
  currentBlocks: ExistingBlockLike[];
  availableBlockTypes: string[];
  labels: Record<string, string>;
  availability: Record<string, { ok: boolean; reason: string }>;
  createDefaultData: (sectionType: string, type: string) => TData;
};

const formatList = (values: string[]) => {
  if (values.length <= 1) return values.join('');
  if (values.length === 2) return `${values[0]} + ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} + ${values.at(-1)}`;
};

const resolveMissingRecommendedTypes = ({
  sectionType,
  currentBlocks,
  availableBlockTypes,
}: {
  sectionType: string;
  currentBlocks: ExistingBlockLike[];
  availableBlockTypes: string[];
}) => {
  const currentTypes = new Set(currentBlocks.map((block) => block.type));
  return getRecommendedBlockTypes(sectionType, availableBlockTypes).filter((type) => !currentTypes.has(type));
};

export const buildBuilderV2BlockPackSummary = ({
  sectionTitle,
  sectionType,
  currentBlocks,
  availableBlockTypes,
  labels,
  availability,
}: BuildSummaryParams): BuilderV2BlockPackSummary => {
  const missingRecommendedTypes = resolveMissingRecommendedTypes({
    sectionType,
    currentBlocks,
    availableBlockTypes,
  });
  const buildableTypes = missingRecommendedTypes.filter((type) => availability[type]?.ok ?? true);
  const blockedTypes = missingRecommendedTypes.filter((type) => !(availability[type]?.ok ?? true));
  const buildableLabels = buildableTypes.map((type) => labels[type] ?? type);

  if (!missingRecommendedTypes.length) {
    return {
      missingRecommendedTypes,
      buildableTypes,
      blockedTypes,
      headline: `${sectionTitle} already has its core block spine`,
      detail: 'The section already carries its key structural blocks, so manual polish is stronger than adding a canned pack.',
      bestNextMove: 'Refine order, wording, and spacing instead of inserting another block bundle.',
    };
  }

  if (!buildableTypes.length) {
    return {
      missingRecommendedTypes,
      buildableTypes,
      blockedTypes,
      headline: `${sectionTitle} is missing signature blocks, but the pack is blocked right now`,
      detail: 'The section still needs its core structure, but current limits or block caps are preventing a safe one-click insert.',
      bestNextMove: 'Trim or merge lower-value blocks first, then add the signature pack once the lane has room again.',
    };
  }

  return {
    missingRecommendedTypes,
    buildableTypes,
    blockedTypes,
    headline: `${sectionTitle} can add ${formatList(buildableLabels)} as one recommended pack`,
    detail: blockedTypes.length > 0
      ? 'We can add the highest-value missing blocks now, and you can come back for the blocked ones after trimming the lane.'
      : 'This section is still missing part of its signature structure, and the pack will add those blocks in one deliberate move.',
    bestNextMove: `Add the recommended pack so ${sectionTitle} reads like a complete lane before you keep polishing details.`,
  };
};

export const buildBuilderV2BlockPack = <TData>({
  sectionId,
  sectionType,
  currentBlocks,
  availableBlockTypes,
  labels,
  availability,
  createDefaultData,
}: BuildBlocksParams<TData>): PackedBlock<TData>[] => {
  const summary = buildBuilderV2BlockPackSummary({
    sectionTitle: sectionType,
    sectionType,
    currentBlocks,
    availableBlockTypes,
    labels,
    availability,
  });

  return summary.buildableTypes.map((type, index) => ({
    id: `${sectionId}-${type}-pack-${index + 1}`,
    type,
    content: labels[type] ?? type,
    data: createDefaultData(sectionType, type),
  }));
};
