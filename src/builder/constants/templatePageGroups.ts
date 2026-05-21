import type { BuilderSectionType } from '../../types/builder/section';

export type TemplatePageGroupId = 'home' | 'schedule' | 'travel' | 'details' | 'rsvp' | 'registry';

export const TEMPLATE_PAGE_GROUPS: Array<{
  id: TemplatePageGroupId;
  title: string;
  slug: string;
  isHome?: boolean;
  sectionTypes: BuilderSectionType[];
}> = [
  {
    id: 'home',
    title: 'Home',
    slug: 'home',
    isHome: true,
    sectionTypes: ['hero', 'story', 'venue', 'gallery', 'countdown', 'footer-cta'],
  },
  {
    id: 'schedule',
    title: 'Schedule',
    slug: 'schedule',
    sectionTypes: ['schedule'],
  },
  {
    id: 'travel',
    title: 'Travel',
    slug: 'travel',
    sectionTypes: ['travel', 'accommodations', 'directions'],
  },
  {
    id: 'details',
    title: 'Details',
    slug: 'details',
    sectionTypes: ['wedding-party', 'dress-code', 'menu', 'music', 'video', 'quotes', 'custom'],
  },
  {
    id: 'rsvp',
    title: 'RSVP',
    slug: 'rsvp',
    sectionTypes: ['rsvp', 'faq', 'contact'],
  },
  {
    id: 'registry',
    title: 'Registry',
    slug: 'registry',
    sectionTypes: ['registry'],
  },
];
