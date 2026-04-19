import { describe, expect, it } from 'vitest';

const shouldShowGuidedSetupHydrationError = ({ hasLocalDraft, serverFailed }: { hasLocalDraft: boolean; serverFailed: boolean }) => {
  return serverFailed && !hasLocalDraft;
};

describe('guidedSetup server hydration fallback', () => {
  it('does not surface a blocking hydration error when a local draft already exists', () => {
    expect(shouldShowGuidedSetupHydrationError({ hasLocalDraft: true, serverFailed: true })).toBe(false);
  });

  it('surfaces a soft hydration error when server preload fails and no local draft exists', () => {
    expect(shouldShowGuidedSetupHydrationError({ hasLocalDraft: false, serverFailed: true })).toBe(true);
  });
});
