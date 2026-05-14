import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoordinatorCheckInQueuePanel } from './CoordinatorModePanels';
import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import type { CoordinatorCheckInBoard } from '../../../lib/coordinatorCheckInBoard';
import type { CoordinatorDoorStatusContext } from '../../../lib/coordinatorCheckInStatus';

const guests: GuestLiteForCoordinator[] = [
  {
    id: 'guest-1',
    first_name: 'Maya',
    last_name: 'Patel',
    name: 'Maya Patel',
    email: 'maya@example.com',
    invite_token: 'guest-token-1',
    rsvp_status: 'confirmed',
    event_arrivals: {
      'event-1': {
        seating_event_id: 'seat-1',
        table_id: 'table-1',
        table_name: 'Table 1',
        checked_in_at: null,
        is_seated: true,
      },
    },
  },
  {
    id: 'guest-2',
    first_name: 'Leo',
    last_name: 'Patel',
    name: 'Leo Patel',
    email: 'leo@example.com',
    invite_token: 'guest-token-2',
    rsvp_status: 'confirmed',
    event_arrivals: {
      'event-1': {
        seating_event_id: 'seat-1',
        table_id: null,
        table_name: 'Unassigned',
        checked_in_at: '2026-05-13T12:00:00.000Z',
        is_seated: false,
      },
    },
  },
];

const checkInBoard: CoordinatorCheckInBoard = {
  eventLabel: 'Reception door',
  eventProgressLabel: '0 in · 2 waiting',
  statusLabel: 'Reception is ready to keep moving',
  tone: 'ready',
  activeLabel: 'No active guest selected',
  nextReadyLabel: 'Maya Patel',
  queueLabel: '1 ready · 1 review · 0 checked in',
  reviewLabel: '1 need review before arrival',
};

const checkInStatusContext: CoordinatorDoorStatusContext = {
  currentEventId: 'event-1',
  eventGuestIds: { 'event-1': new Set(['guest-1', 'guest-2']) },
  eventSeatingConfiguredIds: new Set(['event-1']),
  guests,
};

function renderPanel(overrides: Partial<React.ComponentProps<typeof CoordinatorCheckInQueuePanel>> = {}) {
  const onCheckInGuest = vi.fn();
  const onEscalateDoorReview = vi.fn();
  const onSelectGuest = vi.fn();

  render(
    <CoordinatorCheckInQueuePanel
      activeGuestId={null}
      canCheckIn
      canEditQna
      checkInBoard={checkInBoard}
      checkInEventName="Reception"
      checkInBoardTargetId={null}
      checkInBusyGuestId={null}
      checkInFilter="arrivals"
      checkInQuery=""
      checkInQueue={guests}
      checkInReviewOnly={false}
      checkInStatusContext={checkInStatusContext}
      checkInTargetState={{ activeGuestId: null, boardTargetId: null, isBoardTargetActive: false, label: null }}
      checkInWatchCount={1}
      isFocused={false}
      nextArrivals={guests}
      siteSlug="maya-and-leo"
      onActiveGuestCheckIn={() => {}}
      onCheckInGuest={onCheckInGuest}
      onEscalateDoorReview={onEscalateDoorReview}
      onFocusFirstQueueGuest={() => {}}
      onFocusLane={() => {}}
      onReadyNowClick={() => {}}
      onReviewOnlyClick={() => {}}
      onRouteGuest={() => {}}
      onRouteNoMatch={() => {}}
      onSelectGuest={onSelectGuest}
      onSetFilter={() => {}}
      onSetQuery={() => {}}
      {...overrides}
    />,
  );

  return { onCheckInGuest, onEscalateDoorReview, onSelectGuest };
}

describe('Coordinator QR scanner integration', () => {
  it('opens the real guest view from the coordinator queue without exposing a raw token label', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPanel();

    fireEvent.click(screen.getAllByRole('button', { name: 'Guest view' })[0]);

    expect(openSpy).toHaveBeenCalledWith(
      '/site/maya-and-leo?previewGuest=guest-1&previewSurface=public',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });

  it('renders the QR scanner inside the coordinator check-in panel', () => {
    renderPanel();

    expect(screen.getByText('Scan guest QR')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste a guest RSVP/check-in URL or invite token')).toBeInTheDocument();
  });

  it('shows a confirm button for a valid guest token and calls the check-in action only after confirmation', async () => {
    const { onCheckInGuest, onSelectGuest } = renderPanel();

    fireEvent.change(screen.getByPlaceholderText('Paste a guest RSVP/check-in URL or invite token'), { target: { value: 'guest-token-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate code' }));

    await screen.findByRole('button', { name: 'Confirm check-in' });
    expect(onCheckInGuest).not.toHaveBeenCalled();
    expect(onSelectGuest).toHaveBeenCalledWith('guest-1');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm check-in' }));
    expect(onCheckInGuest).toHaveBeenCalledWith(expect.objectContaining({ id: 'guest-1' }));
  });

  it('shows already checked-in state without a confirm button', async () => {
    renderPanel();

    fireEvent.change(screen.getByPlaceholderText('Paste a guest RSVP/check-in URL or invite token'), { target: { value: 'guest-token-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate code' }));

    await screen.findByText('Already checked in');
    expect(screen.queryByRole('button', { name: 'Confirm check-in' })).not.toBeInTheDocument();
  });

  it('blocks wrong-event guests and offers exception routing', async () => {
    const { onEscalateDoorReview } = renderPanel({
      checkInStatusContext: {
        ...checkInStatusContext,
        eventGuestIds: { 'event-1': new Set(['guest-2']) },
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Paste a guest RSVP/check-in URL or invite token'), { target: { value: 'guest-token-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate code' }));

    await screen.findByText('Wrong event guest');
    expect(screen.queryByRole('button', { name: 'Confirm check-in' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Route to issue desk' }));
    expect(onEscalateDoorReview).toHaveBeenCalledWith(expect.objectContaining({ id: 'guest-1' }));
  });

  it('keeps public hub and malformed QR payloads in guidance mode', async () => {
    renderPanel();

    const input = screen.getByPlaceholderText('Paste a guest RSVP/check-in URL or invite token');
    fireEvent.change(input, { target: { value: 'https://maya-and-leo.dayof.love/event/maya-and-leo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate code' }));
    await screen.findByText('Public hub QR detected');
    expect(screen.queryByRole('button', { name: 'Confirm check-in' })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'not a url' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate code' }));
    await screen.findByText('Malformed QR');
    await waitFor(() => {
      expect(screen.getByText('Malformed QR. Search the guest manually.')).toBeInTheDocument();
    });
  });
});
