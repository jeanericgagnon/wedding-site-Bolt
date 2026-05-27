import { describe, expect, it } from 'vitest';
import { buildNameChangeOverviewCardModel } from './nameChangeOverviewCard';

describe('buildNameChangeOverviewCardModel', () => {
  it('keeps the assistant discoverable before a workspace exists', () => {
    const model = buildNameChangeOverviewCardModel({
      hasWorkspace: false,
      workflowStatus: null,
      hasExecutionActivity: false,
    });

    expect(model.headline).toBe('Start whenever you want, then come back whenever you need');
    expect(model.primaryLabel).toBe('Start case setup');
    expect(model.primaryHref).toBe('/dashboard/planning?tab=nameChange#case-setup');
    expect(model.secondaryLabel).toBe('See roadmap first');
    expect(model.secondaryHref).toBe('/dashboard/planning?tab=nameChange#name-change-roadmap');
    expect(model.statusLabel).toBe('Start free assistant');
    expect(model.focusTitle).toMatch(/Save the lane now/i);
    expect(model.bestNextMove).toMatch(/save the basics|roadmap hold the rest/i);
    expect(model.decisionRule).toMatch(/Early setup beats future reconstruction/i);
    expect(model.watchout).toMatch(/reconstruct names, addresses|first save happens early/i);
    expect(model.sequence).toHaveLength(3);
    expect(model.sequence[0]).toMatchObject({ status: 'current' });
    expect(model.sequence[1]).toMatchObject({ status: 'next' });
    expect(model.sequence[2]).toMatchObject({ status: 'then' });
    expect(model.tertiaryHref).toBe('/dashboard/planning?tab=nameChange#name-change-roadmap');
    expect(model.tertiaryLabel).toBe('Browse full assistant');
    expect(model.plannerHref).toBe('/dashboard/planning?tab=nameChange#name-change-roadmap');
    expect(model.plannerLabel).toBe('Open roadmap');
  });

  it('resumes into the status vault once execution activity exists', () => {
    const model = buildNameChangeOverviewCardModel({
      hasWorkspace: true,
      workflowStatus: 'in_progress',
      hasExecutionActivity: true,
    });

    expect(model.headline).toBe('Soft next steps, not a checklist you have to clear');
    expect(model.statusLabel).toBe('Resume where you left off');
    expect(model.focusTitle).toMatch(/proof, not from memory/i);
    expect(model.bestNextMove).toMatch(/status vault first|saved details actually changed/i);
    expect(model.decisionRule).toMatch(/pick back up from the saved proof trail/i);
    expect(model.watchout).toMatch(/reopen case setup|vault is the better starting point/i);
    expect(model.sequence[0].title).toMatch(/status vault/i);
    expect(model.primaryHref).toBe('/dashboard/planning?tab=nameChange#target-status-tracking');
    expect(model.secondaryHref).toBe('/dashboard/planning?tab=nameChange#name-change-roadmap');
    expect(model.secondaryLabel).toBe('Open full assistant');
    expect(model.tertiaryHref).toBe('/dashboard/planning?tab=nameChange#case-setup');
    expect(model.tertiaryLabel).toBe('Edit saved details');
    expect(model.plannerHref).toBe('/dashboard/planning?tab=nameChange#target-status-tracking');
    expect(model.plannerLabel).toBe('Open status vault');
  });

  it('softens the card after the workflow is complete', () => {
    const model = buildNameChangeOverviewCardModel({
      hasWorkspace: true,
      workflowStatus: 'complete',
      hasExecutionActivity: true,
    });

    expect(model.headline).toBe('Everything is saved. Reopen only when you need proof.');
    expect(model.primaryLabel).toBe('Review status vault');
    expect(model.statusLabel).toBe('Status vault complete');
    expect(model.focusTitle).toMatch(/proof storage/i);
    expect(model.bestNextMove).toMatch(/late account|document question/i);
    expect(model.decisionRule).toMatch(/only reopen for proof/i);
    expect(model.watchout).toMatch(/full restart|go quiet again/i);
    expect(model.sequence[2].detail).toMatch(/turning completion back into a project/i);
    expect(model.optionalNextStep).toContain('Nothing pushy here');
    expect(model.secondaryHref).toBe('/dashboard/planning?tab=nameChange#name-change-roadmap');
    expect(model.secondaryLabel).toBe('Open full assistant');
    expect(model.tertiaryHref).toBe('/dashboard/planning?tab=nameChange#case-setup');
    expect(model.tertiaryLabel).toBe('Edit saved details');
    expect(model.plannerHref).toBe('/dashboard/planning?tab=nameChange#target-status-tracking');
    expect(model.plannerLabel).toBe('Open status vault');
  });

  it('keeps the roadmap discoverable when a saved workspace has no execution yet', () => {
    const model = buildNameChangeOverviewCardModel({
      hasWorkspace: true,
      workflowStatus: 'ready',
      hasExecutionActivity: false,
    });

    expect(model.headline).toBe('Start whenever you want, then come back whenever you need');
    expect(model.statusLabel).toBe('Roadmap saved');
    expect(model.focusTitle).toMatch(/Use the roadmap to orient/i);
    expect(model.bestNextMove).toMatch(/Skim the roadmap first|tighten the saved details/i);
    expect(model.decisionRule).toMatch(/sequence clarity beats urgency/i);
    expect(model.watchout).toMatch(/saved roadmap with urgent work|background guilt/i);
    expect(model.sequence[0].title).toMatch(/roadmap/i);
    expect(model.primaryLabel).toBe('See roadmap first');
    expect(model.primaryHref).toBe('/dashboard/planning?tab=nameChange#name-change-roadmap');
    expect(model.tertiaryHref).toBe('/dashboard/planning?tab=nameChange#name-change-roadmap');
    expect(model.plannerHref).toBe('/dashboard/planning?tab=nameChange#name-change-roadmap');
    expect(model.plannerLabel).toBe('Open roadmap');
  });
});
