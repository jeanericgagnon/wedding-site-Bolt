import { BuilderPage, generateBuilderId } from '../../types/builder/project';
import { BuilderSectionInstance, createDefaultSectionInstance } from '../../types/builder/section';
import { BuilderTemplateDefinition, TemplatePageSlot, TemplateSectionSlot } from '../../types/builder/template';
import { inferTemplatePages } from '../constants/builderTemplatePacks';
import {
  assignDefaultSectionAnchors,
  normalizePageAnchorSlug,
  normalizeSectionAnchorId,
  stripRedundantPageSectionAnchor,
} from './sectionAnchors';

export type TemplateApplyPageMode = 'single' | 'multi';

export type TemplateSectionTransformer = (sections: BuilderSectionInstance[]) => BuilderSectionInstance[];

export const identityTemplateSectionTransformer: TemplateSectionTransformer = (sections) => sections;

function getTemplateString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value;
  }
  return '';
}

export function normalizeTemplatePageSlots(template: BuilderTemplateDefinition): TemplatePageSlot[] {
  const pages = template.pages && template.pages.length > 0
    ? template.pages
    : inferTemplatePages(template.sectionComposition);

  return pages.map((page, index) => ({
    ...page,
    title: getTemplateString(page.title).trim() || (index === 0 || page.isHome ? 'Home' : `Page ${index + 1}`),
    slug: getTemplateString(page.slug),
  }));
}

export function getTemplatePageSlotSlug(pageSlot: Pick<TemplatePageSlot, 'slug' | 'title'>): string {
  return normalizePageAnchorSlug(pageSlot.slug) || normalizePageAnchorSlug(pageSlot.title);
}

export function makeUniqueTemplatePageSlug(
  baseSlug: string,
  usedSlugs: Set<string>,
  fallbackIndex = usedSlugs.size + 1,
): string {
  const fallback = normalizePageAnchorSlug(baseSlug) || `page-${fallbackIndex}`;
  if (!usedSlugs.has(fallback)) {
    usedSlugs.add(fallback);
    return fallback;
  }

  let index = 2;
  while (usedSlugs.has(`${fallback}-${index}`)) index += 1;
  const slug = `${fallback}-${index}`;
  usedSlugs.add(slug);
  return slug;
}

export function createSectionFromTemplateSlot(slot: TemplateSectionSlot, orderIndex: number): BuilderSectionInstance {
  const section = createDefaultSectionInstance(slot.type, slot.variant, orderIndex);
  return {
    ...section,
    enabled: slot.enabled,
    locked: slot.locked,
    settings: { ...section.settings, ...slot.settings },
  };
}

export function applyCollapsedPageAnchor(
  section: BuilderSectionInstance,
  pageSlot: TemplatePageSlot,
  sectionIndex: number,
): BuilderSectionInstance {
  const pageSlug = getTemplatePageSlotSlug(pageSlot);
  if (!pageSlug || pageSlot.isHome || pageSlug === 'home' || sectionIndex !== 0 || normalizeSectionAnchorId(section.settings.anchorId)) {
    return section;
  }

  return {
    ...section,
    settings: {
      ...section.settings,
      anchorId: pageSlug,
    },
  };
}

export function stripRedundantDedicatedPageAnchors(
  sections: BuilderSectionInstance[],
  pageSlot: Pick<TemplatePageSlot, 'title' | 'isHome'> & { slug: string },
): BuilderSectionInstance[] {
  if (pageSlot.isHome || normalizePageAnchorSlug(pageSlot.slug) === 'home') return sections;
  return sections.map((section) => stripRedundantPageSectionAnchor(section, {
    slug: pageSlot.slug,
    title: pageSlot.title,
    meta: { isHome: false },
  }));
}

function hasExplicitAnchorSetting(section: BuilderSectionInstance | undefined): boolean {
  return Object.prototype.hasOwnProperty.call(section?.settings ?? {}, 'anchorId');
}

function stripGeneratedDedicatedPageLeadAnchor(
  sections: BuilderSectionInstance[],
  transformedSections: BuilderSectionInstance[],
  isHomePage: boolean,
): BuilderSectionInstance[] {
  if (isHomePage || hasExplicitAnchorSetting(transformedSections[0])) return sections;
  return sections.map((section, index) => {
    if (index !== 0 || !hasExplicitAnchorSetting(section)) return section;
    const { anchorId: _anchorId, ...settings } = section.settings;
    return {
      ...section,
      settings,
    };
  });
}

