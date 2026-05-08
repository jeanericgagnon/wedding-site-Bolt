import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const settingsSource = () => readFileSync(join(process.cwd(), 'src/pages/dashboard/Settings.tsx'), 'utf8');
const settingsSiteAccessActionsSource = () => readFileSync(
  join(process.cwd(), 'src/pages/dashboard/settings/useSettingsSiteAccessActions.ts'),
  'utf8',
);
const customerSafeErrorSource = () => readFileSync(join(process.cwd(), 'src/lib/customerSafeError.ts'), 'utf8');
const settingsSiteDataSource = () => readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/settingsSiteData.ts'), 'utf8');

describe('settings error safety', () => {
  it('does not render raw billing or planner invite exception messages directly', () => {
    const source = settingsSource();
    const actionsSource = settingsSiteAccessActionsSource();

    expect(source).toContain("setBillingError(safeSettingsError(err, 'Couldn’t load billing right now.'))");
    expect(actionsSource).toContain("setPlannerInviteError(safeSettingsError(err, 'Couldn’t save planner invite.'))");
    expect(actionsSource).toContain("setPlannerInviteError(safeSettingsError(err, 'Couldn’t remove planner invite.'))");
    expect(source).not.toContain('.catch(err => setBillingError(err.message))');
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
    expect(pageSource).toContain('loadSettingsSite(activeSite.id)');
    expect(source).toContain('function updateSettingsSite');
    expect(source).toContain("supabase.rpc('hash_site_password'");
    expect(source).toContain("supabase.rpc('generate_secure_token'");
    expect(source).toContain("supabase.functions.invoke('translate-site-content'");
    expect(actionsSource).toContain('hashSettingsSitePassword(sitePassword)');
    expect(actionsSource).toContain('generateSettingsSecureToken()');
    expect(actionsSource).toContain('translateSettingsSiteContent(targetSiteId, language)');
    expect(pageSource).toContain('updateSettingsSite(targetSiteId');
    expect(pageSource).toContain('rsvp_custom_questions: cleaned');
    expect(pageSource).toContain('notification_prefs: { rsvp: notifRsvp');
  });
});
