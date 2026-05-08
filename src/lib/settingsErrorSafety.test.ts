import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const settingsSource = () => readFileSync(join(process.cwd(), 'src/pages/dashboard/Settings.tsx'), 'utf8');
const settingsSiteAccessActionsSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/useSettingsSiteAccessActions.ts'),
  'utf8',
);
const settingsExperienceActionsSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/useSettingsExperienceActions.ts'),
  'utf8',
);
const settingsTabContentSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/SettingsTabContent.tsx'),
  'utf8',
);
const settingsSiteTabContentSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/SettingsSiteTabContent.tsx'),
  'utf8',
);
const settingsRsvpTabContentSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/SettingsRsvpTabContent.tsx'),
  'utf8',
);
const settingsDashboardSnapshotSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/loadSettingsDashboardSnapshot.ts'),
  'utf8',
);
const settingsDashboardViewModelSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/buildSettingsDashboardViewModel.ts'),
  'utf8',
);
const customerSafeErrorSource = () => readFileSync(join(process.cwd(), 'src/lib/customerSafeError.ts'), 'utf8');
const settingsSiteDataSource = () => readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/settingsSiteData.ts'), 'utf8');

describe('settings error safety', () => {
  it('does not render raw billing or planner invite exception messages directly', () => {
    const source = settingsSource();
    const actionsSource = settingsSiteAccessActionsSource();
    const experienceSource = settingsExperienceActionsSource();

    expect(source).toContain("setBillingError(safeSettingsError(err, 'Couldn’t load billing right now.'))");
    expect(experienceSource).toContain("setSubscribeError(safeSettingsError(err, 'Couldn’t start checkout right now.'))");
    expect(experienceSource).toContain("setTemplateError(safeSettingsError(err, 'Couldn’t change design.'))");
    expect(experienceSource).toContain("setRsvpQuestionsError(safeSettingsError(err, 'Couldn’t save RSVP questions.'))");
    expect(experienceSource).toContain("setNotifError(safeSettingsError(err, 'Couldn’t save preferences.'))");
    expect(actionsSource).toContain("setPlannerInviteError(safeSettingsError(err, 'Couldn’t save planner invite.'))");
    expect(actionsSource).toContain("setPlannerInviteError(safeSettingsError(err, 'Couldn’t remove planner invite.'))");
    expect(source).not.toContain('.catch(err => setBillingError(err.message))');
    expect(experienceSource).not.toContain("setSubscribeError(err instanceof Error ? err.message : 'Couldn’t start checkout right now.')");
    expect(actionsSource).not.toContain("setPlannerInviteError(err instanceof Error ? err.message : 'Couldn’t save planner invite.')");
    expect(actionsSource).not.toContain("setPlannerInviteError(err instanceof Error ? err.message : 'Couldn’t remove planner invite.')");
  });

  it('treats payment/provider/backend-shaped wording as unsafe for settings copy', () => {
    const source = customerSafeErrorSource();

    expect(source).toContain('service[-_\\s]*role');
    expect(source).toContain('database');
    expect(source).toContain('network');
    expect(source).toContain('fetch');
    expect(source).toContain('provider');
    expect(source).toContain('stripe');
    expect(source).toContain('schema');
    expect(source).toContain('sql');
    expect(source).toContain('token');
  });

  it('explicitly selects every privacy, language, and notification setting it hydrates', () => {
    const source = settingsSiteDataSource();
    const pageSource = settingsSource();
    const actionsSource = settingsSiteAccessActionsSource();
    const experienceSource = settingsExperienceActionsSource();
    const snapshotSource = settingsDashboardSnapshotSource();
    const viewModelSource = settingsDashboardViewModelSource();
    const selectMatch = source.match(/export const SETTINGS_SITE_SELECT = \[([\s\S]*?)\]\.join/);
    expect(selectMatch?.[1]).toBeTruthy();
    const selectedColumns = new Set(
      (selectMatch?.[1] ?? '')
        .split('\n')
        .map((entry) => entry.replace(/[',]/g, '').trim())
        .filter(Boolean),
    );

    for (const column of [
      'privacy_mode',
      'hide_from_search',
      'guest_access_token',
      'default_language',
      'notification_prefs',
      'rsvp_custom_questions',
      'rsvp_meal_config',
      'music_playlist_url',
    ]) {
      expect(selectedColumns.has(column), column).toBe(true);
    }

    expect(source).toContain('.select(SETTINGS_SITE_SELECT)');
    expect(source).not.toContain(".select('*')");
    expect(pageSource).toContain('loadSettingsDashboardSnapshot({');
    expect(pageSource).toContain('buildSettingsDashboardViewModel({');
    expect(snapshotSource).toContain('loadSettingsSite(activeSite.id)');
    expect(snapshotSource).toContain('loadSettingsCollaboratorInvites(siteId)');
    expect(snapshotSource).toContain('loadSettingsTranslationStatuses(');
    expect(viewModelSource).toContain('getSettingsTabs(settingsRole)');
    expect(viewModelSource).toContain('buildWeddingIdentityExportKit({');
    expect(viewModelSource).toContain('buildWeddingIdentityPrintAssets({');
    expect(source).toContain('function updateSettingsSite');
    expect(source).toContain("supabase.rpc('hash_site_password'");
    expect(source).toContain("supabase.rpc('generate_secure_token'");
    expect(source).toContain("supabase.functions.invoke('translate-site-content'");
    expect(actionsSource).toContain('hashSettingsSitePassword(sitePassword)');
    expect(actionsSource).toContain('generateSettingsSecureToken()');
    expect(actionsSource).toContain('translateSettingsSiteContent(targetSiteId, language)');
    expect(pageSource).toContain('useSettingsExperienceActions({');
    expect(experienceSource).toContain('updateSettingsSite(targetSiteId');
    expect(experienceSource).toContain('rsvp_custom_questions: cleanedQuestions');
    expect(experienceSource).toContain('notification_prefs: { rsvp: notifRsvp');
  });

  it('keeps settings tab rendering behind the shared tab-content seam', () => {
    const pageSource = settingsSource();
    const tabContentSource = settingsTabContentSource();
    const siteTabContentSource = settingsSiteTabContentSource();
    const rsvpTabContentSource = settingsRsvpTabContentSource();

    expect(pageSource).toContain('<SettingsTabContent');
    expect(pageSource).toContain('<SettingsSiteTabContent');
    expect(pageSource).toContain('<SettingsRsvpTabContent');
    expect(tabContentSource).toContain('switch (activeTab)');
    expect(tabContentSource).toContain('case \'account\'');
    expect(tabContentSource).toContain('case \'team\'');
    expect(tabContentSource).toContain('case \'site\'');
    expect(tabContentSource).toContain('case \'rsvp\'');
    expect(tabContentSource).toContain('case \'notifications\'');
    expect(tabContentSource).toContain('case \'billing\'');
    expect(tabContentSource).toContain('accountContent');
    expect(tabContentSource).toContain('teamContent');
    expect(tabContentSource).toContain('siteContent');
    expect(tabContentSource).toContain('rsvpContent');
    expect(tabContentSource).toContain('notificationsContent');
    expect(tabContentSource).toContain('billingContent');
    expect(siteTabContentSource).toContain('<SettingsSiteUrlPanel');
    expect(siteTabContentSource).toContain('<SettingsIdentityExportsPanel');
    expect(siteTabContentSource).toContain('<SettingsPrivacyPanel');
    expect(siteTabContentSource).toContain('<SettingsTemplatePanel');
    expect(rsvpTabContentSource).toContain('<SettingsRsvpMealPanel');
    expect(rsvpTabContentSource).toContain('<SettingsRsvpQuestionsPanel');
  });
});
