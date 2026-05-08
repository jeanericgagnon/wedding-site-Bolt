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
  updateSettingsAccountPassword,
  verifySettingsCurrentPassword,
} from './settingsSiteData';

const {
  getUserMock,
  signInWithPasswordMock,
  updateUserMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
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
    from: vi.fn(() => ({
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
    })),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('settings site data boundary', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    signInWithPasswordMock.mockReset();
    updateUserMock.mockReset();
  });

  it('keeps privacy-sensitive site settings on explicit projections', () => {
    expect(SETTINGS_SITE_SELECT).toContain('privacy_mode');
    expect(SETTINGS_SITE_SELECT).toContain('hide_from_search');
    expect(SETTINGS_SITE_SELECT).toContain('guest_access_token');
    expect(SETTINGS_SITE_SELECT).not.toContain('*');
    expect(SETTINGS_COLLABORATOR_INVITE_SELECT).toBe('id, invite_email, invite_name, role, status, invited_at, expires_at, invite_token, permissions');
    expect(SETTINGS_TRANSLATION_STATUS_SELECT).toBe('language,status,translated_at');
    expect(SETTINGS_TEMPLATE_CHANGE_SELECT).toBe('wedding_data, layout_config, site_json');
    expect(MAX_SETTINGS_COLLABORATOR_INVITES).toBe(200);
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
    expect(routeSupportHook).toContain('const handleLogout = async () => {');
    expect(routeContent).toContain('export function SettingsDashboardRouteContent(props: Props)');
    expect(routeContent).toContain('<SettingsDashboardShell');
    expect(routeContent).toContain('<SettingsTabContent');
    expect(routeContent).toContain('<SettingsSiteTabContent');
    expect(routeContent).toContain('<SettingsRsvpTabContent');
    expect(page).not.toContain('createSubscriptionSession(');
    expect(page).not.toContain('notification_prefs: { rsvp: notifRsvp');
    expect(page).not.toContain('rsvp_custom_questions: cleanedQuestions');

    expect(tabContent).toContain('switch (activeTab)');
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
    expect(siteTabContent).toContain('onSubmitSiteSlug');
    expect(siteTabContent).toContain('onToggleTemplateSettings');
    expect(rsvpTabContent).toContain('<SettingsRsvpMealPanel');
    expect(rsvpTabContent).toContain('<SettingsRsvpQuestionsPanel');
    expect(rsvpTabContent).toContain('onSaveMealSettings');
    expect(rsvpTabContent).toContain('onToggleAdvancedVisibility');

    expect(snapshotLoader).toContain('loadSettingsSite(activeSite.id)');
    expect(snapshotLoader).toContain('loadSettingsCollaboratorInvites(siteId)');
    expect(snapshotLoader).toContain('loadSettingsTranslationStatuses(');
    expect(snapshotLoader).toContain('resolveActiveSiteForUser(userId)');
    expect(snapshotLoader).not.toContain("from('wedding_sites')");
    expect(viewModel).toContain('getSettingsTabs(settingsRole)');
    expect(viewModel).toContain('buildWeddingIdentityExportKit({');
    expect(viewModel).toContain('buildWeddingIdentityPrintAssets({');
    expect(viewModel).toContain("PLANNER_ROLE_OPTIONS.filter((option) => option.value !== 'owner')");

    expect(accountHook).toContain('export function useSettingsAccountActions({');
    expect(accountHook).toContain('await updateSettingsSite(weddingSiteId, { couple_name_1: name1, couple_name_2: name2 });');
    expect(accountHook).toContain("await verifySettingsCurrentPassword(authUser.email || '', currentPassword);");
    expect(accountHook).toContain('await updateSettingsAccountPassword(newPassword);');
    expect(accountHook).toContain("logSettingsAction('account_password_changed', 'Account password was changed.')");

    expect(supportHook).toContain('export function useSettingsDashboardSupport({');
    expect(supportHook).toContain('setCollaboratorInvites(await loadSettingsCollaboratorInvites(siteId));');
    expect(supportHook).toContain('const activeSite = await resolveActiveSiteForUser(userId);');
    expect(supportHook).toContain('void logAppAction({');
    expect(supportHook).toContain('const rows = await loadSettingsTranslationStatuses(');
    expect(supportHook).toContain('const blob = new Blob([content], { type });');

    expect(uiStateHook).toContain('export function useSettingsDashboardUiState({ userId }: Args)');
    expect(uiStateHook).toContain("const [activeTab, setActiveTab] = useState<SettingsTabId>('account');");
    expect(uiStateHook).toContain("const [siteSlug, setSiteSlug] = useState('');");
    expect(uiStateHook).toContain('const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);');
    expect(uiStateHook).toContain('fetchBillingInfo(userId)');
    expect(uiStateHook).toContain("setBillingError(safeSettingsError(err, 'Couldn’t load billing right now.'))");
    expect(uiStateHook).toContain('const invite = readPlannerInvite(siteSlug || userId || null);');

    expect(hydrationHook).toContain('export function useSettingsDashboardSnapshotHydration({');
    expect(hydrationHook).toContain('loadSettingsDashboardSnapshot({');
    expect(hydrationHook).toContain('setSettingsRole(snapshot.settingsRole);');
    expect(hydrationHook).toContain('if (visibilityDraftGuard.shouldHydrate())');
    expect(hydrationHook).toContain('if (notifDraftGuard.shouldHydrate())');
    expect(hydrationHook).toContain('if (rsvpDraftGuard.shouldHydrate())');
    expect(hydrationHook).toContain("setAccountError(safeSettingsError(err, 'Couldn’t load settings right now.'))");

    expect(actionsHook).toContain('createSettingsCollaboratorInvite({');
    expect(actionsHook).toContain('revokeSettingsCollaboratorInvite(inviteId)');
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
    expect(experienceHook).toContain('createSubscriptionSession(');
    expect(experienceHook).toContain('notification_prefs: { rsvp: notifRsvp');
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
