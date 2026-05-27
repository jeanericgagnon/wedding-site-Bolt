import type { BuilderV2Block, BuilderV2BlockData, BuilderV2Document, BuilderV2Page, BuilderV2Section } from './contracts';
import { builderProjectToBuilderV2Document, layoutConfigToBuilderV2Document, looksLikeBuilderProject, looksLikeLayoutConfigV1 } from './adapter';
import { sanitizeImportedBlockType, sanitizeImportedSectionType } from './importSanitize';

type ImportObject = Record<string, unknown>;

export type BuilderV2ImportReport = {
  sourceKind: 'builder-v2' | 'layout-config-v1' | 'builder-project';
  pageCount: number;
  sectionCount: number;
  blockCount: number;
  normalizedVersion: boolean;
  normalizedUpdatedAt: boolean;
  generatedPageIds: number;
  dedupedPageIds: number;
  normalizedPageTitles: number;
  normalizedPageSlugs: number;
  normalizedPageVisibility: number;
  normalizedHomePage: boolean;
  generatedSectionIds: number;
  generatedBlockIds: number;
  dedupedSectionIds: number;
  dedupedBlockIds: number;
  normalizedSectionTypes: number;
  normalizedBlockTypes: number;
  defaultedVariants: number;
  coercedEnabledFlags: number;
  normalizedTitles: number;
  normalizedSubtitles: number;
  resetInvalidBlockData: number;
  recoveredBlockDataFromLegacyContent: number;
  droppedInvalidSections: number;
  droppedInvalidBlocks: number;
  notes: string[];
};

type PreparedImport =
  | { ok: true; doc: BuilderV2Document; report: BuilderV2ImportReport }
  | { ok: false; error: string };

const isObject = (value: unknown): value is ImportObject => typeof value === 'object' && value !== null;

const toIsoStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const slugToken = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const titleCase = (value: string) => value
  .split(/[\s-]+/)
  .filter(Boolean)
  .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
  .join(' ');

const fallbackSectionTitle = (type: string) => titleCase(type.replace(/[^a-z0-9]+/gi, ' ').trim()) || 'Imported section';

const uniqueId = (base: string, seen: Set<string>) => {
  if (!seen.has(base)) {
    seen.add(base);
    return { id: base, deduped: false };
  }

  let index = 2;
  let next = `${base}-${index}`;
  while (seen.has(next)) {
    index += 1;
    next = `${base}-${index}`;
  }
  seen.add(next);
  return { id: next, deduped: true };
};

const deriveLegacyBlockData = (blockType: BuilderV2Block['type'], legacyContent: string): BuilderV2BlockData => {
  const content = legacyContent.trim();
  if (!content) return {};

  switch (blockType) {
    case 'qna':
    case 'faqItem': {
      const match = content.match(/q:\s*(.+?)\s*a:\s*(.+)/i);
      if (match) {
        return { question: match[1].trim(), answer: match[2].trim() };
      }
      return { question: content };
    }
    case 'photo':
      return { caption: content };
    case 'event': {
      const [title, time, location] = content.split('·').map((piece) => piece.trim()).filter(Boolean);
      return { title: title || content, time, location };
    }
    case 'travelTip':
    case 'rsvpNote':
      return { note: content };
    case 'hotelCard':
    case 'registryItem':
    case 'fundHighlight':
    case 'timelineItem':
      return { title: content };
    case 'divider':
    case 'story':
    case 'text':
    case 'title':
    default:
      return { text: content };
  }
};

const mergeBlockDataFromLegacyContent = (
  blockType: BuilderV2Block['type'],
  sourceData: BuilderV2BlockData,
  legacyContent: string,
): { data: BuilderV2BlockData; recovered: boolean } => {
  if (!legacyContent.trim()) {
    return { data: sourceData, recovered: false };
  }

  const derived = deriveLegacyBlockData(blockType, legacyContent);
  let recovered = false;
  const merged: BuilderV2BlockData = { ...sourceData };

  for (const [key, value] of Object.entries(derived) as Array<[keyof BuilderV2BlockData, string | undefined]>) {
    if (!value) continue;
    if (typeof merged[key] === 'string' && merged[key]?.trim()) continue;
    merged[key] = value;
    recovered = true;
  }

  return { data: merged, recovered };
};

