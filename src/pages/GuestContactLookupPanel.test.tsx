import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GuestContactLookupPanel } from './GuestContactLookupPanel';

describe('GuestContactLookupPanel', () => {
  it('keeps guest lookup helpers in invitation-link language instead of technical token language', () => {
    render(
      <GuestContactLookupPanel
        query=""
        verifier=""
        householdVerifier=""
        searching={false}
        matches={[]}
        selectedContactSession=""
        selectedHouseholdSize={1}
        selectedHouseholdAllowed={false}
        applyHousehold={false}
        onQueryChange={vi.fn()}
        onVerifierChange={vi.fn()}
        onHouseholdVerifierChange={vi.fn()}
        onSearch={vi.fn()}
        onSelectContactSession={vi.fn()}
        onToggleApplyHousehold={vi.fn()}
        canSearch
      />,
    );

    expect(screen.getByText(/If you opened this from your invitation link/i)).toBeInTheDocument();
    expect(screen.queryByText(/secure token/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find' })).toBeEnabled();
  });

  it('shows the whole-party helper only when household updates still need phone verification', () => {
    render(
      <GuestContactLookupPanel
        query="Maya Lee"
        verifier="maya"
        householdVerifier=""
        searching={false}
        matches={[{ contact_session: 'session-1', name: 'Maya Lee', household_size: 3, household_updates_allowed: false }]}
        selectedContactSession="session-1"
        selectedHouseholdSize={3}
        selectedHouseholdAllowed={false}
        applyHousehold={false}
        onQueryChange={vi.fn()}
        onVerifierChange={vi.fn()}
        onHouseholdVerifierChange={vi.fn()}
        onSearch={vi.fn()}
        onSelectContactSession={vi.fn()}
        onToggleApplyHousehold={vi.fn()}
        canSearch
      />,
    );

    expect(screen.getByText('To update your whole party, add the last 4 digits of the phone number on file and search again.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('routes match selection through the shared lookup panel controls', () => {
    const onSearch = vi.fn();
    const onSelectContactSession = vi.fn();

    render(
      <GuestContactLookupPanel
        query="Maya Lee"
        verifier="maya"
        householdVerifier="1234"
        searching={false}
        matches={[
          { contact_session: 'session-1', name: 'Maya Lee', household_size: 2, household_updates_allowed: true },
          { contact_session: 'session-2', name: 'Leo Hart', household_size: 1, household_updates_allowed: false },
        ]}
        selectedContactSession="session-1"
        selectedHouseholdSize={2}
        selectedHouseholdAllowed={true}
        applyHousehold={true}
        onQueryChange={vi.fn()}
        onVerifierChange={vi.fn()}
        onHouseholdVerifierChange={vi.fn()}
        onSearch={onSearch}
        onSelectContactSession={onSelectContactSession}
        onToggleApplyHousehold={vi.fn()}
        canSearch
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Find' }));
    fireEvent.change(screen.getByLabelText('Select your name'), { target: { value: 'session-2' } });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSelectContactSession).toHaveBeenCalledWith('session-2');
  });

  it('keeps match selection and whole-party controls hidden when no matches are available yet', () => {
    render(
      <GuestContactLookupPanel
        query="Maya Lee"
        verifier="maya"
        householdVerifier=""
        searching={false}
        matches={[]}
        selectedContactSession=""
        selectedHouseholdSize={1}
        selectedHouseholdAllowed={false}
        applyHousehold={false}
        onQueryChange={vi.fn()}
        onVerifierChange={vi.fn()}
        onHouseholdVerifierChange={vi.fn()}
        onSearch={vi.fn()}
        onSelectContactSession={vi.fn()}
        onToggleApplyHousehold={vi.fn()}
        canSearch
      />,
    );

    expect(screen.queryByLabelText('Select your name')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/whole party/i)).not.toBeInTheDocument();
  });

  it('disables the shared search action while a lookup is already in progress', () => {
    render(
      <GuestContactLookupPanel
        query="Maya Lee"
        verifier="maya"
        householdVerifier=""
        searching
        matches={[]}
        selectedContactSession=""
        selectedHouseholdSize={1}
        selectedHouseholdAllowed={false}
        applyHousehold={false}
        onQueryChange={vi.fn()}
        onVerifierChange={vi.fn()}
        onHouseholdVerifierChange={vi.fn()}
        onSearch={vi.fn()}
        onSelectContactSession={vi.fn()}
        onToggleApplyHousehold={vi.fn()}
        canSearch
      />,
    );

    expect(screen.getByRole('button', { name: 'Searching…' })).toBeDisabled();
  });
});
