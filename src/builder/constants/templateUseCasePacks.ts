export type TemplateUseCasePackId = 'destination' | 'bilingual' | 'interfaith';

export interface TemplateUseCasePack {
  id: TemplateUseCasePackId;
  label: string;
  description: string;
  defaultChanges: string[];
}

export const TEMPLATE_USE_CASE_PACKS: TemplateUseCasePack[] = [
  {
    id: 'destination',
    label: 'Destination',
    description: 'Travel-first structure, weekend logistics, and guest coordination come forward early.',
    defaultChanges: ['Travel details come earlier', 'Hotel + airport guidance', 'Weekend event structure'],
  },
  {
    id: 'bilingual',
    label: 'Bilingual',
    description: 'Copy, guest guidance, and FAQs should support two-language households more gracefully.',
    defaultChanges: ['Two-language welcome flow', 'Dual-language FAQs', 'Guest guidance without awkward duplication'],
  },
  {
    id: 'interfaith',
    label: 'Interfaith',
    description: 'Ceremony context, family guidance, and schedule clarity matter more than generic template styling.',
    defaultChanges: ['Ceremony context sections', 'Family guidance FAQs', 'Multi-tradition schedule cues'],
  },
];
