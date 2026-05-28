import {
  BUILDER_V2_BLOCK_TYPES,
  BUILDER_V2_DOCUMENT_VERSION,
  type BuilderV2BlockType,
  type BuilderV2Document,
} from './contracts';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isString = (v: unknown): v is string => typeof v === 'string';
const isIsoDate = (value: string) => !Number.isNaN(new Date(value).getTime());

export function isBuilderV2BlockType(v: unknown): v is BuilderV2BlockType {
  return isString(v) && (BUILDER_V2_BLOCK_TYPES as readonly string[]).includes(v);
}

function validateSection(section: unknown, prefix: string): string | null {
  if (!isObject(section)) return `${prefix} must be an object`;
  if (!isString(section.id) || !section.id) return `${prefix}.id is required`;
  if (!isString(section.type) || !section.type) return `${prefix}.type is required`;
  if (!isString(section.variant) || !section.variant) return `${prefix}.variant is required`;
  if (typeof section.enabled !== 'boolean') return `${prefix}.enabled must be boolean`;
  if (section.bindings !== undefined) {
    if (!isObject(section.bindings)) return `${prefix}.bindings must be an object`;
    const bindingKeys = ['venueIds', 'scheduleItemIds', 'linkIds', 'faqIds', 'mediaAssetIds'] as const;
    for (const key of bindingKeys) {
      const value = section.bindings[key];
      if (value !== undefined && (!Array.isArray(value) || value.some((item) => !isString(item)))) {
        return `${prefix}.bindings.${key} must be an array of strings`;
      }
    }
  }
  if (!Array.isArray(section.blocks)) return `${prefix}.blocks must be an array`;

  for (let j = 0; j < section.blocks.length; j += 1) {
    const block = section.blocks[j];
    if (!isObject(block)) return `${prefix}.blocks[${j}] must be an object`;
    if (!isString(block.id) || !block.id) return `${prefix}.blocks[${j}].id is required`;
    if (!isBuilderV2BlockType(block.type)) return `${prefix}.blocks[${j}].type is invalid`;
    if (block.data !== undefined && !isObject(block.data)) return `${prefix}.blocks[${j}].data must be an object`;
  }

  return null;
}

export function validateBuilderV2Document(input: unknown): { ok: true; doc: BuilderV2Document } | { ok: false; error: string } {
  if (!isObject(input)) return { ok: false, error: 'Document must be an object' };
  if (input.version !== BUILDER_V2_DOCUMENT_VERSION) return { ok: false, error: `Unsupported version (expected ${BUILDER_V2_DOCUMENT_VERSION})` };
  const pages = input.pages;
  const sections = input.sections;
  const hasPages = Array.isArray(pages);
  const hasSections = Array.isArray(sections);
  if (!hasPages && !hasSections) {
    return { ok: false, error: 'pages or sections must be an array' };
  }

  if (hasPages) {
    const pageIds = new Set<string>();
    const pageSlugs = new Set<string>();
    const sectionIds = new Set<string>();
    const blockIds = new Set<string>();
    let homePageCount = 0;

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const page = pages[pageIndex];
      if (!isObject(page)) return { ok: false, error: `pages[${pageIndex}] must be an object` };
      if (!isString(page.id) || !page.id) return { ok: false, error: `pages[${pageIndex}].id is required` };
      if (pageIds.has(page.id)) return { ok: false, error: `pages[${pageIndex}].id must be unique` };
      pageIds.add(page.id);
      if (!isString(page.title) || !page.title) return { ok: false, error: `pages[${pageIndex}].title is required` };
      if (!isString(page.slug) || !page.slug) return { ok: false, error: `pages[${pageIndex}].slug is required` };
      const normalizedSlug = page.slug.trim().toLowerCase();
      if (pageSlugs.has(normalizedSlug)) return { ok: false, error: `pages[${pageIndex}].slug must be unique` };
      pageSlugs.add(normalizedSlug);
      if (typeof page.isHome !== 'boolean') return { ok: false, error: `pages[${pageIndex}].isHome must be boolean` };
      if (page.isHome) {
        homePageCount += 1;
      }
      if (page.hidden !== undefined && typeof page.hidden !== 'boolean') return { ok: false, error: `pages[${pageIndex}].hidden must be boolean` };
      if (page.isHome === true && page.hidden === true) return { ok: false, error: `pages[${pageIndex}] home page cannot be hidden` };
      if (!Array.isArray(page.sections)) return { ok: false, error: `pages[${pageIndex}].sections must be an array` };

      for (let sectionIndex = 0; sectionIndex < page.sections.length; sectionIndex += 1) {
        const section = page.sections[sectionIndex];
        const sectionError = validateSection(section, `pages[${pageIndex}].sections[${sectionIndex}]`);
        if (sectionError) return { ok: false, error: sectionError };
        const validatedSection = section as Record<string, unknown>;
        const sectionId = validatedSection.id as string;
        if (sectionIds.has(sectionId)) return { ok: false, error: `pages[${pageIndex}].sections[${sectionIndex}].id must be unique across pages` };
        sectionIds.add(sectionId);

        const blocks = validatedSection.blocks as Array<Record<string, unknown>>;
        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
          const blockId = blocks[blockIndex]?.id;
          if (typeof blockId !== 'string') continue;
          if (blockIds.has(blockId)) return { ok: false, error: `pages[${pageIndex}].sections[${sectionIndex}].blocks[${blockIndex}].id must be unique across pages` };
          blockIds.add(blockId);
        }
      }
    }

    if (pages.length > 0 && homePageCount !== 1) {
      return { ok: false, error: 'pages must contain exactly one home page' };
    }
  }

  if (hasSections) {
    const legacySectionIds = new Set<string>();
    const legacyBlockIds = new Set<string>();
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      const section = sections[sectionIndex];
      const sectionError = validateSection(section, `sections[${sectionIndex}]`);
      if (sectionError) return { ok: false, error: sectionError };
      const validatedSection = section as Record<string, unknown>;
      const sectionId = validatedSection.id as string;
      if (legacySectionIds.has(sectionId)) return { ok: false, error: `sections[${sectionIndex}].id must be unique` };
      legacySectionIds.add(sectionId);

      const blocks = validatedSection.blocks as Array<Record<string, unknown>>;
      for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
        const blockId = blocks[blockIndex]?.id;
        if (typeof blockId !== 'string') continue;
        if (legacyBlockIds.has(blockId)) return { ok: false, error: `sections[${sectionIndex}].blocks[${blockIndex}].id must be unique` };
        legacyBlockIds.add(blockId);
      }
    }
  }

  if (!isString(input.updatedAtISO) || !input.updatedAtISO) return { ok: false, error: 'updatedAtISO is required' };
  if (!isIsoDate(input.updatedAtISO)) return { ok: false, error: 'updatedAtISO must be a valid ISO date' };

  const doc = input as unknown as BuilderV2Document;
  return { ok: true, doc };
}
