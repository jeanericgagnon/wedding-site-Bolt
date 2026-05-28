import { describe, expect, it } from 'vitest';

import { getPublishStateDescriptor } from './publishState';

describe('getPublishStateDescriptor', () => {
  it('keeps publishing copy framed as publishing for guests', () => {
    expect(getPublishStateDescriptor({
      isPublishing: true,
    })).toEqual({
      label: 'Publishing now',
      tone: 'warning',
      explainer: 'The system is publishing your latest site changes for guests right now.',
    });
  });

  it('keeps published draft drift framed as a shared-site state', () => {
    expect(getPublishStateDescriptor({
      isPublished: true,
      hasUnsavedChanges: true,
    })).toEqual({
      label: 'Shared site has older changes',
      tone: 'warning',
      explainer: 'Your guests still see the current shared version until you publish again.',
    });
  });

  it('keeps draft and current published states framed around sharing', () => {
    expect(getPublishStateDescriptor({
      isPublished: true,
      hasUnsavedChanges: false,
    })).toEqual({
      label: 'Shared and up to date',
      tone: 'success',
      explainer: 'Your latest saved version is already shared for guests.',
    });

    expect(getPublishStateDescriptor({
      isPublished: false,
    })).toEqual({
      label: 'Draft only',
      tone: 'neutral',
      explainer: 'The site stays draft-only until you share it with guests.',
    });
  });
});
