import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlanningOverviewTab } from './PlanningOverviewTab';
import { buildNameChangePlan } from '../../../lib/nameChange/engine';
import { defaultNameChangeCaseInput } from './nameChangeService';

describe('PlanningOverviewTab', () => {
  it('shows a post-wedding name change tile that routes into the assistant lane', () => {
    const onTabChange = vi.fn();
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
    expect(screen.getByText(plan.summary.nextBestAction)).toBeTruthy();
  });
});
