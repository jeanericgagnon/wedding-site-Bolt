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
  };
}
