type BlockData = Record<string, unknown> | undefined;

type BlockLike = {
  id: string;
  type: string;
  content: string;
  data?: BlockData;
};

export type BuilderV2StructureRepairResult<TBlock extends BlockLike = BlockLike> = {
  blocks: TBlock[];
  changedCount: number;
  summary: string;
};

const textValue = (value: unknown) => typeof value === 'string' ? value.trim() : '';

const blockSubtitle = (block: BlockLike) => textValue(block.data?.subtitle);

const withSubtitle = <TBlock extends BlockLike>(block: TBlock, subtitle: string): TBlock => ({
  ...block,
  data: {
    ...(block.data ?? {}),
    subtitle,
  },
});

const hasUrl = (block: BlockLike) => textValue(block.data?.url).length > 0;

const repairMenuStructure = <TBlock extends BlockLike>(blocks: TBlock[]): BuilderV2StructureRepairResult<TBlock> => {
  const titleBlocks = blocks.filter((block) => block.type === 'title');
  if (!titleBlocks.length) {
    return { blocks, changedCount: 0, summary: 'Menu structure needs at least one course heading before it can be re-keyed.' };
  }

  const oldToNew = new Map<string, string>();
  const titleKeyById = new Map<string, string>();
  titleBlocks.forEach((block, index) => {
    const nextKey = `course:course-${index + 1}`;
    titleKeyById.set(block.id, nextKey);
    const oldKey = blockSubtitle(block);
    if (oldKey) oldToNew.set(oldKey, nextKey);
  });

  let currentKey = '';
  let changedCount = 0;
  const nextBlocks = blocks.map((block) => {
    if (block.type === 'title') {
      currentKey = titleKeyById.get(block.id) ?? currentKey;
      if (blockSubtitle(block) === currentKey) return block;
      changedCount += 1;
      return withSubtitle(block, currentKey);
    }

    if (block.type === 'travelTip') {
      const existingKey = blockSubtitle(block);
      const targetKey = oldToNew.get(existingKey) || currentKey || titleKeyById.get(titleBlocks[0].id) || '';
      if (!targetKey || existingKey === targetKey) return block;
      changedCount += 1;
      return withSubtitle(block, targetKey);
    }

    return block;
  });

  return {
    blocks: nextBlocks,
    changedCount,
    summary: changedCount > 0
      ? `Re-keyed ${changedCount} menu block${changedCount === 1 ? '' : 's'} to consistent course groups.`
      : 'Menu structure already has consistent course keys.',
  };
};

const repairMusicStructure = <TBlock extends BlockLike>(blocks: TBlock[]): BuilderV2StructureRepairResult<TBlock> => {
  const playlistTitles = blocks.filter((block) => block.type === 'title');
  if (!playlistTitles.length) {
    return { blocks, changedCount: 0, summary: 'Music structure needs at least one playlist heading before it can be re-keyed.' };
  }

  const oldToNew = new Map<string, string>();
  const titleKeyById = new Map<string, string>();
  playlistTitles.forEach((block, index) => {
    const nextKey = `playlist:playlist-${index + 1}`;
    titleKeyById.set(block.id, nextKey);
    const oldKey = blockSubtitle(block);
    if (oldKey) oldToNew.set(oldKey, nextKey);
  });

  let currentPlaylistKey = '';
  let changedCount = 0;
  const firstPlaylistKey = titleKeyById.get(playlistTitles[0].id) ?? '';

  const nextBlocks = blocks.map((block) => {
    if (block.type === 'title') {
      currentPlaylistKey = titleKeyById.get(block.id) ?? currentPlaylistKey;
      if (blockSubtitle(block) === currentPlaylistKey) return block;
      changedCount += 1;
      return withSubtitle(block, currentPlaylistKey);
    }

    if (block.type === 'travelTip') {
      const existingKey = blockSubtitle(block);
      const existingPlaylistId = existingKey.includes(':') ? existingKey.slice(existingKey.lastIndexOf(':') + 1) : '';
      const mappedPlaylistKey = oldToNew.get(`playlist:${existingPlaylistId}`);
      const targetPlaylistKey = mappedPlaylistKey || currentPlaylistKey || firstPlaylistKey;
      if (!targetPlaylistKey) return block;

      const targetPlaylistId = targetPlaylistKey.slice('playlist:'.length);
      const targetPrefix = hasUrl(block) ? 'playlist-link:' : 'playlist-track:';
      const nextKey = `${targetPrefix}${targetPlaylistId}`;
      if (existingKey === nextKey) return block;
      changedCount += 1;
      return withSubtitle(block, nextKey);
    }

    return block;
  });

  return {
    blocks: nextBlocks,
    changedCount,
    summary: changedCount > 0
      ? `Re-keyed ${changedCount} music block${changedCount === 1 ? '' : 's'} to consistent playlist groups.`
      : 'Music structure already has consistent playlist keys.',
  };
};

