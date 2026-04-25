import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NameChangePlannerTab } from './NameChangePlannerTab';
import { defaultNameChangeCaseInput } from './nameChangeService';
import { buildNameChangePlan } from '../../../lib/nameChange/engine';
import type { NameChangeCaseInput, NameChangePlan } from '../../../lib/nameChange/types';

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

function makeCompletedPlan(draft: NameChangeCaseInput): NameChangePlan {
  const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });

  return {
    ...plan,
    steps: plan.steps.map((step) => ({
      ...step,
      executionStatus: 'complete',
      executionUpdatedAt: new Date().toISOString(),
    })),
    summary: {
      ...plan.summary,
      executionCounts: {
        todo: 0,
        in_progress: 0,
        complete: plan.steps.length,
      },
      milestoneChecklist: (plan.summary.milestoneChecklist ?? []).map((milestone) => ({
        ...milestone,
        status: 'complete' as const,
      })),
    },
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

      expect(screen.getByText('Start whenever you want, then come back whenever you need')).toBeInTheDocument();
      expect(screen.getByText('Roadmap saved')).toBeInTheDocument();
      expect(screen.getByText('Free assistant · status vault · proof tracking')).toBeInTheDocument();
      expect(screen.getByText('Milestones ready to confirm')).toBeInTheDocument();
      expect(screen.getByText('No open reminders')).toBeInTheDocument();
      expect(screen.getByText(/Optional next step:/i)).toBeInTheDocument();
      expect(screen.getByText('The roadmap is already there, even if you have not started checking steps off yet, so you can come back without rebuilding the plan.')).toBeInTheDocument();
      expect(screen.getByText('Certificate, SSA, and DMV stay together so the legal identity chain does not drift.')).toBeInTheDocument();

      const roadmapButtons = screen.getAllByRole('button', { name: 'See roadmap first' });
      const milestoneChip = screen.getByRole('button', { name: 'Milestones ready to confirm' });
      const reminderChip = screen.getByRole('button', { name: 'No open reminders' });

      fireEvent.click(roadmapButtons[roadmapButtons.length - 1]);
      expect(window.location.hash).toBe('#name-change-roadmap');
      fireEvent.click(milestoneChip);
      expect(window.location.hash).toBe('#name-change-roadmap');
      fireEvent.click(reminderChip);
      expect(window.location.hash).toBe('#name-change-roadmap');
      fireEvent.click(screen.getByRole('button', { name: 'Open roadmap' }));
      expect(window.location.hash).toBe('#name-change-roadmap');
      fireEvent.click(roadmapButtons[roadmapButtons.length - 1]);
      expect(window.location.hash).toBe('#name-change-roadmap');
      fireEvent.click(screen.getByRole('button', { name: 'Save and come back later' }));

      expect(scrollIntoView).toHaveBeenCalledTimes(5);
      expect(onSave).toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('keeps resume labels aligned with the dashboard once execution is underway', () => {
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
          plan={makePlanWithExecutionActivity(draft)}
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

      expect(screen.getByText('Resume where you left off')).toBeInTheDocument();
      expect(screen.getByText('Free assistant · status vault · proof tracking')).toBeInTheDocument();
      expect(screen.getByText('Milestones ready to confirm')).toBeInTheDocument();
      expect(screen.getByText('No open reminders')).toBeInTheDocument();
      expect(screen.getByText('You already started the name-change flow, so the dashboard should bring you back to the status vault instead of making you hunt for your place again.')).toBeInTheDocument();
      expect(screen.getByText('Optional next step: Pick back up in the vault if you want progress and proof. If details changed, case setup is still one click away.')).toBeInTheDocument();
      expect(screen.getByText('0 complete · 1 in progress across the legal identity chain.')).toBeInTheDocument();

      fireEvent.click(
        screen
          .getByText((content) => content.includes('legal identity chain'))
          .closest('button') as HTMLButtonElement,
      );
      expect(window.location.hash).toBe('#target-status-tracking');
      fireEvent.click(
        screen
          .getByText('Milestone confirmations')
          .closest('button') as HTMLButtonElement,
      );
      expect(window.location.hash).toBe('#target-status-tracking');
      fireEvent.click(
        screen
          .getByText((content) => content.includes('account cleanup'))
          .closest('button') as HTMLButtonElement,
      );
      expect(window.location.hash).toBe('#target-status-tracking');
      fireEvent.click(screen.getByRole('button', { name: 'Resume status vault' }));
      expect(window.location.hash).toBe('#target-status-tracking');
      fireEvent.click(screen.getByRole('button', { name: 'Open full assistant' }));
      expect(window.location.hash).toBe('#name-change-roadmap');
      fireEvent.click(screen.getByRole('button', { name: 'Open status vault' }));
      expect(window.location.hash).toBe('#target-status-tracking');
      fireEvent.click(screen.getByRole('button', { name: 'Edit saved details' }));
      expect(window.location.hash).toBe('#case-setup');

      expect(scrollIntoView).toHaveBeenCalledTimes(7);
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('shows softer start-first copy when there is no execution activity yet', () => {
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

      expect(screen.getByText('Start whenever you want, then come back whenever you need')).toBeInTheDocument();

      const roadmapButtons = screen.getAllByRole('button', { name: 'See roadmap first' });

      fireEvent.click(roadmapButtons[roadmapButtons.length - 1]);
      fireEvent.click(screen.getByRole('button', { name: 'Update case setup' }));
      fireEvent.click(roadmapButtons[roadmapButtons.length - 1]);

      expect(scrollIntoView).toHaveBeenCalledTimes(3);
      expect(window.location.hash).toBe('#name-change-roadmap');
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('uses the completed lifecycle copy once the execution chain is done', () => {
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
          plan={makeCompletedPlan(draft)}
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

      expect(screen.getByText('Status vault complete')).toBeInTheDocument();
      expect(screen.getByText('Everything is saved. Reopen only when you need proof.')).toBeInTheDocument();
      expect(screen.getByText('Your status vault already has the chain mapped, so you can reopen it anytime to confirm what landed and what still needs follow-through.')).toBeInTheDocument();
      expect(screen.getByText(/Nothing pushy here/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Review status vault' }));
      expect(window.location.hash).toBe('#target-status-tracking');
      fireEvent.click(screen.getByRole('button', { name: 'Open full assistant' }));
      expect(window.location.hash).toBe('#name-change-roadmap');
      fireEvent.click(screen.getByRole('button', { name: 'Open status vault' }));
      expect(window.location.hash).toBe('#target-status-tracking');
      fireEvent.click(screen.getByRole('button', { name: 'Edit saved details' }));
      expect(window.location.hash).toBe('#case-setup');

      expect(scrollIntoView).toHaveBeenCalledTimes(4);
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('resumes directly into the status vault when the route hash points there', async () => {
    const draft = makeDraft();
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const originalHash = window.location.hash;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    window.location.hash = '#target-status-tracking';

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
          onSave={vi.fn().mockResolvedValue(undefined)}
        />,
      );

      await vi.waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalled();
      });
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      window.location.hash = originalHash;
    }
  });

  it('tracks later hash changes so resume links stay usable after mount', async () => {
    const draft = makeDraft();
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const originalHash = window.location.hash;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    window.location.hash = '';

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
          onSave={vi.fn().mockResolvedValue(undefined)}
        />,
      );

      window.location.hash = '#case-setup';
      window.dispatchEvent(new HashChangeEvent('hashchange'));

      await vi.waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalled();
      });
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      window.location.hash = originalHash;
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

  it('surfaces readiness-specific next asks inside prewritten update templates', () => {
    const draft = makeDraft();
    const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const payrollRequestSummary = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.requestSummary;
    const bankRequestSummary = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-bank')?.requestSummary;
    const payrollProofStatus = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofReadinessSummary;
    const payrollChecklistHighlight = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.checklistHighlight;
    const payrollChecklistStatus = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.checklistStatusNote;
    const payrollProofChecklistSummary = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofChecklist.join(' · ');
    const payrollProofChecklist = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofDocuments.join(' · ');
    const payrollBlockingProofHop = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.blockingProofHopLabel;

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

    expect(payrollRequestSummary).toBeTruthy();
    expect(bankRequestSummary).toBeTruthy();
    expect(screen.getByText(`Next ask: ${payrollRequestSummary}`)).toBeInTheDocument();
    expect(screen.getByText(`Next ask: ${bankRequestSummary}`)).toBeInTheDocument();
    expect(screen.getAllByText(`Blocked by: ${payrollBlockingProofHop}`).length).toBeGreaterThan(0);
    expect(screen.getByText(`Checklist: ${payrollChecklistHighlight}`)).toBeInTheDocument();
    expect(screen.getByText(`Checklist status: ${payrollChecklistStatus}`)).toBeInTheDocument();
    expect(screen.getByText(`Proof status: ${payrollProofStatus}`)).toBeInTheDocument();
    expect(screen.getByText(`Proof checklist: ${payrollProofChecklistSummary}`)).toBeInTheDocument();
    expect(screen.getByText(`Proof to have handy: ${payrollProofChecklist}`)).toBeInTheDocument();
    expect(screen.getAllByText('intake first · legal proof pending').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Copy intake script' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Copy, stage, or send when the proof chain is ready. Payroll, bank, insurance, and other downstream updates should not require fresh writing every time.')).toBeInTheDocument();
    expect(screen.queryByText('Open copy-ready template →')).not.toBeInTheDocument();
    expect(screen.getAllByText('Open update template →').length).toBeGreaterThan(0);
  });

  it('uses a next-step draft copy label for upcoming templates that are waiting on the next proof hop', () => {
    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        accountUpdateTemplates: (basePlan.summary.accountUpdateTemplates ?? []).map((template) => (
          template.id === 'template-bank'
            ? {
                ...template,
                readiness: 'upcoming' as const,
                blockingProofHopLabel: 'ID pending',
              }
            : template
        )),
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

    expect(screen.getAllByRole('button', { name: 'Copy next-step draft' }).length).toBeGreaterThan(0);
  });

  it('makes ready and complete planner labels explicit about proof readiness', () => {
    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const readyCompleteTemplates = (basePlan.summary.accountUpdateTemplates ?? []).map((template) => (
      template.id === 'template-bank'
        ? { ...template, readiness: 'ready' as const, blockingProofHopLabel: undefined }
        : template.id === 'template-insurance'
          ? { ...template, readiness: 'complete' as const, blockingProofHopLabel: undefined }
          : template
    ));
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        accountUpdateTemplates: readyCompleteTemplates,
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

    expect(screen.getAllByText('send now (proof packet ready)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('confirm sync (proof chain complete)').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Copy proof-ready send text' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Copy proof-complete confirmation' }).length).toBeGreaterThan(0);
  });

  it('copies the full readiness-aware template text from the planner card', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    HTMLElement.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });

    const draft = makeDraft();
    const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const payrollTemplate = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll');

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

    fireEvent.click(screen.getAllByRole('button', { name: 'Copy intake script' })[0]!);

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledTimes(1));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Subject: ${payrollTemplate?.subject}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Status: intake first · ${payrollTemplate?.blockingProofHopLabel}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Next ask: ${payrollTemplate?.requestSummary}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Blocked by: ${payrollTemplate?.blockingProofHopLabel}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Checklist: ${payrollTemplate?.checklistHighlight}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Checklist status: ${payrollTemplate?.checklistStatusNote}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Current blocker: ${payrollTemplate?.blockingProofHopLabel}.`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Proof status: ${payrollTemplate?.proofReadinessSummary}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Proof checklist: ${payrollTemplate?.proofChecklist.join(' · ')}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(payrollTemplate?.body ?? ''));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
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

  it('keeps invalid reminder timestamps from outranking real reminder history in the status vault', () => {
    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'in_progress' as const,
        executionNote: 'SSA packet already filed and waiting on receipt.',
        executionUpdatedAt: '2026-04-24T22:10:00.000Z',
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
            reminder_key: 'ssa-bad-follow-up',
            label: 'Broken reminder payload',
            reason: 'Bad imported timestamp',
            trigger_type: 'manual',
            status: 'pending',
            urgency: 'medium',
            focus_target_id: 'ssa',
            updated_at: 'not-a-date',
          },
          {
            reminder_key: 'ssa-good-follow-up',
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

    expect(screen.getAllByText(/Reminder updated 4\/24\/2026, 3:20:00 PM/).length).toBeGreaterThan(0);
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