const coerceEnabled = (value: unknown): { enabled: boolean; coerced: boolean } => {
  if (typeof value === 'boolean') return { enabled: value, coerced: false };
  if (typeof value === 'number') return { enabled: value !== 0, coerced: true };
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'hidden', 'off', 'disabled'].includes(normalized)) {
      return { enabled: false, coerced: true };
    }
    if (normalized) return { enabled: true, coerced: true };
  }
  return { enabled: true, coerced: true };
};

const createEmptyReport = (): BuilderV2ImportReport => ({
  sourceKind: 'builder-v2',
  pageCount: 0,
  sectionCount: 0,
  blockCount: 0,
  normalizedVersion: false,
  normalizedUpdatedAt: false,
  generatedPageIds: 0,
  dedupedPageIds: 0,
  normalizedPageTitles: 0,
  normalizedPageSlugs: 0,
  normalizedPageVisibility: 0,
  normalizedHomePage: false,
  generatedSectionIds: 0,
  generatedBlockIds: 0,
  dedupedSectionIds: 0,
  dedupedBlockIds: 0,
  normalizedSectionTypes: 0,
  normalizedBlockTypes: 0,
  defaultedVariants: 0,
  coercedEnabledFlags: 0,
  normalizedTitles: 0,
  normalizedSubtitles: 0,
  resetInvalidBlockData: 0,
  recoveredBlockDataFromLegacyContent: 0,
  droppedInvalidSections: 0,
  droppedInvalidBlocks: 0,
  notes: [],
});

const sanitizePageTitle = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const sanitizePageSlug = (value: unknown, fallback: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  return slugToken(value) || fallback;
};

const parseImportedSection = (
  rawSection: unknown,
  sectionIndex: number,
  report: BuilderV2ImportReport,
  sectionIds: Set<string>,
): BuilderV2Section | null => {
  if (!isObject(rawSection)) {
    report.droppedInvalidSections += 1;
    report.notes.push(`Dropped section ${sectionIndex + 1} because it was not an object.`);
    return null;
  }

  const rawType = typeof rawSection.type === 'string' ? rawSection.type : '';
  const sanitizedType = sanitizeImportedSectionType(rawType);
  if (!rawType.trim()) {
    report.droppedInvalidSections += 1;
    report.notes.push(`Dropped section ${sectionIndex + 1} because it had no type.`);
    return null;
  }
  if (sanitizedType !== rawType.trim()) {
    report.normalizedSectionTypes += 1;
  }

  const rawId = typeof rawSection.id === 'string' ? slugToken(rawSection.id) : '';
  const generatedSectionId = rawId || `import-section-${sectionIndex + 1}`;
  if (!rawId) {
    report.generatedSectionIds += 1;
  }
  const uniqueSectionId = uniqueId(generatedSectionId, sectionIds);
  if (uniqueSectionId.deduped) {
    report.dedupedSectionIds += 1;
  }

  const variant = typeof rawSection.variant === 'string' && rawSection.variant.trim()
    ? rawSection.variant.trim()
    : 'default';
  if (variant === 'default' && (!(typeof rawSection.variant === 'string') || !rawSection.variant.trim())) {
    report.defaultedVariants += 1;
  }

  const title = typeof rawSection.title === 'string' && rawSection.title.trim()
    ? rawSection.title.trim()
    : fallbackSectionTitle(sanitizedType);
  if (!(typeof rawSection.title === 'string') || !rawSection.title.trim()) {
    report.normalizedTitles += 1;
  }

  const subtitle = typeof rawSection.subtitle === 'string'
    ? rawSection.subtitle.trim()
    : '';
  if (rawSection.subtitle !== undefined && typeof rawSection.subtitle !== 'string') {
    report.normalizedSubtitles += 1;
  }

  const enabledState = coerceEnabled(rawSection.enabled);
  if (enabledState.coerced) {
    report.coercedEnabledFlags += 1;
  }

  const rawBlocks = Array.isArray(rawSection.blocks) ? rawSection.blocks : [];
  if (!Array.isArray(rawSection.blocks)) {
    report.notes.push(`Section "${title}" had invalid blocks and was imported with an empty block list.`);
  }

  const blockIds = new Set<string>();
  const blocks: BuilderV2Block[] = [];
  rawBlocks.forEach((rawBlock, blockIndex) => {
    if (!isObject(rawBlock)) {
      report.droppedInvalidBlocks += 1;
      return;
    }

    const sanitizedBlockType = sanitizeImportedBlockType(rawBlock.type);
    if (rawBlock.type !== sanitizedBlockType) {
      report.normalizedBlockTypes += 1;
    }

    const rawBlockId = typeof rawBlock.id === 'string' ? slugToken(rawBlock.id) : '';
    const generatedBlockId = rawBlockId || `${uniqueSectionId.id}-block-${blockIndex + 1}`;
    if (!rawBlockId) {
      report.generatedBlockIds += 1;
    }
    const uniqueBlockId = uniqueId(generatedBlockId, blockIds);
    if (uniqueBlockId.deduped) {
      report.dedupedBlockIds += 1;
    }

    let blockData: BuilderV2BlockData = {};
    if (rawBlock.data === undefined) {
      blockData = {};
    } else if (isObject(rawBlock.data)) {
      blockData = { ...rawBlock.data } as BuilderV2BlockData;
    } else {
      report.resetInvalidBlockData += 1;
    }

    const legacyContent = typeof rawBlock.content === 'string' ? rawBlock.content : '';
    const mergedBlockData = mergeBlockDataFromLegacyContent(sanitizedBlockType, blockData, legacyContent);
    if (mergedBlockData.recovered) {
      report.recoveredBlockDataFromLegacyContent += 1;
    }

    blocks.push({
      id: uniqueBlockId.id,
      type: sanitizedBlockType,
      data: mergedBlockData.data,
    });
  });

  return {
    id: uniqueSectionId.id,
    type: sanitizedType,
    variant,
    enabled: enabledState.enabled,
    title,
    subtitle,
    blocks,
  } satisfies BuilderV2Section;
};

