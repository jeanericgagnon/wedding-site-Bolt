import { BuilderTemplateDefinition } from '../../types/builder/template';

export interface TemplateGallerySummaryInput {
  templates: BuilderTemplateDefinition[];
  filtered: BuilderTemplateDefinition[];
  currentTemplateId?: string | null;
  compareTemplateIds: string[];
  pageCount: number;
  sectionCount: number;
  currentPageSectionCount: number;
}

export interface TemplateGallerySummary {
  currentTemplateName: string;
  currentDraftDetail: string;
  currentDraftRecommendation: string;
  compareMessage: string;
  compareReady: boolean;
  filteredHeadline: string;
  filteredDetail: string;
  strongestFilteredTemplate: BuilderTemplateDefinition | null;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: string;
  nextStep: string;
  thenStep: string;
}

const SCORE_TAGS = ['modern', 'romantic', 'classic', 'editorial', 'photo', 'destination', 'floral', 'bold', 'minimal'];

function scoreTemplate(template: BuilderTemplateDefinition): number {
  const moodWeight = template.moodTags.reduce((total, tag) => total + (SCORE_TAGS.includes(tag) ? 2 : 1), 0);
  const premiumWeight = template.isPremium ? 2 : 0;
  const freshnessWeight = template.isNew ? 1 : 0;
  return moodWeight + premiumWeight + freshnessWeight + template.sectionComposition.length;
}

export function getTemplateGallerySummary({
  templates,
  filtered,
  currentTemplateId,
  compareTemplateIds,
  pageCount,
  sectionCount,
  currentPageSectionCount,
}: TemplateGallerySummaryInput): TemplateGallerySummary {
  const currentTemplate = templates.find((template) => template.id === currentTemplateId) ?? null;
  const compareTemplates = compareTemplateIds
    .map((id) => templates.find((template) => template.id === id))
    .filter((template): template is BuilderTemplateDefinition => Boolean(template));
  const strongestFilteredTemplate = filtered.length > 0
    ? [...filtered].sort((left, right) => scoreTemplate(right) - scoreTemplate(left))[0]
    : null;

  let compareMessage = 'Select up to 2 designs to compare side by side.';
  if (compareTemplates.length === 1) {
    compareMessage = `Selected for compare: ${compareTemplates[0].displayName}. Choose one more.`;
  } else if (compareTemplates.length === 2) {
    compareMessage = `Ready to compare: ${compareTemplates[0].displayName} vs ${compareTemplates[1].displayName}.`;
  }

  return {
    currentTemplateName: currentTemplate?.displayName ?? 'No design selected yet',
    currentDraftDetail: `${pageCount} page${pageCount === 1 ? '' : 's'} · ${sectionCount} total section${sectionCount === 1 ? '' : 's'} · ${currentPageSectionCount} on this page`,
    currentDraftRecommendation: currentTemplate
      ? 'Only switch if the overall mood is wrong. If the structure is close, keep the template and refine sections instead.'
      : 'Choose the design that gets the emotional direction right first, then tighten the page structure once it is applied.',
    compareMessage,
    compareReady: compareTemplates.length === 2,
    filteredHeadline: filtered.length === 0
      ? 'No designs match the current filter stack'
      : filtered.length === 1
        ? 'One strong design match is left'
        : `${filtered.length} designs are still in play`,
    filteredDetail: filtered.length === 0
      ? 'Reset one filter at a time until you get back to a meaningful comparison set.'
      : strongestFilteredTemplate
        ? `${strongestFilteredTemplate.displayName} is the strongest current fit if you want a fast starting point.`
        : 'Use compare only when two designs are genuinely close enough to debate.',
    strongestFilteredTemplate,
    focusTitle: currentTemplate
      ? `${currentTemplate.displayName} is your current draft direction`
      : 'The draft still needs a strong visual direction',
    focusDetail: currentTemplate
      ? 'Template switching should be about correcting the overall feeling of the site, not chasing tiny layout differences.'
      : 'A good template decision should get the emotional posture right first so later editing becomes easier instead of noisier.',
    bestNextMove: filtered.length === 0
      ? 'Reset one filter and get back to a real choice set before you judge the designs.'
      : compareTemplates.length === 2
        ? `Compare ${compareTemplates[0].displayName} and ${compareTemplates[1].displayName}, then commit to the one that needs less rewriting.`
        : strongestFilteredTemplate
          ? `Start with ${strongestFilteredTemplate.displayName} if you want the fastest strong default.`
          : 'Narrow the gallery until one or two designs feel genuinely defensible.',
    decisionRule: currentTemplate
      ? 'Switch templates only when the mood or structure is materially wrong, not when you are just restless in the current draft.'
      : 'Pick the design that makes the weekend feel right with the least amount of retranslation work.',
    watchout: currentTemplate
      ? 'Repeated template switching can create churn that feels productive while the actual page quality stays flat.'
      : 'A broad gallery can make too many options feel meaningful even when only one or two are a real fit.',
    currentStep: currentTemplate
      ? 'Judge whether the current draft direction is fundamentally right or fundamentally wrong.'
      : 'Choose a small comparison set that actually matches the weekend tone.',
    nextStep: compareTemplates.length === 2
      ? 'Resolve the comparison now instead of collecting more candidates.'
      : strongestFilteredTemplate
        ? `Use ${strongestFilteredTemplate.displayName} or compare it with one serious alternative.`
        : 'Clear filters until a serious candidate appears.',
    thenStep: 'Once the template direction feels right, move back into section and content refinement instead of reopening the whole gallery.',
  };
}
