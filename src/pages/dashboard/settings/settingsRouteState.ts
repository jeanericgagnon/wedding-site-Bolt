import { canManageSettings, type PlannerPermissionKey } from '../../../lib/plannerAccess';
import type { SettingsTabId } from './SettingsNavigation';

type SettingsRouteStateArgs = {
  search: string;
  settingsRole: 'owner' | 'planner' | 'coordinator' | 'viewer';
  settingsPermissions?: PlannerPermissionKey[] | null;
};

export type SettingsRouteState = {
  activeTab: SettingsTabId | null;
  focusTargetId: string | null;
};

const SETTINGS_TAB_IDS: ReadonlySet<SettingsTabId> = new Set([
  'account',
  'team',
  'site',
  'rsvp',
  'notifications',
  'billing',
]);

const OWNER_ONLY_TABS: ReadonlySet<SettingsTabId> = new Set(['team', 'billing']);

export function resolveSettingsRouteState({
  search,
  settingsPermissions,
  settingsRole,
}: SettingsRouteStateArgs): SettingsRouteState {
  const params = new URLSearchParams(search);
  const requestedTab = params.get('tab');
  const canAccessSiteSettings = canManageSettings(settingsRole, settingsPermissions);

  if (!requestedTab) {
    return { activeTab: null, focusTargetId: null };
  }

  if (requestedTab === 'privacy') {
    return canAccessSiteSettings
      ? { activeTab: 'site', focusTargetId: 'settings-privacy' }
      : { activeTab: 'account', focusTargetId: null };
  }

  if (requestedTab === 'data') {
    return canAccessSiteSettings
      ? { activeTab: 'site', focusTargetId: 'settings-identity-exports' }
      : { activeTab: 'account', focusTargetId: null };
  }

  if (requestedTab === 'site-url') {
    return canAccessSiteSettings
      ? { activeTab: 'site', focusTargetId: 'settings-site-url' }
      : { activeTab: 'account', focusTargetId: null };
  }

  if (requestedTab === 'template') {
    return canAccessSiteSettings
      ? { activeTab: 'site', focusTargetId: 'settings-template' }
      : { activeTab: 'account', focusTargetId: null };
  }

  if (!SETTINGS_TAB_IDS.has(requestedTab as SettingsTabId)) {
    return { activeTab: null, focusTargetId: null };
  }

  const normalizedTab = requestedTab as SettingsTabId;
  if (OWNER_ONLY_TABS.has(normalizedTab) && settingsRole !== 'owner') {
    return { activeTab: canAccessSiteSettings ? 'site' : 'account', focusTargetId: null };
  }

  if (
    normalizedTab !== 'account' &&
    !OWNER_ONLY_TABS.has(normalizedTab) &&
    !canAccessSiteSettings
  ) {
    return { activeTab: 'account', focusTargetId: null };
  }

  return { activeTab: normalizedTab, focusTargetId: null };
}
