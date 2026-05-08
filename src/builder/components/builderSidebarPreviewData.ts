import { getDefinition } from '../../sections/registry';
import { SECTION_REGISTRY as LEGACY_SECTION_REGISTRY } from '../../sections/sectionRegistry';
import { BuilderSectionType } from '../../types/builder/section';
import { createEmptyWeddingData, WeddingDataV1 } from '../../types/weddingData';
import { getVariantPreviewSource } from '../registry/variantPreviewSource';

const LEGACY_PLACEHOLDER_TYPES = new Set<BuilderSectionType>(['quotes', 'menu', 'music', 'directions', 'video'] as BuilderSectionType[]);

const PREVIEW_FIXTURES_BY_TYPE: Partial<Record<BuilderSectionType, Record<string, unknown>>> = {
  hero: { title: 'We are getting married', headline: 'Alex & Sam', subtitle: 'January 17, 2027 · Rosewood Estate', showTitle: true },
  story: { title: 'Our Story', showTitle: true },
  venue: { title: 'Venue', showMap: true, showTitle: true },
  schedule: { title: 'Weekend Timeline', showTitle: true },
  travel: { title: 'Travel & Stay', showParking: true, showTitle: true },
  registry: { title: 'Registry', message: 'Your presence is gift enough, but here are a few ideas.', showTitle: true },
  faq: { title: 'FAQ', showTitle: true },
  rsvp: { title: 'RSVP', showTitle: true },
  gallery: { title: 'Gallery', showTitle: true },
  countdown: { showTitle: true, title: 'Countdown', message: 'Celebration starts soon' },
  'wedding-party': { showTitle: true, title: 'Wedding Party' },
  'dress-code': { showTitle: true, title: 'Dress Code', dressCodeLabel: 'Black Tie Optional' },
  accommodations: { showTitle: true, title: 'Accommodations' },
  contact: { showTitle: true, title: 'Questions?' },
  'footer-cta': { headline: 'We’d love your reply', buttonLabel: 'Send RSVP' },
  quotes: { headline: 'Kind words from the people we love', eyebrow: 'Notes from loved ones' },
  menu: { headline: 'Dinner and drinks', eyebrow: 'Reception menu' },
  music: { headline: 'Songs we love', eyebrow: 'On repeat' },
  directions: { headline: 'How to get there', eyebrow: 'Travel details' },
  video: { headline: 'A short film from us', eyebrow: 'Featured video' },
};

const PREVIEW_FIXTURES_BY_VARIANT: Record<string, Record<string, unknown>> = {
  'hero:countdown': { title: 'Save the date', subtitle: 'Ceremony starts in 47 days' },
  'hero:invitation': { title: 'Together with their families', subtitle: 'invite you to celebrate with them' },
  'hero:split': { title: 'Napa weekend', subtitle: 'Vows · Dinner · Dancing' },
  'story:timeline': { title: 'Our story in three chapters' },
  'story:milestones': { title: 'Moments that brought us here' },
  'venue:detailsFirst': { title: 'Venue details and logistics', showMap: false },
  'venue:mapFirst': { title: 'How to find the venue', showMap: true },
  'schedule:agendaCards': { title: 'Weekend events at a glance' },
  'schedule:program': { title: 'Ceremony and reception plan' },
  'travel:mapPins': { title: 'Where to stay nearby' },
  'travel:compact': { title: 'Quick travel notes' },
  'registry:featured': { title: 'Registry highlights' },
  'registry:minimal': { title: 'Your presence means the most' },
  'rsvp:multiEvent': { title: 'Reply for each event' },
  'rsvp:formal': { title: 'Please reply' },
  'gallery:polaroid': { title: 'Wedding weekend snapshots' },
  'gallery:filmStrip': { title: 'Favorite frames' },
  'countdown:simple': { title: 'Big day countdown', message: 'We can’t wait to celebrate with you' },
  'dress-code:moodBoard': { title: 'Dress inspiration', colorPalette: [{ id: 'c1', color: '#1f2937', label: 'Midnight' }, { id: 'c2', color: '#e5e7eb', label: 'Silver' }, { id: 'c3', color: '#9f1239', label: 'Rose' }] },
  'contact:form': { title: 'Need Help?', showTitle: true },
  'footer-cta:rsvpPush': { headline: 'RSVP by May 12' },
};

