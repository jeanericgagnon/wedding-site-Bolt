import { BuilderTemplateDefinition } from '../../types/builder/template';
import { getLaunchTemplatePacks, inferTemplatePages } from './builderTemplatePacks';
import type { TemplateUseCasePackId } from './templateUseCasePacks';
import { normalizePageAnchorSlug } from '../utils/sectionAnchors';

export type TemplatePageBlueprint = {
  title: string;
  route: string;
  sections: string[];
};

export type TemplateReadinessLabel = 'Guest-ready' | 'Strong draft' | 'Needs details';

export const TEMPLATE_READINESS_LABELS: TemplateReadinessLabel[] = ['Guest-ready', 'Strong draft', 'Needs details'];

export type TemplateCatalogItem = {
  id: string;
  name: string;
  previewImage: string;
  previewFallbackImage: string;
  styleTags: string[];
  seasonTags: string[];
  colorwayId: string;
  designFamily: string;
  description: string;
  bestFor: string[];
  includedModules: string[];
  defaultSectionOrder: string[];
  pageCount: number;
  pageTitles: string[];
  guestRoutes: string[];
  pageBlueprints: TemplatePageBlueprint[];
  useCaseIds: TemplateUseCasePackId[];
  readinessScore: number;
  readinessLabel: TemplateReadinessLabel;
  readinessGaps: string[];
  launchTier?: 'flagship' | 'secondary';
};

export type TemplateCatalogSummary = {
  totalTemplates: number;
  guestReadyTemplates: number;
  strongDraftTemplates: number;
  multiPageTemplates: number;
  averageReadinessScore: number;
  useCaseCounts: Record<TemplateUseCasePackId, number>;
};

const THEME_TO_COLORWAY: Record<string, string> = {
  editorial: 'ivory-ink',
  elegant: 'ivory-black-gold',
  moody: 'midnight-ink',
  romantic: 'blush-sage',
  playful: 'mono-contrast',
  classic: 'ivory-black-gold',
  coastal: 'seafoam-sand',
  garden: 'blush-sage',
  minimal: 'ivory-ink',
  luxury: 'ivory-black-gold',
  destination: 'seafoam-sand',
  ocean: 'seafoam-sand',
  photography: 'ivory-ink',
  boho: 'terracotta-cream',
  rustic: 'terracotta-cream',
  sunset: 'terracotta-cream',
  linen: 'ivory-ink',
};

const words = (v: string) => v.toLowerCase();

const inferStyleTags = (id: string, name: string, description: string): string[] => {
  const src = `${id} ${name} ${description}`.toLowerCase();
  const tags: string[] = [];
  const add = (tag: string, match: boolean) => {
    if (match && !tags.includes(tag)) tags.push(tag);
  };

  add('Modern', /modern|minimal|clean|contemporary/.test(src));
  add('Minimal', /minimal|clean/.test(src));
  add('Floral', /garden|floral|botanical/.test(src));
  add('Romantic', /romantic|dreamy|love/.test(src));
  add('Destination', /destination|travel|coastal|beach|adventure/.test(src));
  add('Classic', /classic|timeless|traditional/.test(src));
  add('Formal', /formal|black.tie|black tie|luxury|elegant|opulent/.test(src));
  add('Rustic', /rustic|barn|vineyard/.test(src));
  add('Boho', /boho|earthy/.test(src));
  add('Bold', /bold|dramatic|cinematic|editorial/.test(src));

  if (tags.length === 0) tags.push('Modern');
  return tags.slice(0, 3);
};

const inferSeasonTags = (id: string, name: string, description: string): string[] => {
  const src = words(`${id} ${name} ${description}`);
  const tags: string[] = [];
  const add = (tag: string, ok: boolean) => {
    if (ok && !tags.includes(tag)) tags.push(tag);
  };
  add('Spring', /garden|floral|pastel|romantic/.test(src));
  add('Summer', /coastal|beach|destination|outdoor/.test(src));
  add('Fall', /rustic|barn|warm|earthy/.test(src));
  add('Winter', /moody|formal|black tie|luxury/.test(src));
  if (tags.length === 0) tags.push('Spring', 'Summer');
  return tags.slice(0, 2);
};

const titleCase = (s: string) =>
  s
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const styleTagFromMood = (tag: string) => {
  if (tag === 'luxe') return 'Formal';
  return tag.charAt(0).toUpperCase() + tag.slice(1);
};

