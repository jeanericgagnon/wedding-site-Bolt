import { describe, expect, it } from 'vitest';

import { getBuilderPreviewReviewSummary } from './builderPreviewReviewSummary';

describe('getBuilderPreviewReviewSummary', () => {
  it('treats empty preview pages as structure work', () => {
    const summary = getBuilderPreviewReviewSummary({
      activePageTitle: 'Travel',
      sectionCount: 0,
      previewViewport: 'mobile',
      hasHardPublishBlocker: false,
      canAutoSaveBeforePublish: false,
      isDirty: false,
      isPublished: false,
    });

    expect(summary.badge).toBe('Preview is incomplete');
    expect(summary.primaryAction).toEqual({
      kind: 'switch-to-edit',
      label: 'Back to edit mode',
    });
  });

  it('keeps hard publish blockers pointed at repair work', () => {
    const summary = getBuilderPreviewReviewSummary({
      activePageTitle: 'Home',
      sectionCount: 4,
      previewViewport: 'desktop',
      hasHardPublishBlocker: true,
      canAutoSaveBeforePublish: false,
      isDirty: false,
      isPublished: false,
    });

    expect(summary.badge).toBe('Preview before launch');
    expect(summary.primaryAction).toEqual({
      kind: 'fix-blockers',
      label: 'Fix launch blockers',
    });
  });

  it('treats dirty preview drafts as save-first decisions', () => {
    const summary = getBuilderPreviewReviewSummary({
      activePageTitle: 'Story',
      sectionCount: 3,
      previewViewport: 'mobile',
      hasHardPublishBlocker: false,
      canAutoSaveBeforePublish: true,
      isDirty: true,
      isPublished: false,
    });

    expect(summary.badge).toBe('Preview from a moving draft');
    expect(summary.primaryAction).toEqual({
      kind: 'save-draft',
      label: 'Save this draft',
    });
  });

  it('pushes non-mobile preview into a mobile rehearsal pass', () => {
    const summary = getBuilderPreviewReviewSummary({
      activePageTitle: 'RSVP',
      sectionCount: 5,
      previewViewport: 'tablet',
      hasHardPublishBlocker: false,
      canAutoSaveBeforePublish: false,
      isDirty: false,
      isPublished: false,
    });

    expect(summary.badge).toBe('Desktop first pass');
    expect(summary.primaryAction).toEqual({
      kind: 'switch-viewport',
      label: 'Switch to mobile',
      viewport: 'mobile',
    });
  });

  it('treats clean mobile preview as publish-ready rehearsal', () => {
    const summary = getBuilderPreviewReviewSummary({
      activePageTitle: 'Home',
      sectionCount: 6,
      previewViewport: 'mobile',
      hasHardPublishBlocker: false,
      canAutoSaveBeforePublish: false,
      isDirty: false,
      isPublished: false,
    });

    expect(summary.badge).toBe('Final guest rehearsal');
    expect(summary.primaryAction).toEqual({
      kind: 'publish',
      label: 'Publish from preview',
    });
  });
});
