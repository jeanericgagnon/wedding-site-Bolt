import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { SettingsPrivacyPanel } from './SettingsPrivacyPanel';
import type { AnalyticsRetentionDays } from './settingsDashboardTypes';

function PrivacyPanelHarness() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [analyticsRetentionDays, setAnalyticsRetentionDays] = useState<AnalyticsRetentionDays>(90);
  const [analyticsGuestNotice, setAnalyticsGuestNotice] = useState('Aggregate guest-hub counts only.');

  return (
    <SettingsPrivacyPanel
      allowedLanguages={['en', 'es']}
      analyticsEnabled={analyticsEnabled}
      analyticsRetentionDays={analyticsRetentionDays}
      analyticsGuestNotice={analyticsGuestNotice}
      canEditSettings
      defaultLanguage="en"
      guestAccessToken={null}
      hideFromSearch={false}
      isGuestFacingReady
      isPublished
      onAutoTranslateLanguage={() => {}}
      onCopyInviteLink={() => {}}
      onAllowedLanguagesChange={() => {}}
      onDefaultLanguageChange={() => {}}
      onHideFromSearchChange={() => {}}
      onAnalyticsEnabledChange={setAnalyticsEnabled}
      onAnalyticsRetentionDaysChange={setAnalyticsRetentionDays}
      onAnalyticsGuestNoticeChange={setAnalyticsGuestNotice}
      onRegenerateToken={() => {}}
      onSavePrivacy={(event) => event.preventDefault()}
      onSitePasswordChange={() => {}}
      onToggleShowPrivacySettings={() => {}}
      onToggleShowSitePassword={() => {}}
      onVisibilityModeChange={() => {}}
      privacyCopyNotice={null}
      privacyMode="public"
      showPrivacySettings
      showSitePassword={false}
      siteSlug="alex-jordan"
      sitePassword=""
      translatingLanguage={null}
      translationStatuses={[]}
      visibilityError={null}
      visibilitySaving={false}
      visibilitySuccess={null}
    />
  );
}

describe('SettingsPrivacyPanel', () => {
  it('lets owners control analytics retention and notice without overstating visibility copy', () => {
    render(<PrivacyPanelHarness />);

    expect(screen.getByText(/Aggregate analytics policy/i)).toBeInTheDocument();
    const retention = screen.getByLabelText(/Retention window/i) as HTMLSelectElement;
    const notice = screen.getByLabelText(/Guest-facing notice/i) as HTMLTextAreaElement;

    expect(retention.value).toBe('90');
    expect(notice.value).toBe('Aggregate guest-hub counts only.');

    fireEvent.change(retention, { target: { value: '180' } });
    fireEvent.change(notice, { target: { value: 'Aggregate visits only.' } });

    expect(retention.value).toBe('180');
    expect(notice.value).toBe('Aggregate visits only.');
    expect(screen.getByText(/invite opens, and QR entries/i)).toBeInTheDocument();
  });

  it('disables retention and notice fields when analytics tracking is turned off', () => {
    render(<PrivacyPanelHarness />);

    fireEvent.click(screen.getByLabelText(/Track aggregate guest-hub analytics/i));

    expect(screen.getByLabelText(/Retention window/i)).toBeDisabled();
    expect(screen.getByLabelText(/Guest-facing notice/i)).toBeDisabled();
  });
});
