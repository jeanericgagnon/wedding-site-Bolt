import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GuestContactLookupPanel } from './GuestContactLookupPanel';

describe('GuestContactLookupPanel', () => {
  it('keeps guest lookup helpers in invitation-link language instead of technical token language', () => {
    render(
      <GuestContactLookupPanel
        query=""
        verifier=""
        searching={false}
        matches={[]}
        selectedContactSession=""
        onQueryChange={vi.fn()}
        onVerifierChange={vi.fn()}
        onSearch={vi.fn()}
        onSelectContactSession={vi.fn()}
        canSearch
      />,
    );

    expect(screen.getByText(/If you opened this from your invitation link/i)).toBeInTheDocument();
    expect(screen.queryByText(/secure token/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find' })).toBeEnabled();
  });

  it('shows the match selector with party size details when results are available', () => {
    render(
      <GuestContactLookupPanel
        query="Maya Lee"
        verifier="maya"
        searching={false}
        matches={[{ contact_session: 'session-1', name: 'Maya Lee', household_size: 3 }]}
        selectedContactSession="session-1"
        onQueryChange={vi.fn()}
        onVerifierChange={vi.fn()}
        onSearch={vi.fn()}
        onSelectContactSession={vi.fn()}
        canSearch
      />,
    );

    expect(screen.getByLabelText('Select your name')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Maya Lee (party of 3)' })).toBeInTheDocument();
  });

  it('routes match selection through the shared lookup panel controls', () => {
    const onSearch = vi.fn();
    const onSelectContactSession = vi.fn();

    render(
      <GuestContactLookupPanel
        query="Maya Lee"
        verifier="maya"
        searching={false}
        matches={[
          { contact_session: 'session-1', name: 'Maya Lee', household_size: 2 },
          { contact_session: 'session-2', name: 'Leo Hart', household_size: 1 },
        ]}
        selectedContactSession="session-1"
        onQueryChange={vi.fn()}
        onVerifierChange={vi.fn()}
        onSearch={onSearch}
        onSelectContactSession={onSelectContactSession}
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
        searching={false}
        matches={[]}
        selectedContactSession=""
        onQueryChange={vi.fn()}
        onVerifierChange={vi.fn()}
        onSearch={vi.fn()}
        onSelectContactSession={vi.fn()}
        canSearch
      />,
    );

    expect(screen.queryByLabelText('Select your name')).not.toBeInTheDocument();
  });

  it('disables the shared search action while a lookup is already in progress', () => {
    render(
      <GuestContactLookupPanel
        query="Maya Lee"
        verifier="maya"
        searching
        matches={[]}
        selectedContactSession=""
        onQueryChange={vi.fn()}
        onVerifierChange={vi.fn()}
        onSearch={vi.fn()}
        onSelectContactSession={vi.fn()}
        canSearch
      />,
    );

    expect(screen.getByRole('button', { name: 'Searching…' })).toBeDisabled();
  });
});
