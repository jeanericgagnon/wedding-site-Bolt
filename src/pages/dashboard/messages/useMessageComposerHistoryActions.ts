import type React from 'react';
import { canComposeDashboardMessages, type PlannerPermissionKey, type PlannerAccessRole } from '../../../lib/plannerAccess';
import { formatScheduledMessageDateTime, toScheduleInputValue } from '../messageScheduleTime';
import { getCampaignName, getCampaignTypeLabel, getTemplateKey } from './messageDashboardUtils';
import type { Message, MessageTemplateKey } from './messageDashboardTypes';

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

type FollowUpMode = 'reminder' | 'day-of' | 'thank-you';

export type UseMessageComposerHistoryActionsArgs = {
  activeCampaignLatestMessage: Message | null;
  activeCampaignThreadName: string | null;
  messagesRole: PlannerAccessRole;
  messagesPermissions: PlannerPermissionKey[] | null;
  applyComposerTemplate: (templateKey: MessageTemplateKey, overrides?: Partial<FormDataShape>) => void;
  toast: ToastFn;
  setEditingMessageId: SetState<string | null>;
  setFormData: SetState<FormDataShape>;
  setShowRecipientPreview: SetState<boolean>;
};

export function useMessageComposerHistoryActions({
  activeCampaignLatestMessage,
  activeCampaignThreadName,
  messagesRole,
  messagesPermissions,
  applyComposerTemplate,
  toast,
  setEditingMessageId,
  setFormData,
  setShowRecipientPreview,
}: UseMessageComposerHistoryActionsArgs) {
  function revealComposer() {
    setShowRecipientPreview(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getFollowUpAudience() {
    return activeCampaignLatestMessage?.audience_filter
      ?? (activeCampaignLatestMessage?.recipient_filter?.audience as string)
      ?? 'all';
  }

  function getCampaignBase() {
    if (!activeCampaignLatestMessage) return '';
    return getCampaignName(activeCampaignLatestMessage)
      ?? activeCampaignThreadName
      ?? activeCampaignLatestMessage.subject;
  }

  function loadMessageIntoComposer(message: Message, mode: 'edit' | 'duplicate') {
    if (!canComposeDashboardMessages(messagesRole, messagesPermissions)) {
      toast('Your collaborator role cannot edit campaigns from Messaging.', 'info');
      return;
    }

    const scheduledInputValue = toScheduleInputValue(message.scheduled_for);
    const [scheduleDate = '', scheduleTime = ''] = scheduledInputValue ? scheduledInputValue.split('T') : [];

    setEditingMessageId(mode === 'edit' ? message.id : null);
    setFormData({
      campaignName: mode === 'duplicate'
        ? `Copy of ${getCampaignName(message) ?? getCampaignTypeLabel(message) ?? message.subject}`
        : getCampaignName(message) ?? '',
      templateKey: getTemplateKey(message),
      subject: mode === 'duplicate' && message.status !== 'draft' ? `Copy of ${message.subject}` : message.subject,
      body: message.body,
      audience: message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all',
      channel: message.channel === 'sms' ? 'sms' : 'email',
      scheduleType: message.status === 'scheduled' && scheduleDate && scheduleTime ? 'later' : 'now',
      scheduleDate,
      scheduleTime,
    });
    revealComposer();
    toast(mode === 'edit' ? 'Loaded into composer for editing.' : 'Copied into composer as a new message.', 'info');
  }

  function startFollowUpFromCampaignThread(mode: FollowUpMode) {
    if (!canComposeDashboardMessages(messagesRole, messagesPermissions)) {
      toast('Your collaborator role cannot create follow-up campaigns from Messaging.', 'info');
      return;
    }

    if (!activeCampaignLatestMessage) return;

    const audience = getFollowUpAudience();
    const campaignBase = getCampaignBase();

    if (mode === 'reminder') {
      applyComposerTemplate('rsvp-reminder', {
        audience,
        channel: 'email',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
        campaignName: `${campaignBase} follow-up`,
      });
      revealComposer();
      toast('Loaded thread follow-up reminder into composer.', 'info');
      return;
    }

    if (mode === 'day-of') {
      applyComposerTemplate('day-of-update', {
        audience,
        channel: 'sms',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
        campaignName: `${campaignBase} day-of update`,
      });
      revealComposer();
      toast('Loaded thread day-of update into composer.', 'info');
      return;
    }

    applyComposerTemplate('thank-you', {
      audience,
      channel: 'email',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
      campaignName: `${campaignBase} thank you`,
    });
    revealComposer();
    toast('Loaded thread thank-you into composer.', 'info');
  }

  function startScheduledFollowUpFromCampaignThread(mode: FollowUpMode) {
    if (!canComposeDashboardMessages(messagesRole, messagesPermissions)) {
      toast('Your collaborator role cannot schedule follow-up campaigns from Messaging.', 'info');
      return;
    }

    if (!activeCampaignLatestMessage) return;

    const now = new Date();
    const scheduledAt = new Date(now);

    if (mode === 'day-of') {
      scheduledAt.setHours(now.getHours() + 2);
    } else {
      scheduledAt.setDate(now.getDate() + 1);
      scheduledAt.setHours(10, 0, 0, 0);
    }

    const yyyy = scheduledAt.getFullYear();
    const mm = String(scheduledAt.getMonth() + 1).padStart(2, '0');
    const dd = String(scheduledAt.getDate()).padStart(2, '0');
    const hh = String(scheduledAt.getHours()).padStart(2, '0');
    const min = String(scheduledAt.getMinutes()).padStart(2, '0');
    const scheduledIso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
    const audience = getFollowUpAudience();
    const campaignBase = getCampaignBase();

    if (mode === 'reminder') {
      applyComposerTemplate('rsvp-reminder', {
        audience,
        channel: 'email',
        scheduleType: 'later',
        scheduleDate: `${yyyy}-${mm}-${dd}`,
        scheduleTime: `${hh}:${min}`,
        campaignName: `${campaignBase} scheduled follow-up`,
      });
      revealComposer();
      toast(`Loaded scheduled reminder for ${formatScheduledMessageDateTime(scheduledIso)}.`, 'info');
      return;
    }

    if (mode === 'day-of') {
      applyComposerTemplate('day-of-update', {
        audience,
        channel: 'sms',
        scheduleType: 'later',
        scheduleDate: `${yyyy}-${mm}-${dd}`,
        scheduleTime: `${hh}:${min}`,
        campaignName: `${campaignBase} scheduled day-of update`,
      });
      revealComposer();
      toast(`Loaded scheduled day-of update for ${formatScheduledMessageDateTime(scheduledIso)}.`, 'info');
      return;
    }

    applyComposerTemplate('thank-you', {
      audience,
      channel: 'email',
      scheduleType: 'later',
      scheduleDate: `${yyyy}-${mm}-${dd}`,
      scheduleTime: `${hh}:${min}`,
      campaignName: `${campaignBase} scheduled thank you`,
    });
    revealComposer();
    toast(`Loaded scheduled thank-you for ${formatScheduledMessageDateTime(scheduledIso)}.`, 'info');
  }

  return {
    loadMessageIntoComposer,
    startFollowUpFromCampaignThread,
    startScheduledFollowUpFromCampaignThread,
  };
}
