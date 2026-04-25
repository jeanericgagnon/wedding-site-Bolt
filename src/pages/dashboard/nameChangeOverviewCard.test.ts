import { describe, expect, it } from 'vitest';
import { buildNameChangeOverviewCardModel } from './nameChangeOverviewCard';

describe('buildNameChangeOverviewCardModel', () => {
  it('keeps the assistant discoverable before a workspace exists', () => {
    const model = buildNameChangeOverviewCardModel({
      hasWorkspace: false,
      workflowStatus: null,
      hasExecutionActivity: false,
    });

    expect(model.primaryLabel).toBe('Start case setup');
    expect(model.primaryHref).toBe('/dashboard/planning?tab=nameChange#case-setup');
    expect(model.secondaryLabel).toBe('See roadmap first');
  });

  it('resumes into the status vault once execution activity exists', () => {
    const model = buildNameChangeOverviewCardModel({
      hasWorkspace: true,
      workflowStatus: 'in_progress',
      hasExecutionActivity: true,
    });

    expect(model.statusLabel).toBe('Resume where you left off');
    expect(model.primaryHref).toBe('/dashboard/planning?tab=nameChange#target-status-tracking');
    expect(model.secondaryHref).toBe('/dashboard/planning?tab=nameChange#case-setup');
  });

  it('softens the card after the workflow is complete', () => {
    const model = buildNameChangeOverviewCardModel({
      hasWorkspace: true,
      workflowStatus: 'complete',
      hasExecutionActivity: true,
    });

    expect(model.primaryLabel).toBe('Review status vault');
    expect(model.optionalNextStep).toContain('Nothing pushy here');
  });
});
