import { describe, expect, it } from 'vitest';

import { getBuilderCommandCenterCopy } from './builderTopBarModel';

describe('getBuilderCommandCenterCopy', () => {
  it('keeps unsaved draft follow-up framed as review before sharing', () => {
    const copy = getBuilderCommandCenterCopy({
      projectName: 'Alex & Jordan',
      activePageTitle: 'Schedule',
      pageCount: 3,
      sectionCount: 4,
      isDirty: false,
      hasHardPublishBlocker: false,
      publishValidationError: 'Save your latest draft changes before sharing with guests.',
      canAutoSaveBeforePublish: true,
      isPublished: false,
      publishedVersion: null,
      publishAttemptedAt: null,
    });

    expect(copy.status).toBe('Finish this draft');
    expect(copy.detail).toBe('Save the latest edits, then review before sharing.');
    expect(copy.detail).not.toContain('go live');
  });

  it('keeps clean draft readiness framed as a final share review instead of go-live certainty', () => {
    const copy = getBuilderCommandCenterCopy({
      projectName: 'Alex & Jordan',
      activePageTitle: 'Travel',
      pageCount: 3,
      sectionCount: 2,
      isDirty: false,
      hasHardPublishBlocker: false,
      publishValidationError: null,
      canAutoSaveBeforePublish: false,
      isPublished: false,
      publishedVersion: null,
      publishAttemptedAt: null,
    });

    expect(copy.status).toBe('Ready for final share review');
    expect(copy.detail).toBe('Travel looks ready for one last guest-facing pass before sharing.');
    expect(copy.detail).not.toContain('publish');
  });

  it('keeps hard blockers labeled as launch blockers', () => {
    const copy = getBuilderCommandCenterCopy({
      projectName: 'Alex & Jordan',
      activePageTitle: 'Home',
      pageCount: 1,
      sectionCount: 0,
      isDirty: false,
      hasHardPublishBlocker: true,
      publishValidationError: 'Add both names exactly how you want them shown.',
      canAutoSaveBeforePublish: false,
      isPublished: false,
      publishedVersion: null,
      publishAttemptedAt: null,
    });

    expect(copy.status).toBe('Launch blocker');
    expect(copy.detail).toBe('Add both names exactly how you want them shown.');
  });

  it('keeps fallback launch-blocker detail framed around guest sharing', () => {
    const copy = getBuilderCommandCenterCopy({
      projectName: 'Alex & Jordan',
      activePageTitle: 'Home',
      pageCount: 1,
      sectionCount: 0,
      isDirty: false,
      hasHardPublishBlocker: true,
      publishValidationError: null,
      canAutoSaveBeforePublish: false,
      isPublished: false,
      publishedVersion: null,
      publishAttemptedAt: null,
    });

    expect(copy.detail).toBe('A few launch details still need attention before this is shared with guests.');
  });

  it('keeps published command-center status framed around a shared update', () => {
    const copy = getBuilderCommandCenterCopy({
      projectName: 'Alex & Jordan',
      activePageTitle: 'Home',
      pageCount: 3,
      sectionCount: 4,
      isDirty: false,
      hasHardPublishBlocker: false,
      publishValidationError: null,
      canAutoSaveBeforePublish: false,
      isPublished: true,
      publishedVersion: 4,
      publishAttemptedAt: null,
    });

    expect(copy.status).toBe('Shared v4');
    expect(copy.detail).toContain('next shared update');
  });
});