export function prepareImportedBuilderV2Document(
  input: unknown,
  options?: { nowIso?: string },
): PreparedImport {
  if (!isObject(input)) {
    return { ok: false, error: 'Import must be a JSON object.' };
  }

  const legacyInput = looksLikeLayoutConfigV1(input)
    ? layoutConfigToBuilderV2Document(input)
    : looksLikeBuilderProject(input)
      ? builderProjectToBuilderV2Document(input)
      : null;

  if (legacyInput) {
    const migrated = prepareImportedBuilderV2Document(legacyInput, options);
    if (migrated.ok) {
      migrated.report.sourceKind = looksLikeLayoutConfigV1(input) ? 'layout-config-v1' : 'builder-project';
      migrated.report.normalizedVersion = true;
      migrated.report.notes.unshift(
        looksLikeLayoutConfigV1(input)
          ? 'Imported a legacy layout config and mapped it onto the Builder V2 document model.'
          : 'Imported a legacy builder project and mapped it onto the Builder V2 document model.',
      );
    }
    return migrated;
  }

  if (!Array.isArray(input.pages) && !Array.isArray(input.sections)) {
    return { ok: false, error: 'Import must include a pages array or legacy sections array.' };
  }

  const report = createEmptyReport();
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const updatedAtISO = toIsoStringOrNull(input.updatedAtISO) ?? nowIso;
  if (updatedAtISO !== input.updatedAtISO) {
    report.normalizedUpdatedAt = true;
  }
  if (input.version !== 'v2') {
    report.normalizedVersion = true;
  }

  const sectionIds = new Set<string>();
  const pageIds = new Set<string>();
  const pageSlugs = new Set<string>();
  const pages: BuilderV2Page[] = [];
  const sourcePages = Array.isArray(input.pages)
    ? input.pages
    : [{
      id: 'home',
      title: 'Home',
      slug: 'home',
      isHome: true,
      hidden: false,
      sections: input.sections,
    }];

  sourcePages.forEach((rawPage, pageIndex) => {
    if (!isObject(rawPage)) {
      report.notes.push(`Dropped page ${pageIndex + 1} because it was not an object.`);
      return;
    }

    const rawPageId = typeof rawPage.id === 'string' ? slugToken(rawPage.id) : '';
    const generatedPageId = rawPageId || `page-${pageIndex + 1}`;
    if (!rawPageId) {
      report.generatedPageIds += 1;
    }
    const uniquePageId = uniqueId(generatedPageId, pageIds);
    if (uniquePageId.deduped) {
      report.dedupedPageIds += 1;
    }

    const fallbackTitle = pageIndex === 0 ? 'Home' : `Page ${pageIndex + 1}`;
    const title = sanitizePageTitle(rawPage.title, fallbackTitle);
    if (title !== rawPage.title) {
      report.normalizedPageTitles += 1;
    }

    const requestedSlug = sanitizePageSlug(rawPage.slug, sanitizePageSlug(title, generatedPageId));
    let slug = requestedSlug;
    if (pageSlugs.has(slug)) {
      let suffix = 2;
      let candidate = `${slug}-${suffix}`;
      while (pageSlugs.has(candidate)) {
        suffix += 1;
        candidate = `${slug}-${suffix}`;
      }
      slug = candidate;
      report.normalizedPageSlugs += 1;
    } else if (requestedSlug !== rawPage.slug) {
      report.normalizedPageSlugs += 1;
    }
    pageSlugs.add(slug);

    const pageSections = Array.isArray(rawPage.sections) ? rawPage.sections : [];
    if (!Array.isArray(rawPage.sections)) {
      report.notes.push(`Page "${title}" had invalid sections and was imported with an empty section list.`);
    }

    const sections = pageSections.reduce<BuilderV2Section[]>((acc, rawSection, sectionIndex) => {
      const section = parseImportedSection(rawSection, sectionIndex, report, sectionIds);
      if (section) acc.push(section);
      return acc;
    }, []);

    const hidden = rawPage.hidden === true;
    if (rawPage.hidden !== undefined && typeof rawPage.hidden !== 'boolean') {
      report.normalizedPageVisibility += 1;
    }

    if (!sections.length) {
      report.notes.push(`Dropped page "${title}" because it did not contain any usable sections.`);
      return;
    }

    pages.push({
      id: uniquePageId.id,
      title,
      slug,
      isHome: rawPage.isHome === true,
      hidden,
      sections,
    });
  });

  if (!pages.length) {
    return { ok: false, error: 'Import did not contain any usable sections.' };
  }

  const homeIndex = pages.findIndex((page) => page.isHome);
  pages.forEach((page, index) => {
    const shouldBeHome = homeIndex >= 0 ? index === homeIndex : index === 0;
    if (page.isHome !== shouldBeHome) {
      report.normalizedHomePage = true;
    }
    page.isHome = shouldBeHome;
    if (page.isHome && page.hidden) {
      page.hidden = false;
      report.normalizedPageVisibility += 1;
    }
  });

  report.pageCount = pages.length;
  report.sectionCount = pages.reduce((count, page) => count + page.sections.length, 0);
  report.blockCount = pages.reduce(
    (count, page) => count + page.sections.reduce((pageCount, section) => pageCount + section.blocks.length, 0),
    0,
  );

  if (report.generatedPageIds > 0) {
    report.notes.push(`Generated ${report.generatedPageIds} missing page id${report.generatedPageIds === 1 ? '' : 's'}.`);
  }
  if (report.normalizedPageSlugs > 0) {
    report.notes.push(`Normalized ${report.normalizedPageSlugs} page slug${report.normalizedPageSlugs === 1 ? '' : 's'} for safe reuse.`);
  }
  if (report.generatedSectionIds > 0) {
    report.notes.push(`Generated ${report.generatedSectionIds} missing section id${report.generatedSectionIds === 1 ? '' : 's'}.`);
  }
  if (report.generatedBlockIds > 0) {
    report.notes.push(`Generated ${report.generatedBlockIds} missing block id${report.generatedBlockIds === 1 ? '' : 's'}.`);
  }
  if (report.normalizedBlockTypes > 0) {
    report.notes.push(`Recovered ${report.normalizedBlockTypes} block type${report.normalizedBlockTypes === 1 ? '' : 's'} onto supported Builder V2 blocks.`);
  }
  if (report.recoveredBlockDataFromLegacyContent > 0) {
    report.notes.push(`Recovered content from ${report.recoveredBlockDataFromLegacyContent} legacy block${report.recoveredBlockDataFromLegacyContent === 1 ? '' : 's'}.`);
  }
  if (report.droppedInvalidSections > 0 || report.droppedInvalidBlocks > 0) {
    report.notes.push(`Dropped ${report.droppedInvalidSections} invalid section${report.droppedInvalidSections === 1 ? '' : 's'} and ${report.droppedInvalidBlocks} invalid block${report.droppedInvalidBlocks === 1 ? '' : 's'}.`);
  }

  return {
    ok: true,
    doc: {
      version: 'v2',
      updatedAtISO,
      pages,
    },
    report,
  };
}
