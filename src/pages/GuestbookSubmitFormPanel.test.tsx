import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { GuestbookSubmitFormPanel } from './GuestbookSubmitFormPanel';

describe('GuestbookSubmitFormPanel', () => {
  it('renders visible guest-safe validation state on the shared guestbook form panel', () => {
    render(
      <MemoryRouter>
        <GuestbookSubmitFormPanel
          siteSlug="maya-leo"
          guestName=""
          guestEmail=""
          message=""
          website=""
          status={null}
          error="Write a note before sending."
          submitting={false}
          inputClassName="input"
          labelClassName="label"
          onSubmit={vi.fn()}
          onGuestNameChange={vi.fn()}
          onGuestEmailChange={vi.fn()}
          onMessageChange={vi.fn()}
          onWebsiteChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Write a note before sending.');
    expect(screen.getByLabelText('Note')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Note')).toHaveAttribute('aria-describedby', 'guestbook-message-error guestbook-message-count');
    expect(screen.queryByText(/secure token/i)).not.toBeInTheDocument();
  });

  it('keeps the shared guestbook panel wired to the wedding hub return path', () => {
    render(
      <MemoryRouter>
        <GuestbookSubmitFormPanel
          siteSlug="maya-leo"
          guestName="Maya"
          guestEmail=""
          message="Loved celebrating with you."
          website=""
          status="Note sent."
          error={null}
          submitting={false}
          inputClassName="input"
          labelClassName="label"
          onSubmit={vi.fn()}
          onGuestNameChange={vi.fn()}
          onGuestEmailChange={vi.fn()}
          onMessageChange={vi.fn()}
          onWebsiteChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Note sent.');
    expect(screen.getByRole('link', { name: 'Back to wedding hub' })).toHaveAttribute('href', '/event/maya-leo');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the hidden honeypot field out of the focus order', () => {
    const { container } = render(
      <MemoryRouter>
        <GuestbookSubmitFormPanel
          siteSlug="maya-leo"
          guestName=""
          guestEmail=""
          message=""
          website=""
          status={null}
          error={null}
          submitting={false}
          inputClassName="input"
          labelClassName="label"
          onSubmit={vi.fn()}
          onGuestNameChange={vi.fn()}
          onGuestEmailChange={vi.fn()}
          onMessageChange={vi.fn()}
          onWebsiteChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    const hiddenInput = container.querySelector('input[tabindex="-1"]');
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput).toHaveAttribute('tabindex', '-1');
  });

  it('keeps the hub return path available even while the form is submitting', () => {
    const { container } = render(
      <MemoryRouter>
        <GuestbookSubmitFormPanel
          siteSlug="maya-leo"
          guestName="Maya"
          guestEmail=""
          message="Loved celebrating with you."
          website=""
          status={null}
          error={null}
          submitting
          inputClassName="input"
          labelClassName="label"
          onSubmit={vi.fn()}
          onGuestNameChange={vi.fn()}
          onGuestEmailChange={vi.fn()}
          onMessageChange={vi.fn()}
          onWebsiteChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    const submitButton = screen.getByRole('button', { name: 'Sending…' });
    const busyForm = container.querySelector('form[aria-busy="true"]');
    expect(busyForm).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Back to wedding hub' })).toHaveAttribute('href', '/event/maya-leo');
  });
});
