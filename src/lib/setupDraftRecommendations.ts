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
  'Black tie',
  'Guest interactive',
] as const;

export type SetupMode = {
  destination: boolean;
  bilingual: boolean;
  interfaith: boolean;
  weekend: boolean;
  blackTie: boolean;
  guestInteractive: boolean;
};

export type RecommendedTemplateMatch = {
  template: TemplateCatalogItem;
  score: number;
  reasons: string[];
  isFallback: boolean;
};

const normalizeSetupPreference = (value: string) => value.trim().toLowerCase();

const buildPreferenceSet = (preferences: readonly string[]) => (
  new Set(preferences.map(normalizeSetupPreference).filter(Boolean))
);

const hasPreference = (prefs: Set<string>, value: string) => prefs.has(normalizeSetupPreference(value));

const addReason = (reasons: string[], reason: string) => {
  if (!reasons.includes(reason)) reasons.push(reason);
};

export const deriveSetupMode = (draft: Pick<SetupDraft, 'stylePreferences' | 'guestEstimateBand'>): SetupMode => {
  const prefs = buildPreferenceSet(draft.stylePreferences);
  const destination = hasPreference(prefs, 'Destination');
  const bilingual = hasPreference(prefs, 'Bilingual');
  const interfaith = hasPreference(prefs, 'Interfaith');
  const blackTie = hasPreference(prefs, 'Black tie') || hasPreference(prefs, 'Formal');
  const guestInteractive = hasPreference(prefs, 'Guest interactive') || hasPreference(prefs, 'Bold');
  const weekend = hasPreference(prefs, 'Weekend') || destination || draft.guestEstimateBand === '200plus';
  return { destination, bilingual, interfaith, weekend, blackTie, guestInteractive };
};

const scoreTemplateMatchForSetup = (
  template: TemplateCatalogItem,
  draft: Pick<SetupDraft, 'stylePreferences' | 'guestEstimateBand'>,
): RecommendedTemplateMatch => {
  const prefs = buildPreferenceSet(draft.stylePreferences);
  const reasons: string[] = [];
  let score = 0;
  for (const tag of template.styleTags) {
    if (hasPreference(prefs, tag)) {
      score += 1;
      addReason(reasons, `Matches ${tag.toLowerCase()} style`);
    }
  }
  if (hasPreference(prefs, 'Weekend') && hasPreference(prefs, 'Destination')) {
    score -= 1;
  }
  const source = `${template.id} ${template.name} ${template.description} ${template.bestFor.join(' ')} ${template.defaultSectionOrder.join(' ')} ${template.pageTitles.join(' ')} ${template.guestRoutes.join(' ')}`.toLowerCase();
  const setupMode = deriveSetupMode(draft);
  const routeSet = new Set(template.guestRoutes);
  const moduleSet = new Set(template.includedModules.map((module) => module.toLowerCase()));
  const hasDedicatedTravel = routeSet.has('/travel');
  const hasDedicatedSchedule = routeSet.has('/schedule');
  const hasDedicatedDetails = routeSet.has('/details');
  const hasDedicatedRsvp = routeSet.has('/rsvp');

  if (setupMode.destination && /destination|travel|coastal|itinerary|hotel/.test(source)) {
    score += 2;
    addReason(reasons, 'Built for destination logistics');
  }
  if (setupMode.weekend && /timeline|experience|weekend|guest|travel/.test(source)) {
    score += 1;
    addReason(reasons, 'Supports weekend coordination');
  }
  if (setupMode.destination && setupMode.weekend && /weekend|getaway|multi-day/.test(source)) {
    score += 1;
    addReason(reasons, 'Fits a multi-day getaway');
  }
  if (setupMode.destination && hasDedicatedTravel) {
    score += 2;
    addReason(reasons, 'Includes a dedicated travel page');
  }
  if (setupMode.weekend && template.pageCount >= 4) {
    score += 1;
    addReason(reasons, 'Starts with multiple guest pages');
  }
  if (setupMode.weekend && hasDedicatedSchedule && hasDedicatedRsvp) {
    score += 1;
    addReason(reasons, 'Separates schedule and RSVP');
  }
  if (setupMode.bilingual && /faq|schedule|guide|details|guest/.test(source)) {
    score += 1;
    addReason(reasons, 'Has guest guidance sections');
  }
  if (setupMode.interfaith && /story|schedule|faq|details|ceremony/.test(source)) {
    score += 1;
    addReason(reasons, 'Can explain ceremony context');
  }
  if (setupMode.interfaith && hasDedicatedDetails) {
    score += 1;
    addReason(reasons, 'Includes a details page');
  }
  if (setupMode.interfaith && /family|tradition|multi-tradition|cultural/.test(source)) {
    score += 2;
    addReason(reasons, 'Supports family or tradition notes');
  }
  if (setupMode.blackTie && /black tie|formal|ballroom|invitation|classic|luxe/.test(source)) {
    score += 3;
    addReason(reasons, 'Matches formal wedding tone');
  }
  if (setupMode.blackTie && moduleSet.has('dress code')) {
    score += 1;
    addReason(reasons, 'Includes dress code guidance');
  }
  if (setupMode.guestInteractive && /playful|bold|music|guestbook|song|photo/.test(source)) {
    score += 2;
    addReason(reasons, 'Supports guest interaction');
  }
  if (setupMode.guestInteractive && (moduleSet.has('music') || moduleSet.has('quotes') || moduleSet.has('gallery'))) {
    score += 1;
    addReason(reasons, 'Includes interactive or photo moments');
  }

  return { template, score, reasons, isFallback: false };
};

export const getRecommendedTemplateMatches = (
  draft: Pick<SetupDraft, 'stylePreferences' | 'guestEstimateBand'>,
  templates: TemplateCatalogItem[],
  limit = 3,
): RecommendedTemplateMatch[] => {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  if (normalizedLimit <= 0) return [];
  if (draft.stylePreferences.length === 0) {
    return templates.slice(0, normalizedLimit).map((template) => ({
      template,
      score: 0,
      reasons: ['Good all-purpose starting point'],
      isFallback: true,
    }));
  }

  const scored = [...templates]
    .map((template) => scoreTemplateMatchForSetup(template, draft))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name));

  if (scored.length >= normalizedLimit) return scored.slice(0, normalizedLimit);

  const used = new Set(scored.map((entry) => entry.template.id));
  const fallbacks = templates
    .filter((template) => !used.has(template.id))
    .slice(0, Math.max(normalizedLimit - scored.length, 0))
    .map((template) => ({
      template,
      score: 0,
      reasons: ['Stable fallback when preferences are broad'],
      isFallback: true,
    }));

  return [...scored, ...fallbacks].slice(0, normalizedLimit);
};

export const getRecommendedTemplates = (
  draft: Pick<SetupDraft, 'stylePreferences' | 'guestEstimateBand'>,
  templates: TemplateCatalogItem[],
  limit = 3,
): TemplateCatalogItem[] => {
  return getRecommendedTemplateMatches(draft, templates, limit).map((entry) => entry.template);
};
