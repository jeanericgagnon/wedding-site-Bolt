import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NameChangePlannerTab } from './NameChangePlannerTab';
import { defaultNameChangeCaseInput } from './nameChangeService';
import { buildNameChangeBankExecutionSnapshot } from '../../../lib/nameChange/bankFlow';
import { buildNameChangePlan } from '../../../lib/nameChange/engine';
import { getExecutionNextActionDetail } from '../../../lib/nameChange/actionFeed';
import type { NameChangeCaseInput, NameChangePlan } from '../../../lib/nameChange/types';

vi.setConfig({ testTimeout: 15000 });

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    const marriageStateInput = screen.getByLabelText('Marriage state / issuing jurisdiction') as HTMLInputElement;
    const countyInput = screen.getByLabelText('County / issuing county') as HTMLInputElement;

    expect(currentMiddleNameInput.value).toBe('Marie');
    expect(targetMiddleNameInput.value).toBe('Quinn');
    expect(marriageStateInput.value).toBe('California');
    expect(countyInput.value).toBe('San Diego');

    fireEvent.change(currentMiddleNameInput, { target: { value: 'Rae' } });
    fireEvent.change(targetMiddleNameInput, { target: { value: 'Lane' } });
    fireEvent.change(marriageStateInput, { target: { value: 'Nevada' } });
    fireEvent.change(countyInput, { target: { value: 'Clark' } });

    expect(onDraftChange).toHaveBeenCalledWith({ current_middle_name: 'Rae' });
    expect(onDraftChange).toHaveBeenCalledWith({ target_middle_name: 'Lane' });
    expect(onDraftChange).toHaveBeenCalledWith({ marriage_state: 'Nevada' });
    expect(onDraftChange).toHaveBeenCalledWith({ county_residence: 'Clark' });
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
      expect(screen.getByText('Free assistant · saved status · document checklist')).toBeInTheDocument();
      expect(screen.getByText('Milestones ready to confirm')).toBeInTheDocument();
      expect(screen.getByText('No open reminders')).toBeInTheDocument();
      expect(screen.getByText(/Optional next step:/i)).toBeInTheDocument();
      expect(screen.getByText('The roadmap is already there, including the California-guided state lane, the federal identity chain, and the downstream account follow-through, so you can come back without rebuilding the plan.')).toBeInTheDocument();
      expect(screen.getByText('Certificate, SSA, and DMV stay together so the legal identity chain does not drift.')).toBeInTheDocument();
      expect(screen.getByText('Coverage today')).toBeInTheDocument();
      expect(screen.getByText(/California-guided state filing, plus the U\.S\. federal identity chain/i)).toBeInTheDocument();
      expect(screen.getByText(/California is saved as the marriage jurisdiction/i)).toBeInTheDocument();

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
      expect(screen.getByText('Free assistant · saved status · document checklist')).toBeInTheDocument();
      expect(screen.getByText('Milestones ready to confirm')).toBeInTheDocument();
      expect(screen.getByText('No open reminders')).toBeInTheDocument();
      expect(screen.getByText('You already started the name-change flow, so dayof brings you back to the saved California-guided state lane, federal identity chain, and downstream status view instead of making you hunt for your place again.')).toBeInTheDocument();
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
      expect(screen.getByText('Your status vault already has the California-guided state lane, the federal identity chain, and the downstream follow-through mapped, so you can reopen it anytime to confirm what landed and what still needs follow-through.')).toBeInTheDocument();
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

  it('shows supportive guided next-action wait guidance on blocked downstream execution cards', () => {
    const draft = makeDraft();

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

    expect(screen.getAllByText('Next best step').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Do now:/).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Why it helps:/).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Can wait: Actual submission can safely wait\./).length).toBeGreaterThan(0);
  });

  it('does not duplicate guided next-action fallback detail inside status-vault rows', () => {
    const draft = makeDraft();
    const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const bankSnapshot = buildNameChangeBankExecutionSnapshot(draft, [], [], plan);
    const bankGuidedDetail = getExecutionNextActionDetail(bankSnapshot);

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

    expect(screen.getAllByText(/Next best step|Do now:/).length).toBeGreaterThan(0);
    expect(screen.queryByText(new RegExp(`^Execution note: ${escapeRegExp(bankGuidedDetail)}$`))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(`^• ${escapeRegExp(bankGuidedDetail)}$`))).not.toBeInTheDocument();
    expect(screen.getAllByText(/Next: Unblock DMV completion|Can wait: Actual submission can safely wait\./).length).toBeGreaterThan(0);
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

      fireEvent.click(screen.getAllByRole('button', { name: 'Open linked step' })[0]);
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

    expect(screen.getByText('Status tracking')).toBeInTheDocument();
    expect(screen.getAllByText(/checks ready/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Submitted the SS-5 packet and waiting on return mail.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Status: In progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Latest touch|Step updated/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Steps 0 done • 1 started • 0 to do/)).toBeInTheDocument();
    expect(screen.getByText(/with missing proof/)).toBeInTheDocument();
    expect(screen.getByText(/proof details worth checking/)).toBeInTheDocument();
    expect(screen.getByText(/recently updated/)).toBeInTheDocument();
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
    const payrollProofChecklistSummary = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofChecklist.map((item) => item.replace(/[.\s]+$/u, '')).join(' · ');
    const payrollProofChecklist = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.proofDocuments.join(' · ');
    const payrollBlockingProofHop = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll')?.blockingProofHopLabel;
    const payrollChecklistHighlightLine = payrollChecklistHighlight?.endsWith('.') ? payrollChecklistHighlight : `${payrollChecklistHighlight}.`;
    const payrollChecklistStatusLine = payrollChecklistStatus?.endsWith('.') ? payrollChecklistStatus : `${payrollChecklistStatus}.`;

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
    expect(screen.getAllByText(`Blocked by: ${payrollBlockingProofHop}.`).length).toBeGreaterThan(0);
    expect(screen.getByText(`Checklist: ${payrollChecklistHighlightLine}`)).toBeInTheDocument();
    expect(screen.getByText(`Checklist status: ${payrollChecklistStatusLine}`)).toBeInTheDocument();
    expect(screen.getByText(`Proof status: ${payrollProofStatus}`)).toBeInTheDocument();
    expect(screen.getByText(`Proof checklist: ${payrollProofChecklistSummary}`)).toBeInTheDocument();
    expect(screen.getByText(`Proof to have handy: ${payrollProofChecklist}`)).toBeInTheDocument();
    expect(screen.getAllByText('ask intake rules now · legal proof pending').length).toBeGreaterThan(0);
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
    expect(screen.getAllByText('ask before next proof hop · ID pending').length).toBeGreaterThan(0);
  });

  it('shows fallback proof-phase status chips when no blocker label is available', () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        accountUpdateTemplates: (basePlan.summary.accountUpdateTemplates ?? []).map((template) => (
          template.id === 'template-bank'
            ? { ...template, readiness: 'in_progress' as const, blockingProofHopLabel: undefined }
            : template.id === 'template-insurance'
              ? { ...template, readiness: 'upcoming' as const, blockingProofHopLabel: undefined }
              : template.id === 'template-tax'
                ? { ...template, readiness: 'blocked' as const, blockingProofHopLabel: undefined }
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

    expect(screen.getAllByText('draft now, send after current proof clears · current proof pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ask before next proof hop · next proof hop pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ask intake rules now · proof chain pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blocked by: current proof pending.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blocked by: next proof hop pending.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blocked by: proof chain pending.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Current blocker: current proof pending.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Current blocker: next proof hop pending.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Current blocker: proof chain pending.').length).toBeGreaterThan(0);
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
    expect(screen.getAllByText('Template state: proof packet ready to send now.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Template state: proof chain complete; confirm the downstream sync only.').length).toBeGreaterThan(0);
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
    expect(screen.getAllByText('Template state: intake-only until legal proof pending clears.').length).toBeGreaterThan(0);
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Subject: ${payrollTemplate?.subject}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Status: ask intake rules now · ${payrollTemplate?.blockingProofHopLabel}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Next ask: ${payrollTemplate?.requestSummary}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Blocked by: ${payrollTemplate?.blockingProofHopLabel}.`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Checklist: ${payrollTemplate?.checklistHighlight}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Checklist status: ${payrollTemplate?.checklistStatusNote}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('Template state: intake-only until legal proof pending clears.'));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Current blocker: ${payrollTemplate?.blockingProofHopLabel}.`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Proof status: ${payrollTemplate?.proofReadinessSummary}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Proof checklist: ${payrollTemplate?.proofChecklist.map((item) => item.replace(/[.\s]+$/u, '')).join(' · ')}`));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining(`Template message: ${payrollTemplate?.body}`));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('avoids double punctuation in copied checklist lines', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    HTMLElement.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });

    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        accountUpdateTemplates: (basePlan.summary.accountUpdateTemplates ?? []).map((template) => (
          template.id === 'template-payroll'
            ? {
                ...template,
                checklistHighlight: 'Gather the intake path only until legal proof is fully grounded.',
                checklistStatusNote: 'Gather the intake path only until legal proof is fully grounded.',
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

    fireEvent.click(screen.getAllByRole('button', { name: 'Copy intake script' })[0]!);

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledTimes(1));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('Checklist: Gather the intake path only until legal proof is fully grounded.'));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('Checklist status: Gather the intake path only until legal proof is fully grounded.'));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.not.stringContaining('grounded..'));
  });

  it('punctuates visible checklist lines on planner cards', () => {
    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        accountUpdateTemplates: (basePlan.summary.accountUpdateTemplates ?? []).map((template) => (
          template.id === 'template-payroll'
            ? {
                ...template,
                checklistHighlight: 'Gather the intake path only until legal proof is fully grounded',
                checklistStatusNote: 'Gather the intake path only until legal proof is fully grounded',
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

    expect(screen.getByText('Checklist: Gather the intake path only until legal proof is fully grounded.')).toBeInTheDocument();
    expect(screen.getByText('Checklist status: Gather the intake path only until legal proof is fully grounded.')).toBeInTheDocument();
    expect(screen.queryByText('Checklist: Gather the intake path only until legal proof is fully grounded')).not.toBeInTheDocument();
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

    const trackingHeader = screen.getByText('Status tracking');
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
    expect(screen.getByText(/Latest step/)).toBeInTheDocument();
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

    expect(screen.getByText(/Latest move .*step/)).toBeInTheDocument();
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
    expect(screen.getByText(/Latest step/)).toBeInTheDocument();
    expect(screen.getByText(/Latest reminder/)).toBeInTheDocument();
  });

  it('trims terminal punctuation from proof-to-have-handy text in planner surfaces', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    HTMLElement.prototype.scrollIntoView = vi.fn();

    const draft = makeDraft();
    const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const payrollTemplate = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll');
    if (!payrollTemplate) throw new Error('expected payroll template');

    payrollTemplate.proofDocuments = ['Certified legal name-change proof.', 'Updated Social Security record or SSA confirmation.'];

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
        initialTargetId="account-update-template-template-payroll"
      />,
    );

    expect(screen.getByText('Proof to have handy: Certified legal name-change proof · Updated Social Security record or SSA confirmation')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Copy intake script' })[0]!);

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledTimes(1));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('Proof to have handy: Certified legal name-change proof · Updated Social Security record or SSA confirmation'));
  });

  it('deduplicates normalized proof-to-have-handy text in planner surfaces', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    HTMLElement.prototype.scrollIntoView = vi.fn();

    const draft = makeDraft();
    const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const payrollTemplate = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll');
    if (!payrollTemplate) throw new Error('expected payroll template');

    payrollTemplate.proofDocuments = [
      'Certified legal name-change proof.',
      ' certified legal name-change proof ',
      ' Updated Social Security record or SSA confirmation. ',
      'updated social security record or ssa confirmation',
    ];

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
        initialTargetId="account-update-template-template-payroll"
      />,
    );

    expect(screen.getByText('Proof to have handy: Certified legal name-change proof · Updated Social Security record or SSA confirmation')).toBeInTheDocument();
    expect(screen.queryByText('Proof to have handy: Certified legal name-change proof · Certified legal name-change proof')).not.toBeInTheDocument();
    expect(screen.queryByText('Proof to have handy: Updated Social Security record or SSA confirmation · updated social security record or ssa confirmation')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Copy intake script' })[0]!);

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledTimes(1));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('Proof to have handy: Certified legal name-change proof · Updated Social Security record or SSA confirmation'));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Proof to have handy: Certified legal name-change proof · Certified legal name-change proof'));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Proof to have handy: Updated Social Security record or SSA confirmation · updated social security record or ssa confirmation'));
  });

  it('omits blank normalized proof summary text in planner surfaces', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    HTMLElement.prototype.scrollIntoView = vi.fn();

    const draft = makeDraft();
    const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const payrollTemplate = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll');
    if (!payrollTemplate) throw new Error('expected payroll template');

    payrollTemplate.proofDocuments = ['.', '   '];
    payrollTemplate.proofChecklist = ['.', '   '];

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
        initialTargetId="account-update-template-template-payroll"
      />,
    );

    const payrollCard = document.getElementById('account-update-template-template-payroll');
    if (!payrollCard) throw new Error('expected payroll card');

    expect(within(payrollCard).queryByText(/Proof checklist:/)).not.toBeInTheDocument();
    expect(within(payrollCard).queryByText(/Proof to have handy:/)).not.toBeInTheDocument();

    fireEvent.click(within(payrollCard).getByRole('button', { name: 'Copy intake script' }));

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledTimes(1));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Proof checklist:'));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Proof to have handy:'));
  });

  it('omits punctuation-only checklist text in planner surfaces', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    HTMLElement.prototype.scrollIntoView = vi.fn();

    const draft = makeDraft();
    const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const payrollTemplate = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll');
    if (!payrollTemplate) throw new Error('expected payroll template');

    payrollTemplate.checklistHighlight = ' . ';
    payrollTemplate.checklistStatusNote = '.';

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
        initialTargetId="account-update-template-template-payroll"
      />,
    );

    const payrollCard = document.getElementById('account-update-template-template-payroll');
    if (!payrollCard) throw new Error('expected payroll card');

    expect(within(payrollCard).queryByText(/Checklist:/)).not.toBeInTheDocument();
    expect(within(payrollCard).queryByText(/Checklist status:/)).not.toBeInTheDocument();

    fireEvent.click(within(payrollCard).getByRole('button', { name: 'Copy intake script' }));

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledTimes(1));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Checklist:'));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Checklist status:'));
  });

  it('omits blank subject, message, proof status, and next ask text in planner surfaces', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    HTMLElement.prototype.scrollIntoView = vi.fn();

    const draft = makeDraft();
    const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const payrollTemplate = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll');
    if (!payrollTemplate) throw new Error('expected payroll template');

    payrollTemplate.subject = '   ';
    payrollTemplate.body = ' . ';
    payrollTemplate.proofReadinessSummary = ' - ';
    payrollTemplate.requestSummary = ' ... ';

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
        initialTargetId="account-update-template-template-payroll"
      />,
    );

    const payrollCard = document.getElementById('account-update-template-template-payroll');
    if (!payrollCard) throw new Error('expected payroll card');

    expect(within(payrollCard).queryByText(/Subject:/)).not.toBeInTheDocument();
    expect(within(payrollCard).queryByText(/Template message:/)).not.toBeInTheDocument();
    expect(within(payrollCard).queryByText(/Proof status:/)).not.toBeInTheDocument();
    expect(within(payrollCard).queryByText(/Next ask:/)).not.toBeInTheDocument();

    fireEvent.click(within(payrollCard).getByRole('button', { name: 'Copy intake script' }));

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledTimes(1));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Subject:'));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Template message:'));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Proof status:'));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Next ask:'));
  });

  it('falls back to generic blocker copy in planner surfaces when the blocker label is blank whitespace', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    HTMLElement.prototype.scrollIntoView = vi.fn();

    const draft = makeDraft();
    const plan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const payrollTemplate = plan.summary.accountUpdateTemplates?.find((template) => template.id === 'template-payroll');
    if (!payrollTemplate) throw new Error('expected payroll template');

    payrollTemplate.readiness = 'in_progress';
    payrollTemplate.blockingProofHopLabel = '   ';

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
        initialTargetId="account-update-template-template-payroll"
      />,
    );

    const payrollCard = document.getElementById('account-update-template-template-payroll');
    if (!payrollCard) throw new Error('expected payroll card');

    expect(within(payrollCard).getByText('Blocked by: current proof pending.')).toBeInTheDocument();
    expect(within(payrollCard).getByText('Current blocker: current proof pending.')).toBeInTheDocument();
    expect(within(payrollCard).getByText('Template state: draft now and wait for the current proof to clear before sending.')).toBeInTheDocument();
    expect(payrollCard).toHaveTextContent('draft now, send after current proof clears · current proof pending');

    fireEvent.click(within(payrollCard).getByRole('button', { name: 'Copy staged draft' }));

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledTimes(1));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('Blocked by: current proof pending.'));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('Current blocker: current proof pending.'));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('Template state: draft now and wait for the current proof to clear before sending.'));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Blocked by:    .'));
  });

  it('omits proof-to-have-handy text when a template has no proof documents', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    HTMLElement.prototype.scrollIntoView = vi.fn();

    const draft = makeDraft();
    const basePlan = buildNameChangePlan({ profile: draft, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        accountUpdateTemplates: (basePlan.summary.accountUpdateTemplates ?? []).map((template) => (
          template.id === 'template-payroll'
            ? { ...template, proofDocuments: [] }
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
        initialTargetId="account-update-template-template-payroll"
      />,
    );

    const payrollCard = document.getElementById('account-update-template-template-payroll');
    if (!payrollCard) throw new Error('expected payroll card');

    expect(within(payrollCard).queryByText(/Proof to have handy:/)).not.toBeInTheDocument();

    fireEvent.click(within(payrollCard).getByRole('button', { name: 'Copy intake script' }));

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledTimes(1));
    expect(clipboardWriteText).not.toHaveBeenCalledWith(expect.stringContaining('Proof to have handy:'));
  });

  it('surfaces deeper state playbook, institution coverage, dual-partner rollout, and export surfaces', () => {
    const draft = makeDraft({
      marriage_state: 'Nevada',
      structured_intake: {
        ...makeDraft().structured_intake,
        spouseLastName: 'Jordan',
        bothPartnersChangeName: true,
      },
    });

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

    expect(screen.getByText('State playbook')).toBeInTheDocument();
    expect(screen.getByText('Expanded Nevada guidance')).toBeInTheDocument();
    expect(screen.getByText('Institution coverage map')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dual-partner rollout' })).toBeInTheDocument();
    expect(screen.getByText('Wedding identity exports')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy action packet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy downstream rollout' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy status ledger' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy dual-partner rollout' })).toBeInTheDocument();
  });

  it('copies the action packet export with the state playbook context included', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });

    const draft = makeDraft({ marriage_state: 'Nevada' });

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

    fireEvent.click(screen.getByRole('button', { name: 'Copy action packet' }));

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledTimes(1));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('Day of Love name-change action packet'));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('State playbook: Nevada (Expanded)'));
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('Next actions:'));
    expect(screen.getAllByRole('button', { name: 'Copied' }).length).toBeGreaterThan(0);
  });
});