export function hasLivePreviewSupport(sectionType: BuilderSectionType, variantId: string): boolean {
  if (getDefinition(sectionType, variantId)) return true;
  if (LEGACY_PLACEHOLDER_TYPES.has(sectionType)) return false;
  return Boolean(LEGACY_SECTION_REGISTRY[sectionType]);
}

export function buildPreviewSettings(sectionType: BuilderSectionType, variantId: string): Record<string, unknown> {
  const previewVariantId = getVariantPreviewSource(sectionType, variantId);
  return {
    showTitle: true,
    ...(PREVIEW_FIXTURES_BY_TYPE[sectionType] ?? {}),
    ...(PREVIEW_FIXTURES_BY_VARIANT[`${sectionType}:${previewVariantId}`] ?? {}),
  };
}

export type PreviewPhotoSet = 'romantic' | 'editorial' | 'coastal';
type PreviewSectionFamily = Extract<BuilderSectionType, 'hero' | 'story' | 'gallery' | 'rsvp' | 'venue' | 'schedule' | 'travel' | 'registry' | 'faq' | 'contact' | 'footer-cta'>;

interface PreviewPhotoRecipe {
  hero: string;
  gallery: string[];
  moments: string[];
  story?: string;
}

export const PREVIEW_PHOTO_SET_OPTIONS: Array<{ id: PreviewPhotoSet; label: string }> = [
  { id: 'romantic', label: 'Romantic' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'coastal', label: 'Coastal' },
];

const ENGAGEMENT_LIBRARY = [
  '/photos/engagement/003bf600-3a4d-4f35-976b-0586379b6785.jpg',
  '/photos/engagement/053d97ba-331e-4d85-93f9-7986e70e2874.jpg',
  '/photos/engagement/092f4223-1508-45f6-8f3d-78ca5afbb6f1.jpg',
  '/photos/engagement/18419a0b-742d-4e06-b315-c83be4e25f68.jpg',
  '/photos/engagement/1e3ee16d-404f-48e2-b949-62ed57e96c6c.jpg',
  '/photos/engagement/36788f74-4b86-4550-bee9-6b2e5fbb19f5.jpg',
  '/photos/engagement/3a6534e7-adf1-44c5-a728-94c6f6fa646c.jpg',
  '/photos/engagement/3c011ec8-ec9e-4b90-99f8-22e12da880c8.jpg',
  '/photos/engagement/45fe54f7-a753-4e5d-9913-aff3951db84f.jpg',
  '/photos/engagement/46c6527f-aabe-48ef-87c0-bfdac05c571f.jpg',
  '/photos/engagement/46ec533f-9fdb-4c8d-8f52-759efe846352.jpg',
  '/photos/engagement/47fc5b76-b923-4d85-8bd1-df4cb9cebcb8.jpg',
];

const ENGAGEMENT_MOMENTS = [
  'Golden-hour portraits together',
  'Playful candid with natural smiles',
  'Walking shots with soft movement',
  'Close-up ring and hand detail',
  'Wide scenic frame for hero moments',
  'Documentary-style laugh and motion',
  'Soft editorial portrait in shade',
  'Sunlit celebration frame',
  'Elegant side-profile portrait',
  'Classic embrace shot',
  'Final storytelling frame',
];

function makeRecipe(start: number, story?: string): PreviewPhotoRecipe {
  const hero = ENGAGEMENT_LIBRARY[start % ENGAGEMENT_LIBRARY.length];
  const gallery = [0, 1, 2].map((offset) => ENGAGEMENT_LIBRARY[(start + offset) % ENGAGEMENT_LIBRARY.length]);
  const moments = [0, 1, 2].map((offset) => ENGAGEMENT_MOMENTS[(start + offset) % ENGAGEMENT_MOMENTS.length]);
  return { hero, gallery, moments, story };
}

