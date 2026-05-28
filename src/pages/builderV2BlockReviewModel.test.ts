import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2BlockReviewSummary,
  filterBuilderV2Blocks,
} from './builderV2BlockReviewModel';
import { removeBuilderV2Block } from './builderV2BlockOperations';

const labels = {
  title: 'Title',
  text: 'Text Block',
  photo: 'Photo',
  faqItem: 'FAQ Item',
};

const blocks = [
  { id: '1', type: 'title', content: 'Title' },
  { id: '2', type: 'photo', content: 'Photo' },
  { id: '3', type: 'faqItem', content: 'FAQ' },
];

const getWarning = (block: { id: string; type: string }) => {
  if (block.id === '2') return 'Image URL is recommended';
  return '';
};

describe('builderV2BlockReviewModel', () => {
  it('filters blocks by status and search query', () => {
    expect(
      filterBuilderV2Blocks({
        blocks,
        query: '',
        statusFilter: 'warnings',
        blockLabels: labels,
        getWarning,
      }).map((block) => block.id),
    ).toEqual(['2']);

    expect(
      filterBuilderV2Blocks({
        blocks,
        query: 'faq',
        statusFilter: 'all',
        blockLabels: labels,
        getWarning,
      }).map((block) => block.id),
    ).toEqual(['3']);
  });

  it('builds an empty state when the section has no blocks', () => {
    const summary = buildBuilderV2BlockReviewSummary({
      blocks: [],
      query: '',
      statusFilter: 'all',
      blockLabels: labels,
      getWarning,
    });

    expect(summary.headline).toContain('No blocks to review');
    expect(summary.bestNextMove).toContain('Add the first structural block');
  });

  it('builds a warning-focused summary when warning blocks are visible', () => {
    const summary = buildBuilderV2BlockReviewSummary({
      blocks,
      query: '',
      statusFilter: 'warnings',
      blockLabels: labels,
      getWarning,
    });

    expect(summary.headline).toContain('Warning blocks');
    expect(summary.warningVisibleCount).toBe(1);
    expect(summary.visibleBlocks.map((block) => block.id)).toEqual(['2']);
  });

  it('builds a no-match summary when filters hide every block', () => {
    const summary = buildBuilderV2BlockReviewSummary({
      blocks,
      query: 'hotel',
      statusFilter: 'all',
      blockLabels: labels,
      getWarning,
    });

    expect(summary.visibleCount).toBe(0);
    expect(summary.headline).toContain('No blocks match');
  });

  it('builds a full-lane summary when all blocks are visible and healthy', () => {
    const summary = buildBuilderV2BlockReviewSummary({
      blocks: [{ id: '1', type: 'title' }, { id: '3', type: 'faqItem' }],
      query: '',
      statusFilter: 'all',
      blockLabels: labels,
      getWarning: () => '',
    });

    expect(summary.headline).toContain('Full block lane');
    expect(summary.visibleCount).toBe(2);
  });

  it('drops removed warning blocks from the review lane immediately', () => {
    const nextBlocks = removeBuilderV2Block({
      blocks,
      blockId: '2',
    });

    const summary = buildBuilderV2BlockReviewSummary({
      blocks: nextBlocks,
      query: '',
      statusFilter: 'all',
      blockLabels: labels,
      getWarning,
    });

    expect(summary.visibleBlocks.map((block) => block.id)).toEqual(['1', '3']);
    expect(summary.warningVisibleCount).toBe(0);
    expect(summary.headline).toContain('Full block lane');
  });
});
