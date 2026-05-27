import type { TemplateCatalogItem } from '../builder/constants/templateCatalog';
import type { TemplateSupportManifest } from '../builder/constants/templateSupportManifest';

export type TemplateSort = 'recommended' | 'name' | 'style';

export interface TemplateFilterSummary {
  visibleCount: number;
  recommendedVisibleCount: number;
  selectedVisible: boolean;
  empty: boolean;
  activeFilters: string[];
  headline: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
}

export interface TemplateCompareBrief {
  title: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  current: string;
  next: string;
  then: string;
  recommendedWinnerId: string | null;
}

const normalizeSearch = (value: string) => value.trim().toLowerCase();

const templateSearchHaystack = (template: TemplateCatalogItem) => normalizeSearch([
  template.name,
  template.description,
  template.designFamily,
  ...template.styleTags,
  ...template.seasonTags,
  ...template.bestFor,
  ...template.includedModules,
  ...template.defaultSectionOrder,
].join(' '));

export function filterAndSortTemplates(args: {
  templates: TemplateCatalogItem[];
  style: string;
  season: string;
  colorway: string;
  searchQuery: string;
  sortBy: TemplateSort;
  recommendedTemplateIds: string[];
}): TemplateCatalogItem[] {
  const {
    templates,
    style,
    season,
    colorway,
    searchQuery,
    sortBy,
    recommendedTemplateIds,
  } = args;

  const normalizedQuery = normalizeSearch(searchQuery);
  const filtered = templates.filter((template) => {
    const styleOk = style === 'all' || template.styleTags.includes(style);
    const seasonOk = season === 'all' || template.seasonTags.includes(season);
    const colorOk = colorway === 'all' || template.colorwayId === colorway;
    const searchOk = !normalizedQuery || templateSearchHaystack(template).includes(normalizedQuery);
    return styleOk && seasonOk && colorOk && searchOk;
  });

  const sorted = [...filtered];
  if (sortBy === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'style') {
    sorted.sort((a, b) => (a.styleTags[0] ?? '').localeCompare(b.styleTags[0] ?? ''));
  } else {
    sorted.sort((a, b) => {
      const aRec = recommendedTemplateIds.includes(a.id) ? 1 : 0;
      const bRec = recommendedTemplateIds.includes(b.id) ? 1 : 0;
      if (aRec !== bRec) return bRec - aRec;
      return a.name.localeCompare(b.name);
    });
  }

  return sorted;
}

export function buildTemplateFilterSummary(args: {
  filtered: TemplateCatalogItem[];
  style: string;
  season: string;
  colorway: string;
  searchQuery: string;
  selectedTemplateId: string | null;
  recommendedTemplateIds: string[];
}): TemplateFilterSummary {
  const { filtered, style, season, colorway, searchQuery, selectedTemplateId, recommendedTemplateIds } = args;
  const activeFilters = [
    style !== 'all' ? style : null,
    season !== 'all' ? season : null,
    colorway !== 'all' ? colorway : null,
    searchQuery.trim() ? `Search: ${searchQuery.trim()}` : null,
  ].filter((value): value is string => Boolean(value));

  const recommendedVisibleCount = filtered.filter((template) => recommendedTemplateIds.includes(template.id)).length;
  const selectedVisible = selectedTemplateId ? filtered.some((template) => template.id === selectedTemplateId) : false;
  const empty = filtered.length === 0;

  if (empty) {
    return {
      visibleCount: 0,
      recommendedVisibleCount: 0,
      selectedVisible,
      empty: true,
      activeFilters,
      headline: 'These filters are too narrow to make an honest choice',
      detail: 'Nothing in the catalog currently matches this combination, so the calmer move is widening the search instead of over-reading a zero-result state.',
      bestNextMove: 'Clear one or two filters and look for the smallest set that still gives you a real choice.',
      decisionRule: 'When the result set hits zero, widen the filters before you change your standards.',
      watchout: 'A zero-result state can make the catalog feel thinner than it really is. Broaden the search before you abandon the direction.',
    };
  }

  if (recommendedVisibleCount > 0) {
    return {
      visibleCount: filtered.length,
      recommendedVisibleCount,
      selectedVisible,
      empty: false,
      activeFilters,
      headline: recommendedVisibleCount === 1
        ? 'One especially strong fit is still visible'
        : `${recommendedVisibleCount} strong-fit templates are still visible`,
      detail: selectedVisible
        ? 'Your currently selected design is still in the result set, and the recommended lane is visible too, so this is a good moment to choose based on structural confidence instead of thumbnail mood.'
        : 'The current filter set still leaves recommended options in view, which usually means you can decide here without browsing the whole catalog again.',
      bestNextMove: recommendedVisibleCount === 1
        ? 'Open the strongest fit, then compare it only if another option has a genuinely different section flow.'
        : 'Use compare mode on the best-fit options and choose the one that needs the least cleanup after setup.',
      decisionRule: 'If a recommended option is still visible, let structural fit outrank novelty.',
      watchout: 'Once the result set is small and strong, extra browsing tends to create churn more than clarity.',
    };
  }

  return {
    visibleCount: filtered.length,
    recommendedVisibleCount,
    selectedVisible,
    empty: false,
    activeFilters,
    headline: filtered.length === 1
      ? 'One viable direction remains after filtering'
      : `${filtered.length} viable directions remain after filtering`,
    detail: 'The catalog is now narrow enough that every remaining option is plausible, so the next move is checking whether the section flow matches the weekend you actually want guests to read.',
    bestNextMove: filtered.length === 1
      ? 'Open the remaining design and confirm the section order before you commit.'
      : 'Choose two options to compare and decide on structure, not just surface style.',
    decisionRule: 'When recommendations fall away, keep the option whose section flow feels easiest to trust.',
    watchout: 'Thin result sets can over-reward aesthetics. Keep checking the guest-facing structure, not just the thumbnail.',
  };
}

