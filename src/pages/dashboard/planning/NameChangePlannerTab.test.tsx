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
});
