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
  pages: LabPage[];
  sectionBlocks: Record<string, TBlock[]>;
};

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
  pages,
  sectionBlocks,
}: BuilderV2HistorySnapshot<TBlock>): BuilderV2HistorySnapshot<TBlock> => ({
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
      pages: nextPages,
      sectionBlocks: nextSectionBlocks,
    }),
  ];

  return {
    history: nextHistory,
    historyIndex: nextHistory.length - 1,
  };
};
