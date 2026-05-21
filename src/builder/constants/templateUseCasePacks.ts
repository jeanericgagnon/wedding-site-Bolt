export type TemplateUseCasePackId =
  | 'destination'
  | 'bilingual'
  | 'interfaith'
  | 'black-tie'
  | 'weekend'
  | 'guest-interactive';

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
  {
    id: 'black-tie',
    label: 'Black tie',
    description: 'Formal weddings need invitation-style language, dress guidance, menu context, and clear RSVP expectations.',
    defaultChanges: ['Formal RSVP wording', 'Dress code details', 'Menu and venue emphasis'],
  },
  {
    id: 'weekend',
    label: 'Full weekend',
    description: 'Multi-event celebrations work best when schedule, travel, lodging, and RSVP each have a clear home.',
    defaultChanges: ['Dedicated schedule page', 'Travel and lodging page', 'Multi-event RSVP structure'],
  },
  {
    id: 'guest-interactive',
    label: 'Guest interactive',
    description: 'Livelier sites can invite guests into the experience without burying core logistics.',
    defaultChanges: ['Song request moment', 'Guest notes or quotes', 'Photo-forward gallery'],
  },
];
