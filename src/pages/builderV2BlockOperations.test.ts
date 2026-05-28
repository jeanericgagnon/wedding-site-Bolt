import { describe, expect, it } from 'vitest';

import {
  duplicateBuilderV2Block,
  moveBuilderV2Block,
  removeBuilderV2Block,
} from './builderV2BlockOperations';

type TestBlock = {
  id: string;
  type: 'text' | 'photo';
  content: string;
  data?: Record<string, unknown>;
};

const makeBlocks = (): TestBlock[] => [
  { id: 'intro', type: 'text', content: 'Hello', data: { text: 'Hello there' } },
  { id: 'photo', type: 'photo', content: 'Photo', data: { imageUrl: 'https://example.com/photo.jpg', caption: 'Weekend' } },
  { id: 'details', type: 'text', content: 'Details', data: { text: 'More details' } },
];

describe('builderV2BlockOperations', () => {
  it('removes a block when the id exists', () => {
    const blocks = makeBlocks();
    const result = removeBuilderV2Block({
      blocks,
      blockId: 'photo',
    });

    expect(result.map((block) => block.id)).toEqual(['intro', 'details']);
  });

  it('returns the original blocks when removal target is missing', () => {
    const blocks = makeBlocks();
    const result = removeBuilderV2Block({
      blocks,
      blockId: 'missing',
    });

    expect(result).toBe(blocks);
  });

  it('duplicates a block after the source and clones its data payload', () => {
    const blocks = makeBlocks();
    const result = duplicateBuilderV2Block({
      blocks,
      blockId: 'photo',
      canAdd: () => ({ ok: true, reason: '' }),
    });

    expect(result.duplicatedBlockId).toBeTruthy();
    expect(result.blockedReason).toBeNull();
    expect(result.blocks).toHaveLength(4);
    expect(result.blocks.map((block) => block.id)).toEqual(['intro', 'photo', result.duplicatedBlockId!, 'details']);
    expect(result.blocks[2]).toMatchObject({
      type: 'photo',
      content: 'Photo',
      data: { imageUrl: 'https://example.com/photo.jpg', caption: 'Weekend' },
    });
    expect(result.blocks[2]?.data).not.toBe(blocks[1]?.data);
  });

  it('does not duplicate a block when the section limit blocks it', () => {
    const blocks = makeBlocks();
    const result = duplicateBuilderV2Block({
      blocks,
      blockId: 'photo',
      canAdd: () => ({ ok: false, reason: 'Max 1 Photo block(s)' }),
    });

    expect(result.blocks).toBe(blocks);
    expect(result.duplicatedBlockId).toBeNull();
    expect(result.blockedReason).toBe('Max 1 Photo block(s)');
  });

  it('moves a block up or down when the target index is valid', () => {
    const blocks = makeBlocks();
    const movedDown = moveBuilderV2Block({
      blocks,
      blockId: 'intro',
      direction: 1,
    });
    const movedUp = moveBuilderV2Block({
      blocks,
      blockId: 'details',
      direction: -1,
    });

    expect(movedDown.map((block) => block.id)).toEqual(['photo', 'intro', 'details']);
    expect(movedUp.map((block) => block.id)).toEqual(['intro', 'details', 'photo']);
  });

  it('returns the original blocks when a move would go out of bounds', () => {
    const blocks = makeBlocks();
    const result = moveBuilderV2Block({
      blocks,
      blockId: 'intro',
      direction: -1,
    });

    expect(result).toBe(blocks);
  });
});
