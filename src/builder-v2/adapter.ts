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

const makeDefaultBlocksForType = (
  type: string,
  title?: string,
  subtitle?: string,
): BuilderV2Block[] => {
  const titleText = title?.trim() || 'Welcome to our wedding';
  const subtitleText = subtitle?.trim() || 'Edit this intro in the right rail.';

  switch (normalizeBuilderV2SectionType(type)) {
    case 'hero':
      return [
        { id: 'b-title', type: 'title', data: { text: titleText } },
        { id: 'b-text', type: 'text', data: { text: subtitleText } },
      ];
    case 'story':
      return [{ id: 'b-story', type: 'story', data: { text: subtitleText || 'Tell your story here.' } }];
    case 'schedule':
      return [{ id: 'b-event', type: 'event', data: { title: titleText || 'Ceremony', time: '4:00 PM', location: 'Main Venue' } }];
    case 'travel':
      return [{ id: 'b-tip', type: 'travelTip', data: { title: titleText || 'Travel tip', note: subtitleText || 'Book flights early.' } }];
    case 'registry':
      return [{ id: 'b-reg', type: 'registryItem', data: { title: titleText || 'Registry item', note: subtitleText || 'Add item details here.' } }];
    case 'rsvp':
      return [{ id: 'b-rsvp', type: 'rsvpNote', data: { note: subtitleText || 'Please RSVP by the deadline.' } }];
    default:
      return [{ id: 'b-text', type: 'text', data: { text: subtitleText || 'Add content.' } }];
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
    blocks: makeDefaultBlocksForType(normalizedType, title, subtitle),
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
    blocks: makeDefaultBlocksForType(normalizedType, title, subtitle),
  };
};

const getFirstMeaningfulBlock = (
  blocks: BuilderV2Block[],
  types: BuilderV2Block['type'][],
) => blocks.find((block) => (
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
        travelTips: section.blocks
          .filter((block) => block.type === 'travelTip' || block.type === 'hotelCard')
          .map((block, index) => ({
            id: `${section.id}-travel-${index}`,
            title: block.data.title || '',
            note: block.data.note || block.data.text || '',
            url: block.data.url || '',
          })),
      };
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
  bindings: {},
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
