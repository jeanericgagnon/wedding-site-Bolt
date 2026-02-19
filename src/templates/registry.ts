import { SectionInstance } from '../types/layoutConfig';

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  defaultThemePreset: string;
  defaultLayout: {
    sections: Omit<SectionInstance, 'id'>[];
  };
}

const baseTemplate: TemplateDefinition = {
  id: 'base',
  name: 'Base',
  description: 'Clean and simple layout with all essential sections',
  defaultThemePreset: 'romantic',
  defaultLayout: {
    sections: [
      { type: 'hero', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true } },
      { type: 'story', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Our Story' } },
      { type: 'venue', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Venue' } },
      { type: 'schedule', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Schedule' } },
      { type: 'travel', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Travel & Accommodations' } },
      { type: 'registry', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Registry' } },
      { type: 'rsvp', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'RSVP' } },
      { type: 'faq', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'FAQ' } },
      { type: 'gallery', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Photos' } },
    ],
  },
};

const modernTemplate: TemplateDefinition = {
  id: 'modern',
  name: 'Modern',
  description: 'Contemporary design with gallery first, minimal sections',
  defaultThemePreset: 'elegant',
  defaultLayout: {
    sections: [
      { type: 'hero', variant: 'minimal', enabled: true, bindings: {}, settings: { showTitle: true } },
      { type: 'gallery', variant: 'masonry', enabled: true, bindings: {}, settings: { showTitle: false } },
      { type: 'story', variant: 'centered', enabled: true, bindings: {}, settings: { showTitle: true, title: 'About Us' } },
      { type: 'schedule', variant: 'timeline', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Event Details' } },
      { type: 'venue', variant: 'card', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Location' } },
      { type: 'rsvp', variant: 'inline', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Join Us' } },
      { type: 'registry', variant: 'grid', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Gift Registry' } },
      { type: 'travel', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Getting There' } },
      { type: 'faq', variant: 'accordion', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Questions' } },
    ],
  },
};

const editorialTemplate: TemplateDefinition = {
  id: 'editorial',
  name: 'Editorial',
  description: 'Story-focused layout with elegant typography',
  defaultThemePreset: 'garden',
  defaultLayout: {
    sections: [
      { type: 'hero', variant: 'fullbleed', enabled: true, bindings: {}, settings: { showTitle: true } },
      { type: 'story', variant: 'split', enabled: true, bindings: {}, settings: { showTitle: false } },
      { type: 'venue', variant: 'card', enabled: true, bindings: {}, settings: { showTitle: true, title: 'The Venue' } },
      { type: 'schedule', variant: 'timeline', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Timeline' } },
      { type: 'gallery', variant: 'masonry', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Our Journey' } },
      { type: 'travel', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Plan Your Visit' } },
      { type: 'faq', variant: 'accordion', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Good to Know' } },
      { type: 'registry', variant: 'grid', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Registry' } },
      { type: 'rsvp', variant: 'inline', enabled: true, bindings: {}, settings: { showTitle: true, title: 'RSVP' } },
    ],
  },
};

const classicTemplate: TemplateDefinition = {
  id: 'classic',
  name: 'Classic',
  description: 'Timeless elegance with traditional layout and refined typography',
  defaultThemePreset: 'classic',
  defaultLayout: {
    sections: [
      { type: 'hero', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true } },
      { type: 'story', variant: 'centered', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Our Story' } },
      { type: 'venue', variant: 'card', enabled: true, bindings: {}, settings: { showTitle: true, title: 'The Venue' } },
      { type: 'schedule', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Order of Events' } },
      { type: 'registry', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Registry' } },
      { type: 'rsvp', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Kindly RSVP' } },
      { type: 'travel', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Travel & Accommodations' } },
      { type: 'faq', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Frequently Asked Questions' } },
      { type: 'gallery', variant: 'default', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Gallery' } },
    ],
  },
};

const boldContemporaryTemplate: TemplateDefinition = {
  id: 'bold-contemporary',
  name: 'Bold Contemporary',
  description: 'High-contrast typography, asymmetric layouts, and a confident modern aesthetic',
  defaultThemePreset: 'elegant',
  defaultLayout: {
    sections: [
      { type: 'hero', variant: 'fullbleed', enabled: true, bindings: {}, settings: { showTitle: true } },
      { type: 'schedule', variant: 'timeline', enabled: true, bindings: {}, settings: { showTitle: true, title: 'The Day' } },
      { type: 'story', variant: 'split', enabled: true, bindings: {}, settings: { showTitle: true, title: 'How It Happened' } },
      { type: 'gallery', variant: 'filmStrip', enabled: true, bindings: {}, settings: { showTitle: false } },
      { type: 'venue', variant: 'splitMap', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Where We Gather' } },
      { type: 'registry', variant: 'featured', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Registry' } },
      { type: 'rsvp', variant: 'multiEvent', enabled: true, bindings: {}, settings: { showTitle: true, title: 'RSVP' } },
      { type: 'travel', variant: 'hotelBlock', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Where to Stay' } },
      { type: 'faq', variant: 'accordion', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Questions' } },
    ],
  },
};

const photoStorytellingTemplate: TemplateDefinition = {
  id: 'photo-storytelling',
  name: 'Photo Storytelling',
  description: 'Photography-first design where every section leads with stunning imagery',
  defaultThemePreset: 'romantic',
  defaultLayout: {
    sections: [
      { type: 'hero', variant: 'fullbleed', enabled: true, bindings: {}, settings: { showTitle: true } },
      { type: 'gallery', variant: 'masonry', enabled: true, bindings: {}, settings: { showTitle: false } },
      { type: 'story', variant: 'centered', enabled: true, bindings: {}, settings: { showTitle: false } },
      { type: 'venue', variant: 'mapFirst', enabled: true, bindings: {}, settings: { showTitle: true, title: 'The Venue' } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Day of' } },
      { type: 'gallery', variant: 'polaroid', enabled: false, bindings: {}, settings: { showTitle: true, title: 'More Memories' } },
      { type: 'travel', variant: 'list', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Getting There' } },
      { type: 'rsvp', variant: 'inline', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Will you join us?' } },
      { type: 'registry', variant: 'cards', enabled: true, bindings: {}, settings: { showTitle: true, title: 'Registry' } },
    ],
  },
};

export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  base: baseTemplate,
  modern: modernTemplate,
  editorial: editorialTemplate,
  classic: classicTemplate,
  rustic: classicTemplate,
  'bold-contemporary': boldContemporaryTemplate,
  'photo-storytelling': photoStorytellingTemplate,
};

export function getTemplate(templateId: string): TemplateDefinition {
  return TEMPLATE_REGISTRY[templateId] || TEMPLATE_REGISTRY.base;
}

export function getAllTemplates(): TemplateDefinition[] {
  return [baseTemplate, modernTemplate, editorialTemplate, classicTemplate, boldContemporaryTemplate, photoStorytellingTemplate];
}
