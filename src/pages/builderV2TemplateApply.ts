import { templateCatalog } from '../builder/constants/templateCatalog';
import type { LabPage } from './builderV2PageState';
import {
  buildBuilderV2TemplateSeed,
  type BuilderV2TemplateSeed,
} from './builderV2TemplateSeed';

type TemplateApplyBlock = {
  id: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

export type BuilderV2TemplateApplyPlan = {
  templateId: string;
  templateName: string;
  templateDescription: string;
  seed: BuilderV2TemplateSeed;
  currentPageCount: number;
  nextPageCount: number;
  currentSectionCount: number;
  nextSectionCount: number;
  authoredBlockCount: number;
  authoredSectionCount: number;
  carryoverBlockCount: number;
  carryoverSectionCount: number;
  droppedBlockCount: number;
  sharedSectionTypes: string[];
  addedSectionTypes: string[];
  removedSectionTypes: string[];
  carriedSectionTypes: string[];
  currentPageSummaries: string[];
  nextPageSummaries: string[];
  title: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  applyLabel: string;
  keyStats: string[];
};

const titleCaseWords = (value: string) => value
  .split(/[-\s]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const uniqueSectionTypes = (pages: LabPage[]) => Array.from(new Set(
  pages.flatMap((page) => page.sections.map((section) => section.type)),
));

const buildPageSummaries = (pages: LabPage[]) => pages.map((page) => {
  const sectionTitles = page.sections.map((section) => titleCaseWords(section.type));
  return `${page.title}: ${sectionTitles.length > 0 ? sectionTitles.join(' -> ') : 'No sections yet'}`;
});

const cloneBlockValue = <T,>(value: T): T => {
  if (Array.isArray(value)) return value.map((entry) => cloneBlockValue(entry)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, cloneBlockValue(entry)]),
    ) as T;
  }
  return value;
};

const cloneBlocks = <TBlock extends TemplateApplyBlock>(
  blocks: TBlock[],
): TBlock[] => blocks.map((block) => cloneBlockValue(block));

const flattenSections = (pages: LabPage[]) => pages.flatMap((page) => page.sections);

const buildSharedSectionMatches = (currentPages: LabPage[], nextPages: LabPage[]) => {
  const currentByType = new Map<string, typeof currentPages[number]['sections']>();
  flattenSections(currentPages).forEach((section) => {
    const existing = currentByType.get(section.type) ?? [];
    existing.push(section);
    currentByType.set(section.type, existing);
  });

  return flattenSections(nextPages).map((section) => {
    const queue = currentByType.get(section.type);
    const sourceSection = queue?.shift() ?? null;
    return {
      targetSectionId: section.id,
      sourceSection,
      type: section.type,
    };
  });
};

export const applyBuilderV2TemplateSeed = <TBlock extends TemplateApplyBlock>({
  templateId,
  currentPages,
  currentSectionBlocks,
  preserveSharedBlocks = true,
  preserveSharedMetadata = true,
}: {
  templateId: unknown;
  currentPages: LabPage[];
  currentSectionBlocks: Record<string, TBlock[]>;
  preserveSharedBlocks?: boolean;
  preserveSharedMetadata?: boolean;
}) => {
  const seed = buildBuilderV2TemplateSeed(templateId);
  const sharedMatches = buildSharedSectionMatches(currentPages, seed.pages);
  const sourceSectionByTargetId = new Map(
    sharedMatches
      .filter((match) => Boolean(match.sourceSection))
      .map((match) => [match.targetSectionId, match.sourceSection as LabPage['sections'][number]]),
  );

  const pages = seed.pages.map((page) => ({
    ...page,
    sections: page.sections.map((section) => {
      const sourceSection = sourceSectionByTargetId.get(section.id);
      if (!sourceSection || !preserveSharedMetadata) return section;

      return {
        ...section,
        title: sourceSection.title || section.title,
        subtitle: sourceSection.subtitle || section.subtitle,
        enabled: sourceSection.enabled,
        density: sourceSection.density,
      };
    }),
  }));

  const sectionBlocks: Record<string, TBlock[]> = {};
  let carryoverBlockCount = 0;
  let carryoverSectionCount = 0;
  const carriedSectionTypes = new Set<string>();

  if (preserveSharedBlocks) {
    sharedMatches.forEach((match) => {
      const sourceSectionId = match.sourceSection?.id;
      if (!sourceSectionId) return;
      const sourceBlocks = currentSectionBlocks[sourceSectionId] ?? [];
      if (!sourceBlocks.length) return;
      sectionBlocks[match.targetSectionId] = cloneBlocks(sourceBlocks);
      carryoverBlockCount += sourceBlocks.length;
      carryoverSectionCount += 1;
      carriedSectionTypes.add(match.type);
    });
  }

  const authoredBlockCount = Object.values(currentSectionBlocks).reduce((count, blocks) => count + blocks.length, 0);

  return {
    seed,
    pages,
    sectionBlocks,
    carryoverBlockCount,
    carryoverSectionCount,
    droppedBlockCount: Math.max(0, authoredBlockCount - carryoverBlockCount),
    carriedSectionTypes: Array.from(carriedSectionTypes),
  };
};

