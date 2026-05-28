import { templateCatalog } from '../builder/constants/templateCatalog';
import type { LabPage } from './builderV2PageState';
import {
  buildBuilderV2TemplateSeed,
  type BuilderV2TemplateSeed,
} from './builderV2TemplateSeed';

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
  sharedSectionTypes: string[];
  addedSectionTypes: string[];
  removedSectionTypes: string[];
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

export const buildBuilderV2TemplateApplyPlan = (
  templateId: unknown,
  currentPages: LabPage[],
  currentSectionBlocks: Record<string, Array<{ id: string }>> = {},
): BuilderV2TemplateApplyPlan => {
  const seed = buildBuilderV2TemplateSeed(templateId);
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
  const nextPageSummaries = buildPageSummaries(seed.pages);

  const structuralDelta = addedSectionTypes.length + removedSectionTypes.length;
  const title = structuralDelta === 0
    ? `${seed.templateName} keeps the current section shape fairly steady`
    : structuralDelta <= 3
      ? `${seed.templateName} would shift the draft without fully changing its reading spine`
      : `${seed.templateName} would give this draft a meaningfully different starting spine`;
  const detail = authoredBlockCount > 0
    ? `Applying this template replaces the current document with a fresh ${seed.templateName} starter and clears ${authoredBlockCount} authored block${authoredBlockCount === 1 ? '' : 's'}, so the tradeoff is real content reset versus cleaner structure.`
    : structuralDelta === 0
      ? 'This template is close to the current section mix, so the choice is mostly about resetting the section order and starter defaults instead of changing the guest story outright.'
      : `Applying this template replaces the current document with a fresh ${seed.templateName} starter, so the right question is whether the new section flow reduces cleanup more than it costs in rework.`;
  const bestNextMove = authoredBlockCount > 0
    ? 'Keep the recovery checkpoint, then switch only if restarting the structure is honestly easier than preserving the current authored blocks.'
    : structuralDelta === 0
      ? 'Use this reset when the current draft still wants a cleaner starter structure, not because you need a different story arc.'
      : 'Apply it when the new section flow matches the guest journey you actually want better than the current draft does.';
  const decisionRule = 'Switch templates only when the replacement structure feels easier to trust than patching the current draft section by section.';
  const watchout = authoredBlockCount > 0
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
    sharedSectionTypes,
    addedSectionTypes,
    removedSectionTypes,
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
      authoredBlockCount > 0
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
