import React from 'react';
import { AtSign, Calendar, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Clock, Copy, Eye, Loader2, Mail, Link2, RefreshCw, Save, Send, Users } from 'lucide-react';
import { Button, Card, Input, Textarea } from '../../../components/ui';
import { GUEST_COMMUNICATION_FLOW } from '../../../lib/guestCommunicationFlow';
import { getMessageDeliveryState } from '../../../lib/messageDeliveryState';
import { SMS_PROVIDER_PENDING_COPY } from '../../../lib/smsProvider';
import { SMS_SEGMENT_SIZE } from '../../../lib/smsSegments';
import { hasReachableEmail } from './messageDashboardUtils';
import { formatMessageHistoryDate, formatMessageHistoryDateTime } from '../messageHistoryTime';
import type { AudienceOption, ChannelType, DeliveryRow, Guest, Message, MessageTemplateKey, SavedComposerTemplate, SmsCreditTransaction, Toast } from './messageDashboardTypes';
import {
  buildDeliveryStats,
  buildMessageEngagementSummary,
  canRetryMessageStatus,
  COMPOSER_TEMPLATES,
  type CampaignThreadSummary,
  describeRecipientReview,
  getAudienceLabel,
  getCampaignName,
  getCampaignTypeLabel,
  getCleanupRecipientCount,
  getCustomerDeliveryReason,
  getCleanupCoverageRate,
  getFollowThroughReadyRecipientCount,
  getFollowThroughFocusLabel,
  isDeliveryCompletedStatus,
  getMessageEngagementStats,
  getRecipientCount,
  getSkippedCount,
  getUnreachedCount,
  formatScheduledDate,
  isPastScheduledTime,
  isSavedTemplateScheduleUsable,
  type MessageHistoryChannelFilter,
  type MessageHistoryDeliveryFilter,
  type MessageHistoryStatusFilter,
} from './messageDashboardUtils';

export const ToastList: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`rounded-lg border bg-white px-4 py-3 text-sm font-medium text-text-primary ${
          t.type === 'error'
            ? 'border-error/20'
            : t.type === 'info'
            ? 'border-primary/20'
            : 'border-success/20'
        }`}
      >
        {t.message}
      </div>
    ))}
  </div>
);

export const MessageGuestFlowCard: React.FC = () => (
  <div className="rounded-lg border border-border-subtle bg-white p-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-medium text-text-tertiary">Guest flow</p>
        <h2 className="mt-2 text-2xl font-semibold text-text-primary">Start from the moment, then edit the words.</h2>
        <p className="mt-2 text-sm text-text-secondary">Presets use your wedding details and audience first, then hand the message back before anything sends.</p>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
      {GUEST_COMMUNICATION_FLOW.map((stage, index) => (
        <div key={stage.id} className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-4">
          <p className="text-[11px] font-medium text-text-tertiary">0{index + 1}</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{stage.label}</p>
          <p className="mt-2 text-xs leading-5 text-text-secondary">{stage.detail}</p>
        </div>
      ))}
    </div>
  </div>
);

export interface MessageSendingDetailsPanelProps {
  buyingPack: 'sms_100' | 'sms_500' | 'sms_1000' | null;
  coupleEmail?: string | null;
  hardEmailCap: number;
  onBuySmsPack: (pack: 'sms_100' | 'sms_500' | 'sms_1000') => void;
  remainingEmailRecipients: number;
  smsCredits: number;
  smsExpiringSoon: number;
  smsProviderEnabled: boolean;
  smsTransactions: SmsCreditTransaction[];
  usedEmailRecipients: number;
}

