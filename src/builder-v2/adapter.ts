import type { SectionInstance } from '../types/layoutConfig';
import type { BuilderV2Block, BuilderV2Document, BuilderV2Section } from './contracts';

const normalizeBuilderV2SectionType = (type: string) => {
  const normalizedType = type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalizedType.startsWith('registrysection') ? 'registry' : type;
};

const makeDefaultBlocksForType = (type: string): BuilderV2Block[] => {
  switch (normalizeBuilderV2SectionType(type)) {
    case 'hero':
      return [
        { id: 'b-title', type: 'title', data: { text: 'Welcome to our wedding' } },
        { id: 'b-text', type: 'text', data: { text: 'Edit this intro in the right rail.' } },
      ];
    case 'story':
      return [{ id: 'b-story', type: 'story', data: { text: 'Tell your story here.' } }];
    case 'schedule':
      return [{ id: 'b-event', type: 'event', data: { title: 'Ceremony', time: '4:00 PM', location: 'Main Venue' } }];
    case 'travel':
      return [{ id: 'b-tip', type: 'travelTip', data: { title: 'Travel tip', note: 'Book flights early.' } }];
    case 'registry':
      return [{ id: 'b-reg', type: 'registryItem', data: { title: 'Registry item', note: 'Add item details here.' } }];
    case 'rsvp':
      return [{ id: 'b-rsvp', type: 'rsvpNote', data: { note: 'Please RSVP by the deadline.' } }];
    default:
      return [{ id: 'b-text', type: 'text', data: { text: 'Add content.' } }];
  }
};

export const toBuilderV2Section = (instance: SectionInstance): BuilderV2Section => {
  const normalizedType = normalizeBuilderV2SectionType(instance.type);
  return {
    id: instance.id,
    type: normalizedType,
    variant: instance.variant,
    enabled: instance.enabled,
    title: instance.settings?.title,
    subtitle: instance.settings?.subtitle,
    blocks: makeDefaultBlocksForType(normalizedType),
  };
};

export const toBuilderV2Document = (instances: SectionInstance[]): BuilderV2Document => ({
  version: 'v2',
  pages: [
    {
      id: 'home',
      title: 'Home',
      slug: 'home',
      isHome: true,
      hidden: false,
      sections: instances.map(toBuilderV2Section),
    },
  ],
  updatedAtISO: new Date().toISOString(),
});
