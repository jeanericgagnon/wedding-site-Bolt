import { CheckCheck, Copy, Eye, EyeOff, Loader2, Save, Sparkles } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui';
import { getVisibilityModeOptions } from '../../../lib/siteVisibilityState';
import { ANALYTICS_RETENTION_OPTIONS, formatTranslationStatusDate } from './settingsDashboardUtils';
import {
  type AnalyticsRetentionDays,
  SITE_LANGUAGE_OPTIONS,
  TRANSLATION_LANGUAGE_OPTIONS,
  type SiteLanguageCode,
  type TranslationLanguageCode,
  type TranslationStatusRow,
} from './settingsDashboardTypes';

type SettingsPrivacyPanelProps = {
  allowedLanguages: SiteLanguageCode[];
  analyticsEnabled: boolean;
  analyticsRetentionDays: AnalyticsRetentionDays;
  analyticsGuestNotice: string;
  defaultLanguage: SiteLanguageCode;
  guestAccessToken: string | null;
  hideFromSearch: boolean;
  onAutoTranslateLanguage: (language: TranslationLanguageCode) => void;
  onCopyInviteLink: () => void;
  onAllowedLanguagesChange: (languages: SiteLanguageCode[]) => void;
  onDefaultLanguageChange: (language: SiteLanguageCode) => void;
  onHideFromSearchChange: (checked: boolean) => void;
  onAnalyticsEnabledChange: (checked: boolean) => void;
  onAnalyticsRetentionDaysChange: (days: AnalyticsRetentionDays) => void;
  onAnalyticsGuestNoticeChange: (value: string) => void;
  onRegenerateToken: () => void;
  onSavePrivacy: (event: FormEvent) => void;
  onSitePasswordChange: (value: string) => void;
  onToggleShowPrivacySettings: () => void;
  onToggleShowSitePassword: () => void;
  onVisibilityModeChange: (mode: 'public' | 'password_protected' | 'invite_only') => void;
  privacyCopied: boolean;
  privacyMode: 'public' | 'password_protected' | 'invite_only';
  showPrivacySettings: boolean;
  showSitePassword: boolean;
  siteSlug: string;
  sitePassword: string;
  translatingLanguage: TranslationLanguageCode | null;
  translationStatuses: TranslationStatusRow[];
  visibilityError: string | null;
  visibilitySaving: boolean;
  visibilitySuccess: string | null;
};

