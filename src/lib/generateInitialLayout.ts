import { LayoutConfigV1, SectionInstance } from '../types/layoutConfig';
import { WeddingDataV1 } from '../types/weddingData';
import { getTemplate } from '../templates/registry';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateInitialLayout(
  templateId: string,
  data: WeddingDataV1
): LayoutConfigV1 {
  const now = new Date().toISOString();
  const template = getTemplate(templateId);

  const sections: SectionInstance[] = template.defaultLayout.sections.map((sectionDef) => {
    const section: SectionInstance = {
      id: generateId(),
      type: sectionDef.type,
      variant: sectionDef.variant,
      enabled: sectionDef.enabled,
      bindings: { ...sectionDef.bindings },
      settings: { ...sectionDef.settings },
    };

    if (sectionDef.type === 'venue' && data.venues.length > 0) {
      section.bindings.venueIds = data.venues.map(v => v.id);
    }

    if (sectionDef.type === 'schedule' && data.schedule.length > 0) {
      section.bindings.scheduleItemIds = data.schedule.map(s => s.id);
    }

    if (sectionDef.type === 'registry' && data.registry.links.length > 0) {
      section.bindings.linkIds = data.registry.links.map(l => l.id);
    }

    if (sectionDef.type === 'faq' && data.faq.length > 0) {
      section.bindings.faqIds = data.faq.map(f => f.id);
    }

    return section;
  });

  return {
    version: '1',
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
