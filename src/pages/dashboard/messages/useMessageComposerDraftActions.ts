import type React from 'react';
import type {
  AudienceOption,
  Guest,
  Message,
  MessageTemplateKey,
  SavedComposerTemplate,
  WeddingSite,
} from './messageDashboardTypes';
import {
  COMPOSER_TEMPLATES,
  hasReachableEmail,
  isSavedTemplateScheduleUsable,
  normalizeSavedTemplateName,
  safeMessagesError,
  writeSavedComposerTemplates,
} from './messageDashboardUtils';
import { createDashboardMessage, type MessageInsertPayload } from './messageService';

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

export type UseMessageComposerDraftActionsArgs = {
  weddingSite: WeddingSite | null;
  guests: Guest[];
  isDemoMode: boolean;
  formData: FormDataShape;
  savedTemplates: SavedComposerTemplate[];
  audienceOptions: AudienceOption[];
  selectedAudience: AudienceOption | undefined;
  selectedTemplateLabel: string;
  applyTemplateVariables: (text: string) => string;
  fetchMessages: () => Promise<void>;
  toast: ToastFn;
  setMessages: SetState<Message[]>;
  setEditingMessageId: SetState<string | null>;
  setFormData: SetState<FormDataShape>;
  setSavedTemplates: SetState<SavedComposerTemplate[]>;
};

