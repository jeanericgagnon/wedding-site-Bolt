import { describe, expect, it } from 'vitest';
import { resolveSettingsRouteState } from './settingsRouteState';

describe('resolveSettingsRouteState', () => {
  it('returns no-op state when no tab is requested', () => {
    expect(resolveSettingsRouteState({ search: '', settingsRole: 'owner' })).toEqual({
      activeTab: null,
      focusTargetId: null,
    });
  });

  it('maps privacy aliases into the site tab and focus target', () => {
    expect(resolveSettingsRouteState({ search: '?tab=privacy', settingsRole: 'owner' })).toEqual({
      activeTab: 'site',
      focusTargetId: 'settings-privacy',
    });
  });

  it('maps data aliases into the site tab and export target', () => {
    expect(resolveSettingsRouteState({ search: '?tab=data', settingsRole: 'owner' })).toEqual({
      activeTab: 'site',
      focusTargetId: 'settings-identity-exports',
    });
  });

  it('keeps owner-only tabs off limits for non-owners', () => {
    expect(resolveSettingsRouteState({ search: '?tab=team', settingsRole: 'planner' })).toEqual({
      activeTab: 'site',
      focusTargetId: null,
    });
  });

  it('passes through valid primary tabs', () => {
    expect(resolveSettingsRouteState({ search: '?tab=notifications', settingsRole: 'owner' })).toEqual({
      activeTab: 'notifications',
      focusTargetId: null,
    });
  });

  it('keeps site settings tabs off limits without settings permission', () => {
    expect(resolveSettingsRouteState({ search: '?tab=privacy', settingsRole: 'coordinator', settingsPermissions: ['guests'] })).toEqual({
      activeTab: 'account',
      focusTargetId: null,
    });
    expect(resolveSettingsRouteState({ search: '?tab=notifications', settingsRole: 'planner', settingsPermissions: ['guests'] })).toEqual({
      activeTab: 'account',
      focusTargetId: null,
    });
  });
});
