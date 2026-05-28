import {
  getBuilderV2HiddenSectionTitles,
  getBuilderV2VisibleSectionTitles,
  type BuilderV2ReviewPageSnapshot,
} from './builderV2DocumentReviewState';

export type BuilderV2HandoffPacketEntry = {
  pageId: string;
  pageTitle: string;
  sectionId: string;
  sectionTitle: string;
  status: 'visible' | 'hidden' | 'warning' | 'empty';
  summary: string;
};

export type BuilderV2HandoffPacket = {
  headline: string;
  detail: string;
  visibleTitles: string[];
  hiddenTitles: string[];
  pageSummaries: string[];
  entries: BuilderV2HandoffPacketEntry[];
  summaryText: string;
};

type Params = {
  pages: BuilderV2ReviewPageSnapshot[];
};

export const buildBuilderV2HandoffPacket = ({
  pages,
}: Params): BuilderV2HandoffPacket => {
  const visibleTitles = getBuilderV2VisibleSectionTitles(pages);
  const hiddenTitles = getBuilderV2HiddenSectionTitles(pages);
  const pageSummaries = pages.map((page) => {
    const visibleCount = page.hidden ? 0 : page.sections.filter((section) => section.enabled).length;
    const hiddenCount = page.hidden
      ? page.sections.length
      : page.sections.filter((section) => !section.enabled).length;
    const tone = page.hidden
      ? 'hidden page'
      : `${visibleCount} visible · ${hiddenCount} hidden`;
    return `${page.title} (${tone})`;
  });

  const entries = pages.flatMap((page) => page.sections.map<BuilderV2HandoffPacketEntry>((section) => {
    if (page.hidden || !section.enabled) {
      return {
        pageId: page.id,
        pageTitle: page.title,
        sectionId: section.id,
        sectionTitle: section.title,
        status: 'hidden',
        summary: `${section.blockCount} block${section.blockCount === 1 ? '' : 's'} parked outside preview on ${page.title}`,
      };
    }

    if (section.blockCount === 0) {
      return {
        pageId: page.id,
        pageTitle: page.title,
        sectionId: section.id,
        sectionTitle: section.title,
        status: 'empty',
        summary: `${page.title} still shows this lane without its first content spine`,
      };
    }

    if (section.warningCount > 0) {
      return {
        pageId: page.id,
        pageTitle: page.title,
        sectionId: section.id,
        sectionTitle: section.title,
        status: 'warning',
        summary: `${section.warningCount} warning${section.warningCount === 1 ? '' : 's'} across ${section.blockCount} block${section.blockCount === 1 ? '' : 's'} on ${page.title}`,
      };
    }

    return {
      pageId: page.id,
      pageTitle: page.title,
      sectionId: section.id,
      sectionTitle: section.title,
      status: 'visible',
      summary: `${section.blockCount} block${section.blockCount === 1 ? '' : 's'} in the visible flow on ${page.title}`,
    };
  }));

  const visibleCount = entries.filter((entry) => entry.status === 'visible').length;
  const warningCount = entries.filter((entry) => entry.status === 'warning').length;
  const emptyCount = entries.filter((entry) => entry.status === 'empty').length;
  const hiddenPageCount = pages.filter((page) => page.hidden).length;

  let headline = 'Document packet is ready to review';
  let detail = 'Use the packet to sanity-check page order, hidden backlog, and any last visible warnings before handoff.';

  if (emptyCount > 0) {
    headline = `${emptyCount} visible section${emptyCount === 1 ? '' : 's'} still need structure before handoff`;
    detail = 'The packet can still help you review the draft, but the empty visible lanes should be fixed before you trust the export.';
  } else if (warningCount > 0) {
    headline = `${warningCount} visible section${warningCount === 1 ? '' : 's'} still need content cleanup`;
    detail = 'The page map is mostly there; use the packet to focus the last visible warning passes.';
  } else if (hiddenPageCount > 0 || hiddenTitles.length > 0) {
    headline = `${visibleCount} visible section${visibleCount === 1 ? '' : 's'} with ${hiddenPageCount > 0 ? `${hiddenPageCount} hidden page${hiddenPageCount === 1 ? '' : 's'}` : `${hiddenTitles.length} parked lane${hiddenTitles.length === 1 ? '' : 's'}`}`;
    detail = 'The packet now shows both the visible page flow and the parked backlog so the handoff stays honest across pages.';
  }

  const summaryLines = [
    'Builder V2 handoff packet',
    '',
    `Pages: ${pageSummaries.length > 0 ? pageSummaries.join(' | ') : 'none'}`,
    `Visible order: ${visibleTitles.length > 0 ? visibleTitles.join(' -> ') : 'none'}`,
    `Hidden lanes: ${hiddenTitles.length > 0 ? hiddenTitles.join(', ') : 'none'}`,
    '',
    'Section status:',
    ...entries.map((entry) => `- ${entry.pageTitle} / ${entry.sectionTitle} [${entry.status}] - ${entry.summary}`),
  ];

  return {
    headline,
    detail,
    visibleTitles,
    hiddenTitles,
    pageSummaries,
    entries,
    summaryText: summaryLines.join('\n'),
  };
};