export function useMessageComposerDraftActions({
  weddingSite,
  guests,
  isDemoMode,
  formData,
  savedTemplates,
  audienceOptions,
  selectedAudience,
  selectedTemplateLabel,
  applyTemplateVariables,
  fetchMessages,
  toast,
  setMessages,
  setEditingMessageId,
  setFormData,
  setSavedTemplates,
}: UseMessageComposerDraftActionsArgs) {
  function applyComposerTemplate(templateKey: MessageTemplateKey, overrides?: Partial<FormDataShape>) {
    setEditingMessageId(null);
    const template = COMPOSER_TEMPLATES.find((tpl) => tpl.key === templateKey) ?? COMPOSER_TEMPLATES[0];
    const nextAudienceValue = overrides?.audience ?? formData.audience;
    const nextAudience = audienceOptions.find((opt) => opt.value === nextAudienceValue) ?? null;
    const draft = template.build({
      audienceLabel: nextAudience?.label ?? null,
      venue: weddingSite?.venue_name ?? null,
      weddingDate: weddingSite?.wedding_date ?? null,
      applyTemplateVariables,
    });

    setFormData((prev) => ({
      ...prev,
      ...overrides,
      templateKey: template.key,
      channel: overrides?.channel ?? template.defaultChannel,
      subject: overrides?.subject ?? draft.subject,
      body: overrides?.body ?? draft.body,
      campaignName: overrides?.campaignName ?? (template.key === 'blank' ? prev.campaignName : template.label),
    }));
  }

  function applySavedTemplate(template: SavedComposerTemplate) {
    setEditingMessageId(null);
    const savedScheduleIsUsable = isSavedTemplateScheduleUsable(template);

    setFormData((prev) => ({
      ...prev,
      campaignName: template.campaignName || template.name,
      templateKey: 'blank',
      subject: template.subject,
      body: template.body,
      audience: template.audience,
      channel: template.channel,
      scheduleType: savedScheduleIsUsable ? 'later' : 'now',
      scheduleDate: savedScheduleIsUsable ? (template.scheduleDate ?? '') : '',
      scheduleTime: savedScheduleIsUsable ? (template.scheduleTime ?? '') : '',
    }));
    toast(
      savedScheduleIsUsable
        ? `Loaded template "${template.name}".`
        : `Loaded template "${template.name}" without its old send time.`,
      'info',
    );
  }

  function saveCurrentComposerAsTemplate() {
    const subject = formData.subject.trim();
    const body = formData.body.trim();
    const name = formData.campaignName.trim() || subject || selectedTemplateLabel;
    const normalizedName = normalizeSavedTemplateName(name);

    if (!subject && !body) {
      toast('Add a subject or message body before saving a reusable template.', 'error');
      return;
    }

    const existingTemplate = savedTemplates.find((item) => normalizeSavedTemplateName(item.name) === normalizedName);

    const next: SavedComposerTemplate = {
      id: existingTemplate?.id ?? `saved-template-${Date.now()}`,
      name,
      subject: formData.subject,
      body: formData.body,
      channel: formData.channel,
      audience: formData.audience,
      campaignName: formData.campaignName,
      scheduleType: formData.scheduleType as 'now' | 'later',
      scheduleDate: formData.scheduleDate,
      scheduleTime: formData.scheduleTime,
      createdAt: existingTemplate?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [next, ...savedTemplates.filter((item) => normalizeSavedTemplateName(item.name) !== normalizedName)].slice(0, 12);
    const persisted = writeSavedComposerTemplates(updated);
    if (!persisted) {
      toast('Couldn’t save that reusable template on this device right now.', 'error');
      return;
    }
    setSavedTemplates(updated);
    toast(`${existingTemplate ? 'Updated' : 'Saved'} reusable template "${name}".`, 'success');
  }

  function deleteSavedTemplate(templateId: string) {
    const updated = savedTemplates.filter((item) => item.id !== templateId);
    const persisted = writeSavedComposerTemplates(updated);
    if (!persisted) {
      toast('Couldn’t remove that saved template from this device right now.', 'error');
      return;
    }
    setSavedTemplates(updated);
    toast('Removed saved template.', 'info');
  }

  const applySaveTheDatePreset = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');

    applyComposerTemplate('save-the-date', {
      audience: 'all',
      channel: 'email',
      scheduleType: 'later',
      scheduleDate: `${yyyy}-${mm}-${dd}`,
      scheduleTime: '10:00',
      campaignName: 'Save the date',
    });
    toast('Save-the-date preset loaded (scheduled for tomorrow at 10:00).', 'success');
  };

  const quickCreateSaveTheDateCampaign = async () => {
    applySaveTheDatePreset();

    if (!weddingSite?.id) {
      toast('Save-the-date draft loaded. Wedding site context missing for instant campaign creation.', 'error');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const payload: MessageInsertPayload = {
      wedding_site_id: weddingSite.id,
      channel: 'email',
      subject: applyTemplateVariables('Save the Date!'),
      body: applyTemplateVariables('We are thrilled to invite you to our wedding! Please mark your calendars for [DATE] at [VENUE]. Formal invitation to follow.'),
      audience_filter: 'all',
      recipient_count: guests.length,
      recipient_filter: {
        audience: 'all',
        audience_label: 'All Guests',
        campaignName: 'Save the date',
        campaignType: 'save-the-date',
        templateKey: 'save-the-date',
        recipient_count: guests.length,
        reachable_count: guests.filter((guest) => hasReachableEmail(guest.email)).length,
        skipped_count: guests.filter((guest) => !hasReachableEmail(guest.email)).length,
      },
      scheduled_for: tomorrow.toISOString(),
      status: 'scheduled',
    };

    let created = false;
    try {
      if (isDemoMode) {
        const demoMessage: Message = {
          id: `demo-save-the-date-${Date.now()}`,
          wedding_site_id: weddingSite.id,
          channel: 'email',
          subject: payload.subject,
          body: payload.body,
          sent_at: null,
          audience_filter: 'all',
          recipient_count: guests.length,
          recipient_filter: payload.recipient_filter,
          scheduled_for: payload.scheduled_for,
          status: 'scheduled',
          delivered_count: 0,
          failed_count: 0,
          created_at: new Date().toISOString(),
        } as Message;
        setMessages((prev) => [demoMessage, ...prev]);
        created = true;
      } else {
        await createDashboardMessage(payload);
        created = true;
        await fetchMessages();
      }

      toast('Save-the-date campaign scheduled for tomorrow at 10:00.', 'success');
    } catch (err) {
      const message = safeMessagesError(err, 'Couldn’t create the save-the-date campaign right now.');
      toast(created ? `Campaign was created, but the message list needs a refresh. ${message}` : message, created ? 'info' : 'error');
    }
  };

  const applyEventReminderDraft = () => {
    applyComposerTemplate('event-reminder', {
      channel: 'email',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
      campaignName: selectedAudience?.value?.startsWith('event:') ? `${selectedAudience.label} reminder` : 'Event reminder',
    });
    toast('Event reminder draft loaded.', 'info');
  };

  const applyDayOfDraft = () => {
    applyComposerTemplate('day-of-update', {
      channel: 'sms',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
      campaignName: 'Day-of update',
    });
    toast('Day-of update draft loaded.', 'info');
  };

  const applyDayOfAlertPreset = () => {
    applyDayOfDraft();
  };

  return {
    applyComposerTemplate,
    applySavedTemplate,
    applySaveTheDatePreset,
    applyEventReminderDraft,
    applyDayOfAlertPreset,
    applyDayOfDraft,
    deleteSavedTemplate,
    quickCreateSaveTheDateCampaign,
    saveCurrentComposerAsTemplate,
  };
}
