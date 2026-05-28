import { describe, expect, it } from 'vitest';

import { getPublishGuidance } from './builderPublishGuidance';

describe('getPublishGuidance', () => {
  it('guides unsaved publish blockers back to saving first', () => {
    expect(
      getPublishGuidance({
        kind: 'unsaved-changes',
        message: 'Save your latest draft changes before sharing with guests.',
      }),
    ).toEqual({
      notice: 'Save your latest draft changes, then try publish again.',
      error: 'Save your latest draft changes before sharing with guests.',
    });
  });

  it('keeps existing venue blocker guidance stable', () => {
    expect(
      getPublishGuidance({
        kind: 'missing-venue',
        message: 'Add at least one venue before sharing with guests.',
      }),
    ).toEqual({
      notice: 'Add at least one venue before sharing with guests.',
      error: 'Add at least one venue before sharing with guests.',
    });
  });
});
