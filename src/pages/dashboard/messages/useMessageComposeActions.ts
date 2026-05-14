import type React from 'react';
import { countSmsSegments, estimateSmsCredits } from '../../../lib/smsSegments';
import { SMS_PROVIDER_PENDING_COPY, isSmsProviderEnabled } from '../../../lib/smsProvider';
import type {
  AudienceOption,
  Guest,
  Message,
  MessageTemplateKey,
  WeddingSite,
} from './messageDashboardTypes';
import { formatScheduledMessageDateTime } from '../messageScheduleTime';
import {
  describeRecipientReview,
  hasReachableEmail,
  hasReachableSms,
  isPastScheduledTime,
  safeMessagesError,
} from './messageDashboardUtils';
import { triggerDashboardBulkSend, insertDashboardMessageMinimal, updateDashboardMessage } from './messageService';

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

type ToastFn = (message: string, tone?: 'success' | 'error' | 'info') => void;

type FormDataShape = {
  campaignName: string;
  templateKey: MessageTemplateKey;
  subject: string;
  body: string;
  audience: string;
  channel: 'email' | 'sms';
  scheduleType: string;
  scheduleDate: string;
  scheduleTime: string;
};

export type UseMessageComposeActionsArgs = {
  weddingSite: WeddingSite | null;
  isDemoMode: boolean;
  formData: FormDataShape;
  selectedAudience: AudienceOption | undefined;
  selectedTemplate: { campaignType?: string | null };
  editingMessageId: string | null;
  smsCredits: number;
  smsCreditsNeeded: number;
  smsCreditsSufficient: boolean;
  messagesChannel: 'email' | 'sms';
  getRecipients: (audience: string) => Guest[];
  fetchMessages: () => Promise<void>;
  toast: ToastFn;
  setSending: SetState<boolean>;
  setMessages: SetState<Message[]>;
  setShowRecipientPreview: SetState<boolean>;
  setEditingMessageId: SetState<string | null>;
  setFormData: SetState<FormDataShape>;
};

