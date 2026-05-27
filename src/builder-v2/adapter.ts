import type { BuilderProject, BuilderPage as LegacyBuilderPage } from '../types/builder/project';
import type { BuilderSectionInstance } from '../types/builder/section';
import type { LayoutConfigV1, PageConfig, SectionInstance } from '../types/layoutConfig';
import type { BuilderV2Block, BuilderV2Document, BuilderV2Section } from './contracts';
import type { BuilderV2Page } from './contracts';

const normalizeBuilderV2SectionType = (type: string) => {
  const normalizedType = type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalizedType.startsWith('registrysection') ? 'registry' : type;
};

const getSettingString = (settings: Record<string, unknown> | undefined, key: string) => {
  const value = settings?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
};

const getSectionTitle = (
  settings: Record<string, unknown> | undefined,
  fallbackType: string,
  displayName?: string,
) => displayName?.trim()
  || getSettingString(settings, 'title')
  || getSettingString(settings, 'headline')
  || getSettingString(settings, 'label')
  || fallbackType;

const getSectionSubtitle = (settings: Record<string, unknown> | undefined) => (
  getSettingString(settings, 'subtitle')
  || getSettingString(settings, 'subheadline')
  || getSettingString(settings, 'description')
  || getSettingString(settings, 'intro')
  || ''
);

const getSettingStringList = (settings: Record<string, unknown> | undefined, key: string) => {
  const value = settings?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
};

const getSettingRecordList = <T extends Record<string, unknown>>(settings: Record<string, unknown> | undefined, key: string): T[] => {
  const value = settings?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is T => typeof item === 'object' && item !== null)
    : [];
};

const getSettingImage = (settings: Record<string, unknown> | undefined, ...keys: string[]) => {
  for (const key of keys) {
    const value = settings?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object' && 'value' in value) {
      const maybeValue = (value as { value?: unknown }).value;
      if (typeof maybeValue === 'string' && maybeValue.trim()) return maybeValue.trim();
    }
  }
  return '';
};

const getSettingGalleryImages = (settings: Record<string, unknown> | undefined) => {
  const rawImages = ['images', 'galleryImages', 'photos']
    .flatMap((key) => {
      const value = settings?.[key];
      return Array.isArray(value) ? value : [];
    });

  return rawImages
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim() ? { url: item.trim(), caption: '', title: '' } : null;
      }

      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const url = typeof record.url === 'string'
        ? record.url.trim()
        : typeof record.image === 'string'
          ? record.image.trim()
          : '';
      if (!url) return null;

      return {
        url,
        caption: typeof record.caption === 'string' && record.caption.trim() ? record.caption.trim() : '',
        title: typeof record.title === 'string' && record.title.trim() ? record.title.trim() : '',
      };
    })
    .filter((item): item is { url: string; caption: string; title: string } => Boolean(item));
};

const getLegacyFaqItems = (settings: Record<string, unknown> | undefined) => (
  getSettingRecordList<{
    q?: string;
    a?: string;
    question?: string;
    answer?: string;
  }>(settings, 'faqItems')
    .map((item) => ({
      question: typeof item.q === 'string' && item.q.trim()
        ? item.q.trim()
        : typeof item.question === 'string' && item.question.trim()
          ? item.question.trim()
          : '',
      answer: typeof item.a === 'string' && item.a.trim()
        ? item.a.trim()
        : typeof item.answer === 'string' && item.answer.trim()
          ? item.answer.trim()
          : '',
    }))
    .filter((item) => item.question || item.answer)
);

const getLegacyTimelineItems = (settings: Record<string, unknown> | undefined) => (
  getSettingRecordList<{
    title?: string;
    label?: string;
    time?: string;
    location?: string;
    note?: string;
    text?: string;
  }>(settings, 'timelineItems')
    .map((item) => ({
      title: typeof item.title === 'string' && item.title.trim()
        ? item.title.trim()
        : typeof item.label === 'string' && item.label.trim()
          ? item.label.trim()
          : '',
      time: typeof item.time === 'string' && item.time.trim() ? item.time.trim() : '',
      location: typeof item.location === 'string' && item.location.trim() ? item.location.trim() : '',
      note: typeof item.note === 'string' && item.note.trim()
        ? item.note.trim()
        : typeof item.text === 'string' && item.text.trim()
          ? item.text.trim()
          : '',
    }))
    .filter((item) => item.title || item.time || item.location || item.note)
);

const getLegacyRegistryItems = (settings: Record<string, unknown> | undefined) => {
  const registryItems = getSettingRecordList<{
    title?: string;
    label?: string;
    note?: string;
    text?: string;
    url?: string;
  }>(settings, 'registryItems')
    .map((item) => ({
      title: typeof item.title === 'string' && item.title.trim()
        ? item.title.trim()
        : typeof item.label === 'string' && item.label.trim()
          ? item.label.trim()
          : '',
      note: typeof item.note === 'string' && item.note.trim()
        ? item.note.trim()
        : typeof item.text === 'string' && item.text.trim()
          ? item.text.trim()
          : '',
      url: typeof item.url === 'string' && item.url.trim() ? item.url.trim() : '',
    }))
    .filter((item) => item.title || item.note || item.url);

  const registryLinks = getSettingRecordList<{
    label?: string;
    title?: string;
    url?: string;
  }>(settings, 'links')
    .map((item) => ({
      title: typeof item.title === 'string' && item.title.trim()
        ? item.title.trim()
        : typeof item.label === 'string' && item.label.trim()
          ? item.label.trim()
          : '',
      note: '',
      url: typeof item.url === 'string' && item.url.trim() ? item.url.trim() : '',
    }))
    .filter((item) => item.title || item.url);

  return [...registryItems, ...registryLinks];
};

