import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildRsvpAccessModePlan, buildRsvpSetupChecklist, type PersistedRsvpAccessSelection } from '../../../lib/rsvpAccessPlanner';
import { GuestRsvpSettingsView } from './GuestRsvpSettingsView';

vi.mock('../../../components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../components/dashboard/DashboardPageHero', () => ({
  DashboardPageHero: ({ children, title, description }: { children?: ReactNode; title: string; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

function Wrapper() {
  const [selection, setSelection] = useState<PersistedRsvpAccessSelection>({
    primaryMode: 'private_link',
    allowNameLookupBackup: true,
  });
  const plan = buildRsvpAccessModePlan({
    guestCount: 18,
    inviteTokenCount: 18,
    householdCount: 7,
    eventCount: 2,
    emailCount: 14,
    phoneCount: 5,
  }, selection);
  const recommended = plan.find((mode) => mode.status === 'recommended') ?? plan[0];

  return (
    <GuestRsvpSettingsView
      recommendedRsvpAccessMode={recommended}
      rsvpAccessModePlan={plan}
      rsvpAccessSelection={selection}
      rsvpAuditFeed={[]}
      rsvpAuditLoading={false}
      rsvpAutoSaveState="idle"
      rsvpConfigSaving={false}
      rsvpMealEnabled={false}
      rsvpMealOptions={[]}
      rsvpQuestionTemplateCoverage={[]}
      rsvpQuestions={[]}
      rsvpSetupChecklist={buildRsvpSetupChecklist({
        guestCount: 18,
        inviteTokenCount: 18,
        householdCount: 7,
        eventCount: 2,
        emailCount: 14,
        phoneCount: 5,
        mealEnabled: false,
        mealOptionCount: 0,
        questions: [],
      }, selection)}
      stats={{ confirmed: 10, declined: 2, pending: 6 }}
      onAddRsvpQuestionTemplate={vi.fn()}
      onSaveRsvpConfig={vi.fn()}
      onSetConfirmDialog={vi.fn()}
      onSetGuestsTab={vi.fn()}
      onSetRsvpAccessSelection={setSelection}
      onSetRsvpConfigDirty={vi.fn()}
      onSetRsvpMealEnabled={vi.fn()}
      onSetRsvpMealOptions={vi.fn()}
      onSetRsvpQuestions={vi.fn()}
    />
  );
}

describe('GuestRsvpSettingsView', () => {
  it('lets owners switch the active RSVP access mode without exposing future modes as selectable', () => {
    render(<Wrapper />);

    expect(screen.getByText(/Guests reply through private RSVP links/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Selected as primary/i })).toBeInTheDocument();
    expect(screen.getByText(/Guest codes, shared passwords, and open RSVP stay planned/i)).toBeInTheDocument();
    expect(screen.getByText(/Phone or email recovery plan/i)).toBeInTheDocument();
    expect(screen.getAllByText(/14 guest emails and 5 phone numbers are saved/i).length).toBeGreaterThan(0);
    expect(screen.getByText('19 saved recovery inputs')).toBeInTheDocument();
    expect(screen.getAllByText('100% ready').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('email and text')).toBeInTheDocument();
    expect(screen.getByText(/^14$/i)).toBeInTheDocument();
    expect(screen.getByText(/^5$/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready for email recovery/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready for text recovery/i)).toBeInTheDocument();
    expect(screen.getByText(/This does not turn code, password, or open RSVP on/i)).toBeInTheDocument();
    expect(screen.getByText(/Household access proof/i)).toBeInTheDocument();
    expect(screen.getByText(/shared RSVP recovery stays scoped/i)).toBeInTheDocument();
    expect(screen.getAllByText(/bad-code and bad-password lockouts/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Templates and meal collection are optional/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom questions/i)).toBeInTheDocument();
    expect(screen.getByText(/Required now/i)).toBeInTheDocument();
    expect(screen.getByText(/Event-specific/i)).toBeInTheDocument();
    expect(screen.getByText(/Choice questions/i)).toBeInTheDocument();
    expect(screen.getByText(/Meal choices/i)).toBeInTheDocument();
    expect(screen.getByText(/Setup coverage/i)).toBeInTheDocument();
    expect(screen.getByText('100% ready')).toBeInTheDocument();
    expect(screen.getByText('4 of 4 checklist items ready')).toBeInTheDocument();
    expect(screen.getByText('No blockers open')).toBeInTheDocument();
    expect(screen.getByText(/Optional setup/i)).toBeInTheDocument();
    expect(screen.getByText('0% covered')).toBeInTheDocument();
    expect(screen.getByText('templates only · meals off')).toBeInTheDocument();
    expect(screen.getByText('1 optional improvement still open')).toBeInTheDocument();
    expect(screen.getByText('First optional gap: Question templates')).toBeInTheDocument();
    expect(screen.getByText(/^Optional$/i)).toBeInTheDocument();
    expect(screen.queryByText(/Main gap:/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Use as primary access/i })[0]);

    expect(screen.getByText(/Guests can find their RSVP by name or email/i)).toBeInTheDocument();
    expect(screen.getByText(/Name lookup is already the active RSVP path/i)).toBeInTheDocument();
  });

  it('summarizes required, event-specific, and choice-based RSVP questions in the owner readback', () => {
    const selection: PersistedRsvpAccessSelection = {
      primaryMode: 'private_link',
      allowNameLookupBackup: true,
    };
    const plan = buildRsvpAccessModePlan({
      guestCount: 18,
      inviteTokenCount: 18,
      householdCount: 7,
      eventCount: 2,
      emailCount: 14,
      phoneCount: 5,
    }, selection);
    const recommended = plan.find((mode) => mode.status === 'recommended') ?? plan[0];

    render(
      <GuestRsvpSettingsView
        recommendedRsvpAccessMode={recommended}
        rsvpAccessModePlan={plan}
        rsvpAccessSelection={selection}
        rsvpAuditFeed={[]}
        rsvpAuditLoading={false}
        rsvpAutoSaveState="idle"
        rsvpConfigSaving={false}
        rsvpMealEnabled={true}
        rsvpMealOptions={['Chicken', 'Vegetarian']}
        rsvpQuestionTemplateCoverage={[]}
        rsvpQuestions={[
          { id: 'q1', label: 'Which wedding weekend events do you plan to attend?', type: 'multi_choice', required: true, appliesTo: 'all', options: ['Ceremony', 'Reception'] },
          { id: 'q2', label: 'Do you need a shuttle seat?', type: 'single_choice', required: false, appliesTo: 'ceremony', options: ['Yes', 'No'] },
          { id: 'q3', label: 'Anything we should know for dinner?', type: 'long_text', required: true, appliesTo: 'reception', options: [] },
        ]}
        rsvpSetupChecklist={buildRsvpSetupChecklist({
          guestCount: 18,
          inviteTokenCount: 18,
          householdCount: 7,
          eventCount: 2,
          emailCount: 14,
          phoneCount: 5,
          mealEnabled: true,
          mealOptionCount: 2,
          questions: [
            { label: 'Which wedding weekend events do you plan to attend?' },
            { label: 'Do you need a shuttle seat?' },
            { label: 'Anything we should know for dinner?' },
          ],
        }, selection)}
        stats={{ confirmed: 10, declined: 2, pending: 6 }}
        onAddRsvpQuestionTemplate={vi.fn()}
        onSaveRsvpConfig={vi.fn()}
        onSetConfirmDialog={vi.fn()}
        onSetGuestsTab={vi.fn()}
        onSetRsvpAccessSelection={vi.fn()}
        onSetRsvpConfigDirty={vi.fn()}
        onSetRsvpMealEnabled={vi.fn()}
        onSetRsvpMealOptions={vi.fn()}
        onSetRsvpQuestions={vi.fn()}
      />,
    );

    expect(screen.getByText(/Required now/i)).toBeInTheDocument();
    expect(screen.getByText(/Event-specific/i)).toBeInTheDocument();
    expect(screen.getByText(/Choice questions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^2$/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('2 required · 2 event-specific · 2 choice-based questions.')).toBeInTheDocument();
    expect(screen.getByText('Lightweight RSVP form · 2 asked right away for every reply · 2 event-specific follow-ups.')).toBeInTheDocument();
    expect(screen.getByText('50% covered')).toBeInTheDocument();
    expect(screen.getByText('templates and meals')).toBeInTheDocument();
    expect(screen.getByText('1 optional improvement still open')).toBeInTheDocument();
    expect(screen.getByText('First optional gap: Question templates')).toBeInTheDocument();
    expect(screen.getAllByText('100% ready').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('4 of 4 checklist items ready')).toBeInTheDocument();
    expect(screen.getByText('No blockers open')).toBeInTheDocument();
    expect(screen.getByText('email and text')).toBeInTheDocument();
    expect(screen.getByText('2 saved')).toBeInTheDocument();
    expect(screen.getByText('0% coverage')).toBeInTheDocument();
    expect(screen.getByText('3 total live questions')).toBeInTheDocument();
    expect(screen.queryByText(/Main gap:/i)).not.toBeInTheDocument();
  });

  it('calls out the first real RSVP setup blocker without treating optional items as blockers', () => {
    const selection: PersistedRsvpAccessSelection = {
      primaryMode: 'private_link',
      allowNameLookupBackup: true,
    };
    const plan = buildRsvpAccessModePlan({
      guestCount: 18,
      inviteTokenCount: 18,
      householdCount: 7,
      eventCount: 2,
      emailCount: 14,
      phoneCount: 5,
    }, selection);
    const recommended = plan.find((mode) => mode.status === 'recommended') ?? plan[0];

    render(
      <GuestRsvpSettingsView
        recommendedRsvpAccessMode={recommended}
        rsvpAccessModePlan={plan}
        rsvpAccessSelection={selection}
        rsvpAuditFeed={[]}
        rsvpAuditLoading={false}
        rsvpAutoSaveState="idle"
        rsvpConfigSaving={false}
        rsvpMealEnabled={true}
        rsvpMealOptions={['Chicken']}
        rsvpQuestionTemplateCoverage={[]}
        rsvpQuestions={[]}
        rsvpSetupChecklist={buildRsvpSetupChecklist({
          guestCount: 18,
          inviteTokenCount: 18,
          householdCount: 7,
          eventCount: 2,
          emailCount: 14,
          phoneCount: 5,
          mealEnabled: true,
          mealOptionCount: 1,
          questions: [],
        }, selection)}
        stats={{ confirmed: 10, declined: 2, pending: 6 }}
        onAddRsvpQuestionTemplate={vi.fn()}
        onSaveRsvpConfig={vi.fn()}
        onSetConfirmDialog={vi.fn()}
        onSetGuestsTab={vi.fn()}
        onSetRsvpAccessSelection={vi.fn()}
        onSetRsvpConfigDirty={vi.fn()}
        onSetRsvpMealEnabled={vi.fn()}
        onSetRsvpMealOptions={vi.fn()}
        onSetRsvpQuestions={vi.fn()}
      />,
    );

    expect(screen.getByText('Main gap: Meal choices')).toBeInTheDocument();
    expect(screen.getByText('75% ready')).toBeInTheDocument();
    expect(screen.getByText('3 of 4 checklist items ready')).toBeInTheDocument();
    expect(screen.getByText('1 blocker open')).toBeInTheDocument();
    expect(screen.getByText('2 optional improvements still open')).toBeInTheDocument();
    expect(screen.getByText('First optional gap: Question templates')).toBeInTheDocument();
    expect(screen.getByText('50% ready')).toBeInTheDocument();
    expect(screen.getByText('email only')).toBeInTheDocument();
  });
});
