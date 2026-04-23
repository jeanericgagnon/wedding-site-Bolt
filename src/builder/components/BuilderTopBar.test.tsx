import { describe, expect, it } from 'vitest';

import { getPublishBlockerUiState } from './BuilderTopBar';

describe('getPublishBlockerUiState', () => {
  it('treats unsaved changes as auto-saveable instead of a hard go-live blocker', () => {
    expect(
      getPublishBlockerUiState({
        publishValidationError: 'Save your latest draft changes before going live.',
        publishIssueKind: 'unsaved-changes',
      }),
    ).toEqual({
      hasHardPublishBlocker: false,
      effectivePublishValidationError: null,
      canAutoSaveBeforePublish: true,
    });
  });

  it('keeps real publish blockers blocking', () => {
    expect(
      getPublishBlockerUiState({
        publishValidationError: 'Add both names exactly how you want them shown before going live.',
        publishIssueKind: 'missing-couple-names',
      }),
    ).toEqual({
      hasHardPublishBlocker: true,
      effectivePublishValidationError: 'Add both names exactly how you want them shown before going live.',
      canAutoSaveBeforePublish: false,
    });
  });
});
