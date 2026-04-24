import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NameChangePlannerTab } from './NameChangePlannerTab';
import { defaultNameChangeCaseInput } from './nameChangeService';
import { buildNameChangePlan } from '../../../lib/nameChange/engine';
import type { NameChangeCaseInput } from '../../../lib/nameChange/types';

function makeDraft(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    ...defaultNameChangeCaseInput,
    current_first_name: 'Taylor',
    current_middle_name: 'Marie',
    current_last_name: 'Smith',
    target_first_name: 'Taylor',
    target_middle_name: 'Quinn',
    target_last_name: 'Jordan',
    county_residence: 'San Diego',
    marriage_date: '2026-04-20',
    structured_intake: {
      ...defaultNameChangeCaseInput.structured_intake,
      spouseLastName: 'Jordan',
    },
    ...overrides,
  };
}

describe('NameChangePlannerTab', () => {
  it('renders current and target middle-name case setup inputs and routes edits through draft updates', () => {
    const draft = makeDraft();
    const onDraftChange = vi.fn();

    render(
      <NameChangePlannerTab
        draft={draft}
        documents={[]}
        extractedFields={[]}
        plan={buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] })}
        reminders={[]}
        saving={false}
        onDraftChange={onDraftChange}
        onStructuredIntakeChange={vi.fn()}
        onDocumentsChange={vi.fn()}
        onExtractedFieldsChange={vi.fn()}
        onRemindersChange={vi.fn()}
        onStepExecutionStatusChange={vi.fn()}
        onStepExecutionNoteChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const currentMiddleNameInput = screen.getByLabelText('Current middle name') as HTMLInputElement;
    const targetMiddleNameInput = screen.getByLabelText('Target middle name') as HTMLInputElement;

    expect(currentMiddleNameInput.value).toBe('Marie');
    expect(targetMiddleNameInput.value).toBe('Quinn');

    fireEvent.change(currentMiddleNameInput, { target: { value: 'Rae' } });
    fireEvent.change(targetMiddleNameInput, { target: { value: 'Lane' } });

    expect(onDraftChange).toHaveBeenCalledWith({ current_middle_name: 'Rae' });
    expect(onDraftChange).toHaveBeenCalledWith({ target_middle_name: 'Lane' });
    expect(document.getElementById('case-setup')).not.toBeNull();
  });

  it('lets persisted reminder routing jump straight to the linked planner target', () => {
    const draft = makeDraft();
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    try {
      render(
        <NameChangePlannerTab
          draft={draft}
          documents={[]}
          extractedFields={[]}
          plan={buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] })}
          reminders={[
            {
              reminder_key: 'reminder-case-legal-name-setup',
              label: 'Finish case legal-name setup before downstream filing',
              reason: 'Case setup is still missing target middle name.',
              depends_on_step_id: 'eligibility-proof',
              suggested_offset_days: 0,
              urgency: 'high',
              status: 'pending',
              section_key: 'cleanup',
              planner_intent: 'open_execution_card',
              focus_target_id: 'case-setup',
            },
          ]}
          saving={false}
          onDraftChange={vi.fn()}
          onStructuredIntakeChange={vi.fn()}
          onDocumentsChange={vi.fn()}
          onExtractedFieldsChange={vi.fn()}
          onRemindersChange={vi.fn()}
          onStepExecutionStatusChange={vi.fn()}
          onStepExecutionNoteChange={vi.fn()}
          onSave={vi.fn().mockResolvedValue(undefined)}
        />,
      );

      fireEvent.click(screen.getAllByRole('button', { name: 'Open linked execution' })[0]);
      expect(scrollIntoView).toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('shows per-target status vault details with proof summary, notes, and last update', () => {
    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'in_progress' as const,
        executionNote: 'Submitted the SS-5 packet and waiting on return mail.',
        executionUpdatedAt: '2026-04-24T20:15:00.000Z',
      } : step),
    };

    render(
      <NameChangePlannerTab
        draft={draft}
        documents={[]}
        extractedFields={[]}
        plan={plan}
        reminders={[]}
        saving={false}
        onDraftChange={vi.fn()}
        onStructuredIntakeChange={vi.fn()}
        onDocumentsChange={vi.fn()}
        onExtractedFieldsChange={vi.fn()}
        onRemindersChange={vi.fn()}
        onStepExecutionStatusChange={vi.fn()}
        onStepExecutionNoteChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Target status tracking')).toBeInTheDocument();
    expect(screen.getAllByText(/proof item/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Submitted the SS-5 packet and waiting on return mail.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Execution: in_progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Updated /).length).toBeGreaterThan(0);
  });
});
