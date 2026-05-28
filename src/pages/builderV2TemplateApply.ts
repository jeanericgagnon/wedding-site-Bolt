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
  sharedSectionTypes: string[];
  addedSectionTypes: string[];
  removedSectionTypes: string[];
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

export const buildBuilderV2TemplateApplyPlan = (
  templateId: unknown,
  currentPages: LabPage[],
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

  const structuralDelta = addedSectionTypes.length + removedSectionTypes.length;
  const title = structuralDelta === 0
    ? `${seed.templateName} keeps the current section shape fairly steady`
    : structuralDelta <= 3
      ? `${seed.templateName} would shift the draft without fully changing its reading spine`
      : `${seed.templateName} would give this draft a meaningfully different starting spine`;
  const detail = structuralDelta === 0
    ? 'This template is close to the current section mix, so the choice is mostly about resetting the section order and starter defaults instead of changing the guest story outright.'
    : `Applying this template replaces the current document with a fresh ${seed.templateName} starter, so the right question is whether the new section flow reduces cleanup more than it costs in rework.`;
  const bestNextMove = structuralDelta === 0
    ? 'Use this reset when the current draft still wants a cleaner starter structure, not because you need a different story arc.'
    : 'Apply it when the new section flow matches the guest journey you actually want better than the current draft does.';
  const decisionRule = 'Switch templates only when the replacement structure feels easier to trust than patching the current draft section by section.';
  const watchout = removedSectionTypes.length === 0
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
    sharedSectionTypes,
    addedSectionTypes,
    removedSectionTypes,
    title,
    detail,
    bestNextMove,
    decisionRule,
    watchout,
    applyLabel: `Apply ${seed.templateName} starter`,
    keyStats: [
      `${currentSectionCount} -> ${nextSectionCount} sections`,
      addedSectionTypes.length > 0
        ? `Adds ${addedSectionTypes.length} lane${addedSectionTypes.length === 1 ? '' : 's'}`
        : 'No new lanes',
      removedSectionTypes.length > 0
        ? `Drops ${removedSectionTypes.length} lane${removedSectionTypes.length === 1 ? '' : 's'}`
        : 'Keeps all current lanes',
    ],
  };
};