export function useMessageComposeActions({
  weddingSite,
  isDemoMode,
  formData,
  selectedAudience,
  selectedTemplate,
  editingMessageId,
  smsCredits,
  smsCreditsNeeded,
  smsCreditsSufficient,
  messagesChannel,
  getRecipients,
  fetchMessages,
  toast,
  setSending,
  setMessages,
  setShowRecipientPreview,
  setEditingMessageId,
  setFormData,
}: UseMessageComposeActionsArgs) {
  const handleSendMessage = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    if (!weddingSite) return;
    setSending(true);
    try {
      const recipients = getRecipients(formData.audience);
      const totalAudienceCount = recipients.length;
      const recipientCount = formData.channel === 'sms'
        ? recipients.filter((g) => hasReachableSms(g)).length
        : recipients.filter((g) => hasReachableEmail(g.email)).length;
      const skippedRecipientCount = Math.max(totalAudienceCount - recipientCount, 0);

      if (recipientCount === 0 && !saveAsDraft) {
        toast(
          formData.channel === 'sms'
            ? 'No recipients have reachable phone numbers with text consent. Add phone numbers and consent first.'
            : 'No recipients have valid email addresses. Add valid emails to your guests first.',
          'error',
        );
        setSending(false);
        return;
      }

      if (formData.channel === 'sms' && !saveAsDraft) {
        if (!isSmsProviderEnabled()) {
          toast(SMS_PROVIDER_PENDING_COPY, 'info');
          setSending(false);
          return;
        }
        if (!smsCreditsSufficient) {
          toast(`Not enough text credits. Need ${smsCreditsNeeded}, have ${smsCredits}.`, 'error');
          setSending(false);
          return;
        }
      }

      const requestedScheduledFor = !saveAsDraft && formData.scheduleType === 'later' && formData.scheduleDate && formData.scheduleTime
        ? `${formData.scheduleDate}T${formData.scheduleTime}:00`
        : null;
      const isScheduled = !!requestedScheduledFor && !isPastScheduledTime(requestedScheduledFor);
      const isSendNow = !saveAsDraft && !isScheduled;

      const status = saveAsDraft ? 'draft' : isScheduled ? 'scheduled' : 'queued';
      const scheduledFor = isScheduled ? requestedScheduledFor : null;
      const campaignName = formData.campaignName.trim();
      const normalizedSubject = formData.channel === 'sms'
        ? (formData.subject.trim() || `Text • ${selectedAudience?.label ?? 'All guests'}`)
        : formData.subject;
      const recipientMeta = {
        audience: formData.audience,
        audience_label: selectedAudience?.label ?? null,
        recipient_count: totalAudienceCount,
        reachable_count: recipientCount,
        skipped_count: skippedRecipientCount,
        sms_segment_count: formData.channel === 'sms' ? countSmsSegments(formData.body) : null,
        sms_credit_cost: formData.channel === 'sms' ? estimateSmsCredits(formData.body, recipientCount) : null,
        campaignName: campaignName || null,
        campaignType: selectedTemplate.campaignType ?? null,
        templateKey: formData.templateKey,
      };

      let inserted: { id: string } | null = null;
      const isEditingExistingMessage = !!editingMessageId;

      if (isDemoMode) {
        inserted = { id: editingMessageId ?? `demo-msg-${Date.now()}` };
        const demoMessage: Message = {
          id: inserted.id,
          subject: normalizedSubject,
          body: formData.body,
          sent_at: status === 'queued' ? new Date().toISOString() : null,
          scheduled_for: scheduledFor,
          status: status === 'queued' ? (skippedRecipientCount > 0 ? 'partial' : 'sent') : status,
          channel: formData.channel,
          audience_filter: formData.audience,
          recipient_filter: recipientMeta,
          recipient_count: totalAudienceCount,
          delivered_count: status === 'queued' ? recipientCount : 0,
          failed_count: 0,
        };
        setMessages((prev) => {
          if (!isEditingExistingMessage) return [demoMessage, ...prev];
          return prev.map((item) => (item.id === inserted!.id ? demoMessage : item));
        });
      } else {
        if (isEditingExistingMessage) {
          inserted = { id: editingMessageId };

          await updateDashboardMessage(editingMessageId, {
            subject: normalizedSubject,
            body: formData.body,
            channel: formData.channel,
            status,
            scheduled_for: scheduledFor,
            sent_at: null,
            delivered_count: status === 'queued' ? 0 : null,
            failed_count: status === 'queued' ? 0 : null,
            sending_started_at: null,
            sending_finished_at: null,
          });

          void updateDashboardMessage(editingMessageId, {
            audience_filter: formData.audience,
            recipient_count: totalAudienceCount,
            recipient_filter: recipientMeta,
          });
        } else {
          inserted = await insertDashboardMessageMinimal({
            wedding_site_id: weddingSite.id,
            subject: normalizedSubject,
            body: formData.body,
            channel: formData.channel,
            status,
            scheduled_for: scheduledFor,
            sent_at: null,
          });

          if (inserted) {
            void updateDashboardMessage(inserted.id, {
              audience_filter: formData.audience,
              recipient_count: totalAudienceCount,
              recipient_filter: recipientMeta,
            });
          }
        }
      }

      setShowRecipientPreview(false);
      setEditingMessageId(null);
      setFormData({
        campaignName: '',
        templateKey: 'blank',
        subject: '',
        body: '',
        audience: 'all',
        channel: messagesChannel,
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
      });

      if (saveAsDraft) {
        toast(isEditingExistingMessage ? 'Draft updated' : 'Saved as draft', 'info');
        if (!isDemoMode) {
          await fetchMessages();
        }
        return;
      }

      if (isScheduled) {
        toast(`${isEditingExistingMessage ? 'Updated' : 'Scheduled'} for ${formatScheduledMessageDateTime(scheduledFor)} — ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`, 'info');
        if (!isDemoMode) {
          await fetchMessages();
        }
        return;
      }

      if (isSendNow && inserted?.id) {
        if (isDemoMode) {
          if (skippedRecipientCount > 0) {
            toast(`${isEditingExistingMessage ? 'Updated and delivered' : 'Delivered'} ${recipientCount} • ${describeRecipientReview(skippedRecipientCount)} (demo)`, 'info');
          } else {
            toast(`${isEditingExistingMessage ? 'Updated and delivered' : 'Delivered'} to ${recipientCount} guest${recipientCount !== 1 ? 's' : ''} (demo)`, 'success');
          }
          return;
        }

        toast(`Sending to ${recipientCount} guest${recipientCount !== 1 ? 's' : ''}…`, 'info');
        await fetchMessages();
        try {
          const result = await triggerDashboardBulkSend(inserted.id);
          const skipped = result.skipped ?? 0;
          if (result.failed === 0 && skipped === 0) {
            toast(`Delivered to ${result.delivered} guest${result.delivered !== 1 ? 's' : ''}`, 'success');
          } else if (result.delivered === 0 && result.failed === 0 && skipped > 0) {
            toast(`No messages sent: ${describeRecipientReview(skipped)}.`, 'info');
          } else if (result.delivered === 0) {
            toast(`Delivery needs review for ${result.failed} recipient${result.failed !== 1 ? 's' : ''}${skipped > 0 ? ` • ${describeRecipientReview(skipped)}` : ''}. Check message history.`, 'error');
          } else {
            toast(`Sent ${result.delivered}${result.failed > 0 ? ` • ${result.failed} need review` : ''}${skipped > 0 ? ` • ${describeRecipientReview(skipped)}` : ''}. Check message history.`, 'info');
          }
        } catch (sendErr) {
          toast(safeMessagesError(sendErr, 'Delivery needs review. Check message history.'), 'error');
        }
        await fetchMessages();
      }
    } catch (err) {
      toast(safeMessagesError(err, 'Couldn’t process message. Please try again.'), 'error');
    } finally {
      setSending(false);
    }
  };

  return { handleSendMessage };
}