export function SettingsPrivacyPanel({
  allowedLanguages,
  analyticsEnabled,
  analyticsRetentionDays,
  analyticsGuestNotice,
  defaultLanguage,
  guestAccessToken,
  hideFromSearch,
  onAutoTranslateLanguage,
  onCopyInviteLink,
  onAllowedLanguagesChange,
  onDefaultLanguageChange,
  onHideFromSearchChange,
  onAnalyticsEnabledChange,
  onAnalyticsRetentionDaysChange,
  onAnalyticsGuestNoticeChange,
  onRegenerateToken,
  onSavePrivacy,
  onSitePasswordChange,
  onToggleShowPrivacySettings,
  onToggleShowSitePassword,
  onVisibilityModeChange,
  privacyCopied,
  privacyMode,
  showPrivacySettings,
  showSitePassword,
  siteSlug,
  sitePassword,
  translatingLanguage,
  translationStatuses,
  visibilityError,
  visibilitySaving,
  visibilitySuccess,
}: SettingsPrivacyPanelProps) {
  const translationStatusByLanguage = new Map(translationStatuses.map((status) => [status.language, status]));

  return (
    <Card variant="bordered" padding="lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>Control who can view your site</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onToggleShowPrivacySettings}>
            {showPrivacySettings ? 'Hide' : 'Show'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!showPrivacySettings ? (
          <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
            Hidden by default to keep things simple. Open it when you want to choose who can see your site.
          </div>
        ) : (
          <form onSubmit={onSavePrivacy} className="space-y-5">
            {visibilitySuccess && (
              <div className="rounded-lg border border-success/20 bg-success-light p-3 text-sm text-success">{visibilitySuccess}</div>
            )}
            {visibilityError && (
              <div className="rounded-lg border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary">{visibilityError}</div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">Default site language</label>
              <p className="text-xs text-text-secondary">Sets the default language for your public wedding site and RSVP page.</p>
              <div className="flex gap-3">
                {SITE_LANGUAGE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2.5 transition-colors ${
                      defaultLanguage === option.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="default_language"
                      value={option.value}
                      checked={defaultLanguage === option.value}
                      onChange={() => onDefaultLanguageChange(option.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-text-primary">{option.label}</span>
                  </label>
                ))}
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
                <p className="text-sm font-semibold text-text-primary">Guest-facing language options</p>
                <p className="mt-1 text-xs text-text-secondary">Choose which languages should show up across translated guest-facing surfaces. Your default language always stays on.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SITE_LANGUAGE_OPTIONS.map((option) => {
                    const checked = allowedLanguages.includes(option.value);
                    const locked = option.value === defaultLanguage;
                    return (
                      <label
                        key={option.value}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                          checked ? 'border-primary bg-primary/5 text-text-primary' : 'border-border bg-white text-text-secondary'
                        } ${locked ? 'opacity-100' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...allowedLanguages, option.value]
                              : allowedLanguages.filter((language) => language !== option.value);
                            onAllowedLanguagesChange(next);
                          }}
                          className="text-primary focus:ring-primary"
                        />
                        <span>{option.label}{locked ? ' (default)' : ''}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Auto-translate public site</p>
                    <p className="text-xs text-text-secondary">Generate stored translated versions of guest-facing site copy. Review the public site after generation.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TRANSLATION_LANGUAGE_OPTIONS.map((language) => (
                      <Button
                        key={language.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAutoTranslateLanguage(language.value)}
                        disabled={translatingLanguage === language.value}
                      >
                        {translatingLanguage === language.value ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {translatingLanguage === language.value ? 'Translating…' : language.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {TRANSLATION_LANGUAGE_OPTIONS.map((language) => {
                    const status = translationStatusByLanguage.get(language.value);
                    const ready = status?.status === 'ready';
                    const failed = status?.status === 'failed';

                    return (
                      <div key={language.value} className="rounded-lg border border-border bg-white px-3 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-text-primary">{language.label}</p>
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                              ready ? 'bg-success/10 text-success' : failed ? 'bg-surface-subtle text-text-secondary' : 'bg-surface-subtle text-text-tertiary'
                            }`}
                          >
                            {ready ? 'Ready' : failed ? 'Try again' : 'Not yet'}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-4 text-text-tertiary">
                          {formatTranslationStatusDate(status?.translated_at ?? null)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
              <p className="text-sm font-medium text-text-primary">Visibility states</p>
              <ul className="space-y-1 text-xs text-text-secondary">
                <li>• <span className="font-medium text-text-primary">Draft</span> means only you can see the site while editing.</li>
                <li>• <span className="font-medium text-text-primary">Protected live access</span> lets you limit who can open the guest-facing site once it is live.</li>
                <li>• <span className="font-medium text-text-primary">Share with guests</span> makes the site live at your dayof URL.</li>
              </ul>
            </div>

            <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
              <div>
                <p className="text-sm font-medium text-text-primary">Aggregate analytics policy</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Guest-hub analytics stay aggregate-only. Owner readback should never expose invite tokens, private URLs, IP addresses, or device-level detail.
                </p>
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-border bg-white px-3 py-3 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(event) => onAnalyticsEnabledChange(event.target.checked)}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <span>
                  <span className="block font-medium">Track aggregate guest-hub analytics</span>
                  <span className="mt-1 block text-xs text-text-secondary">
                    Use measured website visits, invite opens, and QR entries in owner analytics. Turn this off if you do not want new guest-hub activity counted.
                  </span>
                </span>
              </label>
              <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <label className="space-y-2 text-sm text-text-primary">
                  <span className="block font-medium">Retention window</span>
                  <select
                    value={analyticsRetentionDays}
                    onChange={(event) => onAnalyticsRetentionDaysChange(Number(event.target.value) as AnalyticsRetentionDays)}
                    disabled={!analyticsEnabled}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-surface-subtle"
                  >
                    {ANALYTICS_RETENTION_OPTIONS.map((days) => (
                      <option key={days} value={days}>{days} days</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-text-primary">
                  <span className="block font-medium">Guest-facing notice</span>
                  <textarea
                    value={analyticsGuestNotice}
                    onChange={(event) => onAnalyticsGuestNoticeChange(event.target.value)}
                    rows={3}
                    maxLength={240}
                    disabled={!analyticsEnabled}
                    placeholder="Aggregate visit, invite, and QR counts help us see what guest resources are being used."
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-surface-subtle"
                  />
                  <span className="block text-xs text-text-secondary">
                    Save a short disclosure for your planning team. Keep it high-level and guest-safe.
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              {getVisibilityModeOptions().map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3.5 transition-colors ${
                    privacyMode === option.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="privacy_mode"
                    value={option.value}
                    checked={privacyMode === option.value}
                    onChange={() => onVisibilityModeChange(option.value)}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{option.label}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {privacyMode === 'password_protected' && (
              <div className="space-y-3 rounded-lg border border-border bg-surface-subtle p-4">
                <p className="text-sm font-medium text-text-primary">Site password</p>
                <p className="text-xs text-text-secondary">Guests will be prompted to enter this before viewing the site.</p>
                <div className="relative">
                  <input
                    type={showSitePassword ? 'text' : 'password'}
                    value={sitePassword}
                    onChange={(event) => onSitePasswordChange(event.target.value)}
                    placeholder="Set new password…"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={onToggleShowSitePassword}
                    className="absolute right-3 top-2.5 text-text-tertiary hover:text-text-primary"
                    aria-label={showSitePassword ? 'Hide' : 'Show'}
                  >
                    {showSitePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-text-tertiary">Leave blank to keep the existing password.</p>
              </div>
            )}

            {privacyMode === 'invite_only' && (
              <div className="space-y-3 rounded-lg border border-border bg-surface-subtle p-4">
                <p className="text-sm font-medium text-text-primary">Invite-only guest access link</p>
                <p className="text-xs text-text-secondary">Share this link with guests you want to allow through your invite-only access setting. This is a guest access control, not a separate unpublished preview product, and it is separate from search visibility.</p>
                {guestAccessToken && siteSlug ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-secondary">
                      {`${window.location.origin}/site/${siteSlug}?token=${guestAccessToken.slice(0, 12)}…`}
                    </code>
                    <Button type="button" variant="outline" size="sm" onClick={onCopyInviteLink}>
                      {privacyCopied ? <CheckCheck className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary">Save settings to generate the link.</p>
                )}
                {guestAccessToken && (
                  <button
                    type="button"
                    onClick={onRegenerateToken}
                    className="text-xs text-text-tertiary hover:text-text-secondary hover:underline"
                  >
                    Regenerate access link (old link stops working)
                  </button>
                )}
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={hideFromSearch}
                onChange={(event) => onHideFromSearchChange(event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">Hide from search engines</p>
                <p className="text-xs text-text-secondary">Adds a noindex tag so search engines should not list your site. Search visibility is separate from invite-only access links and separate from whether you have fully gone live for guests.</p>
              </div>
            </label>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="md" type="submit" disabled={visibilitySaving}>
                {visibilitySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Privacy Settings
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
