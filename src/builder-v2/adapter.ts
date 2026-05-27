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
    case 'schedule':
    case 'travel':
    case 'registry':
    case 'rsvp':
      return subtitleText ? [{ id: 'b-text', type: 'text', data: { text: subtitleText } }] : [];
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
      const message = getSettingString(settings, 'message');
      return [
        ...(subtitleText ? [{ id: 'b-text', type: 'text', data: { text: subtitleText } } satisfies BuilderV2Block] : []),
        ...(message ? [{ id: 'b-story', type: 'story', data: { text: message } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'dress-code': {
      const description = getSettingString(settings, 'description');
      const additionalNote = getSettingString(settings, 'additionalNote');
      const suggestions = getSettingStringList(settings, 'suggestions');
      return [
        ...(description ? [{ id: 'b-text', type: 'text', data: { text: description } } satisfies BuilderV2Block] : []),
        ...suggestions.map((suggestion, index) => ({
          id: `b-qna-${index + 1}`,
          type: 'qna' as const,
          data: { answer: suggestion },
        })),
        ...(additionalNote ? [{ id: 'b-story', type: 'story', data: { text: additionalNote } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'accommodations': {
      const generalNote = getSettingString(settings, 'generalNote');
      const hotels = getSettingRecordList<{
        name?: string;
        notes?: string;
        url?: string;
        address?: string;
      }>(settings, 'hotels');
      return [
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
            },
          })),
      ];
    }
    case 'contact': {
      const introText = getSettingString(settings, 'introText');
      const closingNote = getSettingString(settings, 'closingNote');
      return [
        ...(introText ? [{ id: 'b-text', type: 'text', data: { text: introText } } satisfies BuilderV2Block] : []),
        ...(closingNote ? [{ id: 'b-story', type: 'story', data: { text: closingNote } } satisfies BuilderV2Block] : []),
      ];
    }
    case 'footer-cta': {
      const subtext = getSettingString(settings, 'subtext');
      const footerNote = getSettingString(settings, 'footerNote');
      return [
        ...(subtext ? [{ id: 'b-text', type: 'text', data: { text: subtext } } satisfies BuilderV2Block] : []),
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

const getDressCodeSuggestionText = (section: BuilderV2Section) => (
  getMeaningfulBlocks(section.blocks, ['qna', 'faqItem'])
    .flatMap((block) => [block.data.answer, block.data.text, block.data.question, block.data.title])
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
    note: typeof block.data.note === 'string' && block.data.note.trim()
      ? block.data.note.trim()
      : typeof block.data.text === 'string' && block.data.text.trim()
        ? block.data.text.trim()
        : '',
    url: typeof block.data.url === 'string' ? block.data.url.trim() : '',
    location: typeof block.data.location === 'string' ? block.data.location.trim() : '',
    time: typeof block.data.time === 'string' ? block.data.time.trim() : '',
  })).filter((item) => item.title || item.note || item.url || item.location || item.time)
);

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
      return {
        ...common,
        hotels: getSectionNoteCards(section, ['hotelCard', 'travelTip']).map((item) => ({
          name: item.title || 'Stay nearby',
          notes: item.note || undefined,
          url: item.url || undefined,
          address: item.location || undefined,
        })),
        travelTips: getSectionNoteCards(section, ['travelTip', 'hotelCard']).map((item) => ({
          id: item.id,
          title: item.title || '',
          note: item.note || '',
          url: item.url || '',
        })),
      };
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
        eyebrow: getFirstMeaningfulString(section, [section.subtitle]),
        message: narrativeParts[0] || '',
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
      const description = getFirstMeaningfulString(section, [
        getSectionNarrativeText(section),
        section.subtitle,
      ]);
      const suggestions = getDressCodeSuggestionText(section);

      return {
        ...common,
        dressCodeLabel: getFirstMeaningfulString(section, [section.title, common.title as string | undefined, 'Dress Code']),
        description,
        suggestions,
        additionalNote: '',
      };
    }
    case 'contact':
      return {
        ...common,
        introText: getSectionNarrativeText(section) || common.introText,
      };
    case 'footer-cta': {
      const narrativeParts = getSectionNarrativeParts(section);
      const subtext = getFirstMeaningfulString(section, [section.subtitle, narrativeParts[0]]);
      const footerNote = narrativeParts.find((part) => part !== subtext) || '';
      return {
        ...common,
        headline: getFirstMeaningfulString(section, [section.title, common.headline as string | undefined]),
        subtext,
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
