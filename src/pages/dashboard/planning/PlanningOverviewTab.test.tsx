import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlanningOverviewTab } from './PlanningOverviewTab';
import { buildNameChangePlan } from '../../../lib/nameChange/engine';
import { defaultNameChangeCaseInput } from './nameChangeService';
import type { NameChangeCaseInput, NameChangePlan } from '../../../lib/nameChange/types';

function makeDraft(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    ...defaultNameChangeCaseInput,
    current_first_name: 'Taylor',
    current_last_name: 'Smith',
    target_last_name: 'Jordan',
    marriage_date: '2026-04-20',
    ...overrides,
  };
}

function makePlanWithExecutionActivity(draft: NameChangeCaseInput): NameChangePlan {
  const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
  const [firstStep, ...restSteps] = plan.steps;

  return {
    ...plan,
    steps: firstStep
      ? [{ ...firstStep, executionStatus: 'in_progress', executionUpdatedAt: new Date().toISOString() }, ...restSteps]
      : plan.steps,
    summary: {
      ...plan.summary,
      executionCounts: {
        todo: Math.max(plan.steps.length - 1, 0),
        in_progress: firstStep ? 1 : 0,
        complete: 0,
      },
    },
  };
}

describe('PlanningOverviewTab', () => {
  it('shows a post-wedding name change tile that routes into the assistant lane', () => {
    const onTabChange = vi.fn();
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const plan = buildNameChangePlan({ profile: makeDraft(), documents: [], extractedFields: [] });

    render(
      <PlanningOverviewTab
        tasks={[]}
        budgetItems={[]}
        vendors={[]}
        seatingReadiness={{ attending: 0, seated: 0, unassigned: 0 }}
        weddingDate="2026-04-20"
        nameChangePlan={plan}
        onTabChange={onTabChange}
      />,
    );

    const tile = screen.getByRole('button', { name: /Post-wedding name change assistant/i });
    expect(tile).toBeTruthy();
    fireEvent.click(tile);
    expect(onTabChange).toHaveBeenCalledWith('nameChange');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/#name-change-roadmap');
    expect(screen.getByText('Start whenever you want, then come back whenever you need')).toBeTruthy();
    expect(screen.getByText('The roadmap is already there, including the California-guided state lane, the federal identity chain, and the downstream account follow-through, so you can come back without rebuilding the plan.')).toBeTruthy();
    expect(screen.getByText('Roadmap saved')).toBeTruthy();
    expect(screen.getByText('See roadmap first')).toBeTruthy();
    expect(screen.getByText('Post-wedding')).toBeTruthy();
    expect(screen.getByText('Saved progress · document checklist')).toBeTruthy();
    expect(screen.getByText(/Optional next step: Skim the roadmap first/i)).toBeTruthy();
    expect(screen.getByText(/If you want a concrete place to pick back up,/i)).toBeTruthy();
    expect(screen.getByText('Milestones ready to confirm')).toBeTruthy();
    expect(screen.getByText('No open reminders')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Milestones ready to confirm' }));
    expect(onTabChange).toHaveBeenLastCalledWith('nameChange');
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/#name-change-roadmap');
    fireEvent.click(screen.getByRole('button', { name: 'No open reminders' }));
    expect(onTabChange).toHaveBeenLastCalledWith('nameChange');
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/#name-change-roadmap');
    expect(screen.getByText(/reminder.*actionable now/i)).toBeTruthy();
    expect(screen.getByText(/milestone.*waiting on details/i)).toBeTruthy();
    expect(screen.getByText(/place.*ready/i)).toBeTruthy();
    expect(screen.getByText(/Best place to pick back up:/i)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Certified legal proof is grounded and ready to reuse' })[0]);
    expect(onTabChange).toHaveBeenLastCalledWith('nameChange');
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/#name-change-roadmap');
    expect(screen.getByText(/Legal \+ government \+ Work \+ insurance/i)).toBeTruthy();
    expect(screen.getByText(/Certified legal proof is grounded and ready to reuse:/i)).toBeTruthy();
    expect(screen.getByText(/Social Security update is submitted and ready to verify:/i)).toBeTruthy();
    expect(screen.getByText(/Primary photo ID is ready to move after SSA:/i)).toBeTruthy();
    expect(screen.getByText(/Passport update is lined up from the live ID chain:/i)).toBeTruthy();
    expect(screen.getByText(/Payroll and HR can use the verified SSA identity:/i)).toBeTruthy();
    expect(screen.getByText(/Tax and government records are ready to align with SSA and legal proof:/i)).toBeTruthy();
    expect(screen.getByText(/Downstream rollout is ready for the long-tail accounts:/i)).toBeTruthy();
  });

  it('reopens the post-wedding tile into the status vault once execution has started', () => {
    const onTabChange = vi.fn();
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const plan = makePlanWithExecutionActivity(makeDraft());

    render(
      <PlanningOverviewTab
        tasks={[]}
        budgetItems={[]}
        vendors={[]}
        seatingReadiness={{ attending: 0, seated: 0, unassigned: 0 }}
        weddingDate="2026-04-20"
        nameChangePlan={plan}
        onTabChange={onTabChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Post-wedding name change assistant/i }));
    expect(onTabChange).toHaveBeenCalledWith('nameChange');
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/#target-status-tracking');

    fireEvent.click(screen.getAllByRole('button', { name: 'Certified legal proof is grounded and ready to reuse' })[0]);
    expect(onTabChange).toHaveBeenLastCalledWith('nameChange');
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/#target-status-tracking');
  });

  it('shows an undo action after generated starter suite changes are applied', () => {
    const onUndoStarterSuite = vi.fn().mockResolvedValue(undefined);
    const plan = buildNameChangePlan({ profile: makeDraft(), documents: [], extractedFields: [] });

    render(
      <PlanningOverviewTab
        tasks={[]}
        budgetItems={[]}
        vendors={[]}
        seatingReadiness={{ attending: 0, seated: 0, unassigned: 0 }}
        weddingDate="2026-06-20"
        nameChangePlan={plan}
        onTabChange={vi.fn()}
        lastStarterSuiteRun={{
          taskIds: ['task-1', 'task-2'],
          budgetItemIds: ['budget-1'],
          vendorIds: ['vendor-1'],
          createdAt: '2026-05-01T12:00:00.000Z',
        }}
        onUndoStarterSuite={onUndoStarterSuite}
      />,
    );

    expect(screen.getByText('Starter suite added')).toBeTruthy();
    expect(screen.getByText('2 tasks, 1 budget lines, and 1 vendors were created from your wedding details.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo starter suite' }));
    expect(onUndoStarterSuite).toHaveBeenCalledTimes(1);
  });
});
