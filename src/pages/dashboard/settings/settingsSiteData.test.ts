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
    const actionsHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsSiteAccessActions.ts'),
      'utf8',
    );
    const experienceHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsExperienceActions.ts'),
      'utf8',
    );
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/settingsSiteData.ts'), 'utf8');

    expect(page).toContain('loadSettingsDashboardSnapshot({');
    expect(page).toContain('loadSettingsCollaboratorInvites(siteId)');
    expect(page).toContain('useSettingsSiteAccessActions({');
    expect(page).toContain('useSettingsExperienceActions({');
    expect(page).toContain('<SettingsDashboardShell');
    expect(page).toContain('<SettingsTabContent');
    expect(page).toContain('<SettingsSiteTabContent');
    expect(page).toContain('<SettingsRsvpTabContent');
    expect(page).toContain('buildSettingsDashboardViewModel({');
    expect(page).toContain('requireSettingsAuthenticatedUser()');
    expect(page).toContain('verifySettingsCurrentPassword(authUser.email || \'\', currentPassword)');
    expect(page).toContain('updateSettingsAccountPassword(newPassword)');
    expect(page).not.toContain('<DashboardLayout');
    expect(page).not.toContain('<DashboardPageHero');
    expect(page).not.toContain('<SettingsNavigation');
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
