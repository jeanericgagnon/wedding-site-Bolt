import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_SETTINGS_COLLABORATOR_INVITES,
  requireSettingsAuthenticatedUser,
  SETTINGS_COLLABORATOR_INVITE_SELECT,
  SETTINGS_SITE_SELECT,
  SETTINGS_TEMPLATE_CHANGE_SELECT,
  SETTINGS_TRANSLATION_STATUS_SELECT,
  safeSettingsFunctionError,
  translateSettingsSiteContent,
  updateSettingsAccountPassword,
  verifySettingsCurrentPassword,
} from './settingsSiteData';

const {
  fromMock,
  getUserMock,
  invokeMock,
  signInWithPasswordMock,
  updateUserMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  getUserMock: vi.fn(),
  invokeMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
      signInWithPassword: signInWithPasswordMock,
      updateUser: updateUserMock,
    },
    from: fromMock,
    rpc: vi.fn(),
    functions: {
      invoke: invokeMock,
    },
  },
}));

describe('settings site data boundary', () => {
  beforeEach(() => {
    fromMock.mockReset();
    getUserMock.mockReset();
    invokeMock.mockReset();
    signInWithPasswordMock.mockReset();
    updateUserMock.mockReset();
    fromMock.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null })),
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: [] })),
          })),
        })),
        in: vi.fn(async () => ({ data: [] })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    }));
  });

  it('keeps privacy-sensitive site settings on explicit projections', () => {
    expect(SETTINGS_SITE_SELECT).toContain('privacy_mode');
    expect(SETTINGS_SITE_SELECT).toContain('hide_from_search');
    expect(SETTINGS_SITE_SELECT).toContain('guest_access_token');
    expect(SETTINGS_SITE_SELECT).toContain('is_published');
    expect(SETTINGS_SITE_SELECT).toContain('wedding_data');
    expect(SETTINGS_SITE_SELECT).not.toContain('*');
    expect(SETTINGS_COLLABORATOR_INVITE_SELECT).toBe('id, invite_email, invite_name, role, status, invited_at, expires_at, invite_token, permissions');
    expect(SETTINGS_TRANSLATION_STATUS_SELECT).toBe('language,status,translated_at');
    expect(SETTINGS_TEMPLATE_CHANGE_SELECT).toBe('wedding_data, layout_config, site_json');
    expect(MAX_SETTINGS_COLLABORATOR_INVITES).toBe(200);
  });

  it('routes settings writes through RPCs', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/settingsSiteData.ts'), 'utf8');

    expect(source).toContain("supabase.rpc('wedding_site_settings_patch'");
    expect(source).toContain("supabase.rpc('settings_collaborator_invite_write'");
    expect(source).toContain("supabase.rpc('settings_collaborator_invite_revoke'");
    expect(source).not.toContain(".from('wedding_site_collaborator_invites')\n    .insert(");
    expect(source).not.toContain(".from('wedding_site_collaborator_invites')\n    .update({ status: 'revoked'");
    expect(source).not.toContain(".from('wedding_sites')\n    .update(updates)");
  });

  it('keeps owner settings table access behind the settings data service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/Settings.tsx'), 'utf8');
    const tabContent = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/SettingsTabContent.tsx'),
      'utf8',
    );
    const siteTabContent = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/SettingsSiteTabContent.tsx'),
      'utf8',
    );
    const rsvpTabContent = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/SettingsRsvpTabContent.tsx'),
      'utf8',
    );
    const snapshotLoader = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/loadSettingsDashboardSnapshot.ts'),
      'utf8',
    );
    const viewModel = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/buildSettingsDashboardViewModel.ts'),
      'utf8',
    );
    const accountHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsAccountActions.ts'),
      'utf8',
    );
    const supportHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardSupport.ts'),
      'utf8',
    );
    const uiStateHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardUiState.ts'),
      'utf8',
    );
    const routeSupportHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardRouteSupport.ts'),
      'utf8',
    );
    const routeContentPropsHelper = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/buildSettingsDashboardRouteContentProps.ts'),
      'utf8',
    );
    const routeContent = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/SettingsDashboardRouteContent.tsx'),
      'utf8',
    );
    const hydrationHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardSnapshotHydration.ts'),
      'utf8',
    );
    const actionsHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsSiteAccessActions.ts'),
      'utf8',
    );
    const experienceHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsExperienceActions.ts'),
      'utf8',
    );
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/settingsSiteData.ts'), 'utf8');

    expect(page).toContain('useSettingsDashboardSnapshotHydration({');
    expect(page).toContain('useSettingsSiteAccessActions({');
    expect(page).toContain('useSettingsExperienceActions({');
    expect(page).toContain('useSettingsAccountActions({');
    expect(page).toContain('useSettingsDashboardSupport({');
    expect(page).toContain('useSettingsDashboardUiState({ userId: user?.id })');
    expect(page).toContain('useSettingsDashboardRouteSupport({');
    expect(page).toContain('buildSettingsDashboardRouteContentProps({');
    expect(page).toContain('<SettingsDashboardRouteContent');
    expect(page).not.toContain('requireSettingsAuthenticatedUser()');
    expect(page).not.toContain('verifySettingsCurrentPassword(authUser.email || \'\', currentPassword)');
    expect(page).not.toContain('updateSettingsAccountPassword(newPassword)');
    expect(page).not.toContain('const handleSaveAccount = async (e: React.FormEvent) => {');
    expect(page).not.toContain('const handleUpdatePassword = async (e: React.FormEvent) => {');
    expect(page).not.toContain('<DashboardLayout');
    expect(page).not.toContain('<DashboardPageHero');
    expect(page).not.toContain('<SettingsNavigation');
    expect(page).not.toContain('<SettingsTabContent');
    expect(page).not.toContain('<SettingsSiteTabContent');
    expect(page).not.toContain('<SettingsRsvpTabContent');
    expect(page).not.toContain('<SettingsSiteUrlPanel');
    expect(page).not.toContain('<SettingsIdentityExportsPanel');
    expect(page).not.toContain('<SettingsPrivacyPanel');
    expect(page).not.toContain('<SettingsTemplatePanel');
    expect(page).not.toContain('<SettingsRsvpMealPanel');
    expect(page).not.toContain('<SettingsRsvpQuestionsPanel');
    expect(page).not.toContain("from('wedding_site_collaborator_invites')");
    expect(page).not.toContain("from('site_translations')");
    expect(page).not.toMatch(/supabase\s*\n\s*\.from\('wedding_sites'\)/);
    expect(page).not.toContain('loadSettingsSite(activeSite.id)');
    expect(page).not.toContain('getSettingsTabs(settingsRole)');
    expect(page).not.toContain('buildWeddingIdentityExportKit({');
    expect(page).not.toContain('buildWeddingIdentityPrintAssets({');
    expect(page).not.toContain('const loadCollaboratorInvites = async (siteId: string) => {');
    expect(page).not.toContain('const resolveSettingsSiteId = async () => {');
    expect(page).not.toContain('const logSettingsAction = (');
    expect(page).not.toContain('const loadTranslationStatuses = async (siteId: string) => {');
    expect(page).not.toContain("const downloadTextFile = (filename: string, content: string, type = 'text/plain;charset=utf-8') => {");
    expect(page).not.toContain('const loadSiteData = async () => {');
    expect(page).not.toContain("const [activeTab, setActiveTab] = useState<SettingsTabId>('account');");
    expect(page).not.toContain("const [siteSlug, setSiteSlug] = useState('');");
    expect(page).not.toContain('const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);');
    expect(page).not.toContain('if (activeTab === \'billing\' && settingsRole === \'owner\' && user && !billingInfo) {');
    expect(page).not.toContain('const invite = readPlannerInvite(siteSlug || user?.id || null);');
    expect(page).not.toContain('const safeMusicPlaylistUrl = getSafePublicWebUrl(musicPlaylistUrl);');
    expect(page).not.toContain('const handleLogout = async () => {');
    expect(page).not.toContain('accountEmail={accountEmail}');
    expect(page).not.toContain('handleLogout={handleLogout}');
    expect(page).not.toContain('plannerRoleOptions={plannerRoleOptions}');
    expect(page).not.toContain('weddingIdentityExportKit={weddingIdentityExportKit}');
    expect(page).not.toContain('supabase.auth.getUser');
    expect(page).not.toContain('supabase.auth.signInWithPassword');
    expect(page).not.toContain('supabase.auth.updateUser');
    expect(page).not.toContain('Invite your planner, not a generic staff account');
    expect(page).not.toContain('Sent invite links');
    expect(page).not.toContain('Your wedding site address');
    expect(page).not.toContain('Public site QR');
    expect(page).not.toContain('Wedding identity exports');
    expect(page).not.toContain('Copy manifest');
    expect(page).not.toContain('Control who can view your site');
    expect(page).not.toContain('Choose a different design');
    expect(page).not.toContain('Your names, details, and content stay in place when you switch designs.');
    expect(page).not.toContain('Toggle meal collection and customize options shown on RSVP');
    expect(page).not.toContain('Collect meal choice on RSVP form');
    expect(page).not.toContain('Add optional questions to collect extra details from guests');
    expect(page).not.toContain('Song request playlist (Spotify collaborative)');
    expect(page).not.toContain('createSettingsCollaboratorInvite({');
    expect(page).not.toContain('revokeSettingsCollaboratorInvite(inviteId)');
    expect(page).not.toContain('findSettingsSiteBySlug(cleaned)');
    expect(page).not.toContain('translateSettingsSiteContent(targetSiteId, language)');
    expect(page).not.toContain('buildWeddingIdentityManifestText(weddingIdentityExportKit)');
    expect(page).not.toContain('renderWeddingIdentityPrintHtml(weddingIdentityPrintAssets)');
    expect(page).not.toContain('loadSettingsTemplateChangeSite(weddingSiteId)');
    expect(routeSupportHook).toContain('export function useSettingsDashboardRouteSupport({');
    expect(routeSupportHook).toContain('const safeMusicPlaylistUrl = getSafePublicWebUrl(musicPlaylistUrl);');
    expect(routeSupportHook).toContain('buildSettingsDashboardViewModel({');
    expect(routeSupportHook).toContain('isPublished,');
    expect(routeSupportHook).toContain('const handleLogout = async () => {');
    expect(routeContentPropsHelper).toContain('type Props = ComponentProps<typeof SettingsDashboardRouteContent>;');
    expect(routeContentPropsHelper).toContain('export function buildSettingsDashboardRouteContentProps(props: Props): Props {');
    expect(routeContent).toContain('export function SettingsDashboardRouteContent(props: Props)');
    expect(routeContent).toContain('isPublished: props.isPublished,');
    expect(routeContent).toContain('const canEditSettings = canManageSettings(props.settingsRole, props.settingsPermissions);');
    expect(routeContent).toContain("const canManageOwnerSettings = props.settingsRole === 'owner';");
    expect(routeContent).toContain('if (!canEditSettings) return;');
    expect(routeContent).toContain('if (!canManageOwnerSettings) return;');
    expect(routeContent).toContain('onSavePrivacy={canEditSettings ? props.handleSavePrivacy : blockSettingsSubmit}');
    expect(routeContent).toContain('canEditWeddingAccountInfo={canEditSettings}');
    expect(routeContent).toContain('onSaveAccount={canEditSettings ? props.handleSaveAccount : blockSettingsSubmit}');
    expect(routeContent).toContain('onCoupleNamesChange={(value) => runSettingsWrite(() => props.setCoupleNames(value))}');
    expect(routeContent).toContain('onSubmitSiteSlug={canEditSettings ? props.handleUpdateSlug : blockSettingsSubmit}');
    expect(routeContent).toContain('onSaveQuestions={canEditSettings ? props.handleSaveRsvpQuestions : blockSettingsSubmit}');
    expect(routeContent).toContain('onSaveNotifications={canEditSettings ? props.handleSaveNotifications : blockSettingsSubmit}');
    expect(routeContent).toContain('canManageOwnerSettings={canManageOwnerSettings}');
    expect(routeContent).toContain('onResendCollaboratorInvite={(inviteId) => canManageOwnerSettings ? props.handleResendCollaboratorInvite(inviteId) : Promise.resolve(null)}');
    expect(routeContent).toContain('onSubscribe={() => runOwnerSettingsWrite(() => { void props.handleSubscribe(); })}');
    expect(routeContent).toContain('<SettingsDashboardShell');
    expect(routeContent).toContain('<SettingsTabContent');
    expect(routeContent).toContain('<SettingsSiteTabContent');
    expect(routeContent).toContain('<SettingsRsvpTabContent');
    expect(page).not.toContain('createSubscriptionSession(');
    expect(page).not.toContain('notification_prefs: buildNotificationPrefsPatch({');
    expect(page).not.toContain('rsvp_custom_questions: cleanedQuestions');

    expect(tabContent).toContain('const effectiveTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0]?.id;');
    expect(tabContent).toContain('switch (effectiveTab)');
    expect(tabContent).toContain('<>{accountContent}</>');
    expect(tabContent).toContain('<>{teamContent}</>');
    expect(tabContent).toContain('<>{siteContent}</>');
    expect(tabContent).toContain('<>{rsvpContent}</>');
    expect(tabContent).toContain('<>{notificationsContent}</>');
    expect(tabContent).toContain('<>{billingContent}</>');

    expect(siteTabContent).toContain('<SettingsSiteUrlPanel');
    expect(siteTabContent).toContain('<SettingsIdentityExportsPanel');
    expect(siteTabContent).toContain('<SettingsPrivacyPanel');
    expect(siteTabContent).toContain('<SettingsTemplatePanel');
    expect(siteTabContent).toContain('canEditSettings={canEditSettings}');
    expect(siteTabContent).toContain('onSubmitSiteSlug');
    expect(siteTabContent).toContain('onToggleTemplateSettings');
    expect(rsvpTabContent).toContain('<SettingsRsvpMealPanel');
    expect(rsvpTabContent).toContain('<SettingsRsvpQuestionsPanel');
    expect(rsvpTabContent).toContain('canEditSettings={canEditSettings}');
    expect(rsvpTabContent).toContain('onSaveMealSettings');
    expect(rsvpTabContent).toContain('onToggleAdvancedVisibility');

    expect(snapshotLoader).toContain('loadSettingsSite(activeSite.id)');
    expect(snapshotLoader).toContain('isPublished: data.is_published === true');
    expect(snapshotLoader).toContain('loadSettingsCollaboratorInvites(siteId)');
    expect(snapshotLoader).toContain('loadSettingsTranslationStatuses(');
    expect(snapshotLoader).toContain('resolveActiveSiteForUser(userId)');
    expect(snapshotLoader).not.toContain("from('wedding_sites')");
    expect(viewModel).toContain('getSettingsTabs(settingsRole, settingsPermissions)');
    expect(viewModel).toContain('isPublished,');
    expect(viewModel).toContain('buildWeddingIdentityExportKit({');
    expect(viewModel).toContain('buildWeddingIdentityPrintAssets({');
    expect(viewModel).toContain("PLANNER_ROLE_OPTIONS.filter((option) => option.value !== 'owner')");

    expect(accountHook).toContain('export function useSettingsAccountActions({');
    expect(accountHook).toContain('const accountSaveRequestIdRef = useRef(0);');
    expect(accountHook).toContain('const passwordUpdateRequestIdRef = useRef(0);');
    expect(accountHook).toContain('const isCurrentAccountSave = () => requestId === accountSaveRequestIdRef.current;');
    expect(accountHook).toContain('const isCurrentPasswordUpdate = () => requestId === passwordUpdateRequestIdRef.current;');
    expect(accountHook).toContain('await updateSettingsSite(weddingSiteId, { couple_name_1: name1, couple_name_2: name2 });');
    expect(accountHook).toContain("await verifySettingsCurrentPassword(authUser.email || '', currentPassword);");
    expect(accountHook).toContain('await updateSettingsAccountPassword(newPassword);');
    expect(accountHook).toContain('if (!isCurrentAccountSave()) return;');
    expect(accountHook).toContain('if (!isCurrentPasswordUpdate()) return;');
    expect(accountHook).toContain("logSettingsAction('account_password_changed', 'Account password was changed.')");

    expect(supportHook).toContain('export function useSettingsDashboardSupport({');
    expect(supportHook).toContain('const collaboratorInvitesRequestIdRef = useRef(0);');
    expect(supportHook).toContain('const translationStatusesRequestIdRef = useRef(0);');
    expect(supportHook).toContain('if (requestId !== collaboratorInvitesRequestIdRef.current) return;');
    expect(supportHook).toContain('const activeSite = await resolveActiveSiteForUser(userId);');
    expect(supportHook).toContain('void logAppAction({');
    expect(supportHook).toContain('const rows = await loadSettingsTranslationStatuses(');
    expect(supportHook).toContain('if (requestId !== translationStatusesRequestIdRef.current) return;');
    expect(supportHook).toContain('const blob = new Blob([content], { type });');

    expect(uiStateHook).toContain('export function useSettingsDashboardUiState({ userId }: Args)');
    expect(uiStateHook).toContain("const [activeTab, setActiveTab] = useState<SettingsTabId>('account');");
    expect(uiStateHook).toContain("const [siteSlug, setSiteSlug] = useState('');");
    expect(uiStateHook).toContain('const [isPublished, setIsPublished] = useState(false);');
    expect(uiStateHook).toContain('const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);');
    expect(uiStateHook).toContain('fetchBillingInfo(userId)');
    expect(uiStateHook).toContain("setBillingError(safeSettingsError(err, 'Couldn’t load billing right now.'))");
    expect(uiStateHook).toContain('const invite = readPlannerInvite(siteSlug || userId || null);');

    expect(hydrationHook).toContain('export function useSettingsDashboardSnapshotHydration({');
    expect(hydrationHook).toContain('loadSettingsDashboardSnapshot({');
    expect(hydrationHook).toContain('setSettingsRole(snapshot.settingsRole);');
    expect(hydrationHook).toContain('setSettingsPermissions(snapshot.settingsPermissions);');
    expect(hydrationHook).toContain('setIsPublished(snapshot.isPublished);');
    expect(hydrationHook).toContain('if (visibilityDraftGuard.shouldHydrate())');
    expect(hydrationHook).toContain('if (notifDraftGuard.shouldHydrate())');
    expect(hydrationHook).toContain('if (rsvpDraftGuard.shouldHydrate())');
    expect(hydrationHook).toContain("setAccountError(safeSettingsError(err, 'Couldn’t load settings right now.'))");

    expect(actionsHook).toContain('createSettingsCollaboratorInvite({');
    expect(actionsHook).toContain('const collaboratorInviteCopyRequestIdRef = useRef(0);');
    expect(actionsHook).toContain('const guestAccessCopyRequestIdRef = useRef(0);');
    expect(actionsHook).toContain('const identityCopyRequestIdRef = useRef(0);');
    expect(actionsHook).toContain('const identityDownloadRequestIdRef = useRef(0);');
    expect(actionsHook).toContain('revokeSettingsCollaboratorInvite(inviteId)');
    expect(actionsHook).toContain('const isCurrentCollaboratorInviteCopy = () =>');
    expect(actionsHook).toContain('const isCurrentGuestAccessCopy = () =>');
    expect(actionsHook).toContain('const isCurrentIdentityCopy = () =>');
    expect(actionsHook).toContain('const isCurrentIdentityDownload = () =>');
    expect(actionsHook).toContain('const slugSaveRequestIdRef = useRef(0);');
    expect(actionsHook).toContain('const privacySaveRequestIdRef = useRef(0);');
    expect(actionsHook).toContain('const defaultLanguageSaveRequestIdRef = useRef(0);');
    expect(actionsHook).toContain('const translationRequestIdRef = useRef(0);');
    expect(actionsHook).toContain('const musicPlaylistSaveRequestIdRef = useRef(0);');
    expect(actionsHook).toContain('const guestTokenRegenerationRequestIdRef = useRef(0);');
    expect(actionsHook).toContain('const isCurrentSlugSave = () =>');
    expect(actionsHook).toContain('const isCurrentPrivacySave = () =>');
    expect(actionsHook).toContain('const isCurrentDefaultLanguageSave = () =>');
    expect(actionsHook).toContain('const isCurrentTranslation = () =>');
    expect(actionsHook).toContain('const isCurrentMusicPlaylistSave = () =>');
    expect(actionsHook).toContain('const isCurrentGuestTokenRegeneration = () =>');
    expect(actionsHook).toContain('if (!isCurrentSlugSave()) return;');
    expect(actionsHook).toContain('if (!isCurrentPrivacySave()) return;');
    expect(actionsHook).toContain('if (!isCurrentDefaultLanguageSave()) return;');
    expect(actionsHook).toContain('if (!isCurrentTranslation()) return;');
    expect(actionsHook).toContain('if (!isCurrentMusicPlaylistSave()) return;');
    expect(actionsHook).toContain('if (!isCurrentGuestTokenRegeneration()) return;');
    expect(actionsHook).toContain('if (!isCurrentCollaboratorInviteCopy()) return null;');
    expect(actionsHook).toContain('if (!isCurrentGuestAccessCopy()) return;');
    expect(actionsHook).toContain('if (!isCurrentIdentityCopy()) return;');
    expect(actionsHook).toContain('if (!isCurrentIdentityDownload()) return;');
    expect(actionsHook).toContain('guestAccessCopyRequestIdRef.current += 1;');
    expect(actionsHook).toContain('findSettingsSiteBySlug(cleaned)');
    expect(actionsHook).toContain('translateSettingsSiteContent(targetSiteId, language)');
    expect(actionsHook).toContain('generateSettingsSecureToken()');
    expect(actionsHook).toContain('hashSettingsSitePassword(sitePassword)');
    expect(actionsHook).toContain('buildWeddingIdentityManifestText(weddingIdentityExportKit)');
    expect(actionsHook).toContain('renderWeddingIdentityPrintHtml(weddingIdentityPrintAssets)');
    expect(actionsHook).not.toContain("from('wedding_site_collaborator_invites')");
    expect(actionsHook).not.toContain("from('site_translations')");
    expect(actionsHook).not.toMatch(/supabase\s*\n\s*\.from\('wedding_sites'\)/);

    expect(experienceHook).toContain('loadSettingsTemplateChangeSite(weddingSiteId)');
    expect(experienceHook).toContain('const rsvpSettingsSaveRequestIdRef = useRef(0);');
    expect(experienceHook).toContain('const notificationSaveRequestIdRef = useRef(0);');
    expect(experienceHook).toContain('const isCurrentRsvpSettingsSave = () => requestId === rsvpSettingsSaveRequestIdRef.current;');
    expect(experienceHook).toContain('const isCurrentNotificationSave = () => requestId === notificationSaveRequestIdRef.current;');
    expect(experienceHook).toContain('if (!isCurrentRsvpSettingsSave()) return;');
    expect(experienceHook).toContain('if (!isCurrentNotificationSave()) return;');
    expect(experienceHook).toContain('const templateChangeRequestIdRef = useRef(0);');
    expect(experienceHook).toContain('const subscribeRequestIdRef = useRef(0);');
    expect(experienceHook).toContain('const experienceActionContextRef = useRef({ billingSiteId: billingInfo?.wedding_site_id ?? null, weddingSiteId });');
    expect(experienceHook).toContain('const isLatestSubscribeRequest = () => requestId === subscribeRequestIdRef.current;');
    expect(experienceHook).toContain('const isCurrentSubscribe = () =>');
    expect(experienceHook).toContain('const isCurrentTemplateChange = () =>');
    expect(experienceHook).toContain('if (!isCurrentSubscribe()) {');
    expect(experienceHook).toContain('if (isLatestSubscribeRequest()) setSubscribeLoading(false);');
    expect(experienceHook).toContain('if (!isCurrentTemplateChange()) return;');
    expect(experienceHook).toContain('createSubscriptionSession(');
    expect(experienceHook).toContain('notification_prefs: buildNotificationPrefsPatch({');
    expect(experienceHook).toContain('rsvp_custom_questions: cleanedQuestions');
    expect(experienceHook).not.toContain("from('wedding_site_collaborator_invites')");
    expect(experienceHook).not.toContain("from('site_translations')");
    expect(experienceHook).not.toMatch(/supabase\s*\n\s*\.from\('wedding_sites'\)/);

    expect(service).toContain('.select(SETTINGS_SITE_SELECT)');
    expect(service).toContain('.select(SETTINGS_COLLABORATOR_INVITE_SELECT)');
    expect(service).toContain('.select(SETTINGS_TRANSLATION_STATUS_SELECT)');
    expect(service).toContain('.select(SETTINGS_TEMPLATE_CHANGE_SELECT)');
    expect(service).toContain('.limit(MAX_SETTINGS_COLLABORATOR_INVITES);');
    expect(service).toContain('supabase.auth.getUser()');
    expect(service).toContain('supabase.auth.signInWithPassword');
    expect(service).toContain('supabase.auth.updateUser');
    expect(service).not.toContain(".select('*')");
  });

  it('keeps settings function error copy customer-safe', () => {
    expect(safeSettingsFunctionError('translate-site-content provider token failed', 'Couldn’t prepare translation.')).toBe(
      'Couldn’t prepare translation.',
    );
    expect(safeSettingsFunctionError({ error: 'database policy denied' }, 'Couldn’t prepare translation.')).toBe(
      'Couldn’t prepare translation.',
    );
  });

  it('treats a ready translation row as success when the translation invoke returns an error', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('edge timeout') });

    fromMock.mockImplementation((table: string) => {
      if (table === 'site_translations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: [{ language: 'pt', status: 'ready', translated_at: '2026-05-18T03:00:00.000Z' }],
                error: null,
              })),
            })),
          })),
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null })),
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [] })),
            })),
          })),
          in: vi.fn(async () => ({ data: [] })),
        })),
      };
    });

    await expect(translateSettingsSiteContent('site-1', 'pt')).resolves.toBeUndefined();
    expect(invokeMock).toHaveBeenCalledWith('translate-site-content', {
      body: { siteId: 'site-1', language: 'pt' },
    });
  });

  it('surfaces the safe translation error when the translation row never recovers to ready', async () => {
    invokeMock.mockResolvedValue({ data: { error: 'provider timeout' }, error: null });
    fromMock.mockImplementation((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(async () => table === 'site_translations'
            ? { data: [{ language: 'pt', status: 'failed', translated_at: null }], error: null }
            : { data: [], error: null }),
          maybeSingle: vi.fn(async () => ({ data: null })),
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: [] })),
          })),
        })),
      })),
    }));

    await expect(translateSettingsSiteContent('site-1', 'pt')).rejects.toThrow('Couldn’t prepare translation.');
  });

  it('loads the authenticated settings user through the service helper', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1', email: 'owner@example.com' } } });

    await expect(requireSettingsAuthenticatedUser()).resolves.toEqual({
      id: 'user-1',
      email: 'owner@example.com',
    });
  });

  it('verifies the current settings password through the service helper', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });

    await expect(verifySettingsCurrentPassword('owner@example.com', 'oldpass123')).resolves.toBeUndefined();
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'oldpass123',
    });
  });

  it('updates the account password through the service helper', async () => {
    updateUserMock.mockResolvedValue({ error: null });

    await expect(updateSettingsAccountPassword('newpass123')).resolves.toBeUndefined();
    expect(updateUserMock).toHaveBeenCalledWith({ password: 'newpass123' });
  });
});
