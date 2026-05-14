import type { FormEvent } from 'react';
import type { WeddingIdentityExportKit, WeddingIdentityPrintAsset } from '../../../lib/weddingIdentityExports';
import type { AnalyticsRetentionDays, SiteLanguageCode, TranslationLanguageCode, TranslationStatusRow } from './settingsDashboardTypes';
import { SettingsIdentityExportsPanel } from './SettingsIdentityExportsPanel';
import { SettingsPrivacyPanel } from './SettingsPrivacyPanel';
import { SettingsSiteUrlPanel } from './SettingsSiteUrlPanel';
import { SettingsTemplatePanel } from './SettingsTemplatePanel';

type SettingsSiteTabContentProps = {
  allowedLanguages: SiteLanguageCode[];
  analyticsEnabled: boolean;
  analyticsRetentionDays: AnalyticsRetentionDays;
  analyticsGuestNotice: string;
  currentTemplate: string;
  defaultLanguage: SiteLanguageCode;
  hasWeddingIdentityStoryGraphic: boolean;
  guestAccessToken: string | null;
  hideFromSearch: boolean;
  onAutoTranslateLanguage: (language: TranslationLanguageCode) => void;
  onAllowedLanguagesChange: (languages: SiteLanguageCode[]) => void;
  onCopyIdentityManifest: () => void;
  onCopyIdentityStyleKit: () => void;
  onCopyInviteLink: () => void;
  onDefaultLanguageChange: (language: SiteLanguageCode) => void;
  onDownloadIdentityStoryGraphic: () => void;
  onDownloadIdentityPrintPack: () => void;
  onHideFromSearchChange: (checked: boolean) => void;
  onAnalyticsEnabledChange: (checked: boolean) => void;
  onAnalyticsRetentionDaysChange: (days: AnalyticsRetentionDays) => void;
  onAnalyticsGuestNoticeChange: (value: string) => void;
  onPrivacyModeChange: (mode: 'public' | 'password_protected' | 'invite_only') => void;
  onRegenerateToken: () => void;
  onSavePrivacy: (event: FormEvent) => void;
  onSitePasswordChange: (value: string) => void;
  onSiteSlugChange: (value: string) => void;
  onSubmitSiteSlug: (event: FormEvent) => void;
  onTemplateChange: (templateId: string) => void;
  onTogglePrivacySettings: () => void;
  onToggleShowSitePassword: () => void;
  onToggleTemplateSettings: () => void;
  privacyCopied: boolean;
  privacyMode: 'public' | 'password_protected' | 'invite_only';
  publicSiteUrl: string;
  showPrivacySettings: boolean;
  showSitePassword: boolean;
  showTemplateSettings: boolean;
  sitePassword: string;
  siteSlug: string;
  slugError: string | null;
  slugSaving: boolean;
  slugSuccess: string | null;
  templateError: string | null;
  templateSuccess: string | null;
  translatingLanguage: TranslationLanguageCode | null;
  translationStatuses: TranslationStatusRow[];
  visibilityError: string | null;
  visibilitySaving: boolean;
  visibilitySuccess: string | null;
  weddingIdentityExportKit: WeddingIdentityExportKit;
  weddingIdentityPrintAssets: WeddingIdentityPrintAsset[];
  changingTemplate: boolean;
};

