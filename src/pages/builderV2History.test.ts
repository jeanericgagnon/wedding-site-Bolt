import { describe, expect, it } from 'vitest';

import {
  createBuilderV2CheckpointSnapshot,
  createBuilderV2HistorySnapshot,
  listBuilderV2CheckpointSummaries,
  pushBuilderV2ChangeWithCheckpoint,
  pushBuilderV2HistorySnapshot,
  pushBuilderV2CheckpointSnapshot,
} from './builderV2History';

describe('builderV2History', () => {
  it('creates normalized snapshots without leaking mutable references', () => {
    const inputPages = [{
      id: 'page-1',
      title: 'Home',
      slug: 'home',
      isHome: true,
      hidden: false,
      sections: [{
        id: 'story',
        type: 'story',
        title: 'Story',
        subtitle: '',
        variant: 'default',
        enabled: true,
        density: 'comfortable' as const,
      }],
    }];
    const inputBlocks = {
      story: [
        { id: 'block-1', type: 'text', content: 'Story', data: { text: 'Original' } },
      ],
    };

    const snapshot = createBuilderV2HistorySnapshot({
      pages: inputPages,
      sectionBlocks: inputBlocks,
    });

    inputPages[0]!.title = 'Changed';
    inputBlocks.story[0]!.data!.text = 'Mutated';

    expect(snapshot.pages[0]?.title).toBe('Home');
    expect(snapshot.sectionBlocks.story?.[0]?.data?.text).toBe('Original');
  });

  it('pushes a new snapshot and trims stale redo history', () => {
    const base = createBuilderV2HistorySnapshot({
      pages: [{
        id: 'page-1',
        title: 'Home',
        slug: 'home',
        isHome: true,
        hidden: false,
        sections: [],
      }],
      sectionBlocks: {},
    });
    const abandonedRedo = createBuilderV2HistorySnapshot({
      pages: [{
        id: 'page-2',
        title: 'Weekend',
        slug: 'weekend',
        isHome: false,
        hidden: false,
        sections: [],
      }],
      sectionBlocks: {},
    });

    const result = pushBuilderV2HistorySnapshot({
      history: [base, abandonedRedo],
      historyIndex: 0,
      nextPages: [{
        id: 'page-3',
        title: 'Travel',
        slug: 'travel',
        isHome: false,
        hidden: false,
        sections: [],
      }],
      nextSectionBlocks: {
        travel: [{ id: 'travel-1', type: 'text', content: 'Travel', data: { text: 'Bring a jacket' } }],
      },
    });

    expect(result.historyIndex).toBe(1);
    expect(result.history).toHaveLength(2);
    expect(result.history[1]?.pages[0]?.title).toBe('Travel');
    expect(result.history[1]?.sectionBlocks.travel?.[0]?.data?.text).toBe('Bring a jacket');
  });

  it('creates named checkpoint snapshots and lists them newest first', () => {
    const base = createBuilderV2HistorySnapshot({
      id: '',
      pages: [{
        id: 'page-1',
        title: 'Home',
        slug: 'home',
        isHome: true,
        hidden: false,
        sections: [],
      }],
      sectionBlocks: {},
    });

    const result = pushBuilderV2CheckpointSnapshot({
      history: [base],
      historyIndex: 0,
      pages: base.pages,
      sectionBlocks: base.sectionBlocks,
      label: 'Before cleanup',
    });

    expect(result.history[1]).toMatchObject({
      label: 'Before cleanup',
      isCheckpoint: true,
    });

    expect(listBuilderV2CheckpointSummaries(result.history, 1)).toEqual([
      expect.objectContaining({
        label: 'Before cleanup',
        historyIndex: 1,
        status: 'current',
        pageCount: 1,
        sectionCount: 0,
      }),
    ]);
  });

  it('clones checkpoint snapshots without leaking later mutations', () => {
    const pages = [{
      id: 'page-1',
      title: 'Home',
      slug: 'home',
      isHome: true,
      hidden: false,
      sections: [],
    }];
    const sectionBlocks = {
      hero: [{ id: 'hero-1', type: 'text', content: 'Hero', data: { text: 'Original' } }],
    };

    const snapshot = createBuilderV2CheckpointSnapshot({
      pages,
      sectionBlocks,
      label: 'Before restore',
    });

    pages[0]!.title = 'Changed';
    sectionBlocks.hero[0]!.data!.text = 'Mutated';

    expect(snapshot.label).toBe('Before restore');
    expect(snapshot.pages[0]?.title).toBe('Home');
    expect(snapshot.sectionBlocks.hero?.[0]?.data?.text).toBe('Original');
  });

  it('can append a checkpoint and the next change together for risky edits', () => {
    const base = createBuilderV2HistorySnapshot({
      pages: [{
        id: 'page-1',
        title: 'Home',
        slug: 'home',
        isHome: true,
        hidden: false,
        sections: [],
      }],
      sectionBlocks: {
        home: [{ id: 'block-1', type: 'text', content: 'Home', data: { text: 'Before' } }],
      },
    });

    const result = pushBuilderV2ChangeWithCheckpoint({
      history: [base],
      historyIndex: 0,
      currentPages: base.pages,
      currentSectionBlocks: base.sectionBlocks,
      checkpointLabel: 'Before risky cleanup',
      nextPages: [{
        id: 'page-1',
        title: 'Home',
        slug: 'home',
        isHome: true,
        hidden: false,
        sections: [],
      }],
      nextSectionBlocks: {
        home: [{ id: 'block-1', type: 'text', content: 'Home', data: { text: 'After' } }],
      },
    });

    expect(result.history).toHaveLength(3);
    expect(result.history[1]).toMatchObject({
      label: 'Before risky cleanup',
      isCheckpoint: true,
    });
    expect(result.history[2]?.sectionBlocks.home?.[0]?.data?.text).toBe('After');
    expect(result.checkpointId).toBe(result.history[1]?.id);
    expect(result.historyIndex).toBe(2);
  });
});
