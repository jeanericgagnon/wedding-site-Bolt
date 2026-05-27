import { BUILDER_V2_BLOCK_TYPES, type BuilderV2BlockType, type BuilderV2Document } from './contracts';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isString = (v: unknown): v is string => typeof v === 'string';

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
  if (input.version !== 'v2') return { ok: false, error: 'Unsupported version (expected v2)' };
  const pages = input.pages;
  const sections = input.sections;
  const hasPages = Array.isArray(pages);
  const hasSections = Array.isArray(sections);
  if (!hasPages && !hasSections) {
    return { ok: false, error: 'pages or sections must be an array' };
  }

  if (hasPages) {
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const page = pages[pageIndex];
      if (!isObject(page)) return { ok: false, error: `pages[${pageIndex}] must be an object` };
      if (!isString(page.id) || !page.id) return { ok: false, error: `pages[${pageIndex}].id is required` };
      if (!isString(page.title) || !page.title) return { ok: false, error: `pages[${pageIndex}].title is required` };
      if (!isString(page.slug) || !page.slug) return { ok: false, error: `pages[${pageIndex}].slug is required` };
      if (typeof page.isHome !== 'boolean') return { ok: false, error: `pages[${pageIndex}].isHome must be boolean` };
      if (page.hidden !== undefined && typeof page.hidden !== 'boolean') return { ok: false, error: `pages[${pageIndex}].hidden must be boolean` };
      if (!Array.isArray(page.sections)) return { ok: false, error: `pages[${pageIndex}].sections must be an array` };

      for (let sectionIndex = 0; sectionIndex < page.sections.length; sectionIndex += 1) {
        const sectionError = validateSection(page.sections[sectionIndex], `pages[${pageIndex}].sections[${sectionIndex}]`);
        if (sectionError) return { ok: false, error: sectionError };
      }
    }
  }

  if (hasSections) {
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      const sectionError = validateSection(sections[sectionIndex], `sections[${sectionIndex}]`);
      if (sectionError) return { ok: false, error: sectionError };
    }
  }

  if (!isString(input.updatedAtISO) || !input.updatedAtISO) return { ok: false, error: 'updatedAtISO is required' };

  const doc = input as unknown as BuilderV2Document;
  return { ok: true, doc };
}