const getLegacyTravelCards = (settings: Record<string, unknown> | undefined) => {
  const hotels = getSettingRecordList<{
    name?: string;
    title?: string;
    notes?: string;
    note?: string;
    url?: string;
    address?: string;
    location?: string;
    phone?: string;
    blockCode?: string;
    bookingCode?: string;
    blockDeadline?: string;
    priceRange?: string;
    distance?: string;
  }>(settings, 'hotels')
    .map((hotel) => ({
      type: 'hotelCard' as const,
      title: typeof hotel.name === 'string' && hotel.name.trim()
        ? hotel.name.trim()
        : typeof hotel.title === 'string' && hotel.title.trim()
          ? hotel.title.trim()
          : '',
      note: typeof hotel.notes === 'string' && hotel.notes.trim()
        ? hotel.notes.trim()
        : typeof hotel.note === 'string' && hotel.note.trim()
          ? hotel.note.trim()
          : '',
      url: typeof hotel.url === 'string' && hotel.url.trim() ? hotel.url.trim() : '',
      location: typeof hotel.address === 'string' && hotel.address.trim()
        ? hotel.address.trim()
        : typeof hotel.location === 'string' && hotel.location.trim()
          ? hotel.location.trim()
          : '',
      phone: typeof hotel.phone === 'string' && hotel.phone.trim() ? hotel.phone.trim() : '',
      bookingCode: typeof hotel.blockCode === 'string' && hotel.blockCode.trim()
        ? hotel.blockCode.trim()
        : typeof hotel.bookingCode === 'string' && hotel.bookingCode.trim()
          ? hotel.bookingCode.trim()
          : '',
      blockDeadline: typeof hotel.blockDeadline === 'string' && hotel.blockDeadline.trim() ? hotel.blockDeadline.trim() : '',
      priceRange: typeof hotel.priceRange === 'string' && hotel.priceRange.trim() ? hotel.priceRange.trim() : '',
      distance: typeof hotel.distance === 'string' && hotel.distance.trim() ? hotel.distance.trim() : '',
    }))
    .filter((hotel) => hotel.title || hotel.note || hotel.url || hotel.location || hotel.phone || hotel.bookingCode || hotel.blockDeadline || hotel.priceRange || hotel.distance);

  const travelTips = getSettingRecordList<{
    title?: string;
    note?: string;
    text?: string;
    url?: string;
  }>(settings, 'travelTips')
    .map((tip) => ({
      type: 'travelTip' as const,
      title: typeof tip.title === 'string' && tip.title.trim() ? tip.title.trim() : '',
      note: typeof tip.note === 'string' && tip.note.trim()
        ? tip.note.trim()
        : typeof tip.text === 'string' && tip.text.trim()
          ? tip.text.trim()
          : '',
      url: typeof tip.url === 'string' && tip.url.trim() ? tip.url.trim() : '',
      location: '',
    }))
    .filter((tip) => tip.title || tip.note || tip.url);

  const narrativeTips = [
    ['Getting here', getSettingString(settings, 'flightInfo')],
    ['Where to stay', getSettingString(settings, 'hotelInfo')],
    ['Parking', getSettingString(settings, 'parkingInfo')],
  ]
    .filter(([, note]) => Boolean(note))
    .map(([title, note]) => ({
      type: 'travelTip' as const,
      title,
      note,
      url: '',
      location: '',
    }));

  return [...travelTips, ...hotels, ...narrativeTips];
};

const getLegacyDirectionsTransport = (settings: Record<string, unknown> | undefined) => (
  getSettingRecordList<{
    label?: string;
    description?: string;
    note?: string;
  }>(settings, 'transport')
    .map((item) => ({
      title: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : '',
      note: typeof item.description === 'string' && item.description.trim()
        ? item.description.trim()
        : typeof item.note === 'string' && item.note.trim()
          ? item.note.trim()
          : '',
    }))
    .filter((item) => item.title || item.note)
);

