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
    expect(model.statusLabel).toBe('Start free assistant');
    expect(model.tertiaryHref).toBe('/dashboard/planning?tab=nameChange#name-change-roadmap');
    expect(model.tertiaryLabel).toBe('Browse full assistant');
    expect(model.plannerHref).toBe('/dashboard/planning?tab=nameChange');
    expect(model.plannerLabel).toBe('Open name change planner');
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
    expect(model.tertiaryLabel).toBe('Open full assistant');
    expect(model.plannerHref).toBe('/dashboard/planning?tab=nameChange');
  });

  it('softens the card after the workflow is complete', () => {
    const model = buildNameChangeOverviewCardModel({
      hasWorkspace: true,
      workflowStatus: 'complete',
      hasExecutionActivity: true,
    });

    expect(model.primaryLabel).toBe('Review status vault');
    expect(model.statusLabel).toBe('Status vault complete');
    expect(model.optionalNextStep).toContain('Nothing pushy here');
    expect(model.tertiaryHref).toBe('/dashboard/planning?tab=nameChange');
  });

  it('keeps the roadmap discoverable when a saved workspace has no execution yet', () => {
    const model = buildNameChangeOverviewCardModel({
      hasWorkspace: true,
      workflowStatus: 'ready',
      hasExecutionActivity: false,
    });

    expect(model.statusLabel).toBe('Roadmap saved');
    expect(model.primaryLabel).toBe('See roadmap first');
    expect(model.tertiaryHref).toBe('/dashboard/planning?tab=nameChange#name-change-roadmap');
  });
});
