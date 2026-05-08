import { useEffect } from 'react';
import type React from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';
import { COMPOSER_TEMPLATES } from './messageDashboardUtils';
import type { MessageTemplateKey } from './messageDashboardTypes';

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

export type UseMessageDashboardPrefillSyncArgs = {
  location: Location;
  navigate: NavigateFunction;
  fetchWeddingSite: () => Promise<void>;
  fetchSmsExpiryPreview: () => Promise<void>;
  applyComposerTemplate: (templateKey: MessageTemplateKey, overrides?: Partial<FormDataShape>) => void;
  toast: ToastFn;
  setEditingMessageId: SetState<string | null>;
  setFormData: SetState<FormDataShape>;
  setShowRecipientPreview: SetState<boolean>;
};

export function useMessageDashboardPrefillSync({
  location,
  navigate,
  fetchWeddingSite,
  fetchSmsExpiryPreview,
  applyComposerTemplate,
  toast,
  setEditingMessageId,
  setFormData,
  setShowRecipientPreview,
}: UseMessageDashboardPrefillSyncArgs) {
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillSubject = params.get('prefillSubject');
    const prefillBody = params.get('prefillBody');
    const prefillAudience = params.get('prefillAudience');
    const prefillCampaignName = params.get('prefillCampaignName');
    const prefillChannel = params.get('prefillChannel');
    const templateKey = params.get('template') as MessageTemplateKey | null;
    const templateAudience = params.get('audience');
    const smsCreditsStatus = params.get('smsCredits');
    const requestedTemplate = templateKey && COMPOSER_TEMPLATES.some((template) => template.key === templateKey) ? templateKey : null;

    if (!prefillSubject && !prefillBody && !prefillAudience && !prefillCampaignName && !prefillChannel && !smsCreditsStatus && !requestedTemplate) {
      return;
    }

    if (requestedTemplate) {
      applyComposerTemplate(requestedTemplate, {
        audience: templateAudience === 'pending' ? 'not_responded' : templateAudience ?? undefined,
      });
      setShowRecipientPreview(true);
    }

    if (prefillSubject || prefillBody || prefillAudience || prefillCampaignName || prefillChannel) {
      setEditingMessageId(null);
      setFormData((prev) => ({
        ...prev,
        campaignName: prefillCampaignName ?? prev.campaignName,
        subject: prefillSubject ?? prev.subject,
        body: prefillBody ?? prev.body,
        audience: prefillAudience ?? prev.audience,
        channel: prefillChannel === 'sms' ? 'sms' : prefillChannel === 'email' ? 'email' : prev.channel,
      }));
      setShowRecipientPreview(true);
    }

    if (smsCreditsStatus === 'success') {
      toast('Text credit purchase complete. Refreshing your balance now.', 'success');
      void fetchWeddingSite();
      void fetchSmsExpiryPreview();
    } else if (smsCreditsStatus === 'cancel') {
      toast('Text credit checkout was canceled.', 'info');
    }

    const cleanedParams = new URLSearchParams(location.search);
    cleanedParams.delete('prefillSubject');
    cleanedParams.delete('prefillBody');
    cleanedParams.delete('prefillAudience');
    cleanedParams.delete('prefillCampaignName');
    cleanedParams.delete('prefillChannel');
    cleanedParams.delete('template');
    cleanedParams.delete('audience');
    cleanedParams.delete('smsCredits');
    const nextSearch = cleanedParams.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    );
  }, [
    applyComposerTemplate,
    fetchSmsExpiryPreview,
    fetchWeddingSite,
    location.pathname,
    location.search,
    navigate,
    setEditingMessageId,
    setFormData,
    setShowRecipientPreview,
    toast,
  ]);
}
