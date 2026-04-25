import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlanningOverviewTab } from './PlanningOverviewTab';
import { buildNameChangePlan } from '../../../lib/nameChange/engine';
import { defaultNameChangeCaseInput } from './nameChangeService';

describe('PlanningOverviewTab', () => {
  it('shows a post-wedding name change tile that routes into the assistant lane', () => {
    const onTabChange = vi.fn();
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const plan = buildNameChangePlan({
      profile: {
        ...defaultNameChangeCaseInput,
        current_first_name: 'Taylor',
        current_last_name: 'Smith',
        target_last_name: 'Jordan',
        marriage_date: '2026-04-20',
      },
      documents: [],
      extractedFields: [],
    });

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

    const tile = screen.getByText('Post-wedding name change assistant');
    expect(tile).toBeTruthy();
    fireEvent.click(tile.closest('button') as HTMLButtonElement);
    expect(onTabChange).toHaveBeenCalledWith('nameChange');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/#name-change-roadmap');
    expect(screen.getByText('Start whenever you want, then come back whenever you need')).toBeTruthy();
    expect(screen.getByText('The roadmap is already there, even if you have not started checking steps off yet, so you can come back without rebuilding the plan.')).toBeTruthy();
    expect(screen.getByText('Roadmap saved')).toBeTruthy();
    expect(screen.getByText('See roadmap first')).toBeTruthy();
    expect(screen.getByText('Post-wedding')).toBeTruthy();
    expect(screen.getByText(/Optional next step: Skim the roadmap first/i)).toBeTruthy();
    expect(screen.getByText(/If you want a concrete place to pick back up,/i)).toBeTruthy();
    expect(screen.getByText(/reminder.*actionable now/i)).toBeTruthy();
    expect(screen.getByText(/blocked milestone/i)).toBeTruthy();
    expect(screen.getByText(/downstream categor/i)).toBeTruthy();
    expect(screen.getByText(/Concrete resume point:/i)).toBeTruthy();
    expect(screen.getByText(/Legal \+ government \+ Work \+ insurance/i)).toBeTruthy();
    expect(screen.getByText(/Certified legal proof is grounded and ready to reuse:/i)).toBeTruthy();
    expect(screen.getByText(/Social Security update is submitted and ready to verify:/i)).toBeTruthy();
    expect(screen.getByText(/Primary photo ID is ready to move after SSA:/i)).toBeTruthy();
    expect(screen.getByText(/Passport update is lined up from the live ID chain:/i)).toBeTruthy();
    expect(screen.getByText(/Payroll and HR can use the verified SSA identity:/i)).toBeTruthy();
    expect(screen.getByText(/Tax records are ready to align with SSA and payroll:/i)).toBeTruthy();
    expect(screen.getByText(/Downstream rollout is ready for the long-tail accounts:/i)).toBeTruthy();
  });
});
