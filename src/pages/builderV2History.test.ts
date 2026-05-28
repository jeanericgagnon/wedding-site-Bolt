import { describe, expect, it } from 'vitest';

import {
  createBuilderV2HistorySnapshot,
  pushBuilderV2HistorySnapshot,
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
});
