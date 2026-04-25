import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

    const view = render(
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

  it('keeps post-wedding resume copy soft and resumable', () => {
    const draft = makeDraft();
    const scrollIntoView = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    try {
      render(
        <NameChangePlannerTab
          draft={draft}
          documents={[]}
          extractedFields={[]}
          plan={buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] })}
          reminders={[]}
          saving={false}
          onDraftChange={vi.fn()}
          onStructuredIntakeChange={vi.fn()}
          onDocumentsChange={vi.fn()}
          onExtractedFieldsChange={vi.fn()}
          onRemindersChange={vi.fn()}
          onStepExecutionStatusChange={vi.fn()}
          onStepExecutionNoteChange={vi.fn()}
          onSave={onSave}
        />,
      );

      expect(screen.getByText('Soft next steps, not a checklist you have to clear')).toBeInTheDocument();
      expect(screen.getByText(/Optional next move:/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Open status vault' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save and come back later' }));

      expect(scrollIntoView).toHaveBeenCalled();
      expect(onSave).toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
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
      summary: {
        ...basePlan.summary,
        milestoneChecklist: (basePlan.summary.milestoneChecklist ?? []).map((milestone) => milestone.id === 'milestone-legal-proof'
          ? { ...milestone, status: 'complete' as const }
          : milestone),
      },
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'in_progress' as const,
        executionNote: 'Submitted the SS-5 packet and waiting on return mail.',
        executionUpdatedAt: '2026-04-24T20:15:00.000Z',
      } : step),
    };

    const view = render(
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
    expect(screen.getAllByText(/checks ready/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Submitted the SS-5 packet and waiting on return mail.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Execution: in_progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Latest touch|Execution updated/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Steps 0 done • 1 active • 0 todo/)).toBeInTheDocument();
    expect(screen.getByText(/with missing proof/)).toBeInTheDocument();
    expect(screen.getByText(/with proof attention/)).toBeInTheDocument();
    expect(screen.getByText(/with execution activity/)).toBeInTheDocument();
    expect(screen.getByText(/with reminder follow-up/)).toBeInTheDocument();
    expect(screen.getAllByText(/missing|attention/).length).toBeGreaterThan(0);
  });

  it('surfaces the most recently touched target first in the status vault list', () => {
    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => {
        if (step.id === 'federal-ssa') {
          return {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-24T20:15:00.000Z',
          };
        }

        if (step.id === 'state-dmv') {
          return {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-24T19:15:00.000Z',
          };
        }

        return step;
      }),
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

    const trackingHeader = screen.getByText('Target status tracking');
    const trackingList = trackingHeader.closest('div')?.parentElement?.nextElementSibling as HTMLElement;
    const targetTitles = within(trackingList).getAllByText(/Social Security Administration|California DMV/).map((node) => node.textContent);
    expect(targetTitles.slice(0, 2)).toEqual([
      'Social Security Administration',
      'California DMV',
    ]);
  });

  it('keeps reminder-backed target tracking visible when a reminder is the latest touch', () => {
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
        reminders={[
          {
            reminder_key: 'ssa-follow-up',
            label: 'SSA follow-up',
            reason: 'Receipt still missing',
            trigger_type: 'manual',
            status: 'pending',
            urgency: 'high',
            focus_target_id: 'ssa',
            updated_at: '2026-04-24T22:20:00.000Z',
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

    expect(screen.getByText(/SSA follow-up/)).toBeInTheDocument();
    expect(screen.getByText(/high urgency/)).toBeInTheDocument();
    expect(screen.getAllByText(/Latest touch/).length).toBeGreaterThan(0);
  });

  it('keeps older reminder timing visible when execution is now the latest touch', () => {
    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'in_progress' as const,
        executionNote: 'SSA packet already filed and waiting on receipt.',
        executionUpdatedAt: '2026-04-24T22:40:00.000Z',
      } : step),
    };

    render(
      <NameChangePlannerTab
        draft={draft}
        documents={[]}
        extractedFields={[]}
        plan={plan}
        reminders={[
          {
            reminder_key: 'ssa-follow-up',
            label: 'SSA follow-up',
            reason: 'Receipt still missing',
            trigger_type: 'manual',
            status: 'pending',
            urgency: 'high',
            focus_target_id: 'ssa',
            updated_at: '2026-04-24T22:20:00.000Z',
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

    expect(screen.getAllByText(/Latest touch .*execution/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reminder updated/).length).toBeGreaterThan(0);
  });

  it('keeps proof debt visible when reminder follow-up becomes the latest touch', () => {
    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? {
            ...step,
            executionStatus: 'in_progress' as const,
            executionNote: 'SSA packet already filed and waiting on receipt.',
            executionUpdatedAt: '2026-04-24T22:10:00.000Z',
          }
        : step),
    };

    render(
      <NameChangePlannerTab
        draft={draft}
        documents={[]}
        extractedFields={[]}
        plan={plan}
        reminders={[
          {
            reminder_key: 'ssa-follow-up',
            label: 'SSA follow-up',
            reason: 'Receipt still missing',
            trigger_type: 'manual',
            status: 'pending',
            urgency: 'high',
            focus_target_id: 'ssa',
            updated_at: '2026-04-24T22:20:00.000Z',
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

    expect(screen.getAllByText(/Proof note:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SSA packet already filed and waiting on receipt\./).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/• Proof needs:/).length).toBeGreaterThan(0);
  });

  it('keeps proof debt visible inside the execution card status vault note stack', () => {
    const draft = makeDraft();
    const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });

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

    expect(screen.getAllByText(/• Proof needs:/).length).toBeGreaterThan(0);
  });

  it('keeps plan-level execution timing visible when reminders are newer than execution', () => {
    const draft = makeDraft();
    const reminders = [
      {
        reminder_key: 'ssa-follow-up',
        label: 'SSA follow-up',
        reason: 'Receipt still missing',
        trigger_type: 'manual' as const,
        status: 'pending' as const,
        urgency: 'high' as const,
        focus_target_id: 'ssa' as const,
        updated_at: '2026-04-24T22:20:00.000Z',
      },
    ];
    const basePlan = buildNameChangePlan({
      profile: draft,
      documents: [],
      extractedFields: [],
      reminders,
    });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        targetStatusOverview: {
          ...basePlan.summary.targetStatusOverview,
          latestUpdatedAt: '2026-04-24T20:15:00.000Z',
          latestReminderAt: '2026-04-24T22:20:00.000Z',
          latestTouchedAt: '2026-04-24T22:20:00.000Z',
          latestTouchedSource: 'reminder' as const,
        },
      },
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'in_progress' as const,
        executionUpdatedAt: '2026-04-24T20:15:00.000Z',
      } : step),
    };

    render(
      <NameChangePlannerTab
        draft={draft}
        documents={[]}
        extractedFields={[]}
        plan={plan}
        reminders={reminders}
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

    expect(screen.getByText(/Latest move .*reminder/)).toBeInTheDocument();
    expect(screen.getByText(/Latest execution/)).toBeInTheDocument();
    expect(screen.queryByText(/Latest reminder/)).not.toBeInTheDocument();
  });

  it('keeps plan-level reminder timing visible when execution becomes the latest move', () => {
    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        targetStatusOverview: {
          ...basePlan.summary.targetStatusOverview,
          latestUpdatedAt: '2026-04-24T22:40:00.000Z',
          latestReminderAt: '2026-04-24T22:20:00.000Z',
          latestTouchedAt: '2026-04-24T22:40:00.000Z',
          latestTouchedSource: 'execution' as const,
        },
      },
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'in_progress' as const,
        executionUpdatedAt: '2026-04-24T22:40:00.000Z',
      } : step),
    };

    render(
      <NameChangePlannerTab
        draft={draft}
        documents={[]}
        extractedFields={[]}
        plan={plan}
        reminders={[
          {
            reminder_key: 'ssa-follow-up',
            label: 'SSA follow-up',
            reason: 'Receipt still missing',
            trigger_type: 'manual' as const,
            status: 'pending' as const,
            urgency: 'high' as const,
            focus_target_id: 'ssa' as const,
            updated_at: '2026-04-24T22:20:00.000Z',
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

    expect(screen.getByText(/Latest move .*execution/)).toBeInTheDocument();
    expect(screen.getByText(/Latest reminder/)).toBeInTheDocument();
  });

  it('shows plan-level milestone timing when milestone confirmations are the latest move', () => {
    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        targetStatusOverview: {
          ...basePlan.summary.targetStatusOverview,
          latestUpdatedAt: '2026-04-24T20:15:00.000Z',
          latestMilestoneAt: '2026-04-24T22:20:00.000Z',
          latestReminderAt: '2026-04-24T21:20:00.000Z',
          latestTouchedAt: '2026-04-24T22:20:00.000Z',
          latestTouchedSource: 'milestone' as const,
        },
      },
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

    expect(screen.getByText(/Latest move .*milestone/)).toBeInTheDocument();
    expect(screen.getByText(/Latest execution/)).toBeInTheDocument();
    expect(screen.getByText(/Latest reminder/)).toBeInTheDocument();
  });
});
