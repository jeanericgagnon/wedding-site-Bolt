export type SettingsTab = 'account' | 'team' | 'site' | 'rsvp' | 'notifications' | 'billing';

const SETTINGS_TABS: SettingsTab[] = ['account', 'team', 'site', 'rsvp', 'notifications', 'billing'];

export function resolveSettingsTabFromSearch(search: string): SettingsTab {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  return SETTINGS_TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : 'account';
}
