import { describe, expect, it } from 'vitest';

import { getPublishGuidance } from './builderPublishGuidance';

describe('getPublishGuidance', () => {
  it('guides unsaved publish blockers back to saving first', () => {
    expect(
      getPublishGuidance({
        kind: 'unsaved-changes',
        message: 'Save your latest draft changes before going live.',
      }),
    ).toEqual({
      notice: 'Save your latest draft changes, then try publish again.',
      error: 'Save your latest draft changes before going live.',
    });
  });

  it('keeps existing venue blocker guidance stable', () => {
    expect(
      getPublishGuidance({
        kind: 'missing-venue',
        message: 'Add at least one venue before going live.',
      }),
    ).toEqual({
      notice: 'Add at least one venue before going live.',
      error: 'Add at least one venue before going live.',
    });
  });
});
