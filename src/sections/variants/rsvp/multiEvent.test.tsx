import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rsvpDefaultDefinition } from './multiEvent';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

describe('RSVP multi-event variant', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    sessionStorage.clear();
  });

  it('keeps embedded-form helper copy guest-facing', () => {
    const Component = rsvpDefaultDefinition.Component;

    render(
      <Component
        siteSlug="alex-jordan-demo"
        data={{
          ...rsvpDefaultDefinition.defaultData,
          mode: 'embed',
          embedUrl: 'https://example.com/rsvp',
        }}
      />,
    );

    expect(screen.getByText('If the RSVP form does not appear, please refresh this page or reach out to the couple directly.')).toBeInTheDocument();
    expect(screen.queryByText(/embedded RSVP is enabled|section|provider|token|database/i)).not.toBeInTheDocument();
  });

  it('drops unsafe embed URLs and falls back to the native RSVP form', () => {
    const Component = rsvpDefaultDefinition.Component;
    const { container } = render(
      <Component
        siteSlug="alex-jordan-demo"
        data={{
          ...rsvpDefaultDefinition.defaultData,
          mode: 'embed',
          embedUrl: 'javascript:alert(1)',
        }}
      />,
    );

    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('iframe[src^="javascript:"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Send RSVP' })).toBeInTheDocument();
  });

  it('drops unsafe illustrated RSVP image URLs before render', () => {
    const Component = rsvpDefaultDefinition.Component;
    const { container } = render(
      <Component
        siteSlug="alex-jordan-demo"
        data={{
          ...rsvpDefaultDefinition.defaultData,
          layoutStyle: 'illustrated',
          imageUrl: 'https://image.thum.io/get/https://example.com',
        }}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="image.thum.io"]')).toBeNull();
  });

  it('keeps safe same-origin illustrated RSVP images', () => {
    const Component = rsvpDefaultDefinition.Component;
    render(
      <Component
        siteSlug="alex-jordan-demo"
        data={{
          ...rsvpDefaultDefinition.defaultData,
          layoutStyle: 'illustrated',
          imageUrl: '/preview-photos/header-anchor.jpg',
        }}
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute('src', '/preview-photos/header-anchor.jpg');
  });

  it('submits through the gated public-site RSVP function with stored access state', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    sessionStorage.setItem('dayof_invite_token_alex-jordan-demo', 'invite-123');
    sessionStorage.setItem('dayof_pw_session_alex-jordan-demo', 'pw-session-123');

    const Component = rsvpDefaultDefinition.Component;
    render(
      <Component
        siteSlug="alex-jordan-demo"
        data={{
          ...rsvpDefaultDefinition.defaultData,
          mode: 'form',
        }}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Your full name'), { target: { value: 'Taylor Guest' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'taylor@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Joyfully accepts' }));
    fireEvent.change(screen.getByDisplayValue('1 guest'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('Vegetarian, vegan, gluten-free, allergies...'), { target: { value: 'Vegetarian' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send RSVP' }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('public-site-rsvp-submit', expect.objectContaining({
        body: expect.objectContaining({
          slug: 'alex-jordan-demo',
          inviteToken: 'invite-123',
          passwordSession: 'pw-session-123',
          guestName: 'Taylor Guest',
          guestEmail: 'taylor@example.com',
          rsvpStatus: 'attending',
          guestCount: 2,
          dietaryNotes: 'Vegetarian',
        }),
      }));
    });

    expect(await screen.findByText('We got your RSVP!')).toBeInTheDocument();
  });

  it('clears stale RSVP submission errors as soon as the guest edits the form again', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: new Error('submit failed') });

    const Component = rsvpDefaultDefinition.Component;
    render(
      <Component
        siteSlug="alex-jordan-demo"
        data={{
          ...rsvpDefaultDefinition.defaultData,
          mode: 'form',
        }}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Your full name'), { target: { value: 'Taylor Guest' } });
    fireEvent.click(screen.getByRole('button', { name: 'Joyfully accepts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send RSVP' }));

    expect(await screen.findByText('Something went wrong. Please try again or contact us directly.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Vegetarian, vegan, gluten-free, allergies...'), { target: { value: 'Vegetarian' } });

    await waitFor(() => {
      expect(screen.queryByText('Something went wrong. Please try again or contact us directly.')).not.toBeInTheDocument();
    });
  });
});