const scoreTemplateForDecision = (args: {
  template: TemplateCatalogItem;
  manifest: TemplateSupportManifest | null;
  recommended: boolean;
  selected: boolean;
}) => {
  const { template, manifest, recommended, selected } = args;
  let score = 0;
  if (recommended) score += 5;
  if (selected) score += 3;
  if (manifest?.templateExistsInBuilder) score += 3;
  if (manifest?.previewStatus === 'verified') score += 2;
  score += Math.min(template.defaultSectionOrder.length, 10);
  score += Math.min(template.includedModules.length, 6);
  return score;
};

export function buildTemplateCompareBrief(args: {
  comparedTemplates: TemplateCatalogItem[];
  manifestsByTemplateId: Record<string, TemplateSupportManifest | null>;
  recommendedTemplateIds: string[];
  selectedTemplateId: string | null;
}): TemplateCompareBrief | null {
  const { comparedTemplates, manifestsByTemplateId, recommendedTemplateIds, selectedTemplateId } = args;
  if (comparedTemplates.length === 0) return null;

  if (comparedTemplates.length === 1) {
    const template = comparedTemplates[0];
    const manifest = manifestsByTemplateId[template.id] ?? null;
    return {
      title: `${template.name} is ready for a closer structure check`,
      detail: 'You have one design in compare mode, which is the right moment to decide whether it actually matches the weekend flow you want guests to read.',
      bestNextMove: 'Add one more design if you are torn, or open this one and check the section order honestly before you commit.',
      decisionRule: 'If you do not need a second design to answer a real question, keep moving instead of comparison shopping out of habit.',
      watchout: manifest?.templateExistsInBuilder
        ? 'Do not let a clean preview turn into endless comparison if the structure already feels trustworthy.'
        : 'This design still wants a little more builder confidence, so compare it against one steadier option before you commit.',
      current: 'Pick the design you are genuinely considering.',
      next: 'Compare only if the structural question is still real.',
      then: 'Commit and move the next pass into content clarity.',
      recommendedWinnerId: null,
    };
  }

  const ranked = [...comparedTemplates]
    .map((template) => ({
      template,
      score: scoreTemplateForDecision({
        template,
        manifest: manifestsByTemplateId[template.id] ?? null,
        recommended: recommendedTemplateIds.includes(template.id),
        selected: selectedTemplateId === template.id,
      }),
    }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0]?.template ?? null;
  const runnerUp = ranked[1]?.template ?? null;
  const winnerManifest = winner ? manifestsByTemplateId[winner.id] ?? null : null;

  return {
    title: winner && runnerUp
      ? `${winner.name} looks like the steadier starting point`
      : 'One option is beginning to look steadier',
    detail: winner && runnerUp
      ? `${winner.name} currently has the stronger balance of fit, support coverage, and section readiness compared with ${runnerUp.name}.`
      : 'One option currently has a stronger balance of support coverage and section readiness.',
    bestNextMove: winner
      ? `Use compare mode to confirm ${winner.name} still feels easier to trust, then start there and stop browsing.`
      : 'Choose the option that needs less structural cleanup and move on.',
    decisionRule: 'When two designs look close, choose the one that needs less cleanup after setup and has stronger support truth.',
    watchout: winnerManifest?.templateExistsInBuilder
      ? 'Do not let minor aesthetic preference outrank the calmer operational path once one option is clearly steadier.'
      : 'The prettiest option can still be the costlier one if its support coverage is thinner. Keep builder truth in the decision.',
    current: 'Compare the structure and support truth side by side.',
    next: winner ? `Choose ${winner.name} if it still feels steadier after one honest preview pass.` : 'Choose the steadier option.',
    then: 'Move the next pass into real content and guest clarity, not more template churn.',
    recommendedWinnerId: winner?.id ?? null,
  };
}
