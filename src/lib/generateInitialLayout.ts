import { LayoutConfigV1, SectionInstance } from '../types/layoutConfig';
import { WeddingDataV1 } from '../types/weddingData';
import { getTemplate } from '../templates/registry';
import { resolveBuilderVariant } from './sectionVariantCompatibility';
import { assertCanonicalTemplateLayout } from './canonicalTemplateRuntime';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isPlaceholderCopy(value?: string): boolean {
  if (!value?.trim()) return true;
  const normalized = value.trim().toLowerCase();
  return normalized.includes('will be shared here')
    || normalized.includes('closer to the wedding')
    || normalized.includes('will be shared soon')
    || normalized.includes('recommendations will be shared soon');
}

export function generateInitialLayout(
  templateId: string,
  data: WeddingDataV1
): LayoutConfigV1 {
  const now = new Date().toISOString();
  const template = getTemplate(templateId);

  const hasRealFaqContent = data.faq.some((item) => Boolean(item.q?.trim() && item.a?.trim()));
  const hasSubstantiveFaqContent = data.faq.some((item) => Boolean(item.q?.trim() && item.a?.trim() && !isPlaceholderCopy(item.a)));
  const hasRealTravelContent = Boolean(
    (data.travel?.hotelInfo?.trim() && !isPlaceholderCopy(data.travel.hotelInfo)) ||
    (data.travel?.flightInfo?.trim() && !isPlaceholderCopy(data.travel.flightInfo)) ||
    (data.travel?.parkingInfo?.trim() && !isPlaceholderCopy(data.travel.parkingInfo)) ||
    (data.travel?.notes?.trim() && !isPlaceholderCopy(data.travel.notes))
  );
  const hasRealRegistryContent = data.registry.links.some((link) => Boolean(link.url?.trim()));
  const hasRealStoryContent = Boolean(data.couple.story?.trim()) && !isPlaceholderCopy(data.couple.story);
  const hasRealGalleryContent = data.media.gallery.some((item) => Boolean(item.url?.trim()));
  const hasMultipleScheduleItems = (data.schedule?.length ?? 0) > 1;
  const useCasePacks = data.meta?.useCasePacks ?? [];
  const hasDestinationPack = useCasePacks.includes('destination');
  const hasBilingualPack = useCasePacks.includes('bilingual');
  const hasInterfaithPack = useCasePacks.includes('interfaith');

  const shouldDisableEmptySection = (type: SectionInstance['type']) => {
    if (type === 'registry') return !hasRealRegistryContent;
    if (type === 'faq') return !hasSubstantiveFaqContent && !hasBilingualPack && !hasInterfaithPack;
    if (type === 'travel') return !hasRealTravelContent && !hasMultipleScheduleItems && !hasDestinationPack;
    if (type === 'story') return !hasRealStoryContent;
    if (type === 'gallery') return !hasRealGalleryContent;
    return false;
  };

  const sections: SectionInstance[] = template.defaultLayout.sections.map((sectionDef) => {
    const section: SectionInstance = {
      id: generateId(),
      type: sectionDef.type as SectionInstance['type'],
      variant: resolveBuilderVariant(sectionDef.type as SectionInstance['type'], sectionDef.variant),
      enabled: shouldDisableEmptySection(sectionDef.type as SectionInstance['type']) ? false : sectionDef.enabled,
      bindings: { ...sectionDef.bindings },
      settings: { ...sectionDef.settings },
      overrides: sectionDef.overrides ? { ...sectionDef.overrides } : undefined,
      locked: sectionDef.locked,
    };

    if (sectionDef.type === 'venue' && data.venues.length > 0) {
      section.bindings.venueIds = data.venues.map(v => v.id);
    }

    if (sectionDef.type === 'schedule' && data.schedule.length > 0) {
      section.bindings.scheduleItemIds = data.schedule.map(s => s.id);
    }

    if (sectionDef.type === 'registry' && hasRealRegistryContent) {
      section.bindings.linkIds = data.registry.links.filter((link) => link.url?.trim()).map(l => l.id);
    }

    if (sectionDef.type === 'faq' && hasRealFaqContent) {
      section.bindings.faqIds = data.faq.map(f => f.id);
      if (!hasSubstantiveFaqContent) {
        section.enabled = false;
      }
    }

    return section;
  });

  const layout = {
    version: '1' as const,
    templateId,
    pages: [
      {
        id: 'home',
        title: 'Home',
        sections,
      },
    ],
    meta: {
      createdAtISO: now,
      updatedAtISO: now,
    },
  };

  assertCanonicalTemplateLayout(layout, `generateInitialLayout:${templateId}`);
  return layout;
}

export function regenerateLayout(
  newTemplateId: string,
  data: WeddingDataV1,
  currentLayout: LayoutConfigV1
): LayoutConfigV1 {
  const newLayout = generateInitialLayout(newTemplateId, data);

  const currentSectionsByType = new Map<string, SectionInstance>();
  currentLayout.pages[0]?.sections.forEach(section => {
    currentSectionsByType.set(section.type, section);
  });

  const preservedSections: SectionInstance[] = [];

  newLayout.pages[0].sections.forEach(newSection => {
    const existing = currentSectionsByType.get(newSection.type);
    if (existing) {
      preservedSections.push({
        ...newSection,
        enabled: existing.enabled,
        settings: { ...newSection.settings, ...existing.settings },
        bindings: { ...newSection.bindings, ...existing.bindings },
        overrides: existing.overrides ?? newSection.overrides,
        locked: existing.locked ?? newSection.locked,
      });
    } else {
      preservedSections.push(newSection);
    }
  });

  return {
    ...newLayout,
    pages: [
      {
        ...newLayout.pages[0],
        sections: preservedSections,
      },
    ],
    meta: {
      ...newLayout.meta,
      updatedAtISO: new Date().toISOString(),
    },
  };
}
