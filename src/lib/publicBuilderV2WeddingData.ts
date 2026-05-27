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

const getMeaningfulBlocks = (
  sections: BuilderV2Section[],
  matcher: (section: BuilderV2Section, block: BuilderV2Block) => boolean,
) => (
  sections.flatMap((section) => section.blocks
    .filter((block) => matcher(section, block)))
);

const getFirstMeaningfulPhotoUrl = (sections: BuilderV2Section[]) => {
  for (const section of sections) {
    for (const block of section.blocks) {
      if (hasMeaningfulString(block.data.imageUrl)) return block.data.imageUrl.trim();
    }
  }
  return '';
};

const toWeddingDateIsoOrUndefined = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? undefined : trimmed;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const deriveCoupleDisplayName = (sections: BuilderV2Section[]) => (
  sections
    .filter((section) => section.type === 'hero')
    .flatMap((section) => [
      hasMeaningfulString(section.title) ? section.title.trim() : '',
      ...section.blocks
        .filter((block) => block.type === 'title')
        .map((block) => (hasMeaningfulString(block.data.text) ? block.data.text.trim() : '')),
    ])
    .find(hasMeaningfulString)
);

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
  let weddingDateISO: string | undefined;

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

          const maybeWeddingDateISO = hasMeaningfulString(block.data.time)
            ? toWeddingDateIsoOrUndefined(block.data.time)
            : undefined;
          if (!weddingDateISO && maybeWeddingDateISO) {
            weddingDateISO = maybeWeddingDateISO;
          }

          schedule.push({
            id: `${section.id}-event-${index}`,
            label,
            venueId,
            notes: getBlockText(block) || undefined,
            startTimeISO: hasMeaningfulString(block.data.time) ? block.data.time.trim() : undefined,
          });
        });
    });

  return { venues, schedule, weddingDateISO };
};

const deriveTravel = (sections: BuilderV2Section[]): WeddingDataV1['travel'] => {
  const notes: string[] = [];
  const hotelInfo: string[] = [];
  const flightInfo: string[] = [];
  const parkingInfo: string[] = [];

  sections
    .filter((section) => section.type === 'travel' || section.type === 'accommodations')
    .forEach((section) => {
      if (hasMeaningfulString(section.subtitle)) {
        notes.push(section.subtitle.trim());
      }

      section.blocks
        .filter((block) => block.type === 'travelTip' || block.type === 'hotelCard')
        .forEach((block) => {
          const headline = hasMeaningfulString(block.data.title) ? block.data.title.trim() : '';
          const detail = getBlockText(block);
          const line = [headline, detail].filter(hasMeaningfulString).join(': ').trim();
          if (!line) return;

          const haystack = `${section.type} ${headline} ${detail}`.toLowerCase();

          if (section.type === 'accommodations' || block.type === 'hotelCard' || /(hotel|stay|room|lodging|book)/.test(haystack)) {
            hotelInfo.push(line);
            return;
          }

          if (/(parking|valet|garage|lot|shuttle)/.test(haystack)) {
            parkingInfo.push(line);
            return;
          }

          if (/(flight|airport|airline|fly|arrival|depart)/.test(haystack)) {
            flightInfo.push(line);
            return;
          }

          notes.push(line);
        });
    });

  return {
    notes: notes.length > 0 ? notes.join('\n') : undefined,
    hotelInfo: hotelInfo.length > 0 ? hotelInfo.join('\n') : undefined,
    flightInfo: flightInfo.length > 0 ? flightInfo.join('\n') : undefined,
    parkingInfo: parkingInfo.length > 0 ? parkingInfo.join('\n') : undefined,
  };
};

const deriveRegistry = (sections: BuilderV2Section[]): WeddingDataV1['registry'] => {
  const registrySections = sections.filter((section) => section.type === 'registry');
  const links = registrySections.flatMap((section) => section.blocks
    .filter((block) => (block.type === 'registryItem' || block.type === 'fundHighlight') && hasMeaningfulString(block.data.url))
    .map((block, index) => ({
      id: `${section.id}-registry-${index}`,
      label: hasMeaningfulString(block.data.title) ? block.data.title.trim() : undefined,
      url: block.data.url!.trim(),
    })));

  const notes = registrySections
    .flatMap((section) => [
      hasMeaningfulString(section.subtitle) ? section.subtitle.trim() : '',
      ...section.blocks
        .filter((block) => block.type === 'text' || block.type === 'fundHighlight')
        .map((block) => getBlockText(block)),
    ])
    .filter(hasMeaningfulString)
    .join('\n');

  return {
    links,
    notes: notes || undefined,
  };
};

const deriveStory = (sections: BuilderV2Section[]) => {
  const story = sections
    .filter((section) => section.type === 'story')
    .flatMap((section) => section.blocks
      .filter((block) => block.type === 'story' || block.type === 'text')
      .map((block) => getBlockText(block)))
    .filter(hasMeaningfulString)
    .join('\n\n');
  return story || undefined;
};

const deriveGallery = (sections: BuilderV2Section[]): WeddingDataV1['media']['gallery'] => (
  getMeaningfulBlocks(
    sections,
    (section, block) => (section.type === 'gallery' || section.type === 'hero') && block.type === 'photo' && hasMeaningfulString(block.data.imageUrl),
  )
    .map((block, index) => ({
      id: `gallery-${index}`,
      url: block.data.imageUrl!.trim(),
      caption: hasMeaningfulString(block.data.caption)
        ? block.data.caption.trim()
        : (hasMeaningfulString(block.data.title) ? block.data.title.trim() : undefined),
    }))
);

export const deriveWeddingDataFromBuilderV2Document = (document: BuilderV2Document): Partial<WeddingDataV1> => {
  const sections = getVisibleSections(document);
  const { venues, schedule, weddingDateISO } = deriveSchedule(sections);
  const faq = deriveFaq(sections);
  const travel = deriveTravel(sections);
  const registry = deriveRegistry(sections);
  const story = deriveStory(sections);
  const gallery = deriveGallery(sections);
  const heroImageUrl = getFirstMeaningfulPhotoUrl(sections) || undefined;
  const displayName = deriveCoupleDisplayName(sections);
  const hasVisibleRsvp = sections.some((section) => section.type === 'rsvp');

  return {
    couple: displayName || story
      ? {
          partner1Name: '',
          partner2Name: '',
          displayName: displayName || undefined,
          story,
        }
      : undefined,
    event: weddingDateISO ? { weddingDateISO } : undefined,
    venues,
    schedule,
    rsvp: {
      enabled: hasVisibleRsvp,
    },
    travel,
    registry,
    faq,
    media: heroImageUrl ? { heroImageUrl, gallery } : { gallery },
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
      displayName: seed.couple.displayName || supplement.couple?.displayName || undefined,
      story: seed.couple.story || supplement.couple?.story || undefined,
    },
    event: {
      ...seed.event,
      weddingDateISO: seed.event.weddingDateISO || supplement.event?.weddingDateISO || undefined,
    },
    venues: isEmptyArray(seed.venues) ? (supplement.venues ?? []) : seed.venues,
    schedule: isEmptyArray(seed.schedule) ? (supplement.schedule ?? []) : seed.schedule,
    rsvp: {
      ...seed.rsvp,
      enabled: base ? seed.rsvp.enabled : (supplement.rsvp?.enabled ?? seed.rsvp.enabled),
      deadlineISO: seed.rsvp.deadlineISO || supplement.rsvp?.deadlineISO || undefined,
    },
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
      gallery: isEmptyArray(seed.media.gallery) ? (supplement.media?.gallery ?? []) : seed.media.gallery,
    },
  };
};
