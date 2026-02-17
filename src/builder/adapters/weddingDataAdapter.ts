import { WeddingDataV1 } from '../../types/weddingData';
import { BuilderSectionInstance } from '../../types/builder/section';

export interface BuilderContentBindings {
  venueIds: string[];
  scheduleItemIds: string[];
  linkIds: string[];
  faqIds: string[];
  heroImageUrl: string | undefined;
  galleryAssetUrls: string[];
}

export function fromWeddingDataToBuilderBindings(data: WeddingDataV1): BuilderContentBindings {
  return {
    venueIds: data.venues.map(v => v.id),
    scheduleItemIds: data.schedule.map(s => s.id),
    linkIds: data.registry.links.map(l => l.id),
    faqIds: data.faq.map(f => f.id),
    heroImageUrl: data.media.heroImageUrl,
    galleryAssetUrls: data.media.gallery.map(g => g.url),
  };
}

export function applyWeddingDataBindingsToSections(
  sections: BuilderSectionInstance[],
  data: WeddingDataV1
): BuilderSectionInstance[] {
  const bindings = fromWeddingDataToBuilderBindings(data);

  return sections.map(section => {
    switch (section.type) {
      case 'venue':
        return { ...section, bindings: { ...section.bindings, venueIds: bindings.venueIds } };
      case 'schedule':
        return {
          ...section,
          bindings: { ...section.bindings, scheduleItemIds: bindings.scheduleItemIds },
        };
      case 'registry':
        return { ...section, bindings: { ...section.bindings, linkIds: bindings.linkIds } };
      case 'faq':
        return { ...section, bindings: { ...section.bindings, faqIds: bindings.faqIds } };
      default:
        return section;
    }
  });
}

export function extractWeddingDataUpdatesFromSections(
  sections: BuilderSectionInstance[],
  existingData: WeddingDataV1
): Partial<WeddingDataV1> {
  const updates: Partial<WeddingDataV1> = {};

  const venueSec = sections.find(s => s.type === 'venue');
  if (venueSec?.settings.title && typeof venueSec.settings.title === 'string') {
    updates.venues = existingData.venues;
  }

  return updates;
}
