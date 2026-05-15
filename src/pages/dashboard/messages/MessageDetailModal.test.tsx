import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageDetailModal } from './MessageDetailModal';
import type { DeliveryRow, Message } from './messageDashboardTypes';

const message = (overrides: Partial<Message> = {}): Message => ({
  id: 'message-1',
  subject: 'RSVP reminder',
  body: 'Please reply soon.',
  sent_at: '2026-05-13T12:00:00.000Z',
  scheduled_for: null,
  status: 'failed',
  channel: 'email',
  audience_filter: 'not_responded',
  recipient_filter: null,
  recipient_count: 4,
  delivered_count: 1,
  failed_count: 2,
  ...overrides,
});

const deliveries = (rows: Partial<DeliveryRow>[]): DeliveryRow[] => rows.map((row, index) => ({
  id: `delivery-${index + 1}`,
  message_id: 'message-1',
  guest_id: `guest-${index + 1}`,
  status: 'failed',
  provider_message_id: null,
  error_message: 'Delivery needs review',
  attempted_at: '2026-05-13T12:00:00.000Z',
  delivered_at: null,
  recipient_email: `guest${index + 1}@example.com`,
  recipient_name: `Guest ${index + 1}`,
  ...row,
}));

describe('MessageDetailModal', () => {
  it('shows focused retry and exclusion controls for reviewed rows', async () => {
    const onRetryFailedRecipients = vi.fn().mockResolvedValue(undefined);
    const onExcludeSkippedRecipients = vi.fn().mockResolvedValue(undefined);

    render(
      <MessageDetailModal
        message={message()}
        deliveries={deliveries([
          { guest_id: 'guest-failed', status: 'failed', recipient_name: 'Jordan Lane', recipient_email: 'jordan@example.com', error_message: 'Resend bounced recipient' },
          { guest_id: 'guest-skipped', status: 'skipped', recipient_name: 'Sam Vale', recipient_email: '', error_message: 'Skipped: guest is missing a valid email address' },
        ])}
        canManageCampaigns
        onClose={vi.fn()}
        onRetry={vi.fn().mockResolvedValue(undefined)}
        onRetryFailedRecipients={onRetryFailedRecipients}
        onExcludeSkippedRecipients={onExcludeSkippedRecipients}
        onSendScheduledNow={vi.fn().mockResolvedValue(undefined)}
        onReschedule={vi.fn().mockResolvedValue(undefined)}
        onCancelSchedule={vi.fn().mockResolvedValue(undefined)}
        onLoadIntoComposer={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry reviewed guests only' }));
    await waitFor(() => expect(onRetryFailedRecipients).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Exclude from the next send' }));
    await waitFor(() => expect(onExcludeSkippedRecipients).toHaveBeenCalledTimes(1));

    expect(screen.getByText('Email address needs review')).toBeInTheDocument();
    expect(screen.getByText('Missing contact details')).toBeInTheDocument();
  });

  it('surfaces the saved next-send review plan', () => {
    render(
      <MessageDetailModal
        message={message({
          recipient_filter: {
            retry_guest_ids: ['g1', 'g2'],
            excluded_guest_ids: ['g3'],
          },
        })}
        deliveries={deliveries([])}
        canManageCampaigns
        onClose={vi.fn()}
        onRetry={vi.fn().mockResolvedValue(undefined)}
        onRetryFailedRecipients={vi.fn().mockResolvedValue(undefined)}
        onExcludeSkippedRecipients={vi.fn().mockResolvedValue(undefined)}
        onSendScheduledNow={vi.fn().mockResolvedValue(undefined)}
        onReschedule={vi.fn().mockResolvedValue(undefined)}
        onCancelSchedule={vi.fn().mockResolvedValue(undefined)}
        onLoadIntoComposer={vi.fn()}
      />,
    );

    expect(screen.getByText('Next-send review plan')).toBeInTheDocument();
    expect(screen.getByText(/next send targets 2 reviewed guests and excludes 1 guest still missing contact details/i)).toBeInTheDocument();
    expect(screen.getByText('Targeted 4')).toBeInTheDocument();
    expect(screen.getByText('Delivered 1')).toBeInTheDocument();
    expect(screen.getByText('Needs review 2')).toBeInTheDocument();
    expect(screen.getByText('Not reached 1')).toBeInTheDocument();
    expect(screen.getByText('25% delivered coverage · 50% review coverage · 0% needs contact · 25% unreached')).toBeInTheDocument();
    expect(screen.getByText('75% cleanup still pending')).toBeInTheDocument();
    expect(screen.getByText('25% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('1 recipient already closed out')).toBeInTheDocument();
    expect(screen.getByText('Main cleanup: delivery review')).toBeInTheDocument();
    expect(screen.getByText('100% open · 0% click · 0% reply')).toBeInTheDocument();
    expect(screen.getByText('Some guests still were not reached after a valid send attempt.')).toBeInTheDocument();
  });

  it('shows contact-cleanup guidance when skipped and unreached recipients both exist', () => {
    render(
      <MessageDetailModal
        message={message({
          recipient_count: 5,
          delivered_count: 1,
          failed_count: 2,
        })}
        deliveries={deliveries([
          { guest_id: 'guest-failed', status: 'failed', recipient_name: 'Jordan Lane', recipient_email: 'jordan@example.com', error_message: 'Resend bounced recipient' },
          { guest_id: 'guest-skipped', status: 'skipped', recipient_name: 'Sam Vale', recipient_email: '', error_message: 'Skipped: guest is missing a valid email address' },
        ])}
        canManageCampaigns
        onClose={vi.fn()}
        onRetry={vi.fn().mockResolvedValue(undefined)}
        onRetryFailedRecipients={vi.fn().mockResolvedValue(undefined)}
        onExcludeSkippedRecipients={vi.fn().mockResolvedValue(undefined)}
        onSendScheduledNow={vi.fn().mockResolvedValue(undefined)}
        onReschedule={vi.fn().mockResolvedValue(undefined)}
        onCancelSchedule={vi.fn().mockResolvedValue(undefined)}
        onLoadIntoComposer={vi.fn()}
      />,
    );

    expect(screen.getByText('Needs contact 1')).toBeInTheDocument();
    expect(screen.getByText('Not reached 1')).toBeInTheDocument();
    expect(screen.getByText('Targeted 5')).toBeInTheDocument();
    expect(screen.getByText('20% delivered coverage · 40% review coverage · 20% needs contact · 20% unreached')).toBeInTheDocument();
    expect(screen.getByText('80% cleanup still pending')).toBeInTheDocument();
    expect(screen.getByText('20% follow-through ready')).toBeInTheDocument();
    expect(screen.getByText('1 recipient already closed out')).toBeInTheDocument();
    expect(screen.getByText('Main cleanup: delivery review')).toBeInTheDocument();
    expect(screen.getByText('Clean up contact details first, then decide whether unreached guests need another send.')).toBeInTheDocument();
  });

  it('keeps queued and partial headers truthful instead of calling them sent', () => {
    const { rerender } = render(
      <MessageDetailModal
        message={message({ status: 'queued', sent_at: null })}
        deliveries={deliveries([])}
        canManageCampaigns
        onClose={vi.fn()}
        onRetry={vi.fn().mockResolvedValue(undefined)}
        onRetryFailedRecipients={vi.fn().mockResolvedValue(undefined)}
        onExcludeSkippedRecipients={vi.fn().mockResolvedValue(undefined)}
        onSendScheduledNow={vi.fn().mockResolvedValue(undefined)}
        onReschedule={vi.fn().mockResolvedValue(undefined)}
        onCancelSchedule={vi.fn().mockResolvedValue(undefined)}
        onLoadIntoComposer={vi.fn()}
      />,
    );

    expect(screen.getByText('Queued — waiting to start')).toBeInTheDocument();
    expect(screen.queryByText(/^Sent /)).not.toBeInTheDocument();

    rerender(
      <MessageDetailModal
        message={message({ status: 'partial', sent_at: null, delivered_count: 2, failed_count: 1 })}
        deliveries={deliveries([])}
        canManageCampaigns
        onClose={vi.fn()}
        onRetry={vi.fn().mockResolvedValue(undefined)}
        onRetryFailedRecipients={vi.fn().mockResolvedValue(undefined)}
        onExcludeSkippedRecipients={vi.fn().mockResolvedValue(undefined)}
        onSendScheduledNow={vi.fn().mockResolvedValue(undefined)}
        onReschedule={vi.fn().mockResolvedValue(undefined)}
        onCancelSchedule={vi.fn().mockResolvedValue(undefined)}
        onLoadIntoComposer={vi.fn()}
      />,
    );

    expect(screen.getByText('Needs follow-up — some guests still need attention')).toBeInTheDocument();
    expect(screen.queryByText(/^Sent /)).not.toBeInTheDocument();
  });

  it('shows normalized engagement counters when the message metadata includes them', () => {
    render(
      <MessageDetailModal
        message={message({
          status: 'sent',
          recipient_filter: {
            opened_count: 8,
            viewed_count: 3,
            clicked_count: 2,
            replied_count: 1,
            bounced_count: 1,
          },
          delivered_count: 8,
          failed_count: 1,
        })}
        deliveries={deliveries([])}
        canManageCampaigns
        onClose={vi.fn()}
        onRetry={vi.fn().mockResolvedValue(undefined)}
        onRetryFailedRecipients={vi.fn().mockResolvedValue(undefined)}
        onExcludeSkippedRecipients={vi.fn().mockResolvedValue(undefined)}
        onSendScheduledNow={vi.fn().mockResolvedValue(undefined)}
        onReschedule={vi.fn().mockResolvedValue(undefined)}
        onCancelSchedule={vi.fn().mockResolvedValue(undefined)}
        onLoadIntoComposer={vi.fn()}
      />,
    );

    expect(screen.getByText('8 opened')).toBeInTheDocument();
    expect(screen.getByText('3 viewed')).toBeInTheDocument();
    expect(screen.getByText('2 clicked')).toBeInTheDocument();
    expect(screen.getByText('1 replied')).toBeInTheDocument();
    expect(screen.getByText('1 bounced')).toBeInTheDocument();
    expect(screen.getAllByText('100% open · 25% click · 13% reply').length).toBeGreaterThan(0);
  });
});
