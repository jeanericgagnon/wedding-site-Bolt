import { ensureUniqueBuilderV2PageSlug, sanitizeBuilderV2PageTitle, type LabPage } from './builderV2PageState';

type SectionLike = LabPage['sections'][number];

type BlockData = Record<string, unknown> | undefined;

type BlockLike = {
  id: string;
  type: string;
  content: string;
  data?: BlockData;
};

type MoveParams<TPage extends LabPage = LabPage, TBlock extends BlockLike = BlockLike> = {
  pages: TPage[];
  sectionBlocks: Record<string, TBlock[]>;
  sourcePageId: string;
  targetPageId: string;
  selectedIds: string[];
};

export type BuilderV2MoveSectionsResult<TPage extends LabPage = LabPage, TBlock extends BlockLike = BlockLike> = {
  pages: TPage[];
  sectionBlocks: Record<string, TBlock[]>;
  movedSectionIds: string[];
  targetPageId: string | null;
};

type DuplicateParams<TPage extends LabPage = LabPage, TBlock extends BlockLike = BlockLike> = {
  pages: TPage[];
  sectionBlocks: Record<string, TBlock[]>;
  pageId: string;
};

export type BuilderV2DuplicatePageResult<TPage extends LabPage = LabPage, TBlock extends BlockLike = BlockLike> = {
  pages: TPage[];
  sectionBlocks: Record<string, TBlock[]>;
  duplicatedPageId: string | null;
  duplicatedSectionIds: string[];
};

const slugToken = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const makeUniqueId = (base: string, taken: Set<string>) => {
  let next = base;
  let counter = 2;
  while (taken.has(next)) {
    next = `${base}-${counter}`;
    counter += 1;
  }
  taken.add(next);
  return next;
};

const makeCopyTitle = (title: string, existingTitles: Set<string>) => {
  const trimmedTitle = title.trim() || 'Page';
  let next = `${trimmedTitle} Copy`;
  let counter = 2;
  while (existingTitles.has(next.toLowerCase())) {
    next = `${trimmedTitle} Copy ${counter}`;
    counter += 1;
  }
  existingTitles.add(next.toLowerCase());
  return next;
};

const makeCopySectionTitle = (title: string, existingTitles: Set<string>) => {
  const trimmedTitle = title.trim() || 'Section';
  let next = `${trimmedTitle} Copy`;
  let counter = 2;
  while (existingTitles.has(next.toLowerCase())) {
    next = `${trimmedTitle} Copy ${counter}`;
    counter += 1;
  }
  existingTitles.add(next.toLowerCase());
  return next;
};

export const moveBuilderV2SectionsToPage = <TPage extends LabPage, TBlock extends BlockLike>({
  pages,
  sectionBlocks,
  sourcePageId,
  targetPageId,
  selectedIds,
}: MoveParams<TPage, TBlock>): BuilderV2MoveSectionsResult<TPage, TBlock> => {
  if (sourcePageId === targetPageId || !selectedIds.length) {
    return { pages, sectionBlocks, movedSectionIds: [], targetPageId: null };
  }

  const sourcePage = pages.find((page) => page.id === sourcePageId);
  const targetPage = pages.find((page) => page.id === targetPageId);
  if (!sourcePage || !targetPage) {
    return { pages, sectionBlocks, movedSectionIds: [], targetPageId: null };
  }

  const selectedSet = new Set(selectedIds);
  const movedSections = sourcePage.sections.filter((section) => selectedSet.has(section.id));
  if (!movedSections.length) {
    return { pages, sectionBlocks, movedSectionIds: [], targetPageId: null };
  }

  const nextPages = pages.map((page) => {
    if (page.id === sourcePageId) {
      return {
        ...page,
        sections: page.sections.filter((section) => !selectedSet.has(section.id)),
      };
    }
    if (page.id === targetPageId) {
      return {
        ...page,
        sections: [...page.sections, ...movedSections],
      };
    }
    return page;
  }) as TPage[];

  return {
    pages: nextPages,
    sectionBlocks,
    movedSectionIds: movedSections.map((section) => section.id),
    targetPageId,
  };
};

export const duplicateBuilderV2Page = <TPage extends LabPage, TBlock extends BlockLike>({
  pages,
  sectionBlocks,
  pageId,
}: DuplicateParams<TPage, TBlock>): BuilderV2DuplicatePageResult<TPage, TBlock> => {
  const pageIndex = pages.findIndex((page) => page.id === pageId);
  const sourcePage = pageIndex >= 0 ? pages[pageIndex] : null;
  if (!sourcePage) {
    return { pages, sectionBlocks, duplicatedPageId: null, duplicatedSectionIds: [] };
  }

  const pageIds = new Set(pages.map((page) => page.id));
  const pageTitles = new Set(pages.map((page) => page.title.trim().toLowerCase()).filter(Boolean));
  const sectionIds = new Set(pages.flatMap((page) => page.sections.map((section) => section.id)));
  const sectionTitles = new Set(pages.flatMap((page) => page.sections.map((section) => section.title.trim().toLowerCase()).filter(Boolean)));
  const blockIds = new Set(Object.values(sectionBlocks).flatMap((blocks) => blocks.map((block) => block.id)));

  const duplicatedPageTitle = makeCopyTitle(sourcePage.title, pageTitles);
  const duplicatedPageId = makeUniqueId(slugToken(duplicatedPageTitle) || 'page-copy', pageIds);
  const duplicatedPageSlug = ensureUniqueBuilderV2PageSlug(duplicatedPageTitle, pages);

  const duplicatedSections = sourcePage.sections.map((section) => {
    const duplicatedSectionTitle = makeCopySectionTitle(section.title, sectionTitles);
    const duplicatedSectionId = makeUniqueId(slugToken(duplicatedSectionTitle) || `${slugToken(section.type) || 'section'}-copy`, sectionIds);
    return {
      ...section,
      id: duplicatedSectionId,
      title: duplicatedSectionTitle,
    } as SectionLike;
  });

  const nextBlocks = { ...sectionBlocks };
  duplicatedSections.forEach((section, index) => {
    const sourceSection = sourcePage.sections[index];
    nextBlocks[section.id] = (sectionBlocks[sourceSection.id] ?? []).map((block) => ({
      ...block,
      id: makeUniqueId(`${section.id}-${slugToken(block.type) || 'block'}`, blockIds),
      data: block.data ? { ...block.data } : block.data,
    }));
  });

  const duplicatedPage = {
    ...sourcePage,
    id: duplicatedPageId,
    title: sanitizeBuilderV2PageTitle(duplicatedPageTitle, 'Page Copy'),
    slug: duplicatedPageSlug,
    isHome: false,
    hidden: sourcePage.hidden,
    sections: duplicatedSections,
  } as TPage;

  const nextPages = [...pages];
  nextPages.splice(pageIndex + 1, 0, duplicatedPage);

  return {
    pages: nextPages as TPage[],
    sectionBlocks: nextBlocks,
    duplicatedPageId,
    duplicatedSectionIds: duplicatedSections.map((section) => section.id),
  };
};
