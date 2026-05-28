import { describe, expect, it } from 'vitest';

import {
  getBuilderV2BlockAddAllowance,
  toggleBuilderV2CollapsedBlockState,
} from './builderV2BlockEditorState';

const BLOCK_LABELS = {
  title: 'Title',
  text: 'Text Block',
  qna: 'Q&A',
  photo: 'Photo',
  story: 'Story Paragraph',
  timelineItem: 'Timeline Item',
  event: 'Event Item',
  travelTip: 'Travel Tip',
  hotelCard: 'Hotel Card',
  registryItem: 'Registry Item',
  fundHighlight: 'Fund Highlight',
  rsvpNote: 'RSVP Note',
  faqItem: 'FAQ Item',
  divider: 'Divider',
} as const;

describe('builderV2BlockEditorState', () => {
  it('blocks new additions when a section has reached its total block cap', () => {
    const blocks = Array.from({ length: 6 }, (_, index) => ({
      id: `hero-${index + 1}`,
      type: 'text' as const,
    }));

    expect(getBuilderV2BlockAddAllowance({
      sectionType: 'hero',
      blockType: 'photo',
      blocks,
      labels: BLOCK_LABELS,
    })).toEqual({
      ok: false,
      reason: 'Max 6 blocks for this section',
    });
  });

  it('blocks new additions when a per-type cap has already been reached', () => {
    const blocks = [
      { id: 'fund-1', type: 'fundHighlight' as const },
      { id: 'copy-1', type: 'text' as const },
    ];

    expect(getBuilderV2BlockAddAllowance({
      sectionType: 'registry',
      blockType: 'fundHighlight',
      blocks,
      labels: BLOCK_LABELS,
    })).toEqual({
      ok: false,
      reason: 'Max 1 Fund Highlight block(s)',
    });
  });

  it('allows additions when the section still has room for that block type', () => {
    const blocks = [
      { id: 'travel-1', type: 'travelTip' as const },
      { id: 'copy-1', type: 'text' as const },
    ];

    expect(getBuilderV2BlockAddAllowance({
      sectionType: 'travel',
      blockType: 'hotelCard',
      blocks,
      labels: BLOCK_LABELS,
    })).toEqual({
      ok: true,
      reason: '',
    });
  });

  it('toggles collapse state only for the targeted block id', () => {
    const initial = {
      hero: true,
      story: false,
    };

    expect(toggleBuilderV2CollapsedBlockState(initial, 'story')).toEqual({
      hero: true,
      story: true,
    });
    expect(toggleBuilderV2CollapsedBlockState(initial, 'travel')).toEqual({
      hero: true,
      story: false,
      travel: true,
    });
  });
});
