import React from 'react';
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, RefreshCw, Send, X } from 'lucide-react';
import { Button } from '../../../components/ui';
import { getMessageDeliveryState } from '../../../lib/messageDeliveryState';
import { formatMessageHistoryDateTime } from '../messageHistoryTime';
import { parseScheduleInputToIso, toScheduleInputValue } from '../messageScheduleTime';
import type { DeliveryRow, Message } from './messageDashboardTypes';
import {
  canRetryMessageStatus,
  buildDeliveryBucketSummary,
  getAudienceLabel,
  getCampaignName,
  getCampaignTypeLabel,
  getCleanupRecipientCount,
  getCustomerDeliveryReason,
  getCleanupCoverageRate,
  getFollowThroughReadyRecipientCount,
  getFollowThroughFocusLabel,
  getMessageEngagementStats,
  getRecipientReviewPlanSummary,
  getRecipientCount,
  getSkippedCount,
  getUnreachedCount,
  isPastScheduledTime,
} from './messageDashboardUtils';
import { getStatusBadge } from './MessageDashboardComponents';

interface MessageDetailModalProps {
  message: Message;
  deliveries: DeliveryRow[];
  canManageCampaigns: boolean;
  onClose: () => void;
  onRetry: (message: Message) => Promise<void>;
  onRetryFailedRecipients: (message: Message) => Promise<void>;
  onExcludeSkippedRecipients: (message: Message) => Promise<void>;
  onSendScheduledNow: (message: Message) => Promise<void>;
  onReschedule: (message: Message, scheduledFor: string) => Promise<void>;
  onCancelSchedule: (message: Message) => Promise<void>;
  onLoadIntoComposer: (message: Message, mode: 'edit' | 'duplicate') => void;
}

