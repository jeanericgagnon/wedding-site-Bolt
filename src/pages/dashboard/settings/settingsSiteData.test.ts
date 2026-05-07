import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_SETTINGS_COLLABORATOR_INVITES,
  SETTINGS_COLLABORATOR_INVITE_SELECT,
  SETTINGS_SITE_SELECT,
  SETTINGS_TEMPLATE_CHANGE_SELECT,
  SETTINGS_TRANSLATION_STATUS_SELECT,
  safeSettingsFunctionError,
} from './settingsSiteData';

describe('settings site data boundary', () => {
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
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/settingsSiteData.ts'), 'utf8');

    expect(page).toContain('loadSettingsCollaboratorInvites(siteId)');
    expect(page).toContain('createSettingsCollaboratorInvite({');
    expect(page).toContain('revokeSettingsCollaboratorInvite(inviteId)');
    expect(page).toContain('findSettingsSiteBySlug(cleaned)');
    expect(page).toContain('loadSettingsTemplateChangeSite(weddingSiteId)');
    expect(page).not.toContain("from('wedding_site_collaborator_invites')");
    expect(page).not.toContain("from('site_translations')");
    expect(page).not.toMatch(/supabase\s*\n\s*\.from\('wedding_sites'\)/);

    expect(service).toContain('.select(SETTINGS_SITE_SELECT)');
    expect(service).toContain('.select(SETTINGS_COLLABORATOR_INVITE_SELECT)');
    expect(service).toContain('.select(SETTINGS_TRANSLATION_STATUS_SELECT)');
    expect(service).toContain('.select(SETTINGS_TEMPLATE_CHANGE_SELECT)');
    expect(service).toContain('.limit(MAX_SETTINGS_COLLABORATOR_INVITES);');
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
});