export const MessageSendingDetailsPanel: React.FC<MessageSendingDetailsPanelProps> = ({
  buyingPack,
  coupleEmail,
  hardEmailCap,
  onBuySmsPack,
  remainingEmailRecipients,
  smsCredits,
  smsExpiringSoon,
  smsProviderEnabled,
  smsTransactions,
  usedEmailRecipients,
}) => {
  const emailCapacityEnough = remainingEmailRecipients > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="bordered" padding="lg" className="border-border-subtle overflow-hidden">
          <div className="-mx-6 -mt-6 mb-4 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
            <p className="text-xs font-medium text-text-tertiary">Channels</p>
            <h3 className="mt-2 text-xl font-semibold text-text-primary">Sending details</h3>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary-light p-3">
                  <AtSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-text-tertiary">Wedding email</p>
                  <p className="mt-2 text-base font-semibold text-text-primary">{coupleEmail ?? 'Not set yet'}</p>
                  <p className="mt-1 text-xs text-text-secondary">Guest emails appear from this address when email is used.</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-text-tertiary">Email room</p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">{remainingEmailRecipients}</p>
                  <p className="mt-1 text-xs text-text-secondary">Email recipients available before today’s sending limit of {hardEmailCap}.</p>
                  <p className="text-xs text-text-tertiary">Used {usedEmailRecipients} total email recipients so far.</p>
                </div>
                <div className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${emailCapacityEnough ? 'border-success/20 bg-success-light text-success' : 'border-error/20 bg-error-light text-error'}`}>
                  {emailCapacityEnough ? 'Ready' : 'Needs a smaller audience'}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-text-tertiary">Text credits</p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">{smsCredits}</p>
                  <p className="mt-1 text-xs text-text-secondary">Includes 1,000 text credits. 1 credit = one 160-character text to one recipient.</p>
                  <p className="text-xs text-text-tertiary">
                    {smsProviderEnabled
                      ? `Credits expire 12 months after purchase${smsExpiringSoon > 0 ? ` • ${smsExpiringSoon} expiring in 30 days` : ''}`
                      : 'Texting setup pending. Drafting stays on; sending and purchases are locked.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => onBuySmsPack('sms_100')} disabled={buyingPack !== null || !smsProviderEnabled}>{buyingPack === 'sms_100' ? 'Opening…' : 'Buy 100'}</Button>
                  <Button size="sm" variant="outline" onClick={() => onBuySmsPack('sms_500')} disabled={buyingPack !== null || !smsProviderEnabled}>{buyingPack === 'sms_500' ? 'Opening…' : 'Buy 500'}</Button>
                  <Button size="sm" variant="outline" onClick={() => onBuySmsPack('sms_1000')} disabled={buyingPack !== null || !smsProviderEnabled}>{buyingPack === 'sms_1000' ? 'Opening…' : 'Buy 1,000'}</Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="lg" className="border-border-subtle overflow-hidden">
          <div className="-mx-6 -mt-6 mb-4 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text-tertiary">Text credits</p>
                <h3 className="mt-2 text-xl font-semibold text-text-primary">Recent credit activity</h3>
              </div>
              <span className="text-xs text-text-tertiary">Recent {smsTransactions.length}</span>
            </div>
          </div>
          {smsTransactions.length === 0 ? (
            <p className="text-xs text-text-tertiary">
              {smsProviderEnabled
                ? 'No credit activity yet. Buy credits when you’re ready to send texts.'
                : 'No credit activity yet. Credit purchases will appear here after texting setup is complete.'}
            </p>
          ) : (
            <>
              <div className="mb-3 rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-3">
                <p className="text-[11px] text-text-tertiary">Balance snapshot</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{smsCredits} credits available{smsExpiringSoon > 0 ? ` • ${smsExpiringSoon} expiring soon` : ''}</p>
              </div>
              <div className="space-y-2 max-h-56 overflow-auto pr-1">
                {smsTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 text-xs border border-border rounded-lg px-3 py-2 bg-surface-subtle">
                    <div>
                      <p className="text-text-primary capitalize">{tx.reason}</p>
                      <p className="text-text-tertiary">{formatMessageHistoryDateTime(tx.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`${tx.credits_delta >= 0 ? 'text-success' : 'text-error'} font-medium`}>{tx.credits_delta >= 0 ? '+' : ''}{tx.credits_delta} credits</p>
                      {tx.expires_at && (tx.reason === 'purchase' || tx.reason === 'included') && <p className="text-text-tertiary">Expires {formatMessageHistoryDate(tx.expires_at)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export interface MessageReachSnapshotCardProps {
  canCompose: boolean;
  guests: Guest[];
  knownPhotoLinksCount: number;
  messages: Message[];
  onApplyComposerTemplate: (templateKey: MessageTemplateKey, overrides?: { campaignName?: string }) => void;
  onApplyDayOfAlertPreset: () => void;
  onApplySaveTheDatePreset: () => void;
  onNavigatePhotos: () => void;
  onQuickCreateSaveTheDateCampaign: () => void;
}

export const MessageReachSnapshotCard: React.FC<MessageReachSnapshotCardProps> = ({
  canCompose,
  guests,
  knownPhotoLinksCount,
  messages,
  onApplyComposerTemplate,
  onApplyDayOfAlertPreset,
  onApplySaveTheDatePreset,
  onNavigatePhotos,
  onQuickCreateSaveTheDateCampaign,
}) => {
  const engagementSummary = buildMessageEngagementSummary(messages);
  const deliveryStats = buildDeliveryStats(messages);
  const activeCampaignCount = messages.filter((message) => message.status === 'queued' || message.status === 'sending').length;
  const sentCampaignCount = messages.filter((message) => message.status === 'sent').length;
  const followUpCampaignCount = messages.filter((message) => message.status === 'partial').length;
  const reviewCampaignCount = messages.filter((message) => message.status === 'failed').length;
  const deliveredCoverageRate = deliveryStats.targeted > 0 ? Math.round((deliveryStats.delivered / deliveryStats.targeted) * 100) : null;
  const reviewCoverageRate = deliveryStats.targeted > 0 ? Math.round((deliveryStats.failed / deliveryStats.targeted) * 100) : null;
  const contactCoverageRate = deliveryStats.targeted > 0 ? Math.round((deliveryStats.skipped / deliveryStats.targeted) * 100) : null;
  const unreachedCoverageRate = deliveryStats.targeted > 0 ? Math.round((deliveryStats.unreached / deliveryStats.targeted) * 100) : null;
  const cleanupCoverageRate = getCleanupCoverageRate({
    failed: deliveryStats.failed,
    skipped: deliveryStats.skipped,
    unreached: deliveryStats.unreached,
    targeted: deliveryStats.targeted,
  });
  const cleanupReadyCoverageRate = cleanupCoverageRate != null ? Math.max(0, 100 - cleanupCoverageRate) : null;
  const cleanupRecipientCount = getCleanupRecipientCount({
    failed: deliveryStats.failed,
    skipped: deliveryStats.skipped,
    unreached: deliveryStats.unreached,
  });
  const followThroughReadyRecipientCount = getFollowThroughReadyRecipientCount({
    failed: deliveryStats.failed,
    skipped: deliveryStats.skipped,
    unreached: deliveryStats.unreached,
    targeted: deliveryStats.targeted,
  });
  const followThroughFocusLabel = getFollowThroughFocusLabel({
    failed: deliveryStats.failed,
    skipped: deliveryStats.skipped,
    unreached: deliveryStats.unreached,
  });

  return (
  <Card variant="bordered" padding="lg" className="border-border-subtle overflow-hidden">
    <div className="-mx-6 -mt-6 mb-5 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
      <p className="text-xs font-semibold text-text-tertiary">Snapshot</p>
      <h2 className="mt-2 text-2xl font-semibold text-text-primary">Guest reach</h2>
    </div>
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-light rounded-lg">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-text-primary">{guests.length}</p>
          <p className="text-sm text-text-secondary">Total Guests</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-success-light rounded-lg">
          <CheckCircle className="w-5 h-5 text-success" />
        </div>
        <div>
          <p className="text-2xl font-bold text-text-primary">{guests.filter((guest) => hasReachableEmail(guest.email)).length}</p>
          <p className="text-sm text-text-secondary">With email</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-light rounded-lg">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-text-primary">
            {sentCampaignCount + activeCampaignCount + followUpCampaignCount + reviewCampaignCount}
          </p>
          <p className="text-sm text-text-secondary">Sent, active, follow-up, or review</p>
          <p className="text-xs text-text-tertiary">
            Sent {sentCampaignCount} · Active {activeCampaignCount} · Needs follow-up {followUpCampaignCount} · Needs review {reviewCampaignCount}
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-3">
        <p className="text-xs font-semibold text-text-tertiary">Engagement signals</p>
        <>
          <p className="mt-2 text-sm text-text-primary">
            {engagementSummary.opened} opened · {engagementSummary.clicked} clicked · {engagementSummary.replied} replied
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {engagementSummary.viewed} viewed across guest pages · {engagementSummary.bounced} bounced
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {engagementSummary.openRate}% open rate · {engagementSummary.clickRate}% click rate · {engagementSummary.replyRate}% reply rate
          </p>
        </>
      </div>
      <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-3">
        <p className="text-xs font-semibold text-text-tertiary">Delivery follow-through</p>
        <>
          <p className="mt-2 text-sm text-text-primary">
            {deliveryStats.delivered} delivered · {deliveryStats.failed} need review
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {deliveryStats.delivered} recipients delivered
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {deliveryStats.targeted} targeted recipients
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {deliveryStats.delivered} of {deliveryStats.targeted} targeted recipients have been delivered
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {deliveryStats.skipped} need contact details · {deliveryStats.unreached} not reached yet
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {deliveryStats.skipped} of {deliveryStats.targeted} targeted recipients need contact details · {deliveryStats.unreached} of {deliveryStats.targeted} targeted recipients were not reached yet
          </p>
          {deliveredCoverageRate != null && reviewCoverageRate != null && contactCoverageRate != null && unreachedCoverageRate != null && (
            <p className="mt-1 text-xs text-text-tertiary">
              {deliveredCoverageRate}% delivered coverage · {reviewCoverageRate}% review coverage · {contactCoverageRate}% needs contact · {unreachedCoverageRate}% unreached
            </p>
          )}
          {cleanupCoverageRate != null && (
            <p className="mt-1 text-xs text-text-tertiary">{cleanupCoverageRate}% cleanup still pending</p>
          )}
          {cleanupReadyCoverageRate != null && (
            <p className="mt-1 text-xs text-text-tertiary">{cleanupReadyCoverageRate}% follow-through ready</p>
          )}
          <p className="mt-1 text-xs text-text-tertiary">
            {followThroughReadyRecipientCount} of {deliveryStats.targeted} targeted recipients are already closed out
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {followThroughReadyRecipientCount > 0 ? `${followThroughReadyRecipientCount} recipients already closed out` : 'No recipients are already closed out'}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {cleanupRecipientCount} of {deliveryStats.targeted} targeted recipients still need cleanup
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {cleanupRecipientCount > 0 ? `${cleanupRecipientCount} recipients still need cleanup` : 'No recipients still need cleanup'}
          </p>
          {followThroughFocusLabel && (
            <p className="mt-1 text-xs text-text-tertiary">{followThroughFocusLabel}</p>
          )}
        </>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-light rounded-lg">
          <Link2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-text-primary">{knownPhotoLinksCount}</p>
          <p className="text-sm text-text-secondary">Photo links ready</p>
        </div>
      </div>

      <div className="pt-2">
        <p className="text-xs font-semibold text-text-tertiary mb-2">Helpful starts</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              label: 'Open photos',
              detail: 'Jump into the memory albums you are sharing',
              action: onNavigatePhotos,
              disabled: false,
            },
            {
              label: 'Save-the-date draft',
              detail: 'Preload a clean announcement draft',
              action: onApplySaveTheDatePreset,
              disabled: !canCompose,
            },
            {
              label: 'Schedule save-the-date',
              detail: 'Create the campaign without building it from scratch',
              action: onQuickCreateSaveTheDateCampaign,
              disabled: !canCompose,
            },
            {
              label: 'Day-of update draft',
              detail: 'Start with a time-sensitive guest update',
              action: onApplyDayOfAlertPreset,
              disabled: !canCompose,
            },
            {
              label: 'Use photo request',
              detail: 'Drop in an upload request tied to your memories flow',
              action: () => onApplyComposerTemplate('photo-request', { campaignName: 'Photo request' }),
              disabled: !canCompose,
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              disabled={item.disabled}
              className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-4 text-left transition hover:border-primary/30 hover:bg-white disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-text-primary">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">{item.detail}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  </Card>
  );
};

export interface ComposerFormState {
  audience: string;
  body: string;
  campaignName: string;
  channel: ChannelType;
  scheduleDate: string;
  scheduleTime: string;
  scheduleType: string;
  subject: string;
  templateKey: MessageTemplateKey;
}

export interface ComposerLanguagePreview {
  body: string;
  label: string;
  language: string;
  note: string;
  status: 'fallback' | 'needs-review' | 'ready';
  subject: string;
}

export const MessageComposerLanguagePreviewPanel: React.FC<{
  languagePreviews: ComposerLanguagePreview[];
}> = ({ languagePreviews }) => (
  <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4">
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-sm font-semibold text-text-primary">Language preview</p>
        <p className="mt-1 text-xs leading-5 text-text-tertiary">
          Review how this template reads for guests before language-specific sending is connected.
        </p>
      </div>
      <span className="rounded-lg border border-border-subtle bg-white px-2 py-1 text-[11px] font-medium text-text-tertiary">
        Owner review required
      </span>
    </div>
    <div className="mt-3 grid gap-2 md:grid-cols-3">
      {languagePreviews.map((preview) => (
        <div key={preview.language} className="rounded-lg border border-border-subtle bg-white px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-text-primary">{preview.label}</p>
            <span className="text-[11px] font-medium text-text-tertiary">
              {preview.status === 'ready' ? 'Ready' : preview.status === 'needs-review' ? 'Review' : 'Fallback'}
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-text-secondary">{preview.subject}</p>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-text-tertiary">{preview.body}</p>
          <p className="mt-2 text-[11px] leading-4 text-text-tertiary">{preview.note}</p>
        </div>
      ))}
    </div>
  </div>
);

export interface MessageComposerSchedulePanelProps {
  formData: ComposerFormState;
  onSetFormData: (formData: ComposerFormState) => void;
}

export const MessageComposerSchedulePanel: React.FC<MessageComposerSchedulePanelProps> = ({
  formData,
  onSetFormData,
}) => (
  <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4">
    <label className="block text-sm font-medium text-text-primary mb-2">When should it send?</label>
    <div className="flex gap-4 mb-4">
      <button
        type="button"
        onClick={() => onSetFormData({ ...formData, scheduleType: 'now' })}
        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
          formData.scheduleType === 'now'
            ? 'bg-primary text-text-inverse hover:bg-primary-hover'
            : 'bg-surface-subtle text-text-secondary hover:bg-surface border border-border'
        }`}
      >
        Send now
      </button>
      <button
        type="button"
        onClick={() => onSetFormData({ ...formData, scheduleType: 'later' })}
        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
          formData.scheduleType === 'later'
            ? 'bg-primary text-text-inverse hover:bg-primary-hover'
            : 'bg-surface-subtle text-text-secondary hover:bg-surface border border-border'
        }`}
      >
        Schedule
      </button>
    </div>

    {formData.scheduleType === 'later' && (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 p-4 bg-surface-subtle rounded-lg border border-border">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Date</label>
            <Input
              type="date"
              value={formData.scheduleDate}
              onChange={(e) => onSetFormData({ ...formData, scheduleDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Time
              <span className="ml-1 text-xs font-normal text-text-tertiary">
                ({Intl.DateTimeFormat().resolvedOptions().timeZone})
              </span>
            </label>
            <Input
              type="time"
              value={formData.scheduleTime}
              onChange={(e) => onSetFormData({ ...formData, scheduleTime: e.target.value })}
              required
            />
          </div>
        </div>
        {formData.scheduleDate && formData.scheduleTime && isPastScheduledTime(`${formData.scheduleDate}T${formData.scheduleTime}:00`) && (
          <div className="flex items-start gap-2 p-3 bg-warning-light border border-warning/20 rounded-lg text-sm text-warning">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">That time has already passed.</span>
              {' '}This message will send right away when you click Schedule message.
            </div>
          </div>
        )}
        {formData.scheduleDate && formData.scheduleTime && !isPastScheduledTime(`${formData.scheduleDate}T${formData.scheduleTime}:00`) && (
          <p className="text-xs text-text-tertiary px-1">
            Scheduled for: {formatScheduledDate(`${formData.scheduleDate}T${formData.scheduleTime}:00`)}
          </p>
        )}
      </div>
    )}
  </div>
);

export interface MessageComposerRecipientPreviewPanelProps {
  activeRecipients: number;
  formData: ComposerFormState;
  onTogglePreview: () => void;
  previewRecipients: Guest[];
  showRecipientPreview: boolean;
}

export const MessageComposerRecipientPreviewPanel: React.FC<MessageComposerRecipientPreviewPanelProps> = ({
  activeRecipients,
  formData,
  onTogglePreview,
  previewRecipients,
  showRecipientPreview,
}) => (
  <div className="overflow-hidden rounded-lg border border-border-subtle bg-white">
    <button
      type="button"
      onClick={onTogglePreview}
      className="w-full flex items-center justify-between px-4 py-3 bg-surface-subtle/30 hover:bg-surface transition-colors text-sm"
    >
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-text-secondary" />
        <span className="font-medium text-text-primary">
          Preview recipients ({activeRecipients} with {formData.channel === 'sms' ? 'phone numbers' : 'email addresses'})
        </span>
      </div>
      {showRecipientPreview ? <ChevronUp className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
    </button>
    {showRecipientPreview && (
      <div className="border-t border-border max-h-48 overflow-y-auto">
        {previewRecipients.length === 0 ? (
          <div className="p-4 text-sm text-text-secondary text-center">No guests in this group have {formData.channel === 'sms' ? 'phone numbers with text consent' : 'email addresses'} yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {previewRecipients.map((guest) => (
              <li key={guest.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-text-primary font-medium">{guest.first_name ?? ''} {guest.last_name ?? ''}</span>
                <span className="text-text-tertiary text-xs">{formData.channel === 'sms' ? guest.phone : guest.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
  </div>
);

export interface MessageComposerPreflightPanelProps {
  activeRecipients: number;
  audienceReachability: { missingEmail: number; missingPhone: number; total: number };
  buyingPack: 'sms_100' | 'sms_500' | 'sms_1000' | null;
  emailCapacityAfterSend: number;
  emailCapacityEnough: boolean;
  formData: ComposerFormState;
  onBuySmsPack: (pack: 'sms_100' | 'sms_500' | 'sms_1000') => void;
  recipientsWithEmail: number;
  remainingEmailRecipients: number;
  sending: boolean;
  smsCredits: number;
  smsCreditsNeeded: number;
  smsCreditsSufficient: boolean;
  smsProviderEnabled: boolean;
  smsSegmentCount: number;
}

export const MessageComposerPreflightPanel: React.FC<MessageComposerPreflightPanelProps> = ({
  activeRecipients,
  audienceReachability,
  buyingPack,
  emailCapacityAfterSend,
  emailCapacityEnough,
  formData,
  onBuySmsPack,
  recipientsWithEmail,
  remainingEmailRecipients,
  sending,
  smsCredits,
  smsCreditsNeeded,
  smsCreditsSufficient,
  smsProviderEnabled,
  smsSegmentCount,
}) => (
  <>
    <div className="rounded-lg border border-border-subtle bg-primary-light/35 p-4">
      <div className="flex items-start gap-3">
        <Mail className="w-5 h-5 text-primary mt-0.5" />
        <div className="text-sm">
          <p className="text-xs font-semibold text-text-tertiary">Before sending</p>
          <p className="mt-2 font-medium text-text-primary">What happens next</p>
          <p className="text-text-secondary mt-1">
            {formData.scheduleType === 'later' && formData.scheduleDate && formData.scheduleTime
              ? isPastScheduledTime(`${formData.scheduleDate}T${formData.scheduleTime}:00`)
                ? `Will send right away because that time has already passed — ${activeRecipients} recipient${activeRecipients !== 1 ? 's' : ''}`
                : `Scheduled for ${formatScheduledDate(`${formData.scheduleDate}T${formData.scheduleTime}:00`)} — ${activeRecipients} recipient${activeRecipients !== 1 ? 's' : ''}`
              : `${formData.channel === 'sms' ? 'Text' : 'Email'} will send right away to ${activeRecipients} guest${activeRecipients !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-sm">
        <p className="text-xs font-semibold text-text-tertiary">Email reachability</p>
        <p className="mt-2 text-text-primary">{audienceReachability.total - audienceReachability.missingEmail} reachable · {audienceReachability.missingEmail} missing email</p>
      </div>
      <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-sm">
        <p className="text-xs font-semibold text-text-tertiary">Text reachability</p>
        <p className="mt-2 text-text-primary">{audienceReachability.total - audienceReachability.missingPhone} reachable · {audienceReachability.missingPhone} missing phone/consent</p>
        <p className="mt-1 text-xs text-text-tertiary">{formData.body.trim().length}/{SMS_SEGMENT_SIZE} chars in current segment · {smsSegmentCount || 0} segment{smsSegmentCount === 1 ? '' : 's'} per recipient</p>
      </div>
    </div>

    {activeRecipients > 0 && (
      <div className="text-xs text-text-tertiary bg-surface-subtle border border-border rounded-lg px-3 py-2">
        {formData.scheduleType === 'now'
          ? `When you click Send, this ${formData.channel === 'sms' ? 'text' : 'email'} will go out right away to ${activeRecipients} recipient${activeRecipients !== 1 ? 's' : ''}.`
          : `Scheduled messages will send at your chosen time to everyone who still matches this group.`}
      </div>
    )}

    {activeRecipients === 0 && !sending && formData.audience !== '' && (
      <div className="flex items-center gap-2 p-3 bg-warning-light border border-warning/20 rounded-lg text-sm text-warning">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {formData.channel === 'sms'
          ? 'No guests in this group have phone numbers with text consent yet. Add phone numbers and consent before sending a text.'
          : 'No guests in this group have email addresses yet. Add email addresses before sending.'}
      </div>
    )}

    {formData.channel === 'sms' && activeRecipients > 0 && !smsCreditsSufficient && (
      <div className="flex items-center justify-between gap-3 p-3 bg-error-light border border-error/20 rounded-lg text-sm text-error">
        <span>Not enough text credits yet: need {smsCreditsNeeded}, have {smsCredits}.</span>
        <Button size="sm" variant="outline" onClick={() => onBuySmsPack('sms_100')} disabled={buyingPack !== null || !smsProviderEnabled}>Buy credits</Button>
      </div>
    )}

    {formData.channel === 'sms' && activeRecipients > 0 && !smsProviderEnabled && (
      <div className="flex items-start gap-2 p-3 bg-warning-light border border-warning/20 rounded-lg text-sm text-warning">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{SMS_PROVIDER_PENDING_COPY} You can still save text drafts and build audiences now.</span>
      </div>
    )}

    {formData.channel === 'email' && activeRecipients > 0 && (
      <div className={`flex items-center justify-between gap-3 p-3 rounded-lg text-sm border ${emailCapacityEnough ? 'bg-success-light border-success/20 text-success' : 'bg-error-light border-error/20 text-error'}`}>
        <span>
          {emailCapacityEnough
            ? `Email room: ${remainingEmailRecipients} recipient slots left before send, ${emailCapacityAfterSend} left afterward.`
            : `This audience is too large for the remaining email room. It needs ${recipientsWithEmail}, with ${remainingEmailRecipients} left.`}
        </span>
      </div>
    )}
  </>
);