const getTemplateString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value;
  }
  return '';
};

const getTemplatePages = (tpl: BuilderTemplateDefinition) => (
  (tpl.pages && tpl.pages.length > 0 ? tpl.pages : inferTemplatePages(tpl.sectionComposition)).map((page, index) => ({
    ...page,
    title: getTemplateString(page.title).trim() || (index === 0 || page.isHome ? 'Home' : `Page ${index + 1}`),
    slug: getTemplateString(page.slug),
  }))
);

const getTemplatePageSlug = (page: { slug?: unknown; title?: unknown }): string => (
  normalizePageAnchorSlug(page.slug) || normalizePageAnchorSlug(page.title)
);

const buildGuestRoutes = (tpl: BuilderTemplateDefinition): string[] => (
  getTemplatePages(tpl)
    .filter((page) => page.isHidden !== true)
    .map((page, index) => {
      const slug = getTemplatePageSlug(page);
      if (page.isHome || index === 0 || slug === 'home') return '/';
      return `/${slug || `page-${index + 1}`}`;
    })
);

const buildPageBlueprints = (tpl: BuilderTemplateDefinition): TemplatePageBlueprint[] => (
  getTemplatePages(tpl)
    .filter((page) => page.isHidden !== true)
    .map((page, index) => {
      const slug = getTemplatePageSlug(page);
      const route = page.isHome || index === 0 || slug === 'home' ? '/' : `/${slug || `page-${index + 1}`}`;
      return {
        title: page.title,
        route,
        sections: page.sectionComposition
          .filter((section) => section.enabled)
          .map((section) => titleCase(String(section.type))),
      };
    })
);

const inferUseCaseIds = (tpl: BuilderTemplateDefinition, modules: string[], guestRoutes: string[]): TemplateUseCasePackId[] => {
  const src = `${tpl.id} ${tpl.displayName} ${tpl.description} ${(tpl.bestFor ?? []).join(' ')} ${modules.join(' ')} ${guestRoutes.join(' ')}`.toLowerCase();
  const moduleSet = new Set(modules.map((module) => module.toLowerCase()));
  const routeSet = new Set(guestRoutes);
  const useCases: TemplateUseCasePackId[] = [];
  const add = (id: TemplateUseCasePackId, ok: boolean) => {
    if (ok && !useCases.includes(id)) useCases.push(id);
  };

  add('destination', /destination|coastal|beach|travel|hotel|lodging|airport/.test(src) || routeSet.has('/travel'));
  add('weekend', tpl.sectionComposition.some((section) => section.type === 'schedule' && section.variant === 'dayTabs') || (routeSet.has('/schedule') && routeSet.has('/travel') && routeSet.has('/rsvp')));
  add('black-tie', /black tie|formal|ballroom|invitation/.test(src) || moduleSet.has('dress code') || moduleSet.has('menu'));
  add('guest-interactive', /guestbook|song|music|interactive|photo/.test(src) || moduleSet.has('music') || moduleSet.has('quotes'));
  add('interfaith', /ceremony|family|tradition|interfaith|details/.test(src) && routeSet.has('/details'));
  add('bilingual', routeSet.has('/details') && (moduleSet.has('faq') || moduleSet.has('schedule')));

  return useCases;
};

const getReadinessLabel = (score: number): TemplateReadinessLabel => {
  if (score >= 90) return 'Guest-ready';
  if (score >= 75) return 'Strong draft';
  return 'Needs details';
};

const assessTemplateReadiness = (
  modules: string[],
  guestRoutes: string[],
): { readinessScore: number; readinessLabel: TemplateReadinessLabel; readinessGaps: string[] } => {
  const moduleSet = new Set(modules.map((module) => module.toLowerCase()));
  const routeSet = new Set(guestRoutes);
  const checks = [
    { label: 'Hero', ok: moduleSet.has('hero'), weight: 14 },
    { label: 'Venue', ok: moduleSet.has('venue'), weight: 14 },
    { label: 'Schedule', ok: moduleSet.has('schedule'), weight: 14 },
    { label: 'RSVP', ok: moduleSet.has('rsvp') && routeSet.has('/rsvp'), weight: 16 },
    { label: 'Guest logistics', ok: moduleSet.has('travel') || moduleSet.has('accommodations') || moduleSet.has('directions'), weight: 12 },
    { label: 'Emotional content', ok: moduleSet.has('story') || moduleSet.has('gallery') || moduleSet.has('quotes'), weight: 10 },
    { label: 'Helpful follow-up', ok: moduleSet.has('faq') || moduleSet.has('registry') || moduleSet.has('contact'), weight: 10 },
    { label: 'Multi-page navigation', ok: guestRoutes.length >= 4 && routeSet.has('/schedule') && routeSet.has('/rsvp'), weight: 10 },
  ];
  const readinessScore = checks.reduce((score, check) => score + (check.ok ? check.weight : 0), 0);
  const readinessGaps = checks.filter((check) => !check.ok).map((check) => check.label);

  return {
    readinessScore,
    readinessLabel: getReadinessLabel(readinessScore),
    readinessGaps,
  };
};