export const MessageDetailModal: React.FC<MessageDetailModalProps> = ({
  message,
  deliveries,
  canManageCampaigns,
  onClose,
  onRetry,
  onRetryFailedRecipients,
  onExcludeSkippedRecipients,
  onSendScheduledNow,
  onReschedule,
  onCancelSchedule,
  onLoadIntoComposer,
}) => {
  const [retrying, setRetrying] = React.useState(false);
  const [sendingScheduledNow, setSendingScheduledNow] = React.useState(false);
  const [rescheduling, setRescheduling] = React.useState(false);
  const [cancellingSchedule, setCancellingSchedule] = React.useState(false);
  const recipientCount = getRecipientCount(message);
  const skippedCount = getSkippedCount(message, deliveries);
  const unreachedCount = getUnreachedCount(message, deliveries);
  const audienceLabel = getAudienceLabel(message);
  const campaignName = getCampaignName(message);
  const campaignType = getCampaignTypeLabel(message);
  const recipientReviewPlan = getRecipientReviewPlanSummary(message);
  const deliveryState = getMessageDeliveryState({
    status: message.status,
    sentAt: message.sent_at,
  });

  const sentDate = message.sent_at
    ? formatMessageHistoryDateTime(message.sent_at, { dateStyle: 'long', timeStyle: 'short' }, 'Sent time unavailable')
    : null;
  const scheduledDate = message.scheduled_for
    ? formatMessageHistoryDateTime(message.scheduled_for, { dateStyle: 'long', timeStyle: 'short' }, 'Scheduled time unavailable')
    : null;
  const initialScheduleInput = React.useMemo(() => toScheduleInputValue(message.scheduled_for), [message.scheduled_for]);
  const [scheduleInput, setScheduleInput] = React.useState(initialScheduleInput);

  React.useEffect(() => {
    setScheduleInput(initialScheduleInput);
  }, [initialScheduleInput, message.id]);

  const scheduledInputIso = parseScheduleInputToIso(scheduleInput);
  const scheduleInputIsPast = !!scheduledInputIso && isPastScheduledTime(scheduledInputIso);
  const messageDeliveries = deliveries.filter((delivery) => delivery.message_id === message.id);
  const failedDeliveries = messageDeliveries.filter((delivery) => delivery.status === 'failed');
  const skippedDeliveries = messageDeliveries.filter((delivery) => delivery.status === 'skipped');
  const topFailureReasons = buildDeliveryBucketSummary(messageDeliveries, 'failed');
  const topSkipReasons = buildDeliveryBucketSummary(messageDeliveries, 'skipped');
  const engagement = getMessageEngagementStats(message);
  const deliveredRecipients = Math.max(0, Number(message.delivered_count ?? 0));
  const targetedRecipients = Math.max(
    deliveredRecipients
    + Math.max(0, Number(message.failed_count ?? 0))
    + skippedCount
    + unreachedCount,
    0,
  );
  const deliveredCoverageRate = targetedRecipients > 0 ? Math.round((deliveredRecipients / targetedRecipients) * 100) : null;
  const reviewCoverageRate = targetedRecipients > 0 ? Math.round((Math.max(0, Number(message.failed_count ?? 0)) / targetedRecipients) * 100) : null;
  const contactCoverageRate = targetedRecipients > 0 ? Math.round((skippedCount / targetedRecipients) * 100) : null;
  const unreachedCoverageRate = targetedRecipients > 0 ? Math.round((unreachedCount / targetedRecipients) * 100) : null;
  const cleanupCoverageRate = getCleanupCoverageRate({
    failed: Math.max(0, Number(message.failed_count ?? 0)),
    skipped: skippedCount,
    unreached: unreachedCount,
    targeted: targetedRecipients,
  });
  const cleanupReadyCoverageRate = cleanupCoverageRate != null ? Math.max(0, 100 - cleanupCoverageRate) : null;
  const cleanupRecipientCount = getCleanupRecipientCount({
    failed: Math.max(0, Number(message.failed_count ?? 0)),
    skipped: skippedCount,
    unreached: unreachedCount,
  });
  const followThroughReadyRecipientCount = getFollowThroughReadyRecipientCount({
    failed: Math.max(0, Number(message.failed_count ?? 0)),
    skipped: skippedCount,
    unreached: unreachedCount,
    targeted: targetedRecipients,
  });
  const followThroughFocusLabel = getFollowThroughFocusLabel({
    failed: Math.max(0, Number(message.failed_count ?? 0)),
    skipped: skippedCount,
    unreached: unreachedCount,
  });
  const openRate = deliveredRecipients > 0 && engagement.opened != null ? Math.round((engagement.opened / deliveredRecipients) * 100) : null;
  const clickRate = deliveredRecipients > 0 && engagement.clicked != null ? Math.round((engagement.clicked / deliveredRecipients) * 100) : null;
  const replyRate = deliveredRecipients > 0 && engagement.replied != null ? Math.round((engagement.replied / deliveredRecipients) * 100) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              {campaignName && <p className="text-[11px] font-semibold text-text-tertiary mb-1">{campaignName}</p>}
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-text-primary">{message.subject}</h2>
                {getStatusBadge(message)}
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">
                {message.status === 'scheduled' && scheduledDate
                  ? `Scheduled for ${scheduledDate}`
                  : message.status === 'queued'
                  ? 'Queued — waiting to start'
                  : message.status === 'sending'
                  ? 'Sending now'
                  : message.status === 'partial'
                  ? 'Needs follow-up — some guests still need attention'
                  : message.status === 'failed'
                  ? 'Needs review before another send'
                  : sentDate
                  ? `Sent ${sentDate}`
                  : deliveryState.explainer}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-border flex-shrink-0 bg-surface-subtle">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-text-tertiary text-xs mb-1">Audience</p>
              <p className="font-medium text-text-primary">{audienceLabel}</p>
              {campaignType && <p className="text-[11px] text-text-tertiary mt-1">{campaignType}</p>}
            </div>
            <div>
              <p className="text-text-tertiary text-xs mb-1">Recipients</p>
              <p className="font-medium text-text-primary">{recipientCount} {recipientCount === 1 ? 'person' : 'people'}</p>
              {skippedCount > 0 && <p className="text-[11px] text-warning mt-1">{skippedCount} need contact details</p>}
              {unreachedCount > 0 && <p className="text-[11px] text-warning mt-1">{unreachedCount} not reached yet</p>}
            </div>
            <div>
              <p className="text-text-tertiary text-xs mb-1">Channel</p>
              <p className="font-medium text-text-primary capitalize">{message.channel}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="prose prose-sm max-w-none">
            <div className="bg-surface-subtle rounded-lg border border-border p-5">
              <p className="text-xs font-medium text-text-tertiary mb-3">Message body</p>
              <div className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {message.body}
              </div>
            </div>
          </div>

          {(recipientReviewPlan || (message.delivered_count ?? 0) > 0 || (message.failed_count ?? 0) > 0 || skippedCount > 0 || unreachedCount > 0) && (
            <div className="rounded-lg border border-primary/20 bg-primary-light/30 p-4">
              <p className="text-sm font-semibold text-text-primary">Next-send review plan</p>
              {recipientReviewPlan && (
                <p className="mt-1 text-xs text-text-secondary">{recipientReviewPlan}.</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-tertiary">
                <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
                  {deliveredRecipients > 0 ? `${deliveredRecipients} recipients delivered` : '0 recipients delivered'}
                </span>
                {targetedRecipients > 0 && (
                  <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">{targetedRecipients} targeted recipients</span>
                )}
                {targetedRecipients > 0 && (
                  <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Targeted {targetedRecipients}</span>
                )}
                <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Delivered {message.delivered_count ?? 0}</span>
                <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Needs review {message.failed_count ?? 0}</span>
                <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Needs contact {skippedCount}</span>
                <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Not reached {unreachedCount}</span>
                {deliveredCoverageRate != null && reviewCoverageRate != null && contactCoverageRate != null && unreachedCoverageRate != null && (
                  <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
                    {deliveredCoverageRate}% delivered coverage · {reviewCoverageRate}% review coverage · {contactCoverageRate}% needs contact · {unreachedCoverageRate}% unreached
                  </span>
                )}
                {cleanupCoverageRate != null && (
                  <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">{cleanupCoverageRate}% cleanup still pending</span>
                )}
                {cleanupReadyCoverageRate != null && (
                  <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">{cleanupReadyCoverageRate}% follow-through ready</span>
                )}
                <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
                  {followThroughReadyRecipientCount > 0 ? `${followThroughReadyRecipientCount} recipients already closed out` : 'No recipients are already closed out'}
                </span>
                <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
                  {cleanupRecipientCount > 0 ? `${cleanupRecipientCount} recipients still need cleanup` : 'No recipients still need cleanup'}
                </span>
                {followThroughFocusLabel && (
                  <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">{followThroughFocusLabel}</span>
                )}
                {deliveredRecipients > 0 && openRate != null && clickRate != null && replyRate != null && (
                  <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">{openRate}% open · {clickRate}% click · {replyRate}% reply</span>
                )}
              </div>
              {(skippedCount > 0 || unreachedCount > 0) && (
                <p className="mt-3 text-[11px] text-text-tertiary">
                  {skippedCount > 0 && unreachedCount > 0
                    ? 'Clean up contact details first, then decide whether unreached guests need another send.'
                    : skippedCount > 0
                    ? 'Clean up contact details before the next send so these guests are not skipped again.'
                    : 'Some guests still were not reached after a valid send attempt.'}
                </p>
              )}
            </div>
          )}

          {message.status === 'scheduled' && (
            <div className="rounded-lg border border-border bg-surface-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Scheduled send control</p>
                  <p className="mt-1 text-xs text-text-tertiary">Adjust the send time here or drop it back to draft without leaving the comms center.</p>
                </div>
                {message.scheduled_for && isPastScheduledTime(message.scheduled_for) && (
                  <span className="rounded-lg border border-warning/20 bg-warning-light px-2 py-0.5 text-[11px] font-medium text-warning">Due now</span>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-tertiary mb-1">Send at</label>
                  <input
                    type="datetime-local"
                    value={scheduleInput}
                    onChange={(e) => setScheduleInput(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-white text-sm text-text-primary"
                  />
                  {scheduleInputIsPast && (
                    <p className="mt-2 text-[11px] text-warning">Pick a future time here. If you want it to go now, use “Send scheduled now” instead.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canManageCampaigns || rescheduling || !scheduleInput || scheduleInputIsPast}
                    onClick={async () => {
                      if (!scheduledInputIso) return;
                      setRescheduling(true);
                      try {
                        await onReschedule(message, scheduledInputIso);
                      } finally {
                        setRescheduling(false);
                        onClose();
                      }
                    }}
                  >
                    {rescheduling ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : 'Reschedule'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canManageCampaigns || cancellingSchedule}
                    onClick={async () => {
                      setCancellingSchedule(true);
                      try {
                        await onCancelSchedule(message);
                      } finally {
                        setCancellingSchedule(false);
                        onClose();
                      }
                    }}
                  >
                    {cancellingSchedule ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Updating…</> : 'Unschedule to draft'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {failedDeliveries.length > 0 && (
            <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Delivery needs attention</p>
                  <p className="mt-1 text-xs text-text-secondary">These recipients need a closer look before another send.</p>
                </div>
                <span className="rounded-lg border border-border-subtle bg-white px-2 py-0.5 text-[11px] font-medium text-primary">{failedDeliveries.length} need review</span>
              </div>

              {topFailureReasons.length > 0 && (
                <div className="mt-3 space-y-1">
                  {topFailureReasons.map(([reason, count]) => (
                    <div key={reason} className="flex items-start justify-between gap-3 rounded-lg border border-border-subtle bg-white px-3 py-2 text-xs">
                      <span className="text-text-primary">{reason}</span>
                      <span className="shrink-0 text-primary">{count}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-lg border border-border-subtle bg-white">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
                  <p className="text-xs font-medium text-text-primary">Recipients to review</p>
                  <p className="text-[11px] text-text-tertiary">Most recent first</p>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-border-subtle">
                  {failedDeliveries.slice(0, 8).map((delivery) => (
                    <div key={delivery.id} className="px-3 py-2.5 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-text-primary">{delivery.recipient_name || delivery.recipient_email || 'Unknown recipient'}</p>
                          {delivery.recipient_name && <p className="text-text-secondary">{delivery.recipient_email || 'Contact info not added'}</p>}
                          <p className="mt-0.5 text-text-secondary">{getCustomerDeliveryReason(delivery.error_message, 'Delivery needs review before retrying.')}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-text-tertiary">{delivery.attempted_at ? formatMessageHistoryDateTime(delivery.attempted_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, 'Attempted') : 'Attempted'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canManageCampaigns || retrying}
                  onClick={async () => {
                    setRetrying(true);
                    try {
                      await onRetryFailedRecipients(message);
                    } finally {
                      setRetrying(false);
                    }
                  }}
                >
                  {retrying ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Preparing…</> : 'Retry reviewed guests only'}
                </Button>
              </div>
            </div>
          )}

          {skippedDeliveries.length > 0 && (
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary">Needs contact details</p>
                  <p className="mt-1 text-xs text-text-secondary">These recipients were part of the audience but still need usable contact details.</p>
                </div>
                <span className="rounded-lg border border-border-subtle bg-white px-2 py-0.5 text-[11px] font-medium text-text-secondary">{skippedDeliveries.length} need contact</span>
              </div>

              {topSkipReasons.length > 0 && (
                <div className="mt-3 space-y-1">
                  {topSkipReasons.map(([reason, count]) => (
                    <div key={reason} className="flex items-start justify-between gap-3 rounded-lg border border-border-subtle bg-white/85 px-3 py-2 text-xs">
                      <span className="text-text-secondary">{reason}</span>
                      <span className="shrink-0 text-text-tertiary">{count}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-lg border border-border-subtle bg-white/85">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
                  <p className="text-xs font-medium text-text-primary">Recipients needing contact details</p>
                  <p className="text-[11px] text-text-tertiary">Most recent first</p>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-border-subtle">
                  {skippedDeliveries.slice(0, 8).map((delivery) => (
                    <div key={delivery.id} className="px-3 py-2.5 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-text-primary">{delivery.recipient_name || delivery.recipient_email || 'Unknown recipient'}</p>
                          {delivery.recipient_name && <p className="text-text-secondary">{delivery.recipient_email || 'Contact info not added'}</p>}
                          <p className="mt-0.5 text-text-secondary">{getCustomerDeliveryReason(delivery.error_message, 'Missing or invalid contact details.')}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-text-tertiary">{delivery.attempted_at ? formatMessageHistoryDateTime(delivery.attempted_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, 'Checked') : 'Checked'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canManageCampaigns}
                  onClick={async () => {
                    await onExcludeSkippedRecipients(message);
                  }}
                >
                  Exclude from the next send
                </Button>
              </div>
            </div>
          )}
        </div>

        {(message.delivered_count != null || message.failed_count != null) && (
          <div className="px-6 py-3 border-t border-border flex-shrink-0 bg-surface-subtle">
            <div className="flex flex-wrap gap-6 text-sm">
              {message.delivered_count != null && message.delivered_count > 0 && (
                <span className="flex items-center gap-1.5 text-success">
                  <CheckCircle size={13} />
                  {message.delivered_count} delivered
                </span>
              )}
              {message.failed_count != null && message.failed_count > 0 && (
                <span className="flex items-center gap-1.5 text-error">
                  <AlertCircle size={13} />
                  {message.failed_count} need review
                </span>
              )}
              {unreachedCount > 0 && (
                <span className="flex items-center gap-1.5 text-warning">
                  <AlertCircle size={13} />
                  {unreachedCount} not reached yet
                </span>
              )}
              {skippedDeliveries.length > 0 && (
                <span className="flex items-center gap-1.5 text-warning">
                  <AlertCircle size={13} />
                  {skippedDeliveries.length} need contact
                </span>
              )}
              {engagement.opened != null && engagement.opened > 0 && (
                <span className="text-text-secondary">{engagement.opened} opened</span>
              )}
              {engagement.viewed != null && engagement.viewed > 0 && (
                <span className="text-text-secondary">{engagement.viewed} viewed</span>
              )}
              {engagement.clicked != null && engagement.clicked > 0 && (
                <span className="text-text-secondary">{engagement.clicked} clicked</span>
              )}
              {engagement.replied != null && engagement.replied > 0 && (
                <span className="text-text-secondary">{engagement.replied} replied</span>
              )}
              {engagement.bounced != null && engagement.bounced > 0 && (
                <span className="text-warning">{engagement.bounced} bounced</span>
              )}
              {deliveredRecipients > 0 && openRate != null && clickRate != null && replyRate != null && (
                <span className="text-text-secondary">{openRate}% open · {clickRate}% click · {replyRate}% reply</span>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {(message.status === 'draft' || message.status === 'scheduled') && (
              <Button
                variant="outline"
                size="sm"
                disabled={!canManageCampaigns}
                onClick={() => {
                  onLoadIntoComposer(message, 'edit');
                  onClose();
                }}
              >
                Edit in composer
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!canManageCampaigns}
              onClick={() => {
                onLoadIntoComposer(message, 'duplicate');
                onClose();
              }}
            >
              Duplicate to composer
            </Button>
            {canRetryMessageStatus(message.status) && (
              <Button
                variant="primary"
                size="sm"
                disabled={!canManageCampaigns || retrying}
                onClick={async () => {
                  setRetrying(true);
                  try {
                    await onRetry(message);
                  } finally {
                    setRetrying(false);
                    onClose();
                  }
                }}
              >
                {retrying
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</>
                  : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Send again</>
                }
              </Button>
            )}
            {message.status === 'partial' && (
              <p className="text-xs text-text-tertiary max-w-xs">Campaigns needing follow-up are review-only here so this control does not re-send guests who already got the message.</p>
            )}
            {message.status === 'scheduled' && (
              <Button
                variant="primary"
                size="sm"
                disabled={!canManageCampaigns || sendingScheduledNow}
                onClick={async () => {
                  setSendingScheduledNow(true);
                  try {
                    await onSendScheduledNow(message);
                  } finally {
                    setSendingScheduledNow(false);
                    onClose();
                  }
                }}
              >
                {sendingScheduledNow
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</>
                  : <><Send className="w-3.5 h-3.5 mr-1.5" />Send scheduled now</>}
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};
