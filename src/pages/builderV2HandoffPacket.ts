type SectionSnapshot = {
  id: string;
  title: string;
  enabled: boolean;
  blockCount: number;
  warningCount: number;
};

export type BuilderV2HandoffPacketEntry = {
  sectionId: string;
  sectionTitle: string;
  status: 'live' | 'hidden' | 'warning' | 'empty';
  summary: string;
};

export type BuilderV2HandoffPacket = {
  headline: string;
  detail: string;
  visibleTitles: string[];
  hiddenTitles: string[];
  entries: BuilderV2HandoffPacketEntry[];
  summaryText: string;
};

type Params = {
  sections: SectionSnapshot[];
};

export const buildBuilderV2HandoffPacket = ({
  sections,
}: Params): BuilderV2HandoffPacket => {
  const visibleTitles = sections.filter((section) => section.enabled).map((section) => section.title);
  const hiddenTitles = sections.filter((section) => !section.enabled).map((section) => section.title);

  const entries = sections.map<BuilderV2HandoffPacketEntry>((section) => {
    if (!section.enabled) {
      return {
        sectionId: section.id,
        sectionTitle: section.title,
        status: 'hidden',
        summary: `${section.blockCount} block${section.blockCount === 1 ? '' : 's'} parked outside preview`,
      };
    }

    if (section.blockCount === 0) {
      return {
        sectionId: section.id,
        sectionTitle: section.title,
        status: 'empty',
        summary: 'Visible but still missing its first content spine',
      };
    }

    if (section.warningCount > 0) {
      return {
        sectionId: section.id,
        sectionTitle: section.title,
        status: 'warning',
        summary: `${section.warningCount} warning${section.warningCount === 1 ? '' : 's'} across ${section.blockCount} block${section.blockCount === 1 ? '' : 's'}`,
      };
    }

    return {
      sectionId: section.id,
      sectionTitle: section.title,
      status: 'live',
      summary: `${section.blockCount} block${section.blockCount === 1 ? '' : 's'} in the live page flow`,
    };
  });

  const liveCount = entries.filter((entry) => entry.status === 'live').length;
  const warningCount = entries.filter((entry) => entry.status === 'warning').length;
  const emptyCount = entries.filter((entry) => entry.status === 'empty').length;

  let headline = 'Document packet is ready to review';
  let detail = 'Use the packet to sanity-check section order, hidden lanes, and any last visible warnings before handoff.';

  if (emptyCount > 0) {
    headline = `${emptyCount} visible section${emptyCount === 1 ? '' : 's'} still need structure before handoff`;
    detail = 'The packet can still help you review the draft, but the empty visible lanes should be fixed before you trust the export.';
  } else if (warningCount > 0) {
    headline = `${warningCount} visible section${warningCount === 1 ? '' : 's'} still need content cleanup`;
    detail = 'The page map is mostly there; use the packet to focus the last visible warning passes.';
  } else if (hiddenTitles.length > 0) {
    headline = `${liveCount} live section${liveCount === 1 ? '' : 's'} with ${hiddenTitles.length} parked lane${hiddenTitles.length === 1 ? '' : 's'}`;
    detail = 'The packet now shows both the live reading order and the hidden backlog so the handoff stays honest.';
  }

  const summaryLines = [
    'Builder V2 handoff packet',
    '',
    `Visible order: ${visibleTitles.length > 0 ? visibleTitles.join(' -> ') : 'none'}`,
    `Hidden lanes: ${hiddenTitles.length > 0 ? hiddenTitles.join(', ') : 'none'}`,
    '',
    'Section status:',
    ...entries.map((entry) => `- ${entry.sectionTitle} [${entry.status}] - ${entry.summary}`),
  ];

  return {
    headline,
    detail,
    visibleTitles,
    hiddenTitles,
    entries,
    summaryText: summaryLines.join('\n'),
  };
};