const repairVideoStructure = <TBlock extends BlockLike>(blocks: TBlock[]): BuilderV2StructureRepairResult<TBlock> => {
  const photoBlocks = blocks.filter((block) => block.type === 'photo');
  if (!photoBlocks.length) {
    return { blocks, changedCount: 0, summary: 'Video structure needs at least one thumbnail block before it can pair links safely.' };
  }

  const oldToNew = new Map<string, string>();
  const photoKeyById = new Map<string, string>();
  photoBlocks.forEach((block, index) => {
    const nextKey = `video:video-${index + 1}`;
    photoKeyById.set(block.id, nextKey);
    const oldKey = blockSubtitle(block);
    if (oldKey) oldToNew.set(oldKey, nextKey);
  });

  let currentVideoKey = '';
  let changedCount = 0;
  const firstVideoKey = photoKeyById.get(photoBlocks[0].id) ?? '';

  const nextBlocks = blocks.map((block) => {
    if (block.type === 'photo') {
      currentVideoKey = photoKeyById.get(block.id) ?? currentVideoKey;
      if (blockSubtitle(block) === currentVideoKey) return block;
      changedCount += 1;
      return withSubtitle(block, currentVideoKey);
    }

    if (block.type === 'travelTip') {
      const existingKey = blockSubtitle(block);
      const targetKey = oldToNew.get(existingKey) || currentVideoKey || firstVideoKey;
      if (!targetKey || existingKey === targetKey) return block;
      changedCount += 1;
      return withSubtitle(block, targetKey);
    }

    return block;
  });

  return {
    blocks: nextBlocks,
    changedCount,
    summary: changedCount > 0
      ? `Re-keyed ${changedCount} video block${changedCount === 1 ? '' : 's'} to consistent thumbnail/link pairs.`
      : 'Video structure already has consistent pairing keys.',
  };
};

const repairWeddingPartyStructure = <TBlock extends BlockLike>(blocks: TBlock[]): BuilderV2StructureRepairResult<TBlock> => {
  const partyTitles = blocks.filter((block) => block.type === 'title');
  const partyMembers = blocks.filter((block) => block.type === 'photo');
  if (!partyTitles.length && !partyMembers.length) {
    return { blocks, changedCount: 0, summary: 'Wedding party structure needs side headings or member cards before it can be repaired.' };
  }

  const titleAssignments = new Map<string, string>();
  const photoAssignments = new Map<string, string>();
  const orderedTitles = partyTitles.slice(0, 2);
  orderedTitles.forEach((block, index) => {
    titleAssignments.set(block.id, index === 0 ? 'bridal-title' : 'groom-title');
  });

  let currentPartyKey = '';
  let seenAssignedMember = false;
  let changedCount = 0;
  const normalizedBlocks = blocks.map((block) => {
    if (block.type === 'title') {
      const assignedTitle = titleAssignments.get(block.id);
      if (assignedTitle === 'bridal-title') currentPartyKey = 'bridal-party';
      if (assignedTitle === 'groom-title') currentPartyKey = 'groom-party';
      if (!assignedTitle || blockSubtitle(block) === assignedTitle) return block;
      changedCount += 1;
      return withSubtitle(block, assignedTitle);
    }

    if (block.type === 'photo') {
      const existingKey = blockSubtitle(block);
      if (existingKey === 'bridal-party' || existingKey === 'groom-party') {
        currentPartyKey = existingKey;
        seenAssignedMember = true;
        return block;
      }
      const targetKey = currentPartyKey || (seenAssignedMember ? 'groom-party' : 'bridal-party');
      seenAssignedMember = true;
      currentPartyKey = targetKey;
      photoAssignments.set(block.id, targetKey);
      if (existingKey !== targetKey) changedCount += 1;
      return block;
    }

    return block;
  });
  const nextBlocks = normalizedBlocks.map((block) => {
    if (block.type === 'photo') {
      const targetKey = photoAssignments.get(block.id);
      if (!targetKey || blockSubtitle(block) === targetKey) return block;
      return withSubtitle(block, targetKey);
    }
    return block;
  });

  return {
    blocks: nextBlocks,
    changedCount,
    summary: changedCount > 0
      ? `Re-keyed ${changedCount} wedding party block${changedCount === 1 ? '' : 's'} to consistent side groups.`
      : 'Wedding party structure already has consistent side keys.',
  };
};

export const canRepairBuilderV2SectionStructure = (sectionType: string) =>
  sectionType === 'menu' || sectionType === 'music' || sectionType === 'video' || sectionType === 'wedding-party';

export const repairBuilderV2SectionStructure = <TBlock extends BlockLike>(
  sectionType: string,
  blocks: TBlock[],
): BuilderV2StructureRepairResult<TBlock> => {
  if (sectionType === 'menu') return repairMenuStructure(blocks);
  if (sectionType === 'music') return repairMusicStructure(blocks);
  if (sectionType === 'video') return repairVideoStructure(blocks);
  if (sectionType === 'wedding-party') return repairWeddingPartyStructure(blocks);
  return { blocks, changedCount: 0, summary: 'This section type has no safe automatic structure repair yet.' };
};
