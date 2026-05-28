type BlockLike<TType extends string = string, TData extends Record<string, unknown> | undefined = Record<string, unknown> | undefined> = {
  id: string;
  type: TType;
  content: string;
  data?: TData;
};

type AddBlockAllowance = {
  ok: boolean;
  reason: string;
};

type Direction = -1 | 1;

const makeBlockId = () => `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const removeBuilderV2Block = <TBlock extends BlockLike>({
  blocks,
  blockId,
}: {
  blocks: TBlock[];
  blockId: string;
}): TBlock[] => {
  const nextBlocks = blocks.filter((block) => block.id !== blockId);
  return nextBlocks.length === blocks.length ? blocks : nextBlocks;
};

export const duplicateBuilderV2Block = <TBlock extends BlockLike>({
  blocks,
  blockId,
  canAdd,
}: {
  blocks: TBlock[];
  blockId: string;
  canAdd: (blockType: TBlock['type']) => AddBlockAllowance;
}): { blocks: TBlock[]; duplicatedBlockId: string | null; blockedReason: string | null } => {
  const blockIndex = blocks.findIndex((block) => block.id === blockId);
  if (blockIndex < 0) {
    return { blocks, duplicatedBlockId: null, blockedReason: null };
  }

  const sourceBlock = blocks[blockIndex];
  const allowed = canAdd(sourceBlock.type);
  if (!allowed.ok) {
    return { blocks, duplicatedBlockId: null, blockedReason: allowed.reason };
  }

  const duplicatedBlock = {
    ...sourceBlock,
    id: makeBlockId(),
    data: sourceBlock.data ? { ...sourceBlock.data } : sourceBlock.data,
  } as TBlock;

  const nextBlocks = [...blocks];
  nextBlocks.splice(blockIndex + 1, 0, duplicatedBlock);

  return {
    blocks: nextBlocks,
    duplicatedBlockId: duplicatedBlock.id,
    blockedReason: null,
  };
};

export const moveBuilderV2Block = <TBlock extends BlockLike>({
  blocks,
  blockId,
  direction,
}: {
  blocks: TBlock[];
  blockId: string;
  direction: Direction;
}): TBlock[] => {
  const blockIndex = blocks.findIndex((block) => block.id === blockId);
  const nextIndex = blockIndex + direction;
  if (blockIndex < 0 || nextIndex < 0 || nextIndex >= blocks.length) {
    return blocks;
  }

  const nextBlocks = [...blocks];
  const [movedBlock] = nextBlocks.splice(blockIndex, 1);
  nextBlocks.splice(nextIndex, 0, movedBlock);
  return nextBlocks;
};
