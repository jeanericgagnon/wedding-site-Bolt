import type { SectionConfig } from '../types/siteConfig';

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  section_order: Omit<SectionConfig, 'id'>[];
  default_theme?: {
    preset?: string;
  };
}

export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  base: {
    id: 'base',
    name: 'Base',
    description: 'Default structure with all standard sections',
    section_order: [
      {
        type: 'hero',
        enabled: true,
        props_key: 'hero',
      },
      {
        type: 'details',
        enabled: true,
        props_key: 'details',
      },
      {
        type: 'schedule',
        enabled: true,
        props_key: 'schedule',
      },
      {
        type: 'travel',
        enabled: true,
        props_key: 'travel',
      },
      {
        type: 'rsvp',
        enabled: true,
        props_key: 'rsvp',
      },
      {
        type: 'registry',
        enabled: true,
        props_key: 'registry',
      },
      {
        type: 'faq',
        enabled: true,
        props_key: 'faq',
      },
      {
        type: 'gallery',
        enabled: false,
        props_key: 'gallery',
      },
    ],
    default_theme: {
      preset: 'romantic',
    },
  },
};

export function getTemplate(templateId: string): TemplateDefinition | null {
  return TEMPLATE_REGISTRY[templateId] || null;
}