const PREVIEW_FAMILY_PHOTO_LIBRARY: Record<PreviewPhotoSet, Partial<Record<PreviewSectionFamily, PreviewPhotoRecipe>>> = {
  romantic: {
    hero: makeRecipe(0, 'From first look to final dance, this weekend should feel personal, clear, and easy for guests to follow.'),
    story: makeRecipe(1),
    gallery: makeRecipe(2),
    rsvp: makeRecipe(3),
    venue: makeRecipe(4),
    schedule: makeRecipe(5),
    travel: makeRecipe(6),
    registry: makeRecipe(7),
    faq: makeRecipe(8),
    contact: makeRecipe(9),
    'footer-cta': makeRecipe(10),
  },
  editorial: {
    hero: makeRecipe(2, 'A strong visual direction with your own photos makes the site feel personal from the start.'),
    story: makeRecipe(3),
    gallery: makeRecipe(4),
    rsvp: makeRecipe(5),
    venue: makeRecipe(6),
    schedule: makeRecipe(7),
    travel: makeRecipe(8),
    registry: makeRecipe(9),
    faq: makeRecipe(10),
    contact: makeRecipe(11),
    'footer-cta': makeRecipe(0),
  },
  coastal: {
    hero: makeRecipe(4, 'Your own engagement photos help every preview feel closer to a real wedding website from day one.'),
    story: makeRecipe(5),
    gallery: makeRecipe(6),
    rsvp: makeRecipe(7),
    venue: makeRecipe(8),
    schedule: makeRecipe(9),
    travel: makeRecipe(10),
    registry: makeRecipe(11),
    faq: makeRecipe(0),
    contact: makeRecipe(1),
    'footer-cta': makeRecipe(2),
  },
};

function getPreviewPhotoRecipe(photoSet: PreviewPhotoSet, sectionType: string): PreviewPhotoRecipe {
  const typedSection = sectionType as PreviewSectionFamily;
  const bySet = PREVIEW_FAMILY_PHOTO_LIBRARY[photoSet];
  return bySet[typedSection] ?? bySet.hero ?? PREVIEW_FAMILY_PHOTO_LIBRARY.editorial.hero!;
}

export const buildPreviewWeddingData = (photoSet: PreviewPhotoSet, sectionType: string = 'hero'): WeddingDataV1 => {
  const recipe = getPreviewPhotoRecipe(photoSet, sectionType);
  const data = createEmptyWeddingData();
  data.couple.partner1Name = 'Alex';
  data.couple.partner2Name = 'Sam';
  data.couple.displayName = 'Alex & Sam';
  data.couple.story = recipe.story ?? 'From quiet coffee-shop mornings to a candlelit first dance, this weekend is a chance to gather the people we love most.';
  data.event.weddingDateISO = new Date('2027-01-17T17:00:00.000Z').toISOString();
  data.venues = [{ id: 'venue-1', name: 'Rosewood Estate', address: 'Napa Valley, CA' }];
  data.schedule = [
    { id: 's1', label: 'Welcome Dinner', startTimeISO: '2027-01-16T18:00:00.000Z', venueId: 'venue-1', notes: 'Cocktails and sunset toasts' },
    { id: 's2', label: 'Ceremony', startTimeISO: '2027-01-17T17:00:00.000Z', venueId: 'venue-1', notes: 'Please arrive 20 minutes early' },
    { id: 's3', label: 'Reception', startTimeISO: '2027-01-17T19:00:00.000Z', venueId: 'venue-1', notes: 'Dinner, dancing, and late-night bites' },
  ];
  data.travel = {
    notes: 'We suggest arriving by Friday afternoon to enjoy the full weekend experience.',
    parkingInfo: 'Complimentary valet and shuttle service available from partner hotels.',
    hotelInfo: 'Room blocks are reserved at The Archer, Oak & Ivy, and Riverstone House.',
    flightInfo: 'Nearest airports: SFO (90 min) and OAK (75 min).',
  };
  data.rsvp.deadlineISO = new Date('2027-05-12T00:00:00.000Z').toISOString();
  data.registry.links = [
    { id: 'reg-1', label: 'Honeymoon Fund', url: 'https://example.com/registry/honeymoon' },
    { id: 'reg-2', label: 'Williams Sonoma', url: 'https://example.com/registry/home' },
  ];
  data.faq = [
    { id: 'faq-1', q: 'Can I bring a plus one?', a: 'Please follow your invite details.' },
    { id: 'faq-2', q: 'Will photos be shared?', a: 'Yes — we’ll share photos after the wedding weekend.' },
  ];
  data.media.heroImageUrl = recipe.hero;
  data.media.gallery = recipe.gallery.map((url, i) => ({ id: `g${i + 1}`, url, caption: recipe.moments[i] ?? `Moment ${i + 1}` }));
  return data;
};
