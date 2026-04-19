import { describe, expect, it } from 'vitest';

const shouldPersistQuickStartDraft = ({
  hasHydratedDraft,
  isResetting,
}: {
  hasHydratedDraft: boolean;
  isResetting: boolean;
}) => hasHydratedDraft && !isResetting;

describe('quickStart autosave gating', () => {
  it('does not persist before hydration finishes', () => {
    expect(shouldPersistQuickStartDraft({ hasHydratedDraft: false, isResetting: false })).toBe(false);
  });

  it('does not persist during a reset pass', () => {
    expect(shouldPersistQuickStartDraft({ hasHydratedDraft: true, isResetting: true })).toBe(false);
  });

  it('persists once hydration is complete and reset is not active', () => {
    expect(shouldPersistQuickStartDraft({ hasHydratedDraft: true, isResetting: false })).toBe(true);
  });
});