const makeDefaultBlocksForType = (
  type: string,
  settings: Record<string, unknown> | undefined,
  title?: string,
  subtitle?: string,
): BuilderV2Block[] => {
  const titleText = title?.trim() || '';
  const subtitleText = subtitle?.trim() || '';
  const normalizedType = normalizeBuilderV2SectionType(type);

  switch (normalizedType) {
    case 'hero': {
      const heroImage = getSettingImage(settings, 'backgroundImage', 'heroImage', 'heroImageUrl', 'image', 'coverImage', 'photo');
      return [
        ...(titleText ? [{ id: 'b-title', type: 'title', data: { text: titleText } } satisfies BuilderV2Block] : []),
        ...(subtitleText ? [{ id: 'b-text', type: 'text', data: { text: subtitleText } } satisfies BuilderV2Block] : []),
        ...(heroImage ? [{ id: 'b-photo', type: 'photo', data: { imageUrl: heroImage } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'story': {
      const storyText = getSettingString(settings, 'storyText');
      const storyImage = getSettingImage(settings, 'backgroundImage', 'heroImage', 'heroImageUrl', 'image', 'coverImage', 'photo');
      return [
        ...(storyText ? [{ id: 'b-story', type: 'story', data: { text: storyText } } satisfies BuilderV2Block] : subtitleText ? [{ id: 'b-story', type: 'story', data: { text: subtitleText } } satisfies BuilderV2Block] : []),
        ...(storyImage ? [{ id: 'b-photo', type: 'photo', data: { imageUrl: storyImage } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'schedule': {
      const timelineItems = getLegacyTimelineItems(settings);
      return [
        ...timelineItems.map((item, index) => ({
          id: `b-event-${index + 1}`,
          type: 'event' as const,
          data: {
            title: item.title,
            time: item.time || undefined,
            location: item.location || undefined,
            note: item.note || undefined,
          },
        })),
        ...(timelineItems.length === 0 && subtitleText ? [{ id: 'b-text', type: 'text', data: { text: subtitleText } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'travel': {
      const travelCards = getLegacyTravelCards(settings);
      return [
        ...(subtitleText ? [{ id: 'b-text', type: 'text', data: { text: subtitleText } } satisfies BuilderV2Block] : []),
        ...travelCards.map((card, index) => ({
          id: `b-${card.type}-${index + 1}`,
          type: card.type,
          data: {
            title: card.title || undefined,
            note: card.note || undefined,
            url: card.url || undefined,
            location: card.location || undefined,
          },
        })),
      ];
    }
    case 'registry': {
      const registryItems = getLegacyRegistryItems(settings);
      return [
        ...registryItems.map((item, index) => ({
          id: `b-registry-${index + 1}`,
          type: 'registryItem' as const,
          data: {
            title: item.title || undefined,
            note: item.note || undefined,
            url: item.url || undefined,
          },
        })),
        ...(registryItems.length === 0 && subtitleText ? [{ id: 'b-text', type: 'text', data: { text: subtitleText } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'rsvp': {
      const rsvpNote = getSettingString(settings, 'rsvpNote');
      return [
        ...(rsvpNote ? [{ id: 'b-rsvp-note', type: 'rsvpNote', data: { note: rsvpNote } } satisfies BuilderV2Block] : []),
        ...(subtitleText && !rsvpNote ? [{ id: 'b-text', type: 'text', data: { text: subtitleText } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'faq': {
      const faqItems = getLegacyFaqItems(settings);
      return [
        ...faqItems.map((item, index) => ({
          id: `b-faq-${index + 1}`,
          type: 'faqItem' as const,
          data: {
            question: item.question || undefined,
            answer: item.answer || undefined,
          },
        })),
        ...(faqItems.length === 0 && subtitleText ? [{ id: 'b-text', type: 'text', data: { text: subtitleText } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'gallery': {
      const galleryImages = getSettingGalleryImages(settings);
      return galleryImages.map((image, index) => ({
        id: `b-photo-${index + 1}`,
        type: 'photo' as const,
        data: {
          imageUrl: image.url,
          caption: image.caption || image.title || undefined,
          title: image.title || image.caption || undefined,
        },
      }));
    }
    case 'venue': {
      const venueImage = getSettingImage(settings, 'backgroundImage', 'heroImage', 'heroImageUrl', 'image', 'coverImage', 'photo');
      return [
        ...(subtitleText ? [{ id: 'b-text', type: 'text', data: { text: subtitleText } } satisfies BuilderV2Block] : []),
        ...(venueImage ? [{ id: 'b-photo', type: 'photo', data: { imageUrl: venueImage } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'countdown': {
      const eyebrow = getSettingString(settings, 'eyebrow');
      const message = getSettingString(settings, 'message');
      const showTitle = settings?.showTitle === false ? false : undefined;
      return [
        ...(eyebrow ? [{ id: 'b-countdown-eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: eyebrow } } satisfies BuilderV2Block] : []),
        ...(showTitle === false ? [{ id: 'b-countdown-show-title', type: 'qna', data: { question: 'Show title', answer: 'false' } } satisfies BuilderV2Block] : []),
        ...(subtitleText ? [{ id: 'b-text', type: 'text', data: { text: subtitleText } } satisfies BuilderV2Block] : []),
        ...(message ? [{ id: 'b-story', type: 'story', data: { text: message } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'wedding-party': {
      const eyebrow = getSettingString(settings, 'eyebrow');
      const showTitle = settings?.showTitle === false ? false : undefined;
      const bridalTitle = getSettingString(settings, 'bridalTitle');
      const groomTitle = getSettingString(settings, 'groomTitle');
      const bridalParty = getSettingRecordList<{
        name?: string;
        role?: string;
        photo?: string;
        note?: string;
      }>(settings, 'bridalParty');
      const groomParty = getSettingRecordList<{
        name?: string;
        role?: string;
        photo?: string;
        note?: string;
      }>(settings, 'groomParty');
      return [
        ...(eyebrow ? [{ id: 'b-party-eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: eyebrow } } satisfies BuilderV2Block] : []),
        ...(showTitle === false ? [{ id: 'b-party-show-title', type: 'qna', data: { question: 'Show title', answer: 'false' } } satisfies BuilderV2Block] : []),
        ...(bridalTitle ? [{ id: 'b-party-bridal-title', type: 'title', data: { text: bridalTitle, subtitle: 'bridal-title' } } satisfies BuilderV2Block] : []),
        ...bridalParty
          .filter((member) => (
            (typeof member.name === 'string' && member.name.trim())
            || (typeof member.role === 'string' && member.role.trim())
            || (typeof member.photo === 'string' && member.photo.trim())
            || (typeof member.note === 'string' && member.note.trim())
          ))
          .map((member, index) => ({
            id: `b-party-bridal-${index + 1}`,
            type: 'photo' as const,
            data: {
              title: typeof member.name === 'string' && member.name.trim() ? member.name.trim() : undefined,
              role: typeof member.role === 'string' && member.role.trim() ? member.role.trim() : undefined,
              imageUrl: typeof member.photo === 'string' && member.photo.trim() ? member.photo.trim() : undefined,
              note: typeof member.note === 'string' && member.note.trim() ? member.note.trim() : undefined,
              subtitle: 'bridal-party',
            },
          })),
        ...(groomTitle ? [{ id: 'b-party-groom-title', type: 'title', data: { text: groomTitle, subtitle: 'groom-title' } } satisfies BuilderV2Block] : []),
        ...groomParty
          .filter((member) => (
            (typeof member.name === 'string' && member.name.trim())
            || (typeof member.role === 'string' && member.role.trim())
            || (typeof member.photo === 'string' && member.photo.trim())
            || (typeof member.note === 'string' && member.note.trim())
          ))
          .map((member, index) => ({
            id: `b-party-groom-${index + 1}`,
            type: 'photo' as const,
            data: {
              title: typeof member.name === 'string' && member.name.trim() ? member.name.trim() : undefined,
              role: typeof member.role === 'string' && member.role.trim() ? member.role.trim() : undefined,
              imageUrl: typeof member.photo === 'string' && member.photo.trim() ? member.photo.trim() : undefined,
              note: typeof member.note === 'string' && member.note.trim() ? member.note.trim() : undefined,
              subtitle: 'groom-party',
            },
          })),
        ...(bridalTitle || groomTitle || bridalParty.length > 0 || groomParty.length > 0 || !subtitleText
          ? []
          : [{ id: 'b-text', type: 'text', data: { text: subtitleText } } satisfies BuilderV2Block]),
      ];
    }
    case 'dress-code': {
      const eyebrow = getSettingString(settings, 'eyebrow');
      const showTitle = settings?.showTitle === false ? false : undefined;
      const description = getSettingString(settings, 'description');
      const additionalNote = getSettingString(settings, 'additionalNote');
      const dressCodeLabel = getSettingString(settings, 'dressCodeLabel');
      const presetCode = getSettingString(settings, 'presetCode');
      const colorNote = getSettingString(settings, 'colorNote');
      const suggestions = getSettingStringList(settings, 'suggestions');
      return [
        ...(eyebrow ? [{ id: 'b-dress-eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: eyebrow } } satisfies BuilderV2Block] : []),
        ...(showTitle === false ? [{ id: 'b-dress-show-title', type: 'qna', data: { question: 'Show title', answer: 'false' } } satisfies BuilderV2Block] : []),
        ...(dressCodeLabel ? [{ id: 'b-title', type: 'title', data: { text: dressCodeLabel } } satisfies BuilderV2Block] : []),
        ...(description ? [{ id: 'b-text', type: 'text', data: { text: description } } satisfies BuilderV2Block] : []),
        ...suggestions.map((suggestion, index) => ({
          id: `b-qna-${index + 1}`,
          type: 'qna' as const,
          data: { answer: suggestion },
        })),
        ...(colorNote ? [{ id: 'b-qna-color', type: 'qna', data: { question: 'Color note', answer: colorNote } } satisfies BuilderV2Block] : []),
        ...(presetCode ? [{ id: 'b-qna-preset', type: 'qna', data: { question: 'Preset code', answer: presetCode } } satisfies BuilderV2Block] : []),
        ...(additionalNote ? [{ id: 'b-story', type: 'story', data: { text: additionalNote } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'accommodations': {
      const eyebrow = getSettingString(settings, 'eyebrow');
      const showTitle = settings?.showTitle === false ? false : undefined;
      const generalNote = getSettingString(settings, 'generalNote');
      const hotels = getSettingRecordList<{
        name?: string;
        notes?: string;
        url?: string;
        address?: string;
        phone?: string;
        blockCode?: string;
        bookingCode?: string;
        blockDeadline?: string;
        priceRange?: string;
        distance?: string;
      }>(settings, 'hotels');
      return [
        ...(eyebrow ? [{ id: 'b-accommodations-eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: eyebrow } } satisfies BuilderV2Block] : []),
        ...(showTitle === false ? [{ id: 'b-accommodations-show-title', type: 'qna', data: { question: 'Show title', answer: 'false' } } satisfies BuilderV2Block] : []),
        ...(generalNote ? [{ id: 'b-text', type: 'text', data: { text: generalNote } } satisfies BuilderV2Block] : []),
        ...hotels
          .filter((hotel) => typeof hotel.name === 'string' && hotel.name.trim())
          .map((hotel, index) => ({
            id: `b-hotel-${index + 1}`,
            type: 'hotelCard' as const,
            data: {
              title: hotel.name?.trim(),
              note: typeof hotel.notes === 'string' && hotel.notes.trim() ? hotel.notes.trim() : undefined,
              url: typeof hotel.url === 'string' && hotel.url.trim() ? hotel.url.trim() : undefined,
              location: typeof hotel.address === 'string' && hotel.address.trim() ? hotel.address.trim() : undefined,
              phone: typeof hotel.phone === 'string' && hotel.phone.trim() ? hotel.phone.trim() : undefined,
              bookingCode: typeof hotel.blockCode === 'string' && hotel.blockCode.trim()
                ? hotel.blockCode.trim()
                : typeof hotel.bookingCode === 'string' && hotel.bookingCode.trim()
                  ? hotel.bookingCode.trim()
                  : undefined,
              blockDeadline: typeof hotel.blockDeadline === 'string' && hotel.blockDeadline.trim() ? hotel.blockDeadline.trim() : undefined,
              priceRange: typeof hotel.priceRange === 'string' && hotel.priceRange.trim() ? hotel.priceRange.trim() : undefined,
              distance: typeof hotel.distance === 'string' && hotel.distance.trim() ? hotel.distance.trim() : undefined,
            },
          })),
      ];
    }
    case 'contact': {
      const eyebrow = getSettingString(settings, 'eyebrow');
      const showTitle = settings?.showTitle === false ? false : undefined;
      const introText = getSettingString(settings, 'introText');
      const emailSubject = getSettingString(settings, 'emailSubject');
      const closingNote = getSettingString(settings, 'closingNote');
      const contacts = getSettingRecordList<{
        name?: string;
        role?: string;
        email?: string;
        phone?: string;
      }>(settings, 'contacts');
      return [
        ...(eyebrow ? [{ id: 'b-contact-eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: eyebrow } } satisfies BuilderV2Block] : []),
        ...(showTitle === false ? [{ id: 'b-contact-show-title', type: 'qna', data: { question: 'Show title', answer: 'false' } } satisfies BuilderV2Block] : []),
        ...(introText ? [{ id: 'b-text', type: 'text', data: { text: introText } } satisfies BuilderV2Block] : []),
        ...contacts
          .filter((contact) => (
            (typeof contact.name === 'string' && contact.name.trim())
            || (typeof contact.role === 'string' && contact.role.trim())
            || (typeof contact.email === 'string' && contact.email.trim())
            || (typeof contact.phone === 'string' && contact.phone.trim())
          ))
          .map((contact, index) => ({
            id: `b-contact-${index + 1}`,
            type: 'travelTip' as const,
            data: {
              title: typeof contact.name === 'string' && contact.name.trim() ? contact.name.trim() : undefined,
              role: typeof contact.role === 'string' && contact.role.trim() ? contact.role.trim() : undefined,
              email: typeof contact.email === 'string' && contact.email.trim() ? contact.email.trim() : undefined,
              phone: typeof contact.phone === 'string' && contact.phone.trim() ? contact.phone.trim() : undefined,
            },
          })),
        ...(emailSubject ? [{ id: 'b-contact-email-subject', type: 'qna', data: { question: 'Email subject', answer: emailSubject } } satisfies BuilderV2Block] : []),
        ...(closingNote ? [{ id: 'b-story', type: 'story', data: { text: closingNote } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'directions': {
      const eyebrow = getSettingString(settings, 'eyebrow');
      const venueName = getSettingString(settings, 'venueName');
      const address = getSettingString(settings, 'address');
      const city = getSettingString(settings, 'city');
      const phone = getSettingString(settings, 'phone');
      const mapUrl = getSettingString(settings, 'mapUrl');
      const parkingNote = getSettingString(settings, 'parkingNote');
      const rideshareNote = getSettingString(settings, 'rideshareNote');
      const shuttleNote = getSettingString(settings, 'shuttleNote');
      const transport = getLegacyDirectionsTransport(settings);
      const venueLines = [
        venueName ? `Venue: ${venueName}` : '',
        address ? `Address: ${address}` : '',
        city ? `City: ${city}` : '',
        phone ? `Phone: ${phone}` : '',
      ].filter(Boolean).join('\n');

      return [
        ...(eyebrow ? [{ id: 'b-directions-eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: eyebrow } } satisfies BuilderV2Block] : []),
        ...(venueLines ? [{ id: 'b-directions-venue', type: 'text', data: { text: venueLines } } satisfies BuilderV2Block] : []),
        ...(parkingNote ? [{ id: 'b-directions-parking', type: 'text', data: { text: `Parking: ${parkingNote}` } } satisfies BuilderV2Block] : []),
        ...(rideshareNote ? [{ id: 'b-directions-rideshare', type: 'text', data: { text: `Rideshare: ${rideshareNote}` } } satisfies BuilderV2Block] : []),
        ...(shuttleNote ? [{ id: 'b-directions-shuttle', type: 'text', data: { text: `Shuttle: ${shuttleNote}` } } satisfies BuilderV2Block] : []),
        ...(mapUrl ? [{ id: 'b-directions-map', type: 'travelTip', data: { title: 'Map', note: 'Open directions', url: mapUrl } } satisfies BuilderV2Block] : []),
        ...transport.map((item, index) => ({
          id: `b-directions-transport-${index + 1}`,
          type: 'travelTip' as const,
          data: {
            title: item.title || undefined,
            note: item.note || undefined,
          },
        })),
        ...(venueLines || parkingNote || rideshareNote || shuttleNote || transport.length > 0 || mapUrl || !subtitleText
          ? []
          : [{ id: 'b-text', type: 'text', data: { text: subtitleText } } satisfies BuilderV2Block]),
      ];
    }
    case 'footer-cta': {
      const subtext = getSettingString(settings, 'subtext');
      const buttonLabel = getSettingString(settings, 'buttonLabel');
      const rsvpUrl = getSettingString(settings, 'rsvpUrl');
      const footerNote = getSettingString(settings, 'footerNote');
      return [
        ...(subtext ? [{ id: 'b-text', type: 'text', data: { text: subtext } } satisfies BuilderV2Block] : []),
        ...((buttonLabel || rsvpUrl) ? [{ id: 'b-cta', type: 'travelTip', data: { title: buttonLabel || undefined, url: rsvpUrl || undefined, note: 'Primary action' } } satisfies BuilderV2Block] : []),
        ...(footerNote ? [{ id: 'b-story', type: 'story', data: { text: footerNote } } satisfies BuilderV2Block] : []),
      ];
    }
    default:
      return subtitleText ? [{ id: 'b-text', type: 'text', data: { text: subtitleText } }] : [];
  }
};

export const toBuilderV2Section = (instance: SectionInstance): BuilderV2Section => {
  const normalizedType = normalizeBuilderV2SectionType(instance.type);
  const title = getSectionTitle(instance.settings, normalizedType);
  const subtitle = getSectionSubtitle(instance.settings);
  return {
    id: instance.id,
    type: normalizedType,
    variant: instance.variant,
    enabled: instance.enabled,
    title,
    subtitle,
    blocks: makeDefaultBlocksForType(normalizedType, instance.settings, title, subtitle),
  };
};

const toBuilderV2SectionFromBuilder = (section: BuilderSectionInstance): BuilderV2Section => {
  const normalizedType = normalizeBuilderV2SectionType(section.type);
  const title = getSectionTitle(section.settings, normalizedType, section.displayName);
  const subtitle = getSectionSubtitle(section.settings);
  return {
    id: section.id,
    type: normalizedType,
    variant: section.variant,
    enabled: section.enabled,
    title,
    subtitle,
    bindings: {
      ...(Array.isArray(section.bindings.venueIds) && section.bindings.venueIds.length > 0 ? { venueIds: [...section.bindings.venueIds] } : {}),
      ...(Array.isArray(section.bindings.scheduleItemIds) && section.bindings.scheduleItemIds.length > 0 ? { scheduleItemIds: [...section.bindings.scheduleItemIds] } : {}),
      ...(Array.isArray(section.bindings.linkIds) && section.bindings.linkIds.length > 0 ? { linkIds: [...section.bindings.linkIds] } : {}),
      ...(Array.isArray(section.bindings.faqIds) && section.bindings.faqIds.length > 0 ? { faqIds: [...section.bindings.faqIds] } : {}),
      ...(Array.isArray(section.bindings.mediaAssetIds) && section.bindings.mediaAssetIds.length > 0 ? { mediaAssetIds: [...section.bindings.mediaAssetIds] } : {}),
    },
    blocks: makeDefaultBlocksForType(normalizedType, section.settings, title, subtitle),
  };
};

const getFirstMeaningfulBlock = (
  blocks: BuilderV2Block[],
  types: BuilderV2Block['type'][],
) => blocks.find((block) => (
  types.includes(block.type) && Object.values(block.data ?? {}).some((value) => typeof value === 'string' && value.trim())
));

const getMeaningfulBlocks = (
  blocks: BuilderV2Block[],
  types: BuilderV2Block['type'][],
) => blocks.filter((block) => (
  types.includes(block.type) && Object.values(block.data ?? {}).some((value) => typeof value === 'string' && value.trim())
));

const getFirstMeaningfulString = (
  section: BuilderV2Section,
  candidates: Array<string | undefined>,
) => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  const firstBlock = getFirstMeaningfulBlock(section.blocks, ['title', 'text', 'story', 'travelTip', 'registryItem', 'fundHighlight', 'rsvpNote']);
  for (const value of Object.values(firstBlock?.data ?? {})) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return '';
};

const getSectionPhotoUrl = (section: BuilderV2Section) => {
  const photoBlock = getFirstMeaningfulBlock(section.blocks, ['photo']);
  return typeof photoBlock?.data.imageUrl === 'string' && photoBlock.data.imageUrl.trim()
    ? photoBlock.data.imageUrl.trim()
    : '';
};

const getSectionPhotoEntries = (section: BuilderV2Section) => (
  getMeaningfulBlocks(section.blocks, ['photo'])
    .map((block, index) => {
      const url = typeof block.data.imageUrl === 'string' ? block.data.imageUrl.trim() : '';
      if (!url) return null;

      const caption = typeof block.data.caption === 'string' && block.data.caption.trim()
        ? block.data.caption.trim()
        : typeof block.data.title === 'string' && block.data.title.trim()
          ? block.data.title.trim()
          : '';

      return {
        id: `${section.id}-photo-${index}`,
        url,
        image: url,
        caption,
        title: caption,
        alt: caption,
      };
    })
    .filter((entry): entry is {
      id: string;
      url: string;
      image: string;
      caption: string;
      title: string;
      alt: string;
    } => Boolean(entry))
);

const getSectionNarrativeText = (section: BuilderV2Section) => {
  const parts = getMeaningfulBlocks(section.blocks, ['story', 'text'])
    .flatMap((block) => [block.data.text, block.data.note, block.data.subtitle])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());

  return parts.join('\n\n');
};

const getSectionNarrativeParts = (section: BuilderV2Section) => (
  getMeaningfulBlocks(section.blocks, ['story', 'text'])
    .flatMap((block) => [block.data.text, block.data.note, block.data.subtitle])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
);

const getSectionNoteCards = (
  section: BuilderV2Section,
  types: BuilderV2Block['type'][],
) => (
  getMeaningfulBlocks(section.blocks, types).map((block, index) => ({
    id: `${section.id}-card-${index}`,
    title: typeof block.data.title === 'string' ? block.data.title.trim() : '',
    role: typeof block.data.role === 'string' ? block.data.role.trim() : '',
    note: typeof block.data.note === 'string' && block.data.note.trim()
      ? block.data.note.trim()
      : typeof block.data.text === 'string' && block.data.text.trim()
        ? block.data.text.trim()
        : '',
    url: typeof block.data.url === 'string' ? block.data.url.trim() : '',
    location: typeof block.data.location === 'string' ? block.data.location.trim() : '',
    time: typeof block.data.time === 'string' ? block.data.time.trim() : '',
    phone: typeof block.data.phone === 'string' ? block.data.phone.trim() : '',
    email: typeof block.data.email === 'string' ? block.data.email.trim() : '',
    bookingCode: typeof block.data.bookingCode === 'string' ? block.data.bookingCode.trim() : '',
    blockDeadline: typeof block.data.blockDeadline === 'string' ? block.data.blockDeadline.trim() : '',
    priceRange: typeof block.data.priceRange === 'string' ? block.data.priceRange.trim() : '',
    distance: typeof block.data.distance === 'string' ? block.data.distance.trim() : '',
  })).filter((item) => item.title || item.role || item.note || item.url || item.location || item.time || item.phone || item.email || item.bookingCode || item.blockDeadline || item.priceRange || item.distance)
);

const getTravelHintBucket = (
  title: string,
  note: string,
): 'hotel' | 'flight' | 'parking' | 'general' => {
  const haystack = `${title} ${note}`.trim().toLowerCase();
  if (!haystack) return 'general';
  if (/(hotel|stay|room|lodging|book)/.test(haystack)) return 'hotel';
  if (/(flight|airport|airline|fly|arrival|depart|get(?:ting)? here)/.test(haystack)) return 'flight';
  if (/(parking|valet|garage|lot|shuttle|transit|train|bart|bus|car|drive)/.test(haystack)) return 'parking';
  return 'general';
};

const getNamedAnswerValue = (
  section: BuilderV2Section,
  label: string,
) => {
  const normalizedLabel = label.trim().toLowerCase();
  const match = getMeaningfulBlocks(section.blocks, ['qna', 'faqItem'])
    .find((block) => {
      const candidate = [block.data.question, block.data.title]
        .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
      return candidate?.trim().toLowerCase() === normalizedLabel;
    });

  const answer = [match?.data.answer, match?.data.text]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return answer?.trim() || '';
};

const getNamedBooleanValue = (
  section: BuilderV2Section,
  label: string,
): boolean | undefined => {
  const value = getNamedAnswerValue(section, label).toLowerCase();
  if (!value) return undefined;
  if (['true', 'yes', '1', 'on'].includes(value)) return true;
  if (['false', 'no', '0', 'off'].includes(value)) return false;
  return undefined;
};

const getDirectionsTextValue = (
  section: BuilderV2Section,
  label: 'Venue' | 'Address' | 'City' | 'Phone' | 'Parking' | 'Rideshare' | 'Shuttle',
) => {
  const prefix = `${label}:`;
  const textBlocks = getMeaningfulBlocks(section.blocks, ['text', 'story']);

  for (const block of textBlocks) {
    for (const candidate of [block.data.text, block.data.note, block.data.subtitle]) {
      if (typeof candidate !== 'string') continue;
      const lines = candidate
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const match = lines.find((line) => line.toLowerCase().startsWith(prefix.toLowerCase()));
      if (match) {
        return match.slice(prefix.length).trim();
      }
    }
  }

  return '';
};

const getCommonLegacySettings = (section: BuilderV2Section): Record<string, unknown> => {
  const title = getFirstMeaningfulString(section, [section.title]);
  const subtitle = getFirstMeaningfulString(section, [section.subtitle]);
  const leadText = getFirstMeaningfulString(section, [
    section.subtitle,
    getFirstMeaningfulBlock(section.blocks, ['text', 'story'])?.data.text,
    getFirstMeaningfulBlock(section.blocks, ['travelTip', 'hotelCard', 'registryItem', 'fundHighlight'])?.data.note,
    getFirstMeaningfulBlock(section.blocks, ['rsvpNote'])?.data.note,
  ]);
  const photoUrl = getSectionPhotoUrl(section);
  const narrativeText = getSectionNarrativeText(section);
  const photoEntries = getSectionPhotoEntries(section);

  return {
    showTitle: true,
    title,
    subtitle,
    headline: title,
    subheadline: subtitle || leadText,
    description: leadText,
    intro: leadText,
    heroImage: photoUrl || undefined,
    heroImageUrl: photoUrl || undefined,
    storyText: narrativeText || undefined,
    introText: narrativeText || undefined,
    generalNote: leadText || narrativeText || undefined,
    images: photoEntries,
    galleryImages: photoEntries,
    photos: photoEntries,
    builderV2Title: section.title,
    builderV2Subtitle: section.subtitle,
    builderV2Blocks: section.blocks.map((block) => ({ ...block, data: { ...(block.data ?? {}) } })),
  };
};

const toLegacyBuilderSettings = (section: BuilderV2Section): Record<string, unknown> => {
  const common = getCommonLegacySettings(section);
  const normalizedType = normalizeBuilderV2SectionType(section.type);

  switch (normalizedType) {
    case 'faq':
      return {
        ...common,
        faqItems: section.blocks
          .filter((block) => block.type === 'faqItem' || block.type === 'qna')
          .map((block, index) => ({
            id: `${section.id}-faq-${index}`,
            q: block.data.question || block.data.title || '',
            a: block.data.answer || block.data.text || '',
          })),
      };
    case 'schedule':
      return {
        ...common,
        timelineItems: section.blocks
          .filter((block) => block.type === 'timelineItem' || block.type === 'event')
          .map((block, index) => ({
            id: `${section.id}-timeline-${index}`,
            title: block.data.title || '',
            time: block.data.time || '',
            location: block.data.location || '',
            note: block.data.note || block.data.text || '',
          })),
      };
    case 'travel':
    case 'accommodations':
    {
      const narrativeParts = getSectionNarrativeParts(section);
      const hotelCards = getSectionNoteCards(section, ['hotelCard']);
      const travelTips = getSectionNoteCards(section, ['travelTip']);
      const hotelHints: string[] = [];
      const flightHints: string[] = [];
      const parkingHints: string[] = [];
      const generalHints: string[] = [];

      travelTips.forEach((item) => {
        const line = [item.title, item.note].filter(Boolean).join(': ').trim() || item.title || item.note;
        if (!line) return;

        switch (getTravelHintBucket(item.title, item.note)) {
          case 'hotel':
            hotelHints.push(line);
            break;
          case 'flight':
            flightHints.push(line);
            break;
          case 'parking':
            parkingHints.push(line);
            break;
          default:
            generalHints.push(line);
            break;
        }
      });

      return {
        ...common,
        showTitle: getNamedBooleanValue(section, 'Show title') ?? true,
        eyebrow: getNamedAnswerValue(section, 'Eyebrow') || undefined,
        generalNote: getFirstMeaningfulString(section, [
          section.subtitle,
          narrativeParts[0],
          common.generalNote as string | undefined,
        ]),
        hotels: hotelCards.map((item) => ({
          name: item.title || 'Stay nearby',
          notes: item.note || undefined,
          url: item.url || undefined,
          address: item.location || undefined,
          phone: item.phone || undefined,
          blockCode: item.bookingCode || undefined,
          blockDeadline: item.blockDeadline || undefined,
          priceRange: item.priceRange || undefined,
          distance: item.distance || undefined,
        })),
        travelTips: travelTips.map((item) => ({
          id: item.id,
          title: item.title || '',
          note: item.note || '',
          url: item.url || '',
        })),
        hotelInfo: hotelHints.length > 0 ? hotelHints.join('\n') : undefined,
        flightInfo: flightHints.length > 0 ? flightHints.join('\n') : undefined,
        parkingInfo: parkingHints.length > 0 ? parkingHints.join('\n') : undefined,
        description: getFirstMeaningfulString(section, [
          section.subtitle,
          narrativeParts[0],
          generalHints[0],
          common.description as string | undefined,
        ]),
      };
    }
    case 'gallery':
      return {
        ...common,
        images: getSectionPhotoEntries(section),
        galleryImages: getSectionPhotoEntries(section),
        photos: getSectionPhotoEntries(section),
      };
    case 'story':
      return {
        ...common,
        storyText: getSectionNarrativeText(section) || common.storyText,
      };
    case 'countdown': {
      const narrativeParts = getSectionNarrativeParts(section);
      return {
        ...common,
        showTitle: getNamedBooleanValue(section, 'Show title') ?? true,
        eyebrow: getNamedAnswerValue(section, 'Eyebrow') || getFirstMeaningfulString(section, [section.subtitle]),
        message: narrativeParts[0] || '',
      };
    }
    case 'wedding-party': {
      const titleBlocks = getMeaningfulBlocks(section.blocks, ['title']);
      const partyBlocks = getMeaningfulBlocks(section.blocks, ['photo']);
      const bridalParty = partyBlocks
        .filter((block) => (typeof block.data.subtitle === 'string' ? block.data.subtitle.trim() : '') === 'bridal-party')
        .map((block) => ({
          name: block.data.title || '',
          role: block.data.role || block.data.caption || '',
          photo: block.data.imageUrl || undefined,
          note: block.data.note || undefined,
        }));
      const groomParty = partyBlocks
        .filter((block) => (typeof block.data.subtitle === 'string' ? block.data.subtitle.trim() : '') === 'groom-party')
        .map((block) => ({
          name: block.data.title || '',
          role: block.data.role || block.data.caption || '',
          photo: block.data.imageUrl || undefined,
          note: block.data.note || undefined,
        }));

      return {
        ...common,
        showTitle: getNamedBooleanValue(section, 'Show title') ?? true,
        eyebrow: getNamedAnswerValue(section, 'Eyebrow') || undefined,
        bridalTitle: titleBlocks.find((block) => block.data.subtitle === 'bridal-title')?.data.text || undefined,
        groomTitle: titleBlocks.find((block) => block.data.subtitle === 'groom-title')?.data.text || undefined,
        bridalParty,
        groomParty,
      };
    }
    case 'registry':
      return {
        ...common,
        registryItems: section.blocks
          .filter((block) => block.type === 'registryItem' || block.type === 'fundHighlight')
          .map((block, index) => ({
            id: `${section.id}-registry-${index}`,
            title: block.data.title || '',
            note: block.data.note || block.data.text || '',
            url: block.data.url || '',
          })),
      };
    case 'rsvp':
      return {
        ...common,
        rsvpNote: getFirstMeaningfulString(section, [
          getFirstMeaningfulBlock(section.blocks, ['rsvpNote'])?.data.note,
          section.subtitle,
        ]),
      };
    case 'dress-code': {
      const narrativeParts = getSectionNarrativeParts(section);
      const description = getFirstMeaningfulString(section, [
        narrativeParts[0],
        section.subtitle,
      ]);
      const additionalNote = narrativeParts.find((part) => part !== description) || '';
      const suggestions = getMeaningfulBlocks(section.blocks, ['qna', 'faqItem'])
        .filter((block) => {
          const candidate = [block.data.question, block.data.title]
            .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
            ?.trim()
            .toLowerCase();
          return candidate !== 'color note'
            && candidate !== 'preset code'
            && candidate !== 'eyebrow'
            && candidate !== 'show title';
        })
        .flatMap((block) => [block.data.answer, block.data.text, block.data.question, block.data.title])
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim());

      return {
        ...common,
        showTitle: getNamedBooleanValue(section, 'Show title') ?? true,
        eyebrow: getNamedAnswerValue(section, 'Eyebrow') || undefined,
        dressCodeLabel: getFirstMeaningfulString(section, [
          getFirstMeaningfulBlock(section.blocks, ['title'])?.data.text,
          section.title,
          common.title as string | undefined,
          'Dress Code',
        ]),
        presetCode: getNamedAnswerValue(section, 'Preset code') || undefined,
        description,
        colorNote: getNamedAnswerValue(section, 'Color note') || undefined,
        suggestions,
        additionalNote,
      };
    }
    case 'contact':
    {
      const narrativeParts = getSectionNarrativeParts(section);
      const introText = getFirstMeaningfulString(section, [
        narrativeParts[0],
        section.subtitle,
        common.introText as string | undefined,
      ]);
      const closingNote = narrativeParts.find((part) => part !== introText) || '';
      const contactCards = getSectionNoteCards(section, ['travelTip']);
      return {
        ...common,
        showTitle: getNamedBooleanValue(section, 'Show title') ?? true,
        eyebrow: getNamedAnswerValue(section, 'Eyebrow') || undefined,
        introText,
        emailSubject: getNamedAnswerValue(section, 'Email subject') || undefined,
        contacts: contactCards.map((item) => ({
          name: item.title || '',
          role: item.role || item.note || '',
          email: item.email || undefined,
          phone: item.phone || undefined,
        })),
        closingNote,
      };
    }
    case 'directions': {
      const transport = getSectionNoteCards(section, ['travelTip'])
        .filter((item) => item.title.toLowerCase() !== 'map');

      const mapCard = getSectionNoteCards(section, ['travelTip'])
        .find((item) => item.title.toLowerCase() === 'map' && item.url);

      return {
        ...common,
        eyebrow: getNamedAnswerValue(section, 'Eyebrow') || undefined,
        headline: getFirstMeaningfulString(section, [section.title, common.headline as string | undefined]),
        venueName: getDirectionsTextValue(section, 'Venue'),
        address: getDirectionsTextValue(section, 'Address'),
        city: getDirectionsTextValue(section, 'City'),
        phone: getDirectionsTextValue(section, 'Phone'),
        parkingNote: getDirectionsTextValue(section, 'Parking'),
        rideshareNote: getDirectionsTextValue(section, 'Rideshare'),
        shuttleNote: getDirectionsTextValue(section, 'Shuttle'),
        mapUrl: mapCard?.url || '',
        transport: transport.map((item, index) => ({
          id: `${section.id}-transport-${index}`,
          label: item.title || '',
          description: item.note || '',
        })),
      };
    }
    case 'footer-cta': {
      const narrativeParts = getSectionNarrativeParts(section);
      const subtext = getFirstMeaningfulString(section, [section.subtitle, narrativeParts[0]]);
      const footerNote = narrativeParts.find((part) => part !== subtext) || '';
      const ctaCard = getSectionNoteCards(section, ['travelTip'])
        .find((item) => item.url || item.title);
      return {
        ...common,
        headline: getFirstMeaningfulString(section, [section.title, common.headline as string | undefined]),
        subtext,
        buttonLabel: ctaCard?.title || undefined,
        rsvpUrl: ctaCard?.url || undefined,
        footerNote,
      };
    }
    default:
      return common;
  }
};

const toLegacyBuilderSection = (section: BuilderV2Section, orderIndex: number, updatedAtISO: string): BuilderSectionInstance => ({
  id: section.id,
  displayName: section.title?.trim() || undefined,
  type: normalizeBuilderV2SectionType(section.type) as BuilderSectionInstance['type'],
  variant: section.variant,
  enabled: section.enabled,
  locked: false,
  orderIndex,
  settings: toLegacyBuilderSettings(section),
  bindings: {
    ...(Array.isArray(section.bindings?.venueIds) && section.bindings?.venueIds.length > 0 ? { venueIds: [...section.bindings.venueIds] } : {}),
    ...(Array.isArray(section.bindings?.scheduleItemIds) && section.bindings?.scheduleItemIds.length > 0 ? { scheduleItemIds: [...section.bindings.scheduleItemIds] } : {}),
    ...(Array.isArray(section.bindings?.linkIds) && section.bindings?.linkIds.length > 0 ? { linkIds: [...section.bindings.linkIds] } : {}),
    ...(Array.isArray(section.bindings?.faqIds) && section.bindings?.faqIds.length > 0 ? { faqIds: [...section.bindings.faqIds] } : {}),
    ...(Array.isArray(section.bindings?.mediaAssetIds) && section.bindings?.mediaAssetIds.length > 0 ? { mediaAssetIds: [...section.bindings.mediaAssetIds] } : {}),
  },
  styleOverrides: {},
  meta: {
    createdAtISO: updatedAtISO,
    updatedAtISO,
  },
});

export const builderV2PageToBuilderPage = (
  page: BuilderV2Page,
  orderIndex: number,
  updatedAtISO: string,
): LegacyBuilderPage => ({
  id: page.id,
  title: page.title,
  slug: page.slug,
  orderIndex,
  sections: page.sections.map((section, index) => toLegacyBuilderSection(section, index, updatedAtISO)),
  meta: {
    isHome: page.isHome,
    isHidden: Boolean(page.hidden),
  },
});

export const layoutConfigToBuilderV2Document = (layout: LayoutConfigV1): BuilderV2Document => ({
  version: 'v2',
  pages: layout.pages.map((page, index) => ({
    id: page.id,
    title: page.title,
    slug: index === 0 ? 'home' : page.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `page-${index + 1}`,
    isHome: index === 0,
    hidden: false,
    sections: page.sections.map(toBuilderV2Section),
  })),
  updatedAtISO: layout.meta.updatedAtISO,
});

export const builderProjectToBuilderV2Document = (project: BuilderProject): BuilderV2Document => ({
  version: 'v2',
  pages: project.pages.map((page) => ({
    id: page.id,
    title: page.title,
    slug: page.slug,
    isHome: page.meta.isHome,
    hidden: page.meta.isHidden,
    sections: page.sections.map(toBuilderV2SectionFromBuilder),
  })),
  updatedAtISO: project.meta.updatedAtISO,
});

export const builderV2DocumentToBuilderPages = (
  document: BuilderV2Document,
  updatedAtISO = document.updatedAtISO || new Date().toISOString(),
): LegacyBuilderPage[] => {
  const pages = document.pages?.length
    ? document.pages
    : [{ id: 'home', title: 'Home', slug: 'home', isHome: true, hidden: false, sections: document.sections ?? [] }];

  return pages.map((page, index) => builderV2PageToBuilderPage(page, index, updatedAtISO));
};

export const builderV2DocumentToBuilderProject = (
  document: BuilderV2Document,
  fallback?: Partial<BuilderProject> | null,
): BuilderProject => {
  const updatedAtISO = document.updatedAtISO || fallback?.meta?.updatedAtISO || new Date().toISOString();
  const createdAtISO = fallback?.meta?.createdAtISO || updatedAtISO;

  return {
    id: fallback?.id || 'builder-v2-public-runtime',
    weddingId: fallback?.weddingId || 'public-site',
    templateId: fallback?.templateId || 'modern-luxe',
    themeId: fallback?.themeId || 'romantic',
    themeTokens: fallback?.themeTokens,
    globalAnimationPreset: fallback?.globalAnimationPreset,
    pages: builderV2DocumentToBuilderPages(document, updatedAtISO),
    draftVersion: fallback?.draftVersion ?? 1,
    publishedVersion: fallback?.publishedVersion ?? null,
    publishStatus: fallback?.publishStatus ?? 'draft',
    lastPublishedAt: fallback?.lastPublishedAt ?? null,
    meta: {
      createdAtISO,
      updatedAtISO,
    },
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

export const looksLikeLayoutConfigV1 = (input: unknown): input is LayoutConfigV1 => {
  if (!input || typeof input !== 'object') return false;
  const value = input as Partial<LayoutConfigV1>;
  return value.version === '1' && Array.isArray(value.pages) && typeof value.templateId === 'string';
};

export const looksLikeBuilderProject = (input: unknown): input is BuilderProject => {
  if (!input || typeof input !== 'object') return false;
  const value = input as Partial<BuilderProject>;
  return Array.isArray(value.pages) && typeof value.themeId === 'string' && typeof value.templateId === 'string' && typeof value.weddingId === 'string';
};

export const looksLikeBuilderV2Document = (input: unknown): input is BuilderV2Document => {
  if (!input || typeof input !== 'object') return false;
  const value = input as Partial<BuilderV2Document>;
  return value.version === 'v2' && (Array.isArray(value.pages) || Array.isArray(value.sections));
};

export const isLegacyBuilderPage = (page: unknown): page is LegacyBuilderPage => {
  return Boolean(page && typeof page === 'object' && 'orderIndex' in (page as Record<string, unknown>) && 'meta' in (page as Record<string, unknown>));
};

export const isLayoutConfigPage = (page: unknown): page is PageConfig => {
  return Boolean(page && typeof page === 'object' && 'sections' in (page as Record<string, unknown>) && !('orderIndex' in (page as Record<string, unknown>)));
};
