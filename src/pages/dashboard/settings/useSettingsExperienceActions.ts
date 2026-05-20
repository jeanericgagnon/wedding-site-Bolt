import type React from 'react';
import { useRef } from 'react';
import { createSubscriptionSession, type BillingInfo } from '../../../lib/stripeService';
import { logAppAction } from '../../../lib/actionAudit';
import { mergeGeneratedDraftIntoBuilderProject } from '../../../lib/aiBuilderProjectPatch';
import { regenerateLayout } from '../../../lib/generateInitialLayout';
import { buildNotificationPrefsPatch, computeNextDigestDeliveryAt, type DigestCadence } from '../../../lib/notificationPrefs';
import { fromExistingLayoutToBuilderProject } from '../../../builder/adapters/layoutAdapter';
import { resolveActiveSiteForUser } from '../../../lib/activeSite';
import type { LayoutConfigV1 } from '../../../types/layoutConfig';
import type { WeddingDataV1 } from '../../../types/weddingData';
import { loadSettingsTemplateChangeSite, updateSettingsSite } from './settingsSiteData';
import { writeDemoRsvpSettings } from './settingsDemoStorage';
import { SETTINGS_SITE_MISSING_COPY, cleanRsvpSettings, safeSettingsError } from './settingsDashboardUtils';
import type { RSVPQuestionSetting } from './settingsDashboardTypes';

type DraftGuard = {
  markSaved: () => void;
};

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

type LogSettingsAction = (
  type: string,
  summary: string,
  metadata?: Record<string, unknown>,
  targetId?: string | null,
  targetLabel?: string | null,
  siteIdOverride?: string | null,
) => void;

export type UseSettingsExperienceActionsArgs = {
  userId: string | null | undefined;
  isDemoMode: boolean;
  weddingSiteId: string | null;
  rsvpQuestions: RSVPQuestionSetting[];
  rsvpMealEnabled: boolean;
  rsvpMealOptions: string[];
  notifRsvp: boolean;
  notifPhotos: boolean;
  notifDigest: boolean;
  notifDigestCadence: DigestCadence;
  notifDigestIncludePlanner: boolean;
  notifDigestQuietUntilLabel: string;
  notifDigestLastDeliveredAt: string | null;
  notifUpdates: boolean;
  billingInfo: BillingInfo | null;
  resolveSettingsSiteId: () => Promise<string | null>;
  logSettingsAction: LogSettingsAction;
  rsvpDraftGuard: DraftGuard;
  notifDraftGuard: DraftGuard;
  setWeddingSiteId: SetState<string | null>;
  setRsvpQuestions: SetState<RSVPQuestionSetting[]>;
  setRsvpMealOptions: SetState<string[]>;
  setRsvpQuestionsSaving: SetState<boolean>;
  setRsvpQuestionsSuccess: SetState<string | null>;
  setRsvpQuestionsError: SetState<string | null>;
  setNotifSaving: SetState<boolean>;
  setNotifSuccess: SetState<string | null>;
  setNotifError: SetState<string | null>;
  setNotifDigestNextDeliveryAt: SetState<string | null>;
  setNotifDigestLastReviewedAt: SetState<string | null>;
  setSubscribeLoading: SetState<boolean>;
  setSubscribeError: SetState<string | null>;
  setChangingTemplate: SetState<boolean>;
  setTemplateError: SetState<string | null>;
  setTemplateSuccess: SetState<string | null>;
  setCurrentTemplate: SetState<string>;
};