export const buildBuilderV2TemplateApplyPlan = (
  templateId: unknown,
  currentPages: LabPage[],
  currentSectionBlocks: Record<string, Array<{ id: string; [key: string]: unknown }>> = {},
): BuilderV2TemplateApplyPlan => {
  const applied = applyBuilderV2TemplateSeed({
    templateId,
    currentPages,
    currentSectionBlocks,
  });
  const seed = applied.seed;
  const catalogItem = templateCatalog.find((template) => template.id === seed.templateId);
  const currentTypes = uniqueSectionTypes(currentPages);
  const nextTypes = uniqueSectionTypes(seed.pages);
  const nextTypeSet = new Set(nextTypes);
  const currentTypeSet = new Set(currentTypes);
  const sharedSectionTypes = currentTypes.filter((type) => nextTypeSet.has(type));
  const addedSectionTypes = nextTypes.filter((type) => !currentTypeSet.has(type));
  const removedSectionTypes = currentTypes.filter((type) => !nextTypeSet.has(type));
  const currentSectionCount = currentPages.reduce((count, page) => count + page.sections.length, 0);
  const nextSectionCount = seed.pages.reduce((count, page) => count + page.sections.length, 0);
  const authoredBlockCount = Object.values(currentSectionBlocks).reduce((count, blocks) => count + blocks.length, 0);
  const authoredSectionCount = Object.values(currentSectionBlocks).filter((blocks) => blocks.length > 0).length;
  const currentPageSummaries = buildPageSummaries(currentPages);
  const nextPageSummaries = buildPageSummaries(applied.pages);
  const carryoverBlockCount = applied.carryoverBlockCount;
  const carryoverSectionCount = applied.carryoverSectionCount;
  const droppedBlockCount = applied.droppedBlockCount;
  const carriedSectionTypes = applied.carriedSectionTypes;

  const structuralDelta = addedSectionTypes.length + removedSectionTypes.length;
  const title = structuralDelta === 0
    ? `${seed.templateName} keeps the current section shape fairly steady`
    : structuralDelta <= 3
      ? `${seed.templateName} would shift the draft without fully changing its reading spine`
      : `${seed.templateName} would give this draft a meaningfully different starting spine`;
  const detail = authoredBlockCount > 0 && carryoverBlockCount > 0
    ? `Applying this template can carry over ${carryoverBlockCount} authored block${carryoverBlockCount === 1 ? '' : 's'} on matching lanes, while ${droppedBlockCount} block${droppedBlockCount === 1 ? '' : 's'} would still reset with the new ${seed.templateName} starter.`
    : authoredBlockCount > 0
      ? `Applying this template replaces the current document with a fresh ${seed.templateName} starter and clears ${authoredBlockCount} authored block${authoredBlockCount === 1 ? '' : 's'}, so the tradeoff is real content reset versus cleaner structure.`
    : structuralDelta === 0
      ? 'This template is close to the current section mix, so the choice is mostly about resetting the section order and starter defaults instead of changing the guest story outright.'
      : `Applying this template replaces the current document with a fresh ${seed.templateName} starter, so the right question is whether the new section flow reduces cleanup more than it costs in rework.`;
  const bestNextMove = authoredBlockCount > 0 && carryoverBlockCount > 0
    ? 'Keep shared-lane carryover on when those surviving blocks still fit the new story, then use the checkpoint if the reset still feels too destructive.'
    : authoredBlockCount > 0
      ? 'Keep the recovery checkpoint, then switch only if restarting the structure is honestly easier than preserving the current authored blocks.'
    : structuralDelta === 0
      ? 'Use this reset when the current draft still wants a cleaner starter structure, not because you need a different story arc.'
      : 'Apply it when the new section flow matches the guest journey you actually want better than the current draft does.';
  const decisionRule = 'Switch templates only when the replacement structure feels easier to trust than patching the current draft section by section.';
  const watchout = authoredBlockCount > 0 && droppedBlockCount > 0
    ? `Even with shared-lane carryover, ${droppedBlockCount} authored block${droppedBlockCount === 1 ? '' : 's'} still reset, so do not treat this like a cosmetic theme swap.`
    : authoredBlockCount > 0
      ? `This reset clears authored content in ${authoredSectionCount} section${authoredSectionCount === 1 ? '' : 's'}, so do not treat it like a cosmetic theme swap.`
    : removedSectionTypes.length === 0
      ? 'A safer-looking template can still reset the draft more than you expect, so keep the recovery checkpoint in mind before you apply it.'
      : `This starter drops ${removedSectionTypes.map(titleCaseWords).join(', ')}, so apply it only if those lanes are no longer part of the story you want to publish.`;

  return {
    templateId: seed.templateId,
    templateName: seed.templateName,
    templateDescription: catalogItem?.description ?? '',
    seed,
    currentPageCount: currentPages.length,
    nextPageCount: seed.pages.length,
    currentSectionCount,
    nextSectionCount,
    authoredBlockCount,
    authoredSectionCount,
    carryoverBlockCount,
    carryoverSectionCount,
    droppedBlockCount,
    sharedSectionTypes,
    addedSectionTypes,
    removedSectionTypes,
    carriedSectionTypes,
    currentPageSummaries,
    nextPageSummaries,
    title,
    detail,
    bestNextMove,
    decisionRule,
    watchout,
    applyLabel: `Apply ${seed.templateName} starter`,
    keyStats: [
      `${currentSectionCount} -> ${nextSectionCount} sections`,
      carryoverBlockCount > 0
        ? `Carries ${carryoverBlockCount} block${carryoverBlockCount === 1 ? '' : 's'}`
        : authoredBlockCount > 0
        ? `Resets ${authoredBlockCount} block${authoredBlockCount === 1 ? '' : 's'}`
        : 'No authored blocks to clear',
      addedSectionTypes.length > 0
        ? `Adds ${addedSectionTypes.length} lane${addedSectionTypes.length === 1 ? '' : 's'}`
        : 'No new lanes',
      removedSectionTypes.length > 0
        ? `Drops ${removedSectionTypes.length} lane${removedSectionTypes.length === 1 ? '' : 's'}`
        : 'Keeps all current lanes',
    ],
  };
};
