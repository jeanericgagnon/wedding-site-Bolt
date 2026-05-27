import type { BuilderProject, BuilderPage as LegacyBuilderPage } from '../types/builder/project';
import type { BuilderSectionInstance } from '../types/builder/section';
import type { LayoutConfigV1, PageConfig, SectionInstance } from '../types/layoutConfig';
import type { BuilderV2Block, BuilderV2Document, BuilderV2Section } from './contracts';

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

export const isLegacyBuilderPage = (page: unknown): page is LegacyBuilderPage => {
  return Boolean(page && typeof page === 'object' && 'orderIndex' in (page as Record<string, unknown>) && 'meta' in (page as Record<string, unknown>));
};

export const isLayoutConfigPage = (page: unknown): page is PageConfig => {
  return Boolean(page && typeof page === 'object' && 'sections' in (page as Record<string, unknown>) && !('orderIndex' in (page as Record<string, unknown>)));
};
