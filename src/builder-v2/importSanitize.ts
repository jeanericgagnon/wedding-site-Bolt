import { BUILDER_V2_BLOCK_TYPES, type BuilderV2BlockType } from './contracts';

const normalizeToken = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const BLOCK_TYPE_ALIASES: Record<string, BuilderV2BlockType> = {
  headline: 'title',
  heading: 'title',
  paragraph: 'text',
  copy: 'text',
  body: 'text',
  questionanswer: 'qna',
  photoimage: 'photo',
  image: 'photo',
  storyparagraph: 'story',
  timeline: 'timelineItem',
  timelineitem: 'timelineItem',
  scheduleitem: 'event',
  eventitem: 'event',
  traveltip: 'travelTip',
  travelnote: 'travelTip',
  hotel: 'hotelCard',
  hotelitem: 'hotelCard',
  hotelcard: 'hotelCard',
  registryitem: 'registryItem',
  giftitem: 'registryItem',
  fund: 'fundHighlight',
  fundhighlight: 'fundHighlight',
  rsvp: 'rsvpNote',
  rsvpnote: 'rsvpNote',
  faq: 'faqItem',
  faqitem: 'faqItem',
  separator: 'divider',
};

export function sanitizeImportedBlockType(type: unknown): BuilderV2BlockType {
  if (typeof type === 'string') {
    if ((BUILDER_V2_BLOCK_TYPES as readonly string[]).includes(type)) {
      return type as BuilderV2BlockType;
    }

    const normalizedType = normalizeToken(type);
    const directMatch = BUILDER_V2_BLOCK_TYPES.find((candidate) => normalizeToken(candidate) === normalizedType);
    if (directMatch) {
      return directMatch;
    }

    const aliasMatch = BLOCK_TYPE_ALIASES[normalizedType];
    if (aliasMatch) {
      return aliasMatch;
    }
  }
  return 'text';
}

const SECTION_TYPE_ALIASES: Record<string, string> = {
  herosection: 'hero',
  storysection: 'story',
  schedulesection: 'schedule',
  eventsection: 'schedule',
  travelsection: 'travel',
  registrysection: 'registry',
  rsvpsection: 'rsvp',
  faqsection: 'faq',
  venuesection: 'venue',
  gallerysection: 'gallery',
  weddingparty: 'wedding-party',
  weddingpartysection: 'wedding-party',
  dresscode: 'dress-code',
  dresscodesection: 'dress-code',
  accommodationsection: 'accommodations',
  accommodationssection: 'accommodations',
  directionssection: 'directions',
  countdownsection: 'countdown',
};

export function sanitizeImportedSectionType(type: unknown): string {
  if (typeof type !== 'string') return 'custom';
  const trimmed = type.trim();
  if (!trimmed) return 'custom';

  const normalizedToken = normalizeToken(trimmed);
  if (normalizedToken.startsWith('registrysection')) {
    return 'registry';
  }

  const alias = SECTION_TYPE_ALIASES[normalizedToken];
  if (alias) return alias;

  return trimmed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'custom';
}
