import { useState } from 'react';

import {
  type Guest,
  type Message,
  type Toast,
} from './messageDashboardTypes';
import {
  describeRecipientReview,
  getRecipientExcludedGuestIds,
  getRecipientRetryGuestIds,
  hasReachableEmail,
  hasReachableSms,
  isPastScheduledTime,
  safeMessagesError,
} from './messageDashboardUtils';
import { formatScheduledMessageDateTime } from '../messageScheduleTime';
import {
  triggerDashboardBulkSend,
  triggerScheduledMessageDispatch,
  updateDashboardMessage,
} from './messageService';

interface UseMessageDeliveryActionsInput {
  canCompose: boolean;
  deliveries: Array<{ guest_id?: string | null; message_id: string; status: string }>;
  getRecipients: (audience: string) => Guest[];
  isDemoMode: boolean;
  isSmsProviderEnabled: boolean;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  toast: (message: string, type?: Toast['type']) => void;
  fetchMessages: () => Promise<void>;
}

export function useMessageDeliveryActions({
  canCompose,
  deliveries,
  getRecipients,
  isDemoMode,
  isSmsProviderEnabled,
  messages,
  setMessages,
  toast,
  fetchMessages,
}: UseMessageDeliveryActionsInput) {
  const [processingScheduled, setProcessingScheduled] = useState(false);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);

  function getScopedRecipients(message: Message): Guest[] {
    const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
    const recipients = getRecipients(audience);
    const retryGuestIds = getRecipientRetryGuestIds(message);
    const excludedGuestIds = new Set(getRecipientExcludedGuestIds(message));
    const scopedByRetry = retryGuestIds.length > 0
      ? recipients.filter((guest) => retryGuestIds.includes(guest.id))
      : recipients;
    return scopedByRetry.filter((guest) => !excludedGuestIds.has(guest.id));
  }

  function getDeliveryGuestIds(message: Message, statuses: string[]) {
    return Array.from(new Set(
      deliveries
        .filter((delivery) => delivery.message_id === message.id && statuses.includes(delivery.status) && typeof delivery.guest_id === 'string' && delivery.guest_id.trim())
        .map((delivery) => String(delivery.guest_id).trim()),
    ));
  }

  async function updateMessageRecipientFilter(message: Message, patch: Record<string, unknown>) {
    await updateDashboardMessage(message.id, {
      recipient_filter: {
        ...(message.recipient_filter ?? {}),
        ...patch,
      },
    });
  }

  async function handleRetry(message: Message) {
    if (!canCompose) {
      toast('Your collaborator role cannot retry campaign sends.', 'info');
      return;
    }

    if (message.channel === 'sms' && !isSmsProviderEnabled) {
      toast('Text sending is not ready yet. Finish provider setup first.', 'info');
      return;
    }

    if (!['failed', 'partial'].includes(message.status)) {
      toast(message.status === 'partial'
        ? 'Campaigns that need follow-up are not retried in place here because that can duplicate sends. Duplicate the campaign and target the missed guests instead.'
        : 'Only campaigns needing review can be retried from this control.', 'info');
      return;
    }

    setRetryingMessageId(message.id);
    try {
      if (isDemoMode) {
        const recipients = getScopedRecipients(message);
        const deliveredCount = message.channel === 'sms'
          ? recipients.filter((guest) => hasReachableSms(guest)).length
          : recipients.filter((guest) => hasReachableEmail(guest.email)).length;
        const skippedCount = Math.max(recipients.length - deliveredCount, 0);

        setMessages((prev) => prev.map((item) => (
          item.id === message.id
            ? {
                ...item,
                status: skippedCount > 0 ? 'partial' : 'sent',
                sent_at: new Date().toISOString(),
                delivered_count: deliveredCount,
                failed_count: 0,
                recipient_count: recipients.length,
                recipient_filter: {
                  ...(item.recipient_filter ?? {}),
                  recipient_count: recipients.length,
                  reachable_count: deliveredCount,
                  skipped_count: skippedCount,
                  retry_guest_ids: getRecipientRetryGuestIds(message),
                  excluded_guest_ids: getRecipientExcludedGuestIds(message),
                },
              }
            : item
        )));

        toast(
          skippedCount > 0
            ? `Second send finished in demo: delivered ${deliveredCount} • ${describeRecipientReview(skippedCount)}.`
            : `Second send finished in demo: delivered ${deliveredCount}.`,
          skippedCount > 0 ? 'info' : 'success',
        );
        return;
      }

      await updateDashboardMessage(message.id, { status: 'queued', sent_at: null, failed_count: 0, delivered_count: 0 });
      toast('Sending again…', 'info');
      await fetchMessages();
      try {
        const result = await triggerDashboardBulkSend(message.id);
        const skipped = result.skipped ?? 0;
        if (result.failed === 0 && skipped === 0) {
          toast(`Delivered to ${result.delivered} guest${result.delivered !== 1 ? 's' : ''}`, 'success');
        } else if (result.delivered === 0 && result.failed === 0 && skipped > 0) {
          toast(`Second send finished with ${describeRecipientReview(skipped)}.`, 'info');
        } else {
          toast(
            `Sent ${result.delivered}${result.failed > 0 ? ` • ${result.failed} need review` : ''}${skipped > 0 ? ` • ${describeRecipientReview(skipped)}` : ''}`,
            result.delivered === 0 && result.failed > 0 ? 'error' : 'info',
          );
        }
      } catch (sendErr) {
        await updateDashboardMessage(message.id, {
          status: message.status,
          sent_at: message.sent_at,
          failed_count: message.failed_count,
          delivered_count: message.delivered_count,
        });
        toast(safeMessagesError(sendErr, 'Delivery needs review. Try again later.'), 'error');
      }
      await fetchMessages();
    } catch {
      toast('Couldn’t retry that message right now. Please try again.', 'error');
    } finally {
      setRetryingMessageId(null);
    }
  }

  async function handleRetryFailedRecipients(message: Message) {
    if (!canCompose) {
      toast('Your collaborator role cannot retry campaign sends.', 'info');
      return;
    }

    if (message.channel === 'sms' && !isSmsProviderEnabled) {
      toast('Text sending is not ready yet. Finish provider setup first.', 'info');
      return;
    }

    const failedGuestIds = getDeliveryGuestIds(message, ['failed']);
    if (failedGuestIds.length === 0) {
      toast('No reviewed recipients are waiting for a focused retry here.', 'info');
      return;
    }

    setRetryingMessageId(message.id);
    try {
      if (isDemoMode) {
        const nextMessage = {
          ...message,
          recipient_filter: {
            ...(message.recipient_filter ?? {}),
            retry_guest_ids: failedGuestIds,
          },
        } as Message;
        const recipients = getScopedRecipients(nextMessage);
        const deliveredCount = message.channel === 'sms'
          ? recipients.filter((guest) => hasReachableSms(guest)).length
          : recipients.filter((guest) => hasReachableEmail(guest.email)).length;
        const skippedCount = Math.max(recipients.length - deliveredCount, 0);

        setMessages((prev) => prev.map((item) => (
          item.id === message.id
            ? {
                ...item,
                status: skippedCount > 0 ? 'partial' : 'sent',
                sent_at: new Date().toISOString(),
                delivered_count: deliveredCount,
                failed_count: 0,
                recipient_count: recipients.length,
                recipient_filter: {
                  ...(item.recipient_filter ?? {}),
                  retry_guest_ids: failedGuestIds,
                  recipient_count: recipients.length,
                  reachable_count: deliveredCount,
                  skipped_count: skippedCount,
                },
              }
            : item
        )));

        toast(
          skippedCount > 0
            ? `Focused retry finished in demo: delivered ${deliveredCount} • ${describeRecipientReview(skippedCount)}.`
            : `Focused retry finished in demo: delivered ${deliveredCount}.`,
          skippedCount > 0 ? 'info' : 'success',
        );
        return;
      }

      await updateMessageRecipientFilter(message, { retry_guest_ids: failedGuestIds });
      await handleRetry({
        ...message,
        recipient_filter: {
          ...(message.recipient_filter ?? {}),
          retry_guest_ids: failedGuestIds,
        },
      });
    } catch {
      toast('Couldn’t prepare a focused retry right now. Please try again.', 'error');
    } finally {
      setRetryingMessageId(null);
    }
  }

  async function handleExcludeSkippedRecipients(message: Message) {
    if (!canCompose) {
      toast('Your collaborator role cannot change recipient review rules here.', 'info');
      return;
    }

    const skippedGuestIds = getDeliveryGuestIds(message, ['skipped']);
    if (skippedGuestIds.length === 0) {
      toast('Everyone in this send already has usable contact details.', 'info');
      return;
    }

    const excludedGuestIds = Array.from(new Set([
      ...getRecipientExcludedGuestIds(message),
      ...skippedGuestIds,
    ]));

    try {
      if (isDemoMode) {
        setMessages((prev) => prev.map((item) => (
          item.id === message.id
            ? {
                ...item,
                recipient_filter: {
                  ...(item.recipient_filter ?? {}),
                  excluded_guest_ids: excludedGuestIds,
                },
              }
            : item
        )));
        toast(`Next send will skip ${skippedGuestIds.length} ${skippedGuestIds.length === 1 ? 'recipient' : 'recipients'} still missing contact details.`, 'info');
        return;
      }

      await updateMessageRecipientFilter(message, { excluded_guest_ids: excludedGuestIds });
      await fetchMessages();
      toast(`Next send will skip ${skippedGuestIds.length} ${skippedGuestIds.length === 1 ? 'recipient' : 'recipients'} still missing contact details.`, 'info');
    } catch {
      toast('Couldn’t update that review rule right now. Please try again.', 'error');
    }
  }

  async function handleSendScheduledNow(message: Message) {
    if (!canCompose) {
      toast('Your collaborator role cannot send campaigns from Messaging.', 'info');
      return;
    }

    if (message.channel === 'sms' && !isSmsProviderEnabled) {
      toast('Text sending is not ready yet. Finish provider setup first.', 'info');
      return;
    }

      if (isDemoMode) {
      const recipients = getScopedRecipients(message);
      const deliveredCount = message.channel === 'sms'
        ? recipients.filter((guest) => hasReachableSms(guest)).length
        : recipients.filter((guest) => hasReachableEmail(guest.email)).length;
      const skippedCount = Math.max(recipients.length - deliveredCount, 0);

      setMessages((prev) => prev.map((item) => (
        item.id === message.id
          ? {
              ...item,
              status: skippedCount > 0 ? 'partial' : 'sent',
              sent_at: new Date().toISOString(),
              delivered_count: deliveredCount,
              failed_count: 0,
              recipient_count: recipients.length,
              recipient_filter: {
                ...(item.recipient_filter ?? {}),
                recipient_count: recipients.length,
                reachable_count: deliveredCount,
                skipped_count: skippedCount,
              },
            }
          : item
      )));
      toast(
        skippedCount > 0
          ? `Scheduled message sent in demo: delivered ${deliveredCount} • ${describeRecipientReview(skippedCount)}.`
          : `Scheduled message sent in demo: delivered ${deliveredCount}.`,
        skippedCount > 0 ? 'info' : 'success',
      );
      return;
    }

    let deliveryTriggered = false;
    try {
      await updateDashboardMessage(message.id, { scheduled_for: new Date().toISOString() });

      toast('Sending scheduled message now…', 'info');
      const result = await triggerDashboardBulkSend(message.id);
      const skipped = result.skipped ?? 0;
      if (result.failed === 0 && skipped === 0) {
        toast(`Delivered to ${result.delivered} guest${result.delivered !== 1 ? 's' : ''}`, 'success');
      } else if (result.delivered === 0 && result.failed === 0 && skipped > 0) {
        toast(`No messages sent: ${describeRecipientReview(skipped)}.`, 'info');
      } else if (result.delivered === 0) {
        toast(`Delivery needs review for ${result.failed} recipient${result.failed !== 1 ? 's' : ''}${skipped > 0 ? ` • ${describeRecipientReview(skipped)}` : ''}.`, 'error');
      } else {
        toast(`Sent ${result.delivered}${result.failed > 0 ? ` • ${result.failed} need review` : ''}${skipped > 0 ? ` • ${describeRecipientReview(skipped)}` : ''}.`, 'info');
      }
      deliveryTriggered = true;
      await fetchMessages();
    } catch (err) {
      if (!isDemoMode && !deliveryTriggered) {
        await updateDashboardMessage(message.id, { scheduled_for: message.scheduled_for });
      }
      toast(safeMessagesError(err, 'Couldn’t send that scheduled message right now.'), 'error');
    }
  }

  async function handleRescheduleMessage(message: Message, scheduledFor: string) {
    if (!canCompose) {
      toast('Your collaborator role cannot reschedule campaigns.', 'info');
      return;
    }

    if (isPastScheduledTime(scheduledFor)) {
      toast('Pick a future time to reschedule. Use send now if you want it to go immediately.', 'error');
      return;
    }

    if (isDemoMode) {
      const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
      const recipients = getRecipients(audience);
      const reachableCount = message.channel === 'sms'
        ? recipients.filter((guest) => hasReachableSms(guest)).length
        : recipients.filter((guest) => hasReachableEmail(guest.email)).length;
      const skippedCount = Math.max(recipients.length - reachableCount, 0);

      setMessages((prev) => prev.map((item) => (
        item.id === message.id
          ? {
              ...item,
              status: 'scheduled',
              scheduled_for: scheduledFor,
              recipient_count: recipients.length,
              recipient_filter: {
                ...(item.recipient_filter ?? {}),
                recipient_count: recipients.length,
                reachable_count: reachableCount,
                skipped_count: skippedCount,
              },
            }
          : item
      )));
      toast(`Rescheduled for ${formatScheduledMessageDateTime(scheduledFor)}.`, 'success');
      return;
    }

    try {
      const recipients = getScopedRecipients(message);
      const reachableCount = message.channel === 'sms'
        ? recipients.filter((guest) => hasReachableSms(guest)).length
        : recipients.filter((guest) => hasReachableEmail(guest.email)).length;
      const skippedCount = Math.max(recipients.length - reachableCount, 0);

      await updateDashboardMessage(message.id, {
        status: 'scheduled',
        scheduled_for: scheduledFor,
        sent_at: null,
      });

      void updateDashboardMessage(message.id, {
        recipient_count: recipients.length,
        recipient_filter: {
          ...(message.recipient_filter ?? {}),
          recipient_count: recipients.length,
          reachable_count: reachableCount,
          skipped_count: skippedCount,
        },
      });

      toast(`Rescheduled for ${formatScheduledMessageDateTime(scheduledFor)}.`, 'success');
      await fetchMessages();
    } catch (err) {
      toast(safeMessagesError(err, 'Couldn’t reschedule that campaign right now.'), 'error');
    }
  }

  async function handleCancelSchedule(message: Message) {
    if (!canCompose) {
      toast('Your collaborator role cannot change scheduled campaigns.', 'info');
      return;
    }

    if (isDemoMode) {
      const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
      const recipients = getRecipients(audience);
      const reachableCount = message.channel === 'sms'
        ? recipients.filter((guest) => hasReachableSms(guest)).length
        : recipients.filter((guest) => hasReachableEmail(guest.email)).length;
      const skippedCount = Math.max(recipients.length - reachableCount, 0);

      setMessages((prev) => prev.map((item) => (
        item.id === message.id
          ? {
              ...item,
              status: 'draft',
              scheduled_for: null,
              recipient_count: recipients.length,
              recipient_filter: {
                ...(item.recipient_filter ?? {}),
                recipient_count: recipients.length,
                reachable_count: reachableCount,
                skipped_count: skippedCount,
              },
            }
          : item
      )));
      toast('Scheduled campaign moved back to draft.', 'info');
      return;
    }

    try {
      const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
      const recipients = getRecipients(audience);
      const reachableCount = message.channel === 'sms'
        ? recipients.filter((guest) => hasReachableSms(guest)).length
        : recipients.filter((guest) => hasReachableEmail(guest.email)).length;
      const skippedCount = Math.max(recipients.length - reachableCount, 0);

      await updateDashboardMessage(message.id, {
        status: 'draft',
        scheduled_for: null,
      });

      void updateDashboardMessage(message.id, {
        recipient_count: recipients.length,
        recipient_filter: {
          ...(message.recipient_filter ?? {}),
          recipient_count: recipients.length,
          reachable_count: reachableCount,
          skipped_count: skippedCount,
        },
      });

      toast('Scheduled campaign moved back to draft.', 'info');
      await fetchMessages();
    } catch (err) {
      toast(safeMessagesError(err, 'Couldn’t move that campaign back to draft right now.'), 'error');
    }
  }

  async function handleRunDueScheduledMessages() {
    if (!canCompose) {
      toast('Your collaborator role cannot run scheduled sends.', 'info');
      return;
    }

    if (isDemoMode) {
      const dueIds = messages
        .filter((message) => message.status === 'scheduled' && isPastScheduledTime(message.scheduled_for))
        .map((message) => message.id);

      if (dueIds.length === 0) {
        toast('No scheduled messages are due right now.', 'info');
        return;
      }

      setProcessingScheduled(true);
      try {
        let skippedRecipients = 0;
        setMessages((prev) => prev.map((message) => {
          if (!dueIds.includes(message.id)) return message;

          const recipients = getScopedRecipients(message);
          const deliveredCount = message.channel === 'sms'
            ? recipients.filter((guest) => hasReachableSms(guest)).length
            : recipients.filter((guest) => hasReachableEmail(guest.email)).length;
          const skippedCount = Math.max(recipients.length - deliveredCount, 0);
          skippedRecipients += skippedCount;

          return {
            ...message,
            status: skippedCount > 0 ? 'partial' : 'sent',
            sent_at: new Date().toISOString(),
            delivered_count: deliveredCount,
            failed_count: 0,
            recipient_count: recipients.length,
            recipient_filter: {
              ...(message.recipient_filter ?? {}),
              recipient_count: recipients.length,
              reachable_count: deliveredCount,
              skipped_count: skippedCount,
            },
          };
        }));
        toast(
          `Processed ${dueIds.length} scheduled message${dueIds.length !== 1 ? 's' : ''} in demo${skippedRecipients > 0 ? ` • ${describeRecipientReview(skippedRecipients)}` : ''}.`,
          skippedRecipients > 0 ? 'info' : 'success',
        );
      } finally {
        setProcessingScheduled(false);
      }
      return;
    }

    setProcessingScheduled(true);
    try {
      const result = await triggerScheduledMessageDispatch(10);
      if (result.processed === 0) {
        toast('No scheduled messages are due right now.', 'info');
      } else if (result.failed === 0 && result.partial === 0) {
        toast(`Processed ${result.processed} scheduled message${result.processed !== 1 ? 's' : ''}${result.skippedRecipients > 0 ? ` • ${describeRecipientReview(result.skippedRecipients)}` : ''}.`, 'success');
      } else {
        toast(`Processed ${result.processed}: sent ${result.sent}, partial ${result.partial}, needs review ${result.failed}${result.skippedRecipients > 0 ? `, ${describeRecipientReview(result.skippedRecipients)}` : ''}${result.skippedMessages > 0 ? `, messages needing review ${result.skippedMessages}` : ''}.`, result.failed > 0 ? 'error' : 'info');
      }
      await fetchMessages();
    } catch (err) {
      toast(safeMessagesError(err, 'Couldn’t process scheduled messages right now.'), 'error');
    } finally {
      setProcessingScheduled(false);
    }
  }

  return {
    handleCancelSchedule,
    handleExcludeSkippedRecipients,
    handleRescheduleMessage,
    handleRetry,
    handleRetryFailedRecipients,
    handleRunDueScheduledMessages,
    handleSendScheduledNow,
    processingScheduled,
    retryingMessageId,
  };
}