export function buildTemplatePageInstances(
  template: BuilderTemplateDefinition,
  pageMode: TemplateApplyPageMode,
  transformSections: TemplateSectionTransformer = identityTemplateSectionTransformer,
): BuilderPage[] {
  if (pageMode === 'single') {
    const pageEntries = normalizeTemplatePageSlots(template).flatMap((pageSlot) =>
      pageSlot.sectionComposition.map((slot, sectionIndex) => ({
        pageSlot,
        sectionIndex,
        slot,
        section: applyCollapsedPageAnchor(
          createSectionFromTemplateSlot(slot, 0),
          pageSlot,
          sectionIndex,
        ),
      }))
    );
    const pageEntryBySlot = new Map(pageEntries.map((entry) => [entry.slot, entry]));
    const canPreserveTemplateCompositionOrder = template.sectionComposition.length === pageEntries.length
      && template.sectionComposition.every((slot) => pageEntryBySlot.has(slot));
    const baseEntries = canPreserveTemplateCompositionOrder
      ? template.sectionComposition.map((slot) => pageEntryBySlot.get(slot)!)
      : pageEntries;
    const baseSections = baseEntries.map(({ section }, sectionIndex) => ({ ...section, orderIndex: sectionIndex }));
    const usedCollapsedAnchorSlugs = new Set<string>();
    const restoredCollapsedAnchors = transformSections(baseSections)
      .map((section, sectionIndex) => {
        const entry = baseEntries[sectionIndex];
        if (!entry) return section;
        const pageSlug = getTemplatePageSlotSlug(entry.pageSlot);
        if (!pageSlug || entry.pageSlot.isHome || pageSlug === 'home' || entry.sectionIndex !== 0) {
          return section;
        }

        return {
          ...section,
          settings: {
            ...section.settings,
            anchorId: makeUniqueTemplatePageSlug(pageSlug, usedCollapsedAnchorSlugs, sectionIndex + 1),
          },
        };
      });

    const sections = assignDefaultSectionAnchors(
      restoredCollapsedAnchors
    ).map((section, sectionIndex) => ({ ...section, orderIndex: sectionIndex }));

    return [{
      id: 'home',
      title: 'Home',
      slug: 'home',
      orderIndex: 0,
      sections,
      meta: { isHome: true, isHidden: false },
    }];
  }

  const usedPageSlugs = new Set<string>();

  return normalizeTemplatePageSlots(template).map((pageSlot, pageIndex) => {
    const normalizedSlotSlug = getTemplatePageSlotSlug(pageSlot);
    const wantsHomePage = pageSlot.isHome === true || pageIndex === 0 || normalizedSlotSlug === 'home';
    const isHomePage = wantsHomePage && !usedPageSlugs.has('home');
    const pageSlug = isHomePage
      ? makeUniqueTemplatePageSlug('home', usedPageSlugs, pageIndex + 1)
      : makeUniqueTemplatePageSlug(normalizedSlotSlug, usedPageSlugs, pageIndex + 1);
    const baseSections = pageSlot.sectionComposition.map((slot, sectionIndex) =>
      createSectionFromTemplateSlot(slot, sectionIndex)
    );
    const transformedSections = transformSections(baseSections);
    const sections = assignDefaultSectionAnchors(transformedSections)
      .map((section, sectionIndex) => ({ ...section, orderIndex: sectionIndex }));
    const pageSections = stripRedundantDedicatedPageAnchors(stripGeneratedDedicatedPageLeadAnchor(
      sections,
      transformedSections,
      isHomePage
    ), {
      title: pageSlot.title,
      slug: pageSlug,
      isHome: isHomePage,
    });

    return {
      id: isHomePage ? 'home' : generateBuilderId(),
      title: pageSlot.title,
      slug: pageSlug,
      orderIndex: pageIndex,
      sections: pageSections,
      meta: {
        isHome: isHomePage,
        isHidden: isHomePage ? false : pageSlot.isHidden === true,
      },
    };
  });
}
