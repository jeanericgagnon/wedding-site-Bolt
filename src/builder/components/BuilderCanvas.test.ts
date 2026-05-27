import { describe, expect, it } from 'vitest';
import { getBuilderCanvasEmptyState } from './builderCanvasEmptyState';

describe('getBuilderCanvasEmptyState', () => {
  it('keeps edit-mode empty pages framed as buildable', () => {
    expect(getBuilderCanvasEmptyState('Travel', false)).toEqual({
      title: 'Travel is ready for its first section',
      detail: 'Start with a hero or another anchor section so this page has something real to shape.',
    });
  });

  it('keeps preview-mode empty pages framed as not ready to share', () => {
    expect(getBuilderCanvasEmptyState('FAQ', true)).toEqual({
      title: 'FAQ has no sections yet',
      detail: 'Exit preview and add a first section before sharing this page.',
    });
  });
});