export interface MessageComposerCardProps {
  activeRecipients: number;
  applyComposerTemplate: (templateKey: MessageTemplateKey) => void;
  audienceOptions: AudienceOption[];
  audienceReachability: { missingEmail: number; missingPhone: number; total: number };
  buyingPack: 'sms_100' | 'sms_500' | 'sms_1000' | null;
  canCompose: boolean;
  emailCapacityAfterSend: number;
  emailCapacityEnough: boolean;
  formData: ComposerFormState;
  languagePreviews: ComposerLanguagePreview[];
  onBuySmsPack: (pack: 'sms_100' | 'sms_500' | 'sms_1000') => void;
  onSaveCurrentComposerAsTemplate: () => void;
  onSetFormData: (formData: ComposerFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSubmitDraft: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleRecipientPreview: () => void;
  previewRecipients: Guest[];
  recipientsWithEmail: number;
  recipientsWithSmsConsent: number;
  remainingEmailRecipients: number;
  selectedAudienceCount: number;
  selectedAudienceDetail: string;
  selectedScheduleIsPast: boolean;
  selectedTemplateDetail: string;
  sending: boolean;
  showRecipientPreview: boolean;
  smsCredits: number;
  smsCreditsNeeded: number;
  smsCreditsSufficient: boolean;
  smsProviderEnabled: boolean;
  smsSegmentCount: number;
  unreachableRecipients: number;
}

export const MessageComposerCard: React.FC<MessageComposerCardProps> = ({
  activeRecipients,
  applyComposerTemplate,
  audienceOptions,
  audienceReachability,
  buyingPack,
  canCompose,
  emailCapacityAfterSend,
  emailCapacityEnough,
  formData,
  languagePreviews,
  onBuySmsPack,
  onSaveCurrentComposerAsTemplate,
  onSetFormData,
  onSubmit,
  onSubmitDraft,
  onToggleRecipientPreview,
  previewRecipients,
  recipientsWithEmail,
  recipientsWithSmsConsent,
  remainingEmailRecipients,
  selectedAudienceCount,
  selectedAudienceDetail,
  selectedScheduleIsPast,
  selectedTemplateDetail,
  sending,
  showRecipientPreview,
  smsCredits,
  smsCreditsNeeded,
  smsCreditsSufficient,
  smsProviderEnabled,
  smsSegmentCount,
  unreachableRecipients,
}) => (
  <Card variant="bordered" padding="lg" className="overflow-hidden border-border-subtle">
    <div className="-mx-6 -mt-6 mb-6 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
      <p className="text-xs font-semibold text-text-tertiary">Composer</p>
      <h2 className="mt-2 text-2xl font-semibold text-text-primary">Send a guest update</h2>
      <p className="mt-1 text-sm text-text-secondary">Pick who needs it, adjust the wording, then send now or schedule it.</p>
    </div>
    {!canCompose && <p className="mb-3 text-xs text-text-tertiary">Viewer mode is on, so writing and sending are turned off.</p>}
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset disabled={!canCompose} className="space-y-6">
        <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">Campaign name</label>
              <Input
                value={formData.campaignName}
                onChange={(e) => onSetFormData({ ...formData, campaignName: e.target.value })}
                placeholder="Spring RSVP reminder"
              />
              <p className="mt-1 text-xs text-text-tertiary">Used to organize drafts, scheduled sends, and history. Subject stays separate.</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">Template</label>
              <select
                aria-label="Template"
                value={formData.templateKey}
                onChange={(e) => applyComposerTemplate(e.target.value as MessageTemplateKey)}
                className="w-full rounded-lg border border-border bg-surface-subtle px-4 py-2.5 text-text-primary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {COMPOSER_TEMPLATES.map((template) => (
                  <option key={template.key} value={template.key}>{template.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-tertiary">{selectedTemplateDetail}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onSaveCurrentComposerAsTemplate} disabled={!canCompose}>
              <Save className="mr-1.5 h-3.5 w-3.5" />Save as reusable template
            </Button>
            <span className="self-center text-xs text-text-tertiary">Keeps a lightweight reusable version in this browser for fast repeat campaigns.</span>
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4">
          <label className="mb-2 block text-sm font-medium text-text-primary">Channel</label>
          <div className="inline-flex overflow-hidden rounded-lg border border-border bg-white">
            <button type="button" className={`px-3 py-1.5 text-sm ${formData.channel === 'email' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`} onClick={() => onSetFormData({ ...formData, channel: 'email' })}>Email</button>
            <button type="button" className={`border-l border-border px-3 py-1.5 text-sm ${formData.channel === 'sms' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`} onClick={() => onSetFormData({ ...formData, channel: 'sms' })}>Text</button>
          </div>
          {formData.channel === 'sms' && (
            <p className="mt-1 text-xs text-text-tertiary">
              Texts use credits by 160-character segment and only send to guests with phone numbers and text consent.
              {!smsProviderEnabled ? ' Sending is locked until texting setup is complete.' : ''}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4">
          <label className="mb-2 block text-sm font-medium text-text-primary">Who should get this?</label>
          {audienceOptions.some((a) => a.value.startsWith('event:')) && (
            <p className="mb-1 text-xs text-text-tertiary">You can also send to itinerary groups from the dropdown.</p>
          )}
          <select
            key={`aud-${audienceOptions.length}`}
            value={formData.audience}
            onChange={(e) => onSetFormData({ ...formData, audience: e.target.value })}
            className="w-full rounded-lg border border-border bg-surface-subtle px-4 py-2.5 text-text-primary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {audienceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count} guests)
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-text-tertiary">{selectedAudienceDetail}</p>
          {formData.channel === 'email' && activeRecipients < selectedAudienceCount && (
            <p className="mt-1 text-sm text-warning">
              {activeRecipients} of {selectedAudienceCount} guests have email addresses
            </p>
          )}
          {formData.channel === 'sms' && recipientsWithSmsConsent < selectedAudienceCount && (
            <p className="mt-1 text-sm text-warning">
              {recipientsWithSmsConsent} of {selectedAudienceCount} guests have phone numbers and text consent
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-secondary">
              Reaches {activeRecipients} guest{activeRecipients !== 1 ? 's' : ''}
            </span>
            <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs ${unreachableRecipients > 0 ? 'border-warning/30 bg-warning-light text-warning' : 'border-success/30 bg-success-light text-success'}`}>
              {unreachableRecipients > 0 ? `${unreachableRecipients} missing ${formData.channel === 'sms' ? 'phone/consent' : 'email addresses'}` : `Everyone in this group is reachable by ${formData.channel === 'sms' ? 'text' : 'email'}`}
            </span>
            {formData.channel === 'sms' && (
              <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs ${smsCreditsSufficient ? 'border-success/30 bg-success-light text-success' : 'border-error/30 bg-error-light text-error'}`}>
                {smsCreditsSufficient ? `${smsCreditsNeeded} credits ready` : `Need ${smsCreditsNeeded - smsCredits} more credits`}
              </span>
            )}
            {formData.channel === 'sms' && (
              <span className="inline-flex items-center rounded-lg border border-border bg-white px-2 py-1 text-xs text-text-secondary">
                {smsSegmentCount || 0} segment{smsSegmentCount === 1 ? '' : 's'} x {recipientsWithSmsConsent} recipient{recipientsWithSmsConsent === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {formData.channel === 'email' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Subject <span className="text-error">*</span>
            </label>
            <Input
              value={formData.subject}
              onChange={(e) => onSetFormData({ ...formData, subject: e.target.value })}
              placeholder="For example: Wedding day reminder"
              required
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            Message <span className="text-error">*</span>
          </label>
          <Textarea
            value={formData.body}
            onChange={(e) => onSetFormData({ ...formData, body: e.target.value })}
            placeholder="Write your message here"
            rows={8}
            required
          />
          <p className="mt-1 text-sm text-text-tertiary">
            Include the details guests need most, like time, place, or dress code.
          </p>
        </div>

        <MessageComposerLanguagePreviewPanel languagePreviews={languagePreviews} />

        <MessageComposerSchedulePanel formData={formData} onSetFormData={onSetFormData} />

        <MessageComposerRecipientPreviewPanel
          activeRecipients={activeRecipients}
          formData={formData}
          onTogglePreview={onToggleRecipientPreview}
          previewRecipients={previewRecipients}
          showRecipientPreview={showRecipientPreview}
        />

        <MessageComposerPreflightPanel
          activeRecipients={activeRecipients}
          audienceReachability={audienceReachability}
          buyingPack={buyingPack}
          emailCapacityAfterSend={emailCapacityAfterSend}
          emailCapacityEnough={emailCapacityEnough}
          formData={formData}
          onBuySmsPack={onBuySmsPack}
          recipientsWithEmail={recipientsWithEmail}
          remainingEmailRecipients={remainingEmailRecipients}
          sending={sending}
          smsCredits={smsCredits}
          smsCreditsNeeded={smsCreditsNeeded}
          smsCreditsSufficient={smsCreditsSufficient}
          smsProviderEnabled={smsProviderEnabled}
          smsSegmentCount={smsSegmentCount}
        />

        <div className="flex gap-3">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={sending || activeRecipients === 0 || (formData.channel === 'email' && !emailCapacityEnough) || (formData.channel === 'sms' && !smsProviderEnabled)}
          >
            {sending ? 'Processing...' : (
              formData.scheduleType === 'later' && !selectedScheduleIsPast ? (
                <><Calendar className="mr-2 h-4 w-4" />Schedule message</>
              ) : (
                <><Send className="mr-2 h-4 w-4" />Send now</>
              )
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onSubmitDraft} disabled={sending}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
        </div>
      </fieldset>
    </form>
  </Card>
);

export interface MessageSavedTemplatesCardProps {
  audienceOptions: AudienceOption[];
  onApplySavedTemplate: (template: SavedComposerTemplate) => void;
  onDeleteSavedTemplate: (templateId: string) => void;
  savedTemplates: SavedComposerTemplate[];
}

export const MessageSavedTemplatesCard: React.FC<MessageSavedTemplatesCardProps> = ({
  audienceOptions,
  onApplySavedTemplate,
  onDeleteSavedTemplate,
  savedTemplates,
}) => (
  <Card variant="bordered" padding="lg" className="overflow-hidden border-border-subtle mt-6">
    <div className="-mx-6 -mt-6 mb-6 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
      <p className="text-xs font-semibold text-text-tertiary">Reusable templates</p>
      <h2 className="mt-2 text-2xl font-semibold text-text-primary">Saved from your real campaigns</h2>
      <p className="mt-1 text-sm text-text-secondary">Keep a lightweight library of messages you actually reuse.</p>
    </div>
    {savedTemplates.length === 0 ? (
      <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-6 text-sm text-text-secondary">
        No saved reusable templates yet. Save one from the composer when you have a message worth reusing.
      </div>
    ) : (
      <div className="space-y-3">
        {savedTemplates.map((template) => {
          const savedScheduleIsUsable = isSavedTemplateScheduleUsable(template);

          return (
            <div key={template.id} className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-4 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-text-tertiary">{template.channel.toUpperCase()} · {audienceOptions.find((option) => option.value === template.audience)?.label ?? 'Saved audience'}</p>
                  <h3 className="mt-1 text-sm font-semibold text-text-primary">{template.name}</h3>
                  <p className="mt-1 text-xs text-text-secondary line-clamp-2">{template.subject || '(No subject)'}{template.body ? ` — ${template.body}` : ''}</p>
                  {template.scheduleType === 'later' && template.scheduleDate && template.scheduleTime && (
                    <p className={`mt-1 text-[11px] ${savedScheduleIsUsable ? 'text-text-tertiary' : 'text-warning'}`}>
                      {savedScheduleIsUsable
                        ? `Saved with schedule: ${formatScheduledDate(`${template.scheduleDate}T${template.scheduleTime}:00`)}`
                        : 'Saved schedule has expired and will not be reused'}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-text-tertiary">
                    Created {formatMessageHistoryDateTime(template.createdAt)}
                    {template.updatedAt ? ` • Updated ${formatMessageHistoryDateTime(template.updatedAt)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onApplySavedTemplate(template)}>
                    Use template
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDeleteSavedTemplate(template.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </Card>
);

export interface MessageStartingPointsCardProps {
  canCompose: boolean;
  onApplyComposerTemplate: (templateKey: MessageTemplateKey, overrides?: { campaignName?: string }) => void;
}

export const MessageStartingPointsCard: React.FC<MessageStartingPointsCardProps> = ({
  canCompose,
  onApplyComposerTemplate,
}) => (
  <Card variant="bordered" padding="lg" className="border-border-subtle overflow-hidden">
    <div className="-mx-6 -mt-6 mb-5 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
      <p className="text-xs font-semibold text-text-tertiary">Starting points</p>
      <h2 className="mt-2 text-2xl font-semibold text-text-primary">Draft from something useful, not from a blank page.</h2>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        { label: 'Save the date', detail: 'Early excitement and initial heads-up', templateKey: 'save-the-date' as MessageTemplateKey, campaignName: 'Save the date' },
        { label: 'RSVP reminder', detail: 'Nudge people who still have not replied', templateKey: 'rsvp-reminder' as MessageTemplateKey, campaignName: 'RSVP reminder' },
        { label: 'Week-of details', detail: 'Useful logistics right before the event', templateKey: 'event-reminder' as MessageTemplateKey, campaignName: 'Week-of details' },
        { label: 'Photo request', detail: 'Invite guests to add memories in one tap', templateKey: 'photo-request' as MessageTemplateKey, campaignName: 'Photo request' },
        { label: 'Day-of update', detail: 'Fast text-first guest update', templateKey: 'day-of-update' as MessageTemplateKey, campaignName: 'Day-of update' },
        { label: 'Thank you', detail: 'Close the loop after the celebration', templateKey: 'thank-you' as MessageTemplateKey, campaignName: 'Thank you' },
      ].map((template) => (
        <button
          key={template.label}
          type="button"
          onClick={() => onApplyComposerTemplate(template.templateKey, { campaignName: template.campaignName })}
          disabled={!canCompose}
          className="w-full rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-4 text-left transition hover:border-primary/30 hover:bg-white disabled:opacity-50"
        >
          <p className="text-sm font-semibold text-text-primary">{template.label}</p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">{template.detail}</p>
        </button>
      ))}
    </div>
  </Card>
);

export interface MessageHistorySummaryPanelsProps {
  audienceBreakdown: Array<[string, number]>;
  campaignStatusSummary: {
    draft: number;
    failed: number;
    partial: number;
    scheduled: number;
    sent: number;
  };
  channelBreakdown: Record<'email' | 'sms', {
    active: number;
    failed: number;
    partial: number;
    scheduled: number;
    sent: number;
    targeted: number;
  }>;
  channelDeliveryBreakdown: Record<'email' | 'sms', {
    delivered: number;
    failed: number;
    skipped: number;
    targeted: number;
    unreached: number;
  }>;
  channelEngagementBreakdown: Record<'email' | 'sms', {
    bounced: number;
    clicked: number;
    clickRate: number;
    deliveredRecipients: number;
    opened: number;
    openRate: number;
    replied: number;
    replyRate: number;
    trackedMessages: number;
    viewed: number;
  }>;
  deliveryHealth: {
    failRate: number;
    overdueScheduled: number;
    skipped: number;
    skippedRate: number;
    successRate: number;
  };
  historyStatusCounts: {
    active: number;
    failed: number;
    partial: number;
    scheduled: number;
    sent: number;
  };
  providerTelemetry: {
    attempted: number;
    errorTop: Array<[string, number]>;
    sent: number;
    sentRate: number;
    skipped: number;
  };
}

export const MessageHistorySummaryPanels: React.FC<MessageHistorySummaryPanelsProps> = ({
  audienceBreakdown,
  campaignStatusSummary,
  channelBreakdown,
  channelDeliveryBreakdown,
  channelEngagementBreakdown,
  deliveryHealth,
  historyStatusCounts,
  providerTelemetry,
}) => (
  <>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
      {[
        ['Sent', historyStatusCounts.sent],
        ['Active', historyStatusCounts.active],
        ['Scheduled', historyStatusCounts.scheduled],
        ['Needs follow-up', historyStatusCounts.partial],
        ['Needs review', historyStatusCounts.failed],
      ].map(([label, count]) => (
        <div key={String(label)} className="rounded-lg border border-border-subtle bg-white px-2.5 py-2">
          <p className="text-[11px] text-text-tertiary">{label}</p>
          <p className="text-sm font-semibold text-text-primary">{count}</p>
        </div>
      ))}
    </div>

    <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-[11px] text-text-secondary mb-4">
      Delivery health is based on the message activity available here. Use it to see what needs a quick look before the next guest update.
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      {[
        {
          label: 'Prepared messages',
          value: providerTelemetry.attempted,
          detail: `${providerTelemetry.sentRate}% sent successfully`,
        },
        {
          label: 'Needs contact details',
          value: providerTelemetry.skipped,
          detail: 'Missing or invalid contact info',
        },
        {
          label: 'Sent successfully',
          value: providerTelemetry.sent,
          detail: 'Delivery rows marked sent',
        },
        {
          label: 'Needs attention',
          value: providerTelemetry.errorTop.length,
          detail: providerTelemetry.errorTop[0]?.[0] ?? 'No send issues found',
        },
      ].map((item) => (
        <div key={item.label} className="rounded-lg border border-border-subtle bg-white px-3 py-2.5">
          <p className="text-[11px] text-text-tertiary">{item.label}</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">{item.value}</p>
          <p className="mt-1 text-[11px] text-text-tertiary line-clamp-2">{item.detail}</p>
        </div>
      ))}
    </div>

    {audienceBreakdown.length > 0 && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {audienceBreakdown.map(([label, count]) => (
          <div key={label} className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-2.5 py-2">
            <p className="text-[11px] text-text-tertiary truncate">{label}</p>
            <p className="text-sm font-semibold text-text-primary">{count} recipients</p>
          </div>
        ))}
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
      {(['email', 'sms'] as const).map((channel) => (
        <div key={channel} className="rounded-lg border border-border-subtle bg-white px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-text-tertiary">{channel.toUpperCase()}</p>
            <p className="text-xs text-text-secondary">{channelBreakdown[channel].targeted} recipients</p>
          </div>
          <p className="text-xs text-text-secondary">
            Sent {channelBreakdown[channel].sent} · Active {channelBreakdown[channel].active} · Scheduled {channelBreakdown[channel].scheduled} · Needs follow-up {channelBreakdown[channel].partial} · Needs review {channelBreakdown[channel].failed}
          </p>
          {(channelDeliveryBreakdown[channel].targeted > 0
            || channelBreakdown[channel].sent > 0
            || channelBreakdown[channel].active > 0
            || channelBreakdown[channel].scheduled > 0
            || channelBreakdown[channel].partial > 0
            || channelBreakdown[channel].failed > 0) && (
            <>
              <p className="mt-1 text-xs text-text-primary">
                {channelDeliveryBreakdown[channel].delivered} delivered · {channelDeliveryBreakdown[channel].failed} need review
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {channelDeliveryBreakdown[channel].delivered} recipients delivered
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {channelDeliveryBreakdown[channel].targeted} targeted recipients
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {channelDeliveryBreakdown[channel].delivered} of {channelDeliveryBreakdown[channel].targeted} targeted recipients have been delivered
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {(() => {
                  const targeted = channelDeliveryBreakdown[channel].targeted;
                  const reviewRate = targeted > 0 ? Math.round((channelDeliveryBreakdown[channel].failed / targeted) * 100) : 0;
                  const unreachedRate = targeted > 0 ? Math.round((channelDeliveryBreakdown[channel].unreached / targeted) * 100) : 0;
                  return `${channelDeliveryBreakdown[channel].deliveredRate}% delivered coverage · ${reviewRate}% review coverage · ${channelDeliveryBreakdown[channel].skippedRate}% needs contact · ${unreachedRate}% unreached`;
                })()}
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {(() => {
                  const cleanupRate = getCleanupCoverageRate({
                    failed: channelDeliveryBreakdown[channel].failed,
                    skipped: channelDeliveryBreakdown[channel].skipped,
                    unreached: channelDeliveryBreakdown[channel].unreached,
                    targeted: channelDeliveryBreakdown[channel].targeted,
                  });
                  return cleanupRate != null ? `${cleanupRate}% cleanup still pending` : '';
                })()}
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {(() => {
                  const cleanupRate = getCleanupCoverageRate({
                    failed: channelDeliveryBreakdown[channel].failed,
                    skipped: channelDeliveryBreakdown[channel].skipped,
                    unreached: channelDeliveryBreakdown[channel].unreached,
                    targeted: channelDeliveryBreakdown[channel].targeted,
                  });
                  return cleanupRate != null ? `${Math.max(0, 100 - cleanupRate)}% follow-through ready` : '';
                })()}
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {(() => {
                  const targeted = channelDeliveryBreakdown[channel].targeted;
                  const closedOutCount = getFollowThroughReadyRecipientCount({
                    failed: channelDeliveryBreakdown[channel].failed,
                    skipped: channelDeliveryBreakdown[channel].skipped,
                    unreached: channelDeliveryBreakdown[channel].unreached,
                    targeted: channelDeliveryBreakdown[channel].targeted,
                  });
                  return `${closedOutCount} of ${targeted} targeted recipients are already closed out`;
                })()}
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {(() => {
                  const closedOutCount = getFollowThroughReadyRecipientCount({
                    failed: channelDeliveryBreakdown[channel].failed,
                    skipped: channelDeliveryBreakdown[channel].skipped,
                    unreached: channelDeliveryBreakdown[channel].unreached,
                    targeted: channelDeliveryBreakdown[channel].targeted,
                  });
                  return closedOutCount > 0 ? `${closedOutCount} recipient${closedOutCount === 1 ? '' : 's'} already closed out` : 'No recipients are already closed out';
                })()}
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {(() => {
                  const targeted = channelDeliveryBreakdown[channel].targeted;
                  const cleanupCount = getCleanupRecipientCount({
                    failed: channelDeliveryBreakdown[channel].failed,
                    skipped: channelDeliveryBreakdown[channel].skipped,
                    unreached: channelDeliveryBreakdown[channel].unreached,
                  });
                  return `${cleanupCount} of ${targeted} targeted recipients still need cleanup`;
                })()}
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {(() => {
                  const cleanupCount = getCleanupRecipientCount({
                    failed: channelDeliveryBreakdown[channel].failed,
                    skipped: channelDeliveryBreakdown[channel].skipped,
                    unreached: channelDeliveryBreakdown[channel].unreached,
                  });
                  return cleanupCount > 0 ? `${cleanupCount} recipients still need cleanup` : 'No recipients still need cleanup';
                })()}
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {channelDeliveryBreakdown[channel].skipped} need contact details · {channelDeliveryBreakdown[channel].unreached} not reached yet
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {channelDeliveryBreakdown[channel].skipped} of {channelDeliveryBreakdown[channel].targeted} targeted recipients need contact details · {channelDeliveryBreakdown[channel].unreached} of {channelDeliveryBreakdown[channel].targeted} targeted recipients were not reached yet
              </p>
              {getFollowThroughFocusLabel({
                failed: channelDeliveryBreakdown[channel].failed,
                skipped: channelDeliveryBreakdown[channel].skipped,
                unreached: channelDeliveryBreakdown[channel].unreached,
              }) && (
                <p className="mt-1 text-[11px] text-text-tertiary">
                  {getFollowThroughFocusLabel({
                    failed: channelDeliveryBreakdown[channel].failed,
                    skipped: channelDeliveryBreakdown[channel].skipped,
                    unreached: channelDeliveryBreakdown[channel].unreached,
                  })}
                </p>
              )}
            </>
          )}
          {channelBreakdown[channel].targeted > 0 && (
            <>
              <p className="mt-1 text-xs text-text-primary">
                {channelEngagementBreakdown[channel].opened} opened · {channelEngagementBreakdown[channel].clicked} clicked · {channelEngagementBreakdown[channel].replied} replied
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {channelEngagementBreakdown[channel].viewed} viewed · {channelEngagementBreakdown[channel].bounced} bounced across {channelEngagementBreakdown[channel].trackedMessages} completed campaign{channelEngagementBreakdown[channel].trackedMessages === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {channelEngagementBreakdown[channel].openRate}% open rate · {channelEngagementBreakdown[channel].clickRate}% click rate · {channelEngagementBreakdown[channel].replyRate}% reply rate
              </p>
            </>
          )}
        </div>
      ))}
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      {[
        {
          label: 'Delivery success',
          value: `${deliveryHealth.successRate}%`,
          tone: 'text-success',
          detail: 'Reached guests cleanly',
        },
        {
          label: 'Needs another look',
          value: `${deliveryHealth.failRate}%`,
          tone: deliveryHealth.failRate > 0 ? 'text-error' : 'text-text-primary',
          detail: 'Prepared messages that did not go through',
        },
        {
          label: 'Needs contact rate',
          value: `${deliveryHealth.skippedRate}%`,
          tone: deliveryHealth.skipped > 0 ? 'text-warning' : 'text-text-primary',
          detail: `${deliveryHealth.skipped} recipients need contact details`,
        },
        {
          label: 'Past-due scheduled',
          value: deliveryHealth.overdueScheduled,
          tone: deliveryHealth.overdueScheduled > 0 ? 'text-warning' : 'text-text-primary',
          detail: 'Scheduled items needing attention',
        },
      ].map((item) => (
        <div key={item.label} className="rounded-lg border border-border-subtle bg-white px-3 py-3">
          <p className="text-[11px] text-text-tertiary">{item.label}</p>
          <p className={`mt-2 text-lg font-semibold ${item.tone}`}>{item.value}</p>
          <p className="mt-1 text-[11px] text-text-tertiary">{item.detail}</p>
        </div>
      ))}
    </div>

    <div className="mb-4 flex flex-wrap gap-2 text-xs text-text-tertiary">
      <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Drafts {campaignStatusSummary.draft}</span>
      <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Scheduled {campaignStatusSummary.scheduled}</span>
      <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Sent {campaignStatusSummary.sent}</span>
      <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Needs follow-up {campaignStatusSummary.partial}</span>
      <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Needs review {campaignStatusSummary.failed}</span>
    </div>
  </>
);

export interface MessageCampaignThreadPanelsProps {
  activeCampaignLatestMessage: Message | null;
  activeCampaignThread: CampaignThreadSummary | null;
  campaignThreads: CampaignThreadSummary[];
  canCompose: boolean;
  deliveries: DeliveryRow[];
  onClearThreadFilter: () => void;
  onDuplicateLatest: (message: Message) => void;
  onEditLatest: (message: Message) => void;
  onScheduleFollowUp: (mode: 'reminder' | 'day-of' | 'thank-you') => void;
  onSelectThread: (threadName: string) => void;
  onStartFollowUp: (mode: 'reminder' | 'day-of' | 'thank-you') => void;
  onViewLatest: (message: Message) => void;
}

export const MessageCampaignThreadPanels: React.FC<MessageCampaignThreadPanelsProps> = ({
  activeCampaignLatestMessage,
  activeCampaignThread,
  campaignThreads,
  canCompose,
  deliveries,
  onClearThreadFilter,
  onDuplicateLatest,
  onEditLatest,
  onScheduleFollowUp,
  onSelectThread,
  onStartFollowUp,
  onViewLatest,
}) => (
  <>
    {campaignThreads.length > 0 && (
      <div className="mb-4 rounded-lg border border-border-subtle bg-white p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold text-text-tertiary">Campaign rollups</p>
            <p className="mt-1 text-sm font-medium text-text-primary">Recent campaign threads</p>
          </div>
          <span className="text-[11px] text-text-tertiary">Grouped by campaign name or subject</span>
        </div>
        <div className="space-y-2">
          {campaignThreads.map((thread) => (
            (() => {
              const engagementSummary = [
                `${thread.opened} opened`,
                `${thread.viewed} viewed`,
                `${thread.clicked} clicked`,
                `${thread.replied} replied`,
                thread.bounced > 0 ? `${thread.bounced} bounced` : null,
              ].filter(Boolean).join(' · ');

              return (
            <button
              key={thread.key}
              type="button"
              onClick={() => onSelectThread(thread.name)}
              className="w-full flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-subtle/20 px-3 py-3 text-sm text-left hover:border-primary/30 hover:bg-white transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-text-primary truncate">{thread.name}</p>
                <p className="text-[11px] text-text-tertiary">{thread.count} send{thread.count !== 1 ? 's' : ''} · latest {thread.latestStatus} · click to filter history</p>
              </div>
              <div className="text-right text-[11px] text-text-tertiary">
                {(() => {
                  const targeted = thread.delivered + thread.failed + thread.skipped + thread.unreached;
                  const skippedRate = targeted > 0 ? Math.round((thread.skipped / targeted) * 100) : null;
                  const reviewRate = targeted > 0 ? Math.round((thread.failed / targeted) * 100) : null;
                  const unreachedRate = targeted > 0 ? Math.round((thread.unreached / targeted) * 100) : null;
                  const cleanupRate = getCleanupCoverageRate({
                    failed: thread.failed,
                    skipped: thread.skipped,
                    unreached: thread.unreached,
                    targeted,
                  });
                  const cleanupCount = getCleanupRecipientCount({
                    failed: thread.failed,
                    skipped: thread.skipped,
                    unreached: thread.unreached,
                  });
                  const followThroughReadyCount = getFollowThroughReadyRecipientCount({
                    failed: thread.failed,
                    skipped: thread.skipped,
                    unreached: thread.unreached,
                    targeted,
                  });
                  const focusLabel = getFollowThroughFocusLabel({
                    failed: thread.failed,
                    skipped: thread.skipped,
                    unreached: thread.unreached,
                  });
                  return (
                    <>
                <p>{thread.delivered} delivered · {thread.failed} need review</p>
                <p className="text-text-secondary">
                  {thread.delivered > 0 ? `${thread.delivered} recipients delivered` : '0 recipients delivered'}
                </p>
                {targeted > 0 && <p className="text-text-secondary">{targeted} targeted recipients</p>}
                {targeted > 0 && <p className="text-text-secondary">{thread.delivered} of {targeted} targeted recipients have been delivered</p>}
                {targeted > 0 && <p className="text-text-secondary">{thread.deliveredRate}% delivered coverage{reviewRate != null ? ` · ${reviewRate}% review coverage` : ''}{skippedRate != null ? ` · ${skippedRate}% needs contact` : ''}{unreachedRate != null ? ` · ${unreachedRate}% unreached` : ''}</p>}
                {cleanupRate != null && <p className="text-text-secondary">{cleanupRate}% cleanup still pending</p>}
                {cleanupRate != null && <p className="text-text-secondary">{Math.max(0, 100 - cleanupRate)}% follow-through ready</p>}
                <p className="text-text-secondary">{followThroughReadyCount} of {targeted} targeted recipients are already closed out</p>
                <p className="text-text-secondary">{followThroughReadyCount > 0 ? `${followThroughReadyCount} recipients already closed out` : 'No recipients are already closed out'}</p>
                <p className="text-text-secondary">{cleanupCount} of {targeted} targeted recipients still need cleanup</p>
                <p className="text-text-secondary">{cleanupCount > 0 ? `${cleanupCount} recipients still need cleanup` : 'No recipients still need cleanup'}</p>
                {engagementSummary && <p className="text-text-secondary">{engagementSummary}</p>}
                <p className="text-warning">
                  {thread.skipped > 0 ? describeRecipientReview(thread.skipped) : '0 need contact details'}
                  {' · '}
                  {thread.unreached} not reached yet
                </p>
                <p className="text-text-secondary">
                  {thread.skipped} of {targeted} targeted recipients need contact details
                  {' · '}
                  {thread.unreached} of {targeted} targeted recipients were not reached yet
                </p>
                {focusLabel && <p className="text-text-secondary">{focusLabel}</p>}
                {targeted > 0 && <p className="text-text-secondary">{thread.openRate}% open · {thread.clickRate}% click · {thread.replyRate}% reply</p>}
                    </>
                  );
                })()}
              </div>
            </button>
              );
            })()
          ))}
        </div>
      </div>
    )}

    {activeCampaignThread && (
      <div className="mb-4 rounded-lg border border-border-subtle bg-primary-light/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-tertiary">Active campaign thread</p>
            <h3 className="mt-1 text-sm font-semibold text-text-primary">{activeCampaignThread.name}</h3>
            <p className="mt-1 text-xs text-text-secondary">{activeCampaignThread.count} sends · latest {activeCampaignThread.latestStatus}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeCampaignLatestMessage && (
              <Button size="sm" variant="primary" disabled={!canCompose} onClick={() => onDuplicateLatest(activeCampaignLatestMessage)}>
                <Copy className="w-3.5 h-3.5 mr-1.5" />Duplicate thread to composer
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClearThreadFilter}>Clear thread filter</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-tertiary">
          {(() => {
            const activeThreadTargeted = activeCampaignThread.delivered
              + activeCampaignThread.failed
              + activeCampaignThread.skipped
              + activeCampaignThread.unreached;
            const activeThreadTargetedFallback = activeThreadTargeted > 0
              ? activeThreadTargeted
              : (activeCampaignLatestMessage ? getRecipientCount(activeCampaignLatestMessage) : 0);
            const activeThreadSkippedRate = activeThreadTargeted > 0 ? Math.round((activeCampaignThread.skipped / activeThreadTargeted) * 100) : null;
            const activeThreadReviewRate = activeThreadTargeted > 0 ? Math.round((activeCampaignThread.failed / activeThreadTargeted) * 100) : null;
            const activeThreadUnreachedRate = activeThreadTargeted > 0 ? Math.round((activeCampaignThread.unreached / activeThreadTargeted) * 100) : null;
            const activeThreadCleanupRate = getCleanupCoverageRate({
              failed: activeCampaignThread.failed,
              skipped: activeCampaignThread.skipped,
              unreached: activeCampaignThread.unreached,
              targeted: activeThreadTargetedFallback,
            });
            const activeThreadCleanupCount = getCleanupRecipientCount({
              failed: activeCampaignThread.failed,
              skipped: activeCampaignThread.skipped,
              unreached: activeCampaignThread.unreached,
            });
            const activeThreadReadyCount = getFollowThroughReadyRecipientCount({
              failed: activeCampaignThread.failed,
              skipped: activeCampaignThread.skipped,
              unreached: activeCampaignThread.unreached,
              targeted: activeThreadTargetedFallback,
            });
            const activeThreadDeliveredCoverage = activeThreadTargetedFallback > 0
              ? Math.round((activeCampaignThread.delivered / activeThreadTargetedFallback) * 100)
              : null;
            const activeThreadReviewCoverage = activeThreadTargetedFallback > 0
              ? Math.round((activeCampaignThread.failed / activeThreadTargetedFallback) * 100)
              : null;
            const activeThreadContactCoverage = activeThreadTargetedFallback > 0
              ? Math.round((activeCampaignThread.skipped / activeThreadTargetedFallback) * 100)
              : null;
            const activeThreadUnreachedCoverage = activeThreadTargetedFallback > 0
              ? Math.round((activeCampaignThread.unreached / activeThreadTargetedFallback) * 100)
              : null;
            return (
              <>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
            {activeCampaignThread.delivered > 0 ? `${activeCampaignThread.delivered} recipients delivered` : '0 recipients delivered'}
          </span>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Delivered {activeCampaignThread.delivered}</span>
          {activeThreadTargetedFallback > 0 && (
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
              Targeted {activeThreadTargetedFallback}
            </span>
          )}
          {activeThreadTargetedFallback > 0 && (
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
              {activeCampaignThread.delivered} of {activeThreadTargetedFallback} targeted recipients have been delivered
            </span>
          )}
          {activeThreadDeliveredCoverage != null && (
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
              {activeThreadDeliveredCoverage}% delivered coverage
            </span>
          )}
          {activeThreadReviewCoverage != null && (
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
              {activeThreadReviewCoverage}% review coverage
            </span>
          )}
          {activeThreadContactCoverage != null && (
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
              {activeThreadContactCoverage}% needs contact
            </span>
          )}
          {activeThreadUnreachedCoverage != null && (
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
              {activeThreadUnreachedCoverage}% unreached
            </span>
          )}
          {getFollowThroughFocusLabel({
            failed: activeCampaignThread.failed,
            skipped: activeCampaignThread.skipped,
            unreached: activeCampaignThread.unreached,
          }) && (
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
              {getFollowThroughFocusLabel({
                failed: activeCampaignThread.failed,
                skipped: activeCampaignThread.skipped,
                unreached: activeCampaignThread.unreached,
              })}
            </span>
          )}
          {activeThreadCleanupRate != null && (
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
              {activeThreadCleanupRate}% cleanup still pending
            </span>
          )}
          {activeThreadCleanupRate != null && (
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
              {Math.max(0, 100 - activeThreadCleanupRate)}% follow-through ready
            </span>
          )}
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
            {activeThreadReadyCount} of {activeThreadTargetedFallback} targeted recipients are already closed out
          </span>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
            {activeThreadReadyCount > 0 ? `${activeThreadReadyCount} recipients already closed out` : 'No recipients are already closed out'}
          </span>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
            {activeThreadCleanupCount} of {activeThreadTargetedFallback} targeted recipients still need cleanup
          </span>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">
            {activeThreadCleanupCount > 0 ? `${activeThreadCleanupCount} recipients still need cleanup` : 'No recipients still need cleanup'}
          </span>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Needs review {activeCampaignThread.failed}</span>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Needs contact {activeCampaignThread.skipped}</span>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Not reached {activeCampaignThread.unreached}</span>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Opened {activeCampaignThread.opened}</span>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Viewed {activeCampaignThread.viewed}</span>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Clicked {activeCampaignThread.clicked}</span>
          <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Replied {activeCampaignThread.replied}</span>
          <span className="rounded-lg border border-warning/20 bg-warning-light px-3 py-1 text-warning">Bounced {activeCampaignThread.bounced}</span>
              </>
            );
          })()}
        </div>
        {activeCampaignLatestMessage && (
          <div className="mt-4 rounded-lg border border-border-subtle bg-white px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-text-tertiary">Latest campaign message</p>
                <h4 className="mt-1 text-sm font-semibold text-text-primary">{activeCampaignLatestMessage.subject}</h4>
                <p className="mt-1 text-xs text-text-secondary">
                  {activeCampaignLatestMessage.channel.toUpperCase()} · {getAudienceLabel(activeCampaignLatestMessage)} · {activeCampaignLatestMessage.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onViewLatest(activeCampaignLatestMessage)}>View latest</Button>
                <Button size="sm" variant="outline" disabled={!canCompose} onClick={() => onEditLatest(activeCampaignLatestMessage)}>Edit in composer</Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!canCompose} onClick={() => onStartFollowUp('reminder')}>Next: reminder</Button>
              <Button size="sm" variant="outline" disabled={!canCompose} onClick={() => onScheduleFollowUp('reminder')}>Schedule reminder</Button>
              <Button size="sm" variant="outline" disabled={!canCompose} onClick={() => onStartFollowUp('day-of')}>Next: day-of update</Button>
              <Button size="sm" variant="outline" disabled={!canCompose} onClick={() => onScheduleFollowUp('day-of')}>Schedule day-of</Button>
              <Button size="sm" variant="outline" disabled={!canCompose} onClick={() => onStartFollowUp('thank-you')}>Next: thank you</Button>
              <Button size="sm" variant="outline" disabled={!canCompose} onClick={() => onScheduleFollowUp('thank-you')}>Schedule thank you</Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-tertiary">
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Recipients {getRecipientCount(activeCampaignLatestMessage)}</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Delivered {activeCampaignLatestMessage.delivered_count ?? 0}</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Needs review {activeCampaignLatestMessage.failed_count ?? 0}</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Needs contact {getSkippedCount(activeCampaignLatestMessage, deliveries)}</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Not reached {getUnreachedCount(activeCampaignLatestMessage, deliveries)}</span>
              {(() => {
                const engagement = getMessageEngagementStats(activeCampaignLatestMessage);
                const deliveredRecipients = Math.max(0, Number(activeCampaignLatestMessage.delivered_count ?? 0));
                const failedRecipients = Math.max(0, Number(activeCampaignLatestMessage.failed_count ?? 0));
                const skippedRecipients = getSkippedCount(activeCampaignLatestMessage, deliveries);
                const unreachedRecipients = getUnreachedCount(activeCampaignLatestMessage, deliveries);
                const targetedRecipients = Math.max(
                  deliveredRecipients
                  + failedRecipients
                  + skippedRecipients
                  + unreachedRecipients
                  + getRecipientCount(activeCampaignLatestMessage),
                  0,
                );
                const deliveredRate = targetedRecipients > 0 ? Math.round((deliveredRecipients / targetedRecipients) * 100) : null;
                const reviewRate = targetedRecipients > 0 ? Math.round((failedRecipients / targetedRecipients) * 100) : null;
                const skippedRate = targetedRecipients > 0 ? Math.round((skippedRecipients / targetedRecipients) * 100) : null;
                const unreachedRate = targetedRecipients > 0 ? Math.round((unreachedRecipients / targetedRecipients) * 100) : null;
                const cleanupRate = getCleanupCoverageRate({
                  failed: failedRecipients,
                  skipped: skippedRecipients,
                  unreached: unreachedRecipients,
                  targeted: targetedRecipients,
                });
                const cleanupCount = getCleanupRecipientCount({
                  failed: failedRecipients,
                  skipped: skippedRecipients,
                  unreached: unreachedRecipients,
                });
                const followThroughReadyCount = getFollowThroughReadyRecipientCount({
                  failed: failedRecipients,
                  skipped: skippedRecipients,
                  unreached: unreachedRecipients,
                  targeted: targetedRecipients,
                });
                const followThroughFocusLabel = getFollowThroughFocusLabel({
                  failed: failedRecipients,
                  skipped: skippedRecipients,
                  unreached: unreachedRecipients,
                });
                const openRate = deliveredRecipients > 0 && engagement.opened != null ? Math.round((engagement.opened / deliveredRecipients) * 100) : null;
                const clickRate = deliveredRecipients > 0 && engagement.clicked != null ? Math.round((engagement.clicked / deliveredRecipients) * 100) : null;
                const replyRate = deliveredRecipients > 0 && engagement.replied != null ? Math.round((engagement.replied / deliveredRecipients) * 100) : null;
                return (
                  <>
                    <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">
                      {deliveredRecipients > 0 ? `${deliveredRecipients} recipients delivered` : '0 recipients delivered'}
                    </span>
                    <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{targetedRecipients} targeted recipients</span>
                    <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Targeted {targetedRecipients}</span>
                    <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{deliveredRecipients} of {targetedRecipients} targeted recipients have been delivered</span>
                    {deliveredRate != null && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{deliveredRate}% delivered coverage</span>}
                    {reviewRate != null && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{reviewRate}% review coverage</span>}
                    {skippedRate != null && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{skippedRate}% needs contact</span>}
                    {unreachedRate != null && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{unreachedRate}% unreached</span>}
                    {cleanupRate != null && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{cleanupRate}% cleanup still pending</span>}
                    {cleanupRate != null && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{Math.max(0, 100 - cleanupRate)}% follow-through ready</span>}
                    <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{followThroughReadyCount} of {targetedRecipients} targeted recipients are already closed out</span>
                    <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{followThroughReadyCount > 0 ? `${followThroughReadyCount} recipients already closed out` : 'No recipients are already closed out'}</span>
                    <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{cleanupCount} of {targetedRecipients} targeted recipients still need cleanup</span>
                    <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{cleanupCount > 0 ? `${cleanupCount} recipients still need cleanup` : 'No recipients still need cleanup'}</span>
                    <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{skippedRecipients} of {targetedRecipients} targeted recipients need contact details · {unreachedRecipients} of {targetedRecipients} targeted recipients were not reached yet</span>
                    {followThroughFocusLabel && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{followThroughFocusLabel}</span>}
                    {engagement.opened != null && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Opened {engagement.opened}</span>}
                    {engagement.viewed != null && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Viewed {engagement.viewed}</span>}
                    {engagement.clicked != null && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Clicked {engagement.clicked}</span>}
                    {engagement.replied != null && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">Replied {engagement.replied}</span>}
                    {engagement.bounced != null && <span className="rounded-lg border border-warning/20 bg-warning-light px-3 py-1 text-warning">Bounced {engagement.bounced}</span>}
                    {targetedRecipients > 0 && (
                      <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">
                        {(openRate ?? 0)}% open · {(clickRate ?? 0)}% click · {(replyRate ?? 0)}% reply
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    )}
  </>
);

export interface MessageReviewQueuePanelsProps {
  canCompose: boolean;
  deliveries: DeliveryRow[];
  onRetry: (message: Message) => void;
  onShowNeedsFollowUp: () => void;
  onShowNeedsReview: () => void;
  onViewMessage: (message: Message) => void;
  retryCandidates: Message[];
  retryingMessageId: string | null;
  reviewCandidates: Message[];
}

export const MessageReviewQueuePanels: React.FC<MessageReviewQueuePanelsProps> = ({
  canCompose,
  deliveries,
  onRetry,
  onShowNeedsFollowUp,
  onShowNeedsReview,
  onViewMessage,
  retryCandidates,
  retryingMessageId,
  reviewCandidates,
}) => (
  <>
    {retryCandidates.length > 0 && (
      <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4 mb-4">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div>
            <p className="text-xs font-semibold text-text-tertiary">Follow-up review</p>
            <p className="mt-1 text-sm font-medium text-text-primary">Messages that may need another send</p>
          </div>
          <button onClick={onShowNeedsReview} className="text-xs text-primary">View needs review</button>
        </div>
        <div className="space-y-2">
          {retryCandidates.map((message) => (
            <div key={message.id} className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-3 bg-white">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{message.subject}</p>
                <p className="text-[11px] text-text-tertiary">{message.status} · {message.channel} · {getRecipientCount(message)} recipients</p>
              </div>
              {canRetryMessageStatus(message.status) ? (
                <button
                  onClick={() => onRetry(message)}
                  disabled={retryingMessageId !== null || !canCompose}
                  className="text-xs px-2 py-1 rounded border border-border bg-white text-text-secondary disabled:opacity-50"
                >
                  {retryingMessageId === message.id ? 'Sending…' : 'Send again'}
                </button>
              ) : (
                <span className="text-[11px] text-text-tertiary max-w-[220px] text-right">Review partial delivery before sending a follow-up so you do not duplicate messages.</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )}

    {reviewCandidates.length > 0 && (
      <div className="rounded-lg border border-border-subtle bg-surface-subtle/45 p-4 mb-4">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div>
            <p className="text-xs font-semibold text-text-tertiary">Review queue</p>
            <p className="mt-1 text-sm font-medium text-text-primary">Campaigns that need follow-up judgment</p>
          </div>
          <button onClick={onShowNeedsFollowUp} className="text-xs text-primary">View needs follow-up</button>
        </div>
        <div className="space-y-2">
          {reviewCandidates.map((message) => {
            const rowSummary = getMessageRowFollowThroughSummary(message, deliveries);
            return (
              <div key={message.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle px-3 py-3 bg-white">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{message.subject}</p>
                  <p className="text-[11px] text-text-tertiary">
                    {message.channel} · delivered {rowSummary.deliveredRecipients} · needs review {rowSummary.failedRecipients} · needs contact {rowSummary.skippedRecipients} · not reached {rowSummary.unreachedRecipients}
                  </p>
                  <p className="mt-1 text-[11px] text-text-tertiary">
                    {rowSummary.targetedRecipients} targeted recipients · {rowSummary.deliveredCoverageRate}% delivered coverage · {rowSummary.reviewCoverageRate}% review coverage · {rowSummary.contactCoverageRate}% needs contact · {rowSummary.unreachedCoverageRate}% unreached
                  </p>
                  <p className="mt-1 text-[11px] text-text-tertiary">
                    {rowSummary.cleanupCoverageRate}% cleanup still pending · {Math.max(0, 100 - rowSummary.cleanupCoverageRate)}% follow-through ready
                  </p>
                  <p className="mt-1 text-[11px] text-text-tertiary">
                    {rowSummary.followThroughReadyRecipientCount} of {rowSummary.targetedRecipients} targeted recipients are already closed out
                    {' · '}
                    {rowSummary.cleanupRecipientCount} of {rowSummary.targetedRecipients} targeted recipients still need cleanup
                  </p>
                  <p className="mt-1 text-[11px] text-text-tertiary">
                    {rowSummary.followThroughReadyRecipientCount > 0 ? `${rowSummary.followThroughReadyRecipientCount} recipients already closed out` : 'No recipients are already closed out'}
                    {' · '}
                    {rowSummary.cleanupRecipientCount > 0 ? `${rowSummary.cleanupRecipientCount} recipients still need cleanup` : 'No recipients still need cleanup'}
                  </p>
                  <p className="mt-1 text-[11px] text-text-tertiary">
                    {rowSummary.skippedRecipients} of {rowSummary.targetedRecipients} targeted recipients need contact details
                    {' · '}
                    {rowSummary.unreachedRecipients} of {rowSummary.targetedRecipients} targeted recipients were not reached yet
                  </p>
                  {rowSummary.followThroughFocusLabel && (
                    <p className="mt-1 text-[11px] text-text-tertiary">{rowSummary.followThroughFocusLabel}</p>
                  )}
                </div>
                <div className="text-right">
                  <button
                    onClick={() => onViewMessage(message)}
                    className="text-xs px-2 py-1 rounded border border-border bg-white text-text-secondary"
                  >
                    Review
                  </button>
                  <p className="mt-1 text-[11px] text-text-tertiary max-w-[220px]">Review who missed it, then duplicate if you need a follow-up.</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </>
);

export function getStatusBadge(message: Message) {
  const deliveryState = getMessageDeliveryState({
    status: message.status,
    sentAt: message.sent_at,
  });
  const toneClasses = (() => {
    switch (deliveryState.tone) {
      case 'success':
        return 'bg-success-light text-success border-success/20';
      case 'danger':
        return 'bg-error-light text-error border-error/20';
      case 'warning':
        return 'bg-warning-light text-warning border-warning/20';
      default:
        return 'bg-surface-subtle text-text-secondary border-border';
    }
  })();
  if (deliveryState.label === 'Sending') {
    return <span className={`px-2 py-1 rounded text-xs border flex items-center gap-1 ${toneClasses}`}><Loader2 size={10} className="animate-spin" />Sending…</span>;
  }
  return <span className={`px-2 py-1 rounded text-xs border ${toneClasses}`}>{deliveryState.label}</span>;
}

function getMessageRowFollowThroughSummary(message: Message, deliveries: DeliveryRow[]) {
  const recipientCount = getRecipientCount(message);
  const deliveredRecipients = Math.max(0, Number(message.delivered_count ?? 0));
  const failedRecipients = Math.max(0, Number(message.failed_count ?? 0));
  const skippedRecipients = getSkippedCount(message, deliveries);
  const hasDeliveryActivity = isDeliveryCompletedStatus(message.status) || !!message.sent_at || deliveredRecipients > 0 || failedRecipients > 0 || skippedRecipients > 0;
  const unreachedRecipients = hasDeliveryActivity ? getUnreachedCount(message, deliveries) : 0;
  const targetedRecipients = Math.max(
    recipientCount,
    deliveredRecipients + failedRecipients + skippedRecipients + unreachedRecipients,
    0,
  );
  const deliveredCoverageRate = targetedRecipients > 0 ? Math.round((deliveredRecipients / targetedRecipients) * 100) : 0;
  const reviewCoverageRate = targetedRecipients > 0 ? Math.round((failedRecipients / targetedRecipients) * 100) : 0;
  const contactCoverageRate = targetedRecipients > 0 ? Math.round((skippedRecipients / targetedRecipients) * 100) : 0;
  const unreachedCoverageRate = targetedRecipients > 0 ? Math.round((unreachedRecipients / targetedRecipients) * 100) : 0;
  const cleanupCoverageRate = getCleanupCoverageRate({
    failed: failedRecipients,
    skipped: skippedRecipients,
    unreached: unreachedRecipients,
    targeted: targetedRecipients,
  }) ?? 0;
  const cleanupRecipientCount = getCleanupRecipientCount({
    failed: failedRecipients,
    skipped: skippedRecipients,
    unreached: unreachedRecipients,
  });
  const followThroughReadyRecipientCount = getFollowThroughReadyRecipientCount({
    failed: failedRecipients,
    skipped: skippedRecipients,
    unreached: unreachedRecipients,
    targeted: targetedRecipients,
  });
  const followThroughFocusLabel = getFollowThroughFocusLabel({
    failed: failedRecipients,
    skipped: skippedRecipients,
    unreached: unreachedRecipients,
  });
  const engagement = getMessageEngagementStats(message);
  const openRate = deliveredRecipients > 0 && engagement.opened != null ? Math.round((engagement.opened / deliveredRecipients) * 100) : 0;
  const clickRate = deliveredRecipients > 0 && engagement.clicked != null ? Math.round((engagement.clicked / deliveredRecipients) * 100) : 0;
  const replyRate = deliveredRecipients > 0 && engagement.replied != null ? Math.round((engagement.replied / deliveredRecipients) * 100) : 0;

  return {
    deliveredRecipients,
    failedRecipients,
    skippedRecipients,
    unreachedRecipients,
    targetedRecipients,
    deliveredCoverageRate,
    reviewCoverageRate,
    contactCoverageRate,
    unreachedCoverageRate,
    cleanupCoverageRate,
    cleanupRecipientCount,
    followThroughReadyRecipientCount,
    followThroughFocusLabel,
    engagement,
    openRate,
    clickRate,
    replyRate,
  };
}

export interface MessageHistoryCardProps {
  activeCampaignLatestMessage: Message | null;
  activeCampaignThread: CampaignThreadSummary | null;
  audienceBreakdown: MessageHistorySummaryPanelsProps['audienceBreakdown'];
  campaignStatusSummary: MessageHistorySummaryPanelsProps['campaignStatusSummary'];
  campaignThreads: CampaignThreadSummary[];
  canCompose: boolean;
  channelBreakdown: MessageHistorySummaryPanelsProps['channelBreakdown'];
  channelEngagementBreakdown: MessageHistorySummaryPanelsProps['channelEngagementBreakdown'];
  deliveries: DeliveryRow[];
  deliveryHealth: MessageHistorySummaryPanelsProps['deliveryHealth'];
  filteredHistory: Message[];
  historyAudienceFilter: string;
  historyCampaignFilter: string;
  historyChannelFilter: MessageHistoryChannelFilter;
  historyDeliveryFilter: MessageHistoryDeliveryFilter;
  historySearch: string;
  historyStatusCounts: MessageHistorySummaryPanelsProps['historyStatusCounts'];
  historyStatusFilter: MessageHistoryStatusFilter;
  messages: Message[];
  providerTelemetry: MessageHistorySummaryPanelsProps['providerTelemetry'];
  retryCandidates: Message[];
  retryingMessageId: string | null;
  reviewCandidates: Message[];
  onCancelSchedule: (message: Message) => void;
  onClearThreadFilter: () => void;
  onDuplicateLatest: (message: Message) => void;
  onEditLatest: (message: Message) => void;
  onRescheduleMessage: (message: Message) => void;
  onRetry: (message: Message) => void;
  onScheduleFollowUp: (type: 'reminder' | 'day-of' | 'thank-you') => void;
  onSelectThread: (threadName: string) => void;
  onSendScheduledNow: (message: Message) => void;
  onSetHistoryAudienceFilter: (filter: string) => void;
  onSetHistoryCampaignFilter: (filter: string) => void;
  onSetHistoryChannelFilter: (filter: MessageHistoryChannelFilter) => void;
  onSetHistoryDeliveryFilter: (filter: MessageHistoryDeliveryFilter) => void;
  onSetHistorySearch: (search: string) => void;
  onSetHistoryStatusFilter: (filter: MessageHistoryStatusFilter) => void;
  onStartFollowUp: (type: 'reminder' | 'day-of' | 'thank-you') => void;
  onViewMessage: (message: Message) => void;
}

export const MessageHistoryCard: React.FC<MessageHistoryCardProps> = ({
  activeCampaignLatestMessage,
  activeCampaignThread,
  audienceBreakdown,
  campaignStatusSummary,
  campaignThreads,
  canCompose,
  channelBreakdown,
  channelEngagementBreakdown,
  deliveries,
  deliveryHealth,
  filteredHistory,
  historyAudienceFilter,
  historyCampaignFilter,
  historyChannelFilter,
  historyDeliveryFilter,
  historySearch,
  historyStatusCounts,
  historyStatusFilter,
  messages,
  providerTelemetry,
  retryCandidates,
  retryingMessageId,
  reviewCandidates,
  onCancelSchedule,
  onClearThreadFilter,
  onDuplicateLatest,
  onEditLatest,
  onRescheduleMessage,
  onRetry,
  onScheduleFollowUp,
  onSelectThread,
  onSendScheduledNow,
  onSetHistoryAudienceFilter,
  onSetHistoryCampaignFilter,
  onSetHistoryChannelFilter,
  onSetHistoryDeliveryFilter,
  onSetHistorySearch,
  onSetHistoryStatusFilter,
  onStartFollowUp,
  onViewMessage,
}) => {
  const historyAudienceOptions = Array
    .from(new Set(messages.map((message) => message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all')))
    .slice(0, 12);

  return (
    <Card variant="bordered" padding="lg" className="border-border-subtle overflow-hidden">
      <div className="-mx-6 -mt-6 mb-5 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text-tertiary">History</p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">Message history</h2>
            <p className="text-xs text-text-tertiary mt-1">Filter by status, channel, or group to quickly find what you need.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              value={historySearch}
              onChange={(e) => onSetHistorySearch(e.target.value)}
              placeholder="Search messages"
              className="w-[180px]"
            />
            <select value={historyStatusFilter} onChange={(e) => onSetHistoryStatusFilter(e.target.value as MessageHistoryStatusFilter)} className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-secondary">
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="sent">Sent</option>
              <option value="scheduled">Scheduled</option>
              <option value="partial">Needs follow-up</option>
              <option value="failed">Needs review</option>
              <option value="draft">Draft</option>
            </select>
            <select value={historyChannelFilter} onChange={(e) => onSetHistoryChannelFilter(e.target.value as MessageHistoryChannelFilter)} className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-secondary">
              <option value="all">All channels</option>
              <option value="email">Email</option>
              <option value="sms">Text</option>
            </select>
            <select value={historyAudienceFilter} onChange={(e) => onSetHistoryAudienceFilter(e.target.value)} className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-secondary">
              <option value="all">All audiences</option>
              {historyAudienceOptions.map((audience) => (
                <option key={audience} value={audience}>{audience}</option>
              ))}
            </select>
            <select value={historyDeliveryFilter} onChange={(e) => onSetHistoryDeliveryFilter(e.target.value as MessageHistoryDeliveryFilter)} className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-secondary">
              <option value="all">All delivery states</option>
              <option value="delivered">Has delivered</option>
              <option value="failed">Needs review</option>
              <option value="skipped">Needs contact details</option>
              <option value="unreached">Not reached yet</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" onClick={() => { onSetHistoryStatusFilter('failed'); onSetHistoryChannelFilter('all'); onSetHistoryDeliveryFilter('failed'); }} className="text-[11px] px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Needs review</button>
        <button type="button" onClick={() => { onSetHistoryDeliveryFilter('skipped'); onSetHistoryStatusFilter('all'); onSetHistoryChannelFilter('all'); }} className="text-[11px] px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Needs contact details</button>
        <button type="button" onClick={() => { onSetHistoryDeliveryFilter('unreached'); onSetHistoryStatusFilter('all'); onSetHistoryChannelFilter('all'); }} className="text-[11px] px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Not reached yet</button>
        <button type="button" onClick={() => { onSetHistoryStatusFilter('scheduled'); onSetHistoryChannelFilter('all'); }} className="text-[11px] px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Show scheduled</button>
        <button type="button" onClick={() => { onSetHistoryStatusFilter('all'); onSetHistoryChannelFilter('sms'); }} className="text-[11px] px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Text only</button>
        <button type="button" onClick={() => { onSetHistoryStatusFilter('all'); onSetHistoryChannelFilter('email'); }} className="text-[11px] px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Email only</button>
        <button type="button" onClick={() => { onSetHistoryStatusFilter('all'); onSetHistoryChannelFilter('all'); onSetHistoryAudienceFilter('all'); onSetHistoryDeliveryFilter('all'); onSetHistoryCampaignFilter(''); onSetHistorySearch(''); }} className="text-[11px] px-3 py-1.5 rounded-lg border border-border-subtle bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Reset filters</button>
      </div>

      {historyCampaignFilter && (
        <div className="mb-4 flex items-center gap-2 text-xs text-text-tertiary">
          <span className="rounded-lg border border-primary/20 bg-primary-light/40 px-3 py-1 text-primary">Campaign thread: {historyCampaignFilter}</span>
          <button type="button" onClick={() => onSetHistoryCampaignFilter('')} className="text-primary hover:underline">Clear</button>
        </div>
      )}

      <MessageHistorySummaryPanels
        audienceBreakdown={audienceBreakdown}
        campaignStatusSummary={campaignStatusSummary}
        channelBreakdown={channelBreakdown}
        channelEngagementBreakdown={channelEngagementBreakdown}
        deliveryHealth={deliveryHealth}
        historyStatusCounts={historyStatusCounts}
        providerTelemetry={providerTelemetry}
      />

      <MessageCampaignThreadPanels
        activeCampaignLatestMessage={activeCampaignLatestMessage}
        activeCampaignThread={activeCampaignThread}
        campaignThreads={campaignThreads}
        canCompose={canCompose}
        deliveries={deliveries}
        onClearThreadFilter={onClearThreadFilter}
        onDuplicateLatest={onDuplicateLatest}
        onEditLatest={onEditLatest}
        onScheduleFollowUp={onScheduleFollowUp}
        onSelectThread={onSelectThread}
        onStartFollowUp={onStartFollowUp}
        onViewLatest={onViewMessage}
      />

      <MessageReviewQueuePanels
        canCompose={canCompose}
        deliveries={deliveries}
        retryCandidates={retryCandidates}
        retryingMessageId={retryingMessageId}
        reviewCandidates={reviewCandidates}
        onRetry={onRetry}
        onShowNeedsFollowUp={() => {
          onSetHistoryStatusFilter('partial');
          onSetHistoryChannelFilter('all');
          onSetHistoryDeliveryFilter('all');
          onSetHistoryCampaignFilter('');
          onSetHistorySearch('');
        }}
        onShowNeedsReview={() => {
          onSetHistoryStatusFilter('failed');
          onSetHistoryChannelFilter('all');
          onSetHistoryDeliveryFilter('failed');
          onSetHistoryCampaignFilter('');
          onSetHistorySearch('');
        }}
        onViewMessage={onViewMessage}
      />

      {filteredHistory.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-subtle py-14 text-center">
          <Mail className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <p className="text-text-secondary">No messages match these filters</p>
          <p className="text-sm text-text-tertiary mt-1">Try a different status, channel, audience, or search term.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((message) => {
            const recipientCount = getRecipientCount(message);
            const campaignName = getCampaignName(message);
            const rowSummary = getMessageRowFollowThroughSummary(message, deliveries);
            return (
              <div
                key={message.id}
                className="w-full rounded-lg border border-border-subtle bg-white p-5 transition-colors hover:border-primary/30 group"
              >
                <button
                  type="button"
                  onClick={() => onViewMessage(message)}
                  className="w-full text-left"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      {campaignName && <p className="mb-1 text-[11px] font-semibold text-text-tertiary">{campaignName}</p>}
                      <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors break-words leading-snug">
                        {message.subject}
                      </h3>
                      <p className="mt-1 text-[11px] text-text-tertiary">{message.channel} · {getAudienceLabel(message)}</p>
                    </div>
                    <span>{getStatusBadge(message)}</span>
                  </div>
                  <p className="text-sm text-text-secondary mb-4 line-clamp-2">{message.body}</p>
                  <div className="flex items-center justify-between gap-4 text-xs text-text-tertiary">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}
                      </span>
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{rowSummary.deliveredRecipients} delivered · {rowSummary.failedRecipients} need review</span>
                      )}
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{rowSummary.targetedRecipients} targeted recipients</span>
                      )}
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{rowSummary.deliveredRecipients} of {rowSummary.targetedRecipients} targeted recipients have been delivered</span>
                      )}
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{rowSummary.deliveredCoverageRate}% delivered coverage · {rowSummary.reviewCoverageRate}% review coverage · {rowSummary.contactCoverageRate}% needs contact · {rowSummary.unreachedCoverageRate}% unreached</span>
                      )}
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{rowSummary.cleanupCoverageRate}% cleanup still pending</span>
                      )}
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{Math.max(0, 100 - rowSummary.cleanupCoverageRate)}% follow-through ready</span>
                      )}
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{rowSummary.followThroughReadyRecipientCount} of {rowSummary.targetedRecipients} targeted recipients are already closed out</span>
                      )}
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{rowSummary.followThroughReadyRecipientCount > 0 ? `${rowSummary.followThroughReadyRecipientCount} recipients already closed out` : 'No recipients are already closed out'}</span>
                      )}
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{rowSummary.cleanupRecipientCount} of {rowSummary.targetedRecipients} targeted recipients still need cleanup</span>
                      )}
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{rowSummary.cleanupRecipientCount > 0 ? `${rowSummary.cleanupRecipientCount} recipients still need cleanup` : 'No recipients still need cleanup'}</span>
                      )}
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{rowSummary.skippedRecipients} of {rowSummary.targetedRecipients} targeted recipients need contact details · {rowSummary.unreachedRecipients} of {rowSummary.targetedRecipients} targeted recipients were not reached yet</span>
                      )}
                      {rowSummary.followThroughFocusLabel && (
                        <span>{rowSummary.followThroughFocusLabel}</span>
                      )}
                      {rowSummary.engagement.opened != null && (
                        <span>{rowSummary.engagement.opened} opened</span>
                      )}
                      {rowSummary.engagement.viewed != null && (
                        <span>{rowSummary.engagement.viewed} viewed</span>
                      )}
                      {rowSummary.engagement.clicked != null && (
                        <span>{rowSummary.engagement.clicked} clicked</span>
                      )}
                      {rowSummary.engagement.replied != null && (
                        <span>{rowSummary.engagement.replied} replied</span>
                      )}
                      {rowSummary.engagement.bounced != null && (
                        <span>{rowSummary.engagement.bounced} bounced</span>
                      )}
                      {(recipientCount > 0 || typeof message.delivered_count === 'number' || typeof message.failed_count === 'number') && (
                        <span>{rowSummary.openRate}% open · {rowSummary.clickRate}% click · {rowSummary.replyRate}% reply</span>
                      )}
                      <span>{describeRecipientReview(rowSummary.skippedRecipients)}</span>
                      <span>{rowSummary.unreachedRecipients} not reached yet</span>
                      {getCampaignTypeLabel(message) && (
                        <span className="px-2 py-0.5 bg-surface-subtle text-text-secondary rounded border border-border-subtle">
                          {getCampaignTypeLabel(message)}
                        </span>
                      )}
                      {message.status === 'scheduled' && isPastScheduledTime(message.scheduled_for) && (
                        <span className="px-2 py-0.5 bg-warning-light text-warning rounded border border-warning/20">
                          Due now
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-text-tertiary">
                        <Clock className="w-3 h-3" />
                        {message.status === 'scheduled' && message.scheduled_for
                          ? formatMessageHistoryDate(message.scheduled_for)
                          : message.sent_at
                          ? formatMessageHistoryDate(message.sent_at)
                          : 'Draft'}
                      </span>
                      {(recipientCount > 0 || message.delivered_count != null || message.failed_count != null) && (
                        <span className="flex items-center gap-1 text-success font-medium">
                          <CheckCircle size={10} />
                          {rowSummary.deliveredRecipients} delivered
                        </span>
                      )}
                      {(recipientCount > 0 || message.delivered_count != null || message.failed_count != null) && (
                        <span className="flex items-center gap-1 text-error font-medium">
                          <AlertCircle size={10} />
                          {rowSummary.failedRecipients} need review
                        </span>
                      )}
                    </div>
                    <span className="text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View →
                    </span>
                  </div>
                </button>

                {(message.status === 'scheduled' || message.status === 'failed' || message.status === 'partial') && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border-subtle pt-3">
                    {message.status === 'scheduled' && (
                      <>
                        <Button size="sm" variant="primary" onClick={() => onSendScheduledNow(message)} disabled={!canCompose}>
                          <Send className="w-3.5 h-3.5 mr-1.5" />Send now
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onRescheduleMessage(message)} disabled={!canCompose}>
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />Reschedule
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onCancelSchedule(message)} disabled={!canCompose}>
                          Move to draft
                        </Button>
                      </>
                    )}
                    {canRetryMessageStatus(message.status) && (
                      <Button size="sm" variant="outline" onClick={() => onRetry(message)} disabled={retryingMessageId === message.id || !canCompose}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />{retryingMessageId === message.id ? 'Sending…' : 'Send again'}
                      </Button>
                    )}
                    {message.status === 'partial' && (
                      <p className="text-xs text-text-tertiary max-w-xs">Campaigns needing follow-up stay review-only here so this control does not re-send guests who already got the message.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
