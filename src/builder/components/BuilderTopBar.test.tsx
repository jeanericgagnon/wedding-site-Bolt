import { describe, expect, it } from 'vitest';

import { formatPublishedAt, formatSavedAt, getBuilderCommandCenterCopy, getPublishBlockerUiState } from './BuilderTopBar';

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

describe('builder top bar time formatting', () => {
  it('falls back cleanly for invalid persisted save timestamps', () => {
    expect(formatSavedAt('not-a-date')).toBe('Saved time unknown');
  });

  it('falls back cleanly for invalid persisted publish timestamps', () => {
    expect(formatPublishedAt('not-a-date')).toBe('Live since unknown time');
  });
});

describe('getBuilderCommandCenterCopy', () => {
  it('keeps hard publish blockers framed as blockers', () => {
    expect(
      getBuilderCommandCenterCopy({
        projectName: 'Alex & Sam',
        activePageTitle: 'Home',
        pageCount: 2,
        sectionCount: 6,
        isDirty: false,
        hasHardPublishBlocker: true,
        publishValidationError: 'Add both names exactly how you want them shown before going live.',
        canAutoSaveBeforePublish: false,
        isPublished: false,
        publishedVersion: null,
        publishAttemptedAt: null,
      }),
    ).toEqual({
      title: 'Alex & Sam',
      summary: '2 pages · 6 sections on this page',
      tone: 'warning',
      status: 'Go-live blocker',
      detail: 'Add both names exactly how you want them shown before going live.',
    });
  });

  it('treats clean published projects as live updates, not fresh launches', () => {
    expect(
      getBuilderCommandCenterCopy({
        projectName: 'Alex & Sam',
        activePageTitle: 'Story',
        pageCount: 3,
        sectionCount: 4,
        isDirty: false,
        hasHardPublishBlocker: false,
        publishValidationError: null,
        canAutoSaveBeforePublish: false,
        isPublished: true,
        publishedVersion: 7,
        publishAttemptedAt: null,
      }),
    ).toEqual({
      title: 'Alex & Sam',
      summary: '3 pages · 4 sections on this page',
      tone: 'success',
      status: 'Live v7',
      detail: 'Guests can already see this site. New edits here will become the next live update.',
    });
  });
});
