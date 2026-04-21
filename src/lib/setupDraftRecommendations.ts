import type { TemplateCatalogItem } from '../builder/constants/templateCatalog';
import type { SetupDraft } from './setupDraft';

export const SETUP_STYLE_OPTIONS = [
  'Modern',
  'Classic',
  'Floral',
  'Minimal',
  'Romantic',
  'Rustic',
  'Bold',
  'Destination',
  'Weekend',
  'Bilingual',
  'Interfaith',
] as const;

export type SetupMode = {
  destination: boolean;
  bilingual: boolean;
  interfaith: boolean;
  weekend: boolean;
};

const hasPreference = (prefs: Set<string>, value: string) => prefs.has(value);

export const deriveSetupMode = (draft: Pick<SetupDraft, 'stylePreferences' | 'guestEstimateBand'>): SetupMode => {
  const prefs = new Set(draft.stylePreferences);
  const destination = hasPreference(prefs, 'Destination');
  const bilingual = hasPreference(prefs, 'Bilingual');
  const interfaith = hasPreference(prefs, 'Interfaith');
  const weekend = hasPreference(prefs, 'Weekend') || destination || draft.guestEstimateBand === '200plus';
  return { destination, bilingual, interfaith, weekend };
};

const scoreTemplateForSetup = (template: TemplateCatalogItem, draft: Pick<SetupDraft, 'stylePreferences' | 'guestEstimateBand'>): number => {
  const prefs = new Set(draft.stylePreferences);
  let score = template.styleTags.filter((tag) => prefs.has(tag)).length;
  const source = `${template.id} ${template.name} ${template.description} ${template.bestFor.join(' ')} ${template.defaultSectionOrder.join(' ')}`.toLowerCase();
  const setupMode = deriveSetupMode(draft);

  if (setupMode.destination && /destination|travel|coastal|weekend|itinerary|hotel/.test(source)) score += 2;
  if (setupMode.weekend && /timeline|experience|weekend|guest|travel/.test(source)) score += 1;
  if (setupMode.bilingual && /faq|schedule|guide|details|guest/.test(source)) score += 1;
  if (setupMode.interfaith && /story|schedule|faq|details|ceremony/.test(source)) score += 1;

  return score;
};

export const getRecommendedTemplates = (
  draft: Pick<SetupDraft, 'stylePreferences' | 'guestEstimateBand'>,
  templates: TemplateCatalogItem[],
  limit = 3,
): TemplateCatalogItem[] => {
  if (draft.stylePreferences.length === 0) return templates.slice(0, limit);

  return [...templates]
    .map((template) => ({ template, score: scoreTemplateForSetup(template, draft) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name))
    .slice(0, limit)
    .map((entry) => entry.template);
};