export function useSettingsExperienceActions({
  userId,
  isDemoMode,
  weddingSiteId,
  rsvpQuestions,
  rsvpMealEnabled,
  rsvpMealOptions,
  notifRsvp,
  notifPhotos,
  notifDigest,
  notifDigestCadence,
  notifDigestIncludePlanner,
  notifDigestQuietUntilLabel,
  notifDigestLastDeliveredAt,
  notifUpdates,
  billingInfo,
  resolveSettingsSiteId,
  logSettingsAction,
  rsvpDraftGuard,
  notifDraftGuard,
  setWeddingSiteId,
  setRsvpQuestions,
  setRsvpMealOptions,
  setRsvpQuestionsSaving,
  setRsvpQuestionsSuccess,
  setRsvpQuestionsError,
  setNotifSaving,
  setNotifSuccess,
  setNotifError,
  setNotifDigestNextDeliveryAt,
  setNotifDigestLastReviewedAt,
  setSubscribeLoading,
  setSubscribeError,
  setChangingTemplate,
  setTemplateError,
  setTemplateSuccess,
  setCurrentTemplate,
}: UseSettingsExperienceActionsArgs) {
  const rsvpSettingsSaveRequestIdRef = useRef(0);
  const notificationSaveRequestIdRef = useRef(0);
  const subscribeRequestIdRef = useRef(0);
  const templateChangeRequestIdRef = useRef(0);
  const experienceActionContextRef = useRef({ billingSiteId: billingInfo?.wedding_site_id ?? null, weddingSiteId });
  experienceActionContextRef.current = { billingSiteId: billingInfo?.wedding_site_id ?? null, weddingSiteId };

  const saveRsvpSettings = async () => {
    const requestId = ++rsvpSettingsSaveRequestIdRef.current;
    const isCurrentRsvpSettingsSave = () => requestId === rsvpSettingsSaveRequestIdRef.current;
    setRsvpQuestionsSaving(true);
    setRsvpQuestionsSuccess(null);
    setRsvpQuestionsError(null);

    try {
      const { cleanedQuestions, cleanedMealOptions, validationError } = cleanRsvpSettings({
        questions: rsvpQuestions,
        mealEnabled: rsvpMealEnabled,
        mealOptions: rsvpMealOptions,
      });
      if (!isCurrentRsvpSettingsSave()) return;
      if (validationError) {
        setRsvpQuestionsError(validationError);
        return;
      }

      let targetSiteId = weddingSiteId;
      if (!targetSiteId && userId) {
        const activeSite = await resolveActiveSiteForUser(userId);
        if (!isCurrentRsvpSettingsSave()) return;
        targetSiteId = activeSite?.id ?? null;
        if (targetSiteId) setWeddingSiteId(targetSiteId);
      }

      if (!targetSiteId) {
        if (isDemoMode) {
          writeDemoRsvpSettings({ questions: cleanedQuestions, mealEnabled: rsvpMealEnabled, mealOptions: cleanedMealOptions });
          setRsvpQuestions(cleanedQuestions);
          setRsvpQuestionsSuccess('RSVP settings saved (demo).');
          return;
        }

        setRsvpQuestionsError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      await updateSettingsSite(targetSiteId, {
        rsvp_custom_questions: cleanedQuestions,
        rsvp_meal_config: { enabled: rsvpMealEnabled, options: cleanedMealOptions },
      });
      if (!isCurrentRsvpSettingsSave()) return;
      setRsvpQuestions(cleanedQuestions);
      setRsvpMealOptions(cleanedMealOptions);
      rsvpDraftGuard.markSaved();
      logSettingsAction('rsvp_settings_saved', 'RSVP custom questions and meal settings were updated.', {
        customQuestionCount: cleanedQuestions.length,
        mealEnabled: rsvpMealEnabled,
        mealOptionCount: cleanedMealOptions.length,
      }, targetSiteId, 'RSVP settings', targetSiteId);
      setRsvpQuestionsSuccess('RSVP settings saved.');
    } catch (err) {
      if (!isCurrentRsvpSettingsSave()) return;
      setRsvpQuestionsError(safeSettingsError(err, 'Couldn’t save RSVP questions.'));
    } finally {
      if (isCurrentRsvpSettingsSave()) {
        setRsvpQuestionsSaving(false);
      }
    }
  };

  const handleSaveRsvpQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveRsvpSettings();
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestId = ++notificationSaveRequestIdRef.current;
    const isCurrentNotificationSave = () => requestId === notificationSaveRequestIdRef.current;
    setNotifSaving(true);
    setNotifError(null);
    setNotifSuccess(null);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!isCurrentNotificationSave()) return;
      if (!targetSiteId) {
        setNotifError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      const quietUntilLabel = notifDigestQuietUntilLabel.trim();
      const reviewedAt = new Date().toISOString();
      const nextDeliveryAt = notifDigest && !quietUntilLabel && notifDigestCadence !== 'paused'
        ? computeNextDigestDeliveryAt(notifDigestCadence, new Date(reviewedAt))
        : null;
      await updateSettingsSite(targetSiteId, {
        notification_prefs: buildNotificationPrefsPatch({
          rsvp: notifRsvp,
          photos: notifPhotos,
          digest: notifDigest,
          digestCadence: notifDigest ? notifDigestCadence : 'paused',
          digestIncludePlanner: notifDigest && notifDigestIncludePlanner,
          digestQuietUntilLabel: notifDigest ? (quietUntilLabel || null) : null,
          digestNextDeliveryAt: nextDeliveryAt,
          digestLastReviewedAt: reviewedAt,
          digestLastDeliveredAt: notifDigestLastDeliveredAt,
          updates: notifUpdates,
        }),
      });
      if (!isCurrentNotificationSave()) return;
      setNotifDigestNextDeliveryAt(nextDeliveryAt);
      setNotifDigestLastReviewedAt(reviewedAt);
      notifDraftGuard.markSaved();
      logSettingsAction('notification_preferences_saved', 'Notification preferences were updated.', {
        rsvp: notifRsvp,
        photos: notifPhotos,
        digest: notifDigest,
        digestCadence: notifDigest ? notifDigestCadence : 'paused',
        digestIncludePlanner: notifDigest && notifDigestIncludePlanner,
        digestQuietUntilLabel: notifDigest ? (quietUntilLabel || null) : null,
        digestNextDeliveryAt: nextDeliveryAt,
        digestLastReviewedAt: reviewedAt,
        updates: notifUpdates,
      }, targetSiteId, 'Notification preferences', targetSiteId);
      setNotifSuccess('Preferences saved.');
    } catch (err) {
      if (!isCurrentNotificationSave()) return;
      setNotifError(safeSettingsError(err, 'Couldn’t save preferences.'));
    } finally {
      if (isCurrentNotificationSave()) {
        setNotifSaving(false);
      }
    }
  };

  const handleSubscribe = async () => {
    if (!billingInfo) return;
    const requestId = ++subscribeRequestIdRef.current;
    const actionBillingSiteId = billingInfo.wedding_site_id;
    const isLatestSubscribeRequest = () => requestId === subscribeRequestIdRef.current;
    const isCurrentSubscribe = () =>
      isLatestSubscribeRequest() &&
      experienceActionContextRef.current.billingSiteId === actionBillingSiteId;
    setSubscribeLoading(true);
    setSubscribeError(null);
    try {
      const origin = window.location.origin;
      const url = await createSubscriptionSession(
        billingInfo.wedding_site_id,
        `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        `${origin}/dashboard/settings?tab=billing&canceled=1`,
      );
      if (!isCurrentSubscribe()) {
        if (isLatestSubscribeRequest()) setSubscribeLoading(false);
        return;
      }
      void logAppAction({
        weddingSiteId: billingInfo.wedding_site_id,
        area: 'billing',
        type: 'subscription_checkout_started',
        summary: 'Subscription checkout was started.',
        targetId: billingInfo.wedding_site_id,
        targetLabel: 'Subscription checkout',
        metadata: {
          currentPaymentStatus: billingInfo.payment_status,
          currentBillingType: billingInfo.billing_type,
        },
      });
      window.location.href = url;
    } catch (err) {
      if (!isCurrentSubscribe()) {
        if (isLatestSubscribeRequest()) setSubscribeLoading(false);
        return;
      }
      setSubscribeError(safeSettingsError(err, 'Couldn’t start checkout right now.'));
      setSubscribeLoading(false);
    }
  };

  const handleTemplateChange = async (newTemplateId: string) => {
    if (!weddingSiteId) return;
    const requestId = ++templateChangeRequestIdRef.current;
    const actionSiteId = weddingSiteId;
    const isCurrentTemplateChange = () =>
      requestId === templateChangeRequestIdRef.current &&
      experienceActionContextRef.current.weddingSiteId === actionSiteId;
    setChangingTemplate(true);
    setTemplateError(null);
    setTemplateSuccess(null);
    try {
      const data = await loadSettingsTemplateChangeSite(weddingSiteId);
      if (!isCurrentTemplateChange()) return;
      if (!data) throw new Error(SETTINGS_SITE_MISSING_COPY);

      const weddingData = data.wedding_data as WeddingDataV1;
      const currentLayout = data.layout_config as LayoutConfigV1;
      const newLayout = regenerateLayout(newTemplateId, weddingData, currentLayout);
      const rebuiltProject = fromExistingLayoutToBuilderProject(weddingSiteId, newLayout);
      const aiDraft = ((((data.wedding_data as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined)?.aiDraft as import('../../../lib/aiDraftGenerator').DraftGenerationResult | undefined) ?? null);
      const aiContent = ((((data.wedding_data as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined)?.aiContent as import('../../../lib/aiCanonicalContent').AiCanonicalSectionContent | undefined) ?? null);
      const photoBuckets = ((((data.wedding_data as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined)?.photoBuckets as import('../../../lib/aiPhotoBuckets').CanonicalPhotoBuckets | undefined) ?? null);
      const remappedSiteJson = aiDraft
        ? mergeGeneratedDraftIntoBuilderProject(rebuiltProject as unknown as Record<string, unknown>, aiDraft, aiContent, photoBuckets)
        : rebuiltProject;

      await updateSettingsSite(weddingSiteId, { active_template_id: newTemplateId, layout_config: newLayout, site_json: remappedSiteJson });
      if (!isCurrentTemplateChange()) return;
      setCurrentTemplate(newTemplateId);
      logSettingsAction('template_changed', 'Site template was changed.', {
        templateId: newTemplateId,
        preservedContent: true,
      }, weddingSiteId, newTemplateId, weddingSiteId);
      setTemplateSuccess('Template changed successfully. Your content has been preserved.');
    } catch (err) {
      if (!isCurrentTemplateChange()) return;
      setTemplateError(safeSettingsError(err, 'Couldn’t change design.'));
    } finally {
      if (isCurrentTemplateChange()) {
        setChangingTemplate(false);
      }
    }
  };

  return {
    handleSaveNotifications,
    handleSaveRsvpQuestions,
    handleSubscribe,
    handleTemplateChange,
    saveRsvpSettings,
  };
}
