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
const settingsAccountActionsSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/useSettingsAccountActions.ts'),
  'utf8',
);
const settingsDashboardSupportSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardSupport.ts'),
  'utf8',
);
const settingsDashboardSnapshotHydrationSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardSnapshotHydration.ts'),
  'utf8',
);
const settingsDashboardUiStateSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardUiState.ts'),
  'utf8',
);
const settingsTabContentSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/SettingsTabContent.tsx'),
  'utf8',
);
const settingsRouteContentSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/SettingsDashboardRouteContent.tsx'),
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
const settingsRpcMigrationSource = () => readFileSync(
  join(process.cwd(), 'supabase/migrations/20260512012000_settings_overview_write_rpcs.sql'),
  'utf8',
);

describe('settings error safety', () => {
  it('does not render raw billing or planner invite exception messages directly', () => {
    const source = settingsSource();
    const actionsSource = settingsSiteAccessActionsSource();
    const experienceSource = settingsExperienceActionsSource();
    const accountActionsSource = settingsAccountActionsSource();
    const uiStateSource = settingsDashboardUiStateSource();

    expect(uiStateSource).toContain("setBillingError(safeSettingsError(err, 'Couldn’t load billing right now.'))");
    expect(experienceSource).toContain("setSubscribeError(safeSettingsError(err, 'Couldn’t start checkout right now.'))");
    expect(experienceSource).toContain("setTemplateError(safeSettingsError(err, 'Couldn’t change design.'))");
    expect(experienceSource).toContain("setRsvpQuestionsError(safeSettingsError(err, 'Couldn’t save RSVP questions.'))");
    expect(experienceSource).toContain("setNotifError(safeSettingsError(err, 'Couldn’t save preferences.'))");
    expect(actionsSource).toContain("setPlannerInviteError(safeSettingsError(err, 'Couldn’t save planner invite.'))");
    expect(actionsSource).toContain("setPlannerInviteError(safeSettingsError(err, 'Couldn’t remove planner invite.'))");
    expect(accountActionsSource).toContain("setAccountError(safeSettingsError(err, 'Couldn’t save changes.'))");
    expect(accountActionsSource).toContain("setPasswordError(safeSettingsError(err, 'Couldn’t update password.'))");
    expect(uiStateSource).not.toContain('.catch(err => setBillingError(err.message))');
    expect(experienceSource).not.toContain("setSubscribeError(err instanceof Error ? err.message : 'Couldn’t start checkout right now.')");
    expect(actionsSource).not.toContain("setPlannerInviteError(err instanceof Error ? err.message : 'Couldn’t save planner invite.')");
    expect(actionsSource).not.toContain("setPlannerInviteError(err instanceof Error ? err.message : 'Couldn’t remove planner invite.')");
    expect(accountActionsSource).not.toContain("setAccountError(err instanceof Error ? err.message : 'Couldn’t save changes.')");
    expect(accountActionsSource).not.toContain("setPasswordError(err instanceof Error ? err.message : 'Couldn’t update password.')");
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
    const supportSource = settingsDashboardSupportSource();
    const hydrationSource = settingsDashboardSnapshotHydrationSource();
    const uiStateSource = settingsDashboardUiStateSource();
    const routeSupportSource = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardRouteSupport.ts'),
      'utf8',
    );
    const routeContentPropsSource = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/buildSettingsDashboardRouteContentProps.ts'),
      'utf8',
    );
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
    expect(pageSource).toContain('useSettingsDashboardSnapshotHydration({');
    expect(pageSource).toContain('useSettingsDashboardRouteSupport({');
    expect(pageSource).toContain('useSettingsDashboardUiState({ userId: user?.id })');
    expect(snapshotSource).toContain('loadSettingsSite(activeSite.id)');
    expect(snapshotSource).toContain('loadSettingsCollaboratorInvites(siteId)');
    expect(snapshotSource).toContain('loadSettingsTranslationStatuses(');
    expect(viewModelSource).toContain('getSettingsTabs(settingsRole, settingsPermissions)');
    expect(viewModelSource).toContain('buildWeddingIdentityExportKit({');
    expect(viewModelSource).toContain('buildWeddingIdentityPrintAssets({');
    expect(source).toContain('function updateSettingsSite');
    expect(source).toContain("supabase.rpc('hash_site_password'");
    expect(source).toContain("supabase.rpc('generate_secure_token'");
    expect(source).toContain("supabase.functions.invoke('translate-site-content'");
    expect(pageSource).toContain('useSettingsDashboardSupport({');
    expect(actionsSource).toContain('hashSettingsSitePassword(sitePassword)');
    expect(actionsSource).toContain('generateSettingsSecureToken()');
    expect(actionsSource).toContain('translateSettingsSiteContent(targetSiteId, language)');
    expect(supportSource).toContain('resolveActiveSiteForUser(userId)');
    expect(supportSource).toContain('loadSettingsCollaboratorInvites(siteId)');
    expect(supportSource).toContain('loadSettingsTranslationStatuses(');
    expect(supportSource).toContain('logAppAction({');
    expect(hydrationSource).toContain('loadSettingsDashboardSnapshot({');
    expect(hydrationSource).toContain('if (visibilityDraftGuard.shouldHydrate())');
    expect(hydrationSource).toContain('if (notifDraftGuard.shouldHydrate())');
    expect(hydrationSource).toContain('if (rsvpDraftGuard.shouldHydrate())');
    expect(uiStateSource).toContain('export function useSettingsDashboardUiState({ userId }: Args)');
    expect(uiStateSource).toContain("const [activeTab, setActiveTab] = useState<SettingsTabId>('account');");
    expect(uiStateSource).toContain("const [siteSlug, setSiteSlug] = useState('');");
    expect(uiStateSource).toContain('const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);');
    expect(routeSupportSource).toContain('export function useSettingsDashboardRouteSupport({');
    expect(routeSupportSource).toContain('const safeMusicPlaylistUrl = getSafePublicWebUrl(musicPlaylistUrl);');
    expect(routeSupportSource).toContain('buildSettingsDashboardViewModel({');
    expect(routeSupportSource).toContain('const handleLogout = async () => {');
    expect(routeContentPropsSource).toContain('export function buildSettingsDashboardRouteContentProps(props: Props): Props {');
    expect(pageSource).toContain('useSettingsExperienceActions({');
    expect(experienceSource).toContain('updateSettingsSite(targetSiteId');
    expect(experienceSource).toContain('rsvp_custom_questions: cleanedQuestions');
    expect(experienceSource).toContain('notification_prefs: buildNotificationPrefsPatch({');
  });

  it('keeps wedding_site_settings_patch text fields as text in the RPC migration', () => {
    const source = settingsRpcMigrationSource();

    expect(source).toContain("active_template_id = case when p_patch ? 'active_template_id' then nullif(btrim(coalesce(p_patch->>'active_template_id', '')), '') else v_existing.active_template_id end");
    expect(source).not.toContain("active_template_id = case when p_patch ? 'active_template_id' then nullif(p_patch->>'active_template_id', '')::uuid");
  });

  it('keeps settings tab rendering behind the shared tab-content seam', () => {
    const pageSource = settingsSource();
    const routeContentSource = settingsRouteContentSource();
    const routeContentPropsSource = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/buildSettingsDashboardRouteContentProps.ts'),
      'utf8',
    );
    const tabContentSource = settingsTabContentSource();
    const siteTabContentSource = settingsSiteTabContentSource();
    const rsvpTabContentSource = settingsRsvpTabContentSource();

    expect(pageSource).toContain('<SettingsDashboardRouteContent');
    expect(pageSource).toContain('buildSettingsDashboardRouteContentProps({');
    expect(pageSource).not.toContain('accountEmail={accountEmail}');
    expect(pageSource).not.toContain('handleLogout={handleLogout}');
    expect(routeContentSource).toContain('<SettingsTabContent');
    expect(routeContentPropsSource).toContain('type Props = ComponentProps<typeof SettingsDashboardRouteContent>;');
    expect(routeContentSource).toContain('<SettingsSiteTabContent');
    expect(routeContentSource).toContain('<SettingsRsvpTabContent');
    expect(tabContentSource).toContain('const effectiveTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0]?.id;');
    expect(tabContentSource).toContain('switch (effectiveTab)');
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
