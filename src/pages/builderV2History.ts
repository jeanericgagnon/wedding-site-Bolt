import {
  normalizeBuilderV2Pages,
  type LabPage,
} from './builderV2PageState';

type HistoryBlock = {
  id: string;
  type: string;
  content: string;
  data?: Record<string, unknown>;
};

export type BuilderV2HistorySnapshot<TBlock extends HistoryBlock = HistoryBlock> = {
  id: string;
  label?: string;
  isCheckpoint?: boolean;
  createdAtISO: string;
  pages: LabPage[];
  sectionBlocks: Record<string, TBlock[]>;
};

type BuilderV2HistorySnapshotInput<TBlock extends HistoryBlock = HistoryBlock> = {
  id?: string;
  label?: string;
  isCheckpoint?: boolean;
  createdAtISO?: string;
  pages: LabPage[];
  sectionBlocks: Record<string, TBlock[]>;
};

export type BuilderV2CheckpointSummary = {
  id: string;
  label: string;
  historyIndex: number;
  createdAtISO: string;
  pageCount: number;
  sectionCount: number;
  status: 'current' | 'past' | 'ahead';
};

export type BuilderV2CheckpointRestoreTarget = {
  pageId: string;
  sectionId: string;
};

const makeSnapshotId = () => `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const makeSnapshotTimestamp = () => new Date().toISOString();

const cloneSectionBlocks = <TBlock extends HistoryBlock>(
  sectionBlocks: Record<string, TBlock[]>,
): Record<string, TBlock[]> => Object.fromEntries(
  Object.entries(sectionBlocks).map(([sectionId, blocks]) => [
    sectionId,
    blocks.map((block) => ({
      ...block,
      data: block.data ? { ...block.data } : undefined,
    })),
  ]),
);

export const createBuilderV2HistorySnapshot = <TBlock extends HistoryBlock>({
  id,
  label,
  isCheckpoint,
  createdAtISO,
  pages,
  sectionBlocks,
}: BuilderV2HistorySnapshotInput<TBlock>): BuilderV2HistorySnapshot<TBlock> => ({
  id: id || makeSnapshotId(),
  label,
  isCheckpoint: isCheckpoint === true,
  createdAtISO: createdAtISO || makeSnapshotTimestamp(),
  pages: normalizeBuilderV2Pages(pages),
  sectionBlocks: cloneSectionBlocks(sectionBlocks),
});

export const pushBuilderV2HistorySnapshot = <TBlock extends HistoryBlock>({
  history,
  historyIndex,
  nextPages,
  nextSectionBlocks,
}: {
  history: BuilderV2HistorySnapshot<TBlock>[];
  historyIndex: number;
  nextPages: LabPage[];
  nextSectionBlocks: Record<string, TBlock[]>;
}) => {
  const trimmed = history.slice(0, historyIndex + 1);
  const nextHistory = [
    ...trimmed,
    createBuilderV2HistorySnapshot({
      id: '',
      pages: nextPages,
      sectionBlocks: nextSectionBlocks,
    }),
  ];

  return {
    history: nextHistory,
    historyIndex: nextHistory.length - 1,
  };
};

export const createBuilderV2CheckpointSnapshot = <TBlock extends HistoryBlock>({
  pages,
  sectionBlocks,
  label,
}: {
  pages: LabPage[];
  sectionBlocks: Record<string, TBlock[]>;
  label: string;
}) => createBuilderV2HistorySnapshot({
  id: '',
  label,
  isCheckpoint: true,
  pages,
  sectionBlocks,
});

export const pushBuilderV2CheckpointSnapshot = <TBlock extends HistoryBlock>({
  history,
  historyIndex,
  pages,
  sectionBlocks,
  label,
}: {
  history: BuilderV2HistorySnapshot<TBlock>[];
  historyIndex: number;
  pages: LabPage[];
  sectionBlocks: Record<string, TBlock[]>;
  label: string;
}) => {
  const trimmed = history.slice(0, historyIndex + 1);
  const nextHistory = [
    ...trimmed,
    createBuilderV2CheckpointSnapshot({
      pages,
      sectionBlocks,
      label,
    }),
  ];

  return {
    history: nextHistory,
    historyIndex: nextHistory.length - 1,
  };
};

export const pushBuilderV2ChangeWithCheckpoint = <TBlock extends HistoryBlock>({
  history,
  historyIndex,
  currentPages,
  currentSectionBlocks,
  checkpointLabel,
  nextPages,
  nextSectionBlocks,
}: {
  history: BuilderV2HistorySnapshot<TBlock>[];
  historyIndex: number;
  currentPages: LabPage[];
  currentSectionBlocks: Record<string, TBlock[]>;
  checkpointLabel: string;
  nextPages: LabPage[];
  nextSectionBlocks: Record<string, TBlock[]>;
}) => {
  const checkpointState = pushBuilderV2CheckpointSnapshot({
    history,
    historyIndex,
    pages: currentPages,
    sectionBlocks: currentSectionBlocks,
    label: checkpointLabel,
  });
  const nextState = pushBuilderV2HistorySnapshot({
    history: checkpointState.history,
    historyIndex: checkpointState.historyIndex,
    nextPages,
    nextSectionBlocks,
  });

  return {
    history: nextState.history,
    historyIndex: nextState.historyIndex,
    checkpointId: checkpointState.history[checkpointState.historyIndex]?.id ?? '',
  };
};

export const listBuilderV2CheckpointSummaries = <TBlock extends HistoryBlock>(
  history: BuilderV2HistorySnapshot<TBlock>[],
  currentHistoryIndex?: number,
): BuilderV2CheckpointSummary[] => history
  .map((snapshot, historyIndex) => (
    snapshot.isCheckpoint
      ? {
          id: snapshot.id,
          label: snapshot.label?.trim() || `Checkpoint ${historyIndex + 1}`,
          historyIndex,
          createdAtISO: snapshot.createdAtISO,
          pageCount: snapshot.pages.length,
          sectionCount: snapshot.pages.reduce((count, page) => count + page.sections.length, 0),
          status: currentHistoryIndex === undefined
            ? 'past'
            : historyIndex === currentHistoryIndex
              ? 'current'
              : historyIndex < currentHistoryIndex
                ? 'past'
                : 'ahead',
        }
      : null
  ))
  .filter((summary): summary is BuilderV2CheckpointSummary => Boolean(summary))
  .reverse();

export const resolveBuilderV2CheckpointRestoreTarget = <TBlock extends HistoryBlock>({
  snapshot,
  preferredPageId,
  preferredSectionId,
}: {
  snapshot: BuilderV2HistorySnapshot<TBlock>;
  preferredPageId?: string | null;
  preferredSectionId?: string | null;
}): BuilderV2CheckpointRestoreTarget | null => {
  const pages = snapshot.pages;
  if (!pages.length) return null;

  const fallbackPage = pages[0] ?? null;
  const preferredPage = preferredPageId
    ? pages.find((page) => page.id === preferredPageId) ?? null
    : null;
  const page = preferredPage ?? fallbackPage;
  if (!page) return null;

  const fallbackSection = page.sections[0]?.id ?? '';
  const preferredSection = preferredSectionId
    ? page.sections.find((section) => section.id === preferredSectionId)?.id ?? ''
    : '';

  return {
    pageId: page.id,
    sectionId: preferredSection || fallbackSection,
  };
};