export function SettingsSiteTabContent({
  allowedLanguages,
  analyticsEnabled,
  analyticsRetentionDays,
  analyticsGuestNotice,
  changingTemplate,
  currentTemplate,
  defaultLanguage,
  hasWeddingIdentityStoryGraphic,
  guestAccessToken,
  hideFromSearch,
  onAutoTranslateLanguage,
  onAllowedLanguagesChange,
  onCopyIdentityManifest,
  onCopyIdentityStyleKit,
  onCopyInviteLink,
  onDefaultLanguageChange,
  onDownloadIdentityStoryGraphic,
  onDownloadIdentityPrintPack,
  onHideFromSearchChange,
  onAnalyticsEnabledChange,
  onAnalyticsRetentionDaysChange,
  onAnalyticsGuestNoticeChange,
  onPrivacyModeChange,
  onRegenerateToken,
  onSavePrivacy,
  onSitePasswordChange,
  onSiteSlugChange,
  onSubmitSiteSlug,
  onTemplateChange,
  onTogglePrivacySettings,
  onToggleShowSitePassword,
  onToggleTemplateSettings,
  privacyCopied,
  privacyMode,
  publicSiteUrl,
  showPrivacySettings,
  showSitePassword,
  showTemplateSettings,
  sitePassword,
  siteSlug,
  slugError,
  slugSaving,
  slugSuccess,
  templateError,
  templateSuccess,
  translatingLanguage,
  translationStatuses,
  visibilityError,
  visibilitySaving,
  visibilitySuccess,
  weddingIdentityExportKit,
  weddingIdentityPrintAssets,
}: SettingsSiteTabContentProps) {
  return (
    <>
      <SettingsSiteUrlPanel
        onSiteSlugChange={onSiteSlugChange}
        onSubmit={onSubmitSiteSlug}
        publicSiteUrl={publicSiteUrl}
        siteSlug={siteSlug}
        slugError={slugError}
        slugSaving={slugSaving}
        slugSuccess={slugSuccess}
      />

      <SettingsIdentityExportsPanel
        hasStoryGraphic={hasWeddingIdentityStoryGraphic}
        onCopyIdentityManifest={onCopyIdentityManifest}
        onCopyIdentityStyleKit={onCopyIdentityStyleKit}
        onDownloadIdentityStoryGraphic={onDownloadIdentityStoryGraphic}
        onDownloadIdentityPrintPack={onDownloadIdentityPrintPack}
        weddingIdentityExportKit={weddingIdentityExportKit}
        weddingIdentityPrintAssets={weddingIdentityPrintAssets}
      />

      <SettingsPrivacyPanel
        allowedLanguages={allowedLanguages}
        analyticsEnabled={analyticsEnabled}
        analyticsRetentionDays={analyticsRetentionDays}
        analyticsGuestNotice={analyticsGuestNotice}
        defaultLanguage={defaultLanguage}
        guestAccessToken={guestAccessToken}
        hideFromSearch={hideFromSearch}
        onAutoTranslateLanguage={onAutoTranslateLanguage}
        onAllowedLanguagesChange={onAllowedLanguagesChange}
        onCopyInviteLink={onCopyInviteLink}
        onDefaultLanguageChange={onDefaultLanguageChange}
        onHideFromSearchChange={onHideFromSearchChange}
        onAnalyticsEnabledChange={onAnalyticsEnabledChange}
        onAnalyticsRetentionDaysChange={onAnalyticsRetentionDaysChange}
        onAnalyticsGuestNoticeChange={onAnalyticsGuestNoticeChange}
        onRegenerateToken={onRegenerateToken}
        onSavePrivacy={onSavePrivacy}
        onSitePasswordChange={onSitePasswordChange}
        onToggleShowPrivacySettings={onTogglePrivacySettings}
        onToggleShowSitePassword={onToggleShowSitePassword}
        onVisibilityModeChange={onPrivacyModeChange}
        privacyCopied={privacyCopied}
        privacyMode={privacyMode}
        showPrivacySettings={showPrivacySettings}
        showSitePassword={showSitePassword}
        sitePassword={sitePassword}
        siteSlug={siteSlug}
        translatingLanguage={translatingLanguage}
        translationStatuses={translationStatuses}
        visibilityError={visibilityError}
        visibilitySaving={visibilitySaving}
        visibilitySuccess={visibilitySuccess}
      />

      <SettingsTemplatePanel
        changingTemplate={changingTemplate}
        currentTemplate={currentTemplate}
        onTemplateChange={onTemplateChange}
        onToggleVisibility={onToggleTemplateSettings}
        showTemplateSettings={showTemplateSettings}
        templateError={templateError}
        templateSuccess={templateSuccess}
      />
    </>
  );
}