const buildCatalog = (): TemplateCatalogItem[] => {
  return getLaunchTemplatePacks().map((tpl: BuilderTemplateDefinition) => {
    const inferredStyleTags = inferStyleTags(tpl.id, tpl.displayName, tpl.description);
    const styleTags = Array.from(new Set([
      ...tpl.moodTags.map(styleTagFromMood),
      ...inferredStyleTags,
    ])).slice(0, 3);
    const seasonTags = inferSeasonTags(tpl.id, tpl.displayName, tpl.description);
    const defaultSectionOrder = tpl.sectionComposition
      .filter((section) => section.enabled)
      .map((s) => titleCase(String(s.type)));
    const includedModules = Array.from(new Set(defaultSectionOrder));
    const colorwayId = THEME_TO_COLORWAY[tpl.defaultThemeId] ?? 'ivory-ink';
    const pages = getTemplatePages(tpl);
    const guestRoutes = buildGuestRoutes(tpl);
    const pageBlueprints = buildPageBlueprints(tpl);
    const readiness = assessTemplateReadiness(includedModules, guestRoutes);

    return {
      id: tpl.id,
      name: tpl.displayName,
      previewImage: tpl.previewThumbnailPath,
      previewFallbackImage: '/template-previews/_fallback.svg',
      styleTags,
      seasonTags,
      colorwayId,
      designFamily: tpl.id,
      description: tpl.description,
      bestFor: tpl.bestFor ?? [styleTags[0] ? `${styleTags[0]} weddings` : 'All celebrations'],
      includedModules,
      defaultSectionOrder,
      pageCount: pages.filter((page) => page.isHidden !== true).length,
      pageTitles: pages.filter((page) => page.isHidden !== true).map((page) => page.title),
      guestRoutes,
      pageBlueprints,
      useCaseIds: inferUseCaseIds(tpl, includedModules, guestRoutes),
      ...readiness,
      launchTier: tpl.launchTier === 'secondary' ? 'secondary' : 'flagship',
    };
  });
};

export const templateCatalog: TemplateCatalogItem[] = buildCatalog();

const uniqueSorted = (arr: string[]) => Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));

const buildTemplateCatalogSummary = (templates: TemplateCatalogItem[]): TemplateCatalogSummary => {
  const useCaseCounts = templates.reduce<Record<TemplateUseCasePackId, number>>((counts, template) => {
    for (const id of template.useCaseIds) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, {} as Record<TemplateUseCasePackId, number>);
  const totalReadiness = templates.reduce((sum, template) => sum + template.readinessScore, 0);

  return {
    totalTemplates: templates.length,
    guestReadyTemplates: templates.filter((template) => template.readinessLabel === 'Guest-ready').length,
    strongDraftTemplates: templates.filter((template) => template.readinessLabel === 'Strong draft').length,
    multiPageTemplates: templates.filter((template) => template.pageCount > 1).length,
    averageReadinessScore: templates.length > 0 ? Math.round(totalReadiness / templates.length) : 0,
    useCaseCounts,
  };
};

export const templateStyleFacets = uniqueSorted(templateCatalog.flatMap((t) => t.styleTags));
export const templateSeasonFacets = uniqueSorted(templateCatalog.flatMap((t) => t.seasonTags));
export const templateColorwayFacets = uniqueSorted(templateCatalog.map((t) => t.colorwayId));
export const templateUseCaseFacets = uniqueSorted(templateCatalog.flatMap((t) => t.useCaseIds));
export const templateCatalogSummary = buildTemplateCatalogSummary(templateCatalog);
