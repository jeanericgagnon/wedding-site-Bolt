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
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/settingsSiteData.ts'), 'utf8');

    expect(page).toContain('loadSettingsCollaboratorInvites(siteId)');
    expect(page).toContain('createSettingsCollaboratorInvite({');
    expect(page).toContain('revokeSettingsCollaboratorInvite(inviteId)');
    expect(page).toContain('<SettingsTeamAccessPanel');
    expect(page).toContain('<SettingsSiteUrlPanel');
    expect(page).toContain('findSettingsSiteBySlug(cleaned)');
    expect(page).toContain('loadSettingsTemplateChangeSite(weddingSiteId)');
    expect(page).toContain('requireSettingsAuthenticatedUser()');
    expect(page).toContain('verifySettingsCurrentPassword(authUser.email || \'\', currentPassword)');
    expect(page).toContain('updateSettingsAccountPassword(newPassword)');
    expect(page).not.toContain("from('wedding_site_collaborator_invites')");
    expect(page).not.toContain("from('site_translations')");
    expect(page).not.toMatch(/supabase\s*\n\s*\.from\('wedding_sites'\)/);
    expect(page).not.toContain('supabase.auth.getUser');
    expect(page).not.toContain('supabase.auth.signInWithPassword');
    expect(page).not.toContain('supabase.auth.updateUser');
    expect(page).not.toContain('Invite your planner, not a generic staff account');
    expect(page).not.toContain('Sent invite links');
    expect(page).not.toContain('Your wedding site address');
    expect(page).not.toContain('Public site QR');

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
