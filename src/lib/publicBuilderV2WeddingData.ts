import { getBuilderV2Pages, type BuilderV2Block, type BuilderV2Document, type BuilderV2Section } from '../builder-v2/contracts';
import { createEmptyWeddingData, type WeddingDataV1 } from '../types/weddingData';

const hasMeaningfulString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const getVisibleSections = (document: BuilderV2Document): BuilderV2Section[] => (
  getBuilderV2Pages(document)
    .filter((page) => !page.hidden)
    .flatMap((page) => page.sections.filter((section) => section.enabled))
);

const getBlockText = (block: BuilderV2Block) => (
  [
    block.data.text,
    block.data.note,
    block.data.answer,
    block.data.caption,
  ].find(hasMeaningfulString)?.trim() ?? ''
);

const getFirstMeaningfulPhotoUrl = (sections: BuilderV2Section[]) => {
  for (const section of sections) {
    for (const block of section.blocks) {
      if (hasMeaningfulString(block.data.imageUrl)) return block.data.imageUrl.trim();
    }
  }
  return '';
};

const deriveFaq = (sections: BuilderV2Section[]): WeddingDataV1['faq'] => (
  sections
    .filter((section) => section.type === 'faq')
    .flatMap((section) => section.blocks
      .filter((block) => block.type === 'faqItem' || block.type === 'qna')
      .map((block, index) => ({
        id: `${section.id}-faq-${index}`,
        q: hasMeaningfulString(block.data.question) ? block.data.question.trim() : (hasMeaningfulString(block.data.title) ? block.data.title.trim() : ''),
        a: hasMeaningfulString(block.data.answer) ? block.data.answer.trim() : getBlockText(block),
      }))
      .filter((item) => item.q || item.a))
);

const deriveSchedule = (sections: BuilderV2Section[]) => {
  const venues: WeddingDataV1['venues'] = [];
  const venueIds = new Map<string, string>();
  const schedule: WeddingDataV1['schedule'] = [];

  sections
    .filter((section) => section.type === 'schedule')
    .forEach((section) => {
      section.blocks
        .filter((block) => block.type === 'event' || block.type === 'timelineItem')
        .forEach((block, index) => {
          const location = hasMeaningfulString(block.data.location) ? block.data.location.trim() : '';
          let venueId: string | undefined;

          if (location) {
            if (!venueIds.has(location)) {
              const id = `${section.id}-venue-${venues.length}`;
              venueIds.set(location, id);
              venues.push({ id, name: location });
            }
            venueId = venueIds.get(location);
          }

          const label = hasMeaningfulString(block.data.title) ? block.data.title.trim() : getBlockText(block);
          if (!label) return;

          schedule.push({
            id: `${section.id}-event-${index}`,
            label,
            venueId,
            notes: getBlockText(block) || undefined,
            startTimeISO: hasMeaningfulString(block.data.time) ? block.data.time.trim() : undefined,
          });
        });
    });

  return { venues, schedule };
};

const deriveTravel = (sections: BuilderV2Section[]): WeddingDataV1['travel'] => {
  const travelLines = sections
    .filter((section) => section.type === 'travel' || section.type === 'accommodations')
    .flatMap((section) => section.blocks
      .filter((block) => block.type === 'travelTip' || block.type === 'hotelCard')
      .map((block) => [block.data.title, getBlockText(block)].filter(hasMeaningfulString).join(': ').trim())
      .filter(Boolean));

  return {
    notes: travelLines.length > 0 ? travelLines.join('\n') : undefined,
  };
};

const deriveRegistry = (sections: BuilderV2Section[]): WeddingDataV1['registry'] => ({
  links: sections
    .filter((section) => section.type === 'registry')
    .flatMap((section) => section.blocks
      .filter((block) => (block.type === 'registryItem' || block.type === 'fundHighlight') && hasMeaningfulString(block.data.url))
      .map((block, index) => ({
        id: `${section.id}-registry-${index}`,
        label: hasMeaningfulString(block.data.title) ? block.data.title.trim() : undefined,
        url: block.data.url!.trim(),
      }))),
});

const deriveStory = (sections: BuilderV2Section[]) => {
  const storySection = sections.find((section) => section.type === 'story');
  if (!storySection) return undefined;
  const storyBlock = storySection.blocks.find((block) => block.type === 'story' || block.type === 'text');
  const story = storyBlock ? getBlockText(storyBlock) : '';
  return story || undefined;
};

export const deriveWeddingDataFromBuilderV2Document = (document: BuilderV2Document): Partial<WeddingDataV1> => {
  const sections = getVisibleSections(document);
  const { venues, schedule } = deriveSchedule(sections);
  const faq = deriveFaq(sections);
  const travel = deriveTravel(sections);
  const registry = deriveRegistry(sections);
  const story = deriveStory(sections);
  const heroImageUrl = getFirstMeaningfulPhotoUrl(sections) || undefined;

  return {
    couple: story ? { partner1Name: '', partner2Name: '', story } : undefined,
    venues,
    schedule,
    travel,
    registry,
    faq,
    media: heroImageUrl ? { heroImageUrl, gallery: [] } : { gallery: [] },
  };
};

const isEmptyArray = (value: unknown) => !Array.isArray(value) || value.length === 0;

export const mergeWeddingDataWithBuilderV2Supplement = (
  base: WeddingDataV1 | null,
  supplement: Partial<WeddingDataV1>,
): WeddingDataV1 => {
  const seed = base ?? createEmptyWeddingData();

  return {
    ...seed,
    couple: {
      ...seed.couple,
      story: seed.couple.story || supplement.couple?.story || undefined,
    },
    venues: isEmptyArray(seed.venues) ? (supplement.venues ?? []) : seed.venues,
    schedule: isEmptyArray(seed.schedule) ? (supplement.schedule ?? []) : seed.schedule,
    travel: {
      ...seed.travel,
      notes: seed.travel.notes || supplement.travel?.notes || undefined,
      parkingInfo: seed.travel.parkingInfo || supplement.travel?.parkingInfo || undefined,
      hotelInfo: seed.travel.hotelInfo || supplement.travel?.hotelInfo || undefined,
      flightInfo: seed.travel.flightInfo || supplement.travel?.flightInfo || undefined,
    },
    registry: {
      ...seed.registry,
      links: isEmptyArray(seed.registry.links) ? (supplement.registry?.links ?? []) : seed.registry.links,
      notes: seed.registry.notes || supplement.registry?.notes || undefined,
    },
    faq: isEmptyArray(seed.faq) ? (supplement.faq ?? []) : seed.faq,
    media: {
      ...seed.media,
      heroImageUrl: seed.media.heroImageUrl || supplement.media?.heroImageUrl || undefined,
      gallery: seed.media.gallery,
    },
  };
};
