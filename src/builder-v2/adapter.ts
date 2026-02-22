import type { SectionInstance } from '../types/layoutConfig';
import type { BuilderV2Block, BuilderV2Document, BuilderV2Section } from './contracts';

const makeDefaultBlocksForType = (type: string): BuilderV2Block[] => {
  switch (type) {
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
  return {
    id: instance.id,
    type: instance.type,
    variant: instance.variant,
    enabled: instance.enabled,
    title: instance.settings?.title,
    subtitle: instance.settings?.subtitle,
    blocks: makeDefaultBlocksForType(instance.type),
  };
};

export const toBuilderV2Document = (instances: SectionInstance[]): BuilderV2Document => ({
  version: 'v2',
  sections: instances.map(toBuilderV2Section),
  updatedAtISO: new Date().toISOString(),
});
