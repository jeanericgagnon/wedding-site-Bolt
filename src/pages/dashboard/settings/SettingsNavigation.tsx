import { Bell, ClipboardList, CreditCard, Globe, User, Users, type LucideIcon } from 'lucide-react';
import { canManageSettings, type PlannerAccessRole, type PlannerPermissionKey } from '../../../lib/plannerAccess';

export type SettingsTabId = 'account' | 'team' | 'site' | 'rsvp' | 'notifications' | 'billing';

export type SettingsTab = {
  id: SettingsTabId;
  label: string;
  icon: LucideIcon;
};

export function getSettingsTabs(
  settingsRole: PlannerAccessRole,
  settingsPermissions?: PlannerPermissionKey[] | null,
): SettingsTab[] {
  const canAccessSiteSettings = canManageSettings(settingsRole, settingsPermissions);
  const tabs: SettingsTab[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'team', label: 'Team Access', icon: Users },
    { id: 'site', label: 'Site Settings', icon: Globe },
    { id: 'rsvp', label: 'RSVP', icon: ClipboardList },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];
  return tabs.filter((tab) => {
    if (settingsRole === 'owner') return true;
    if (tab.id === 'team' || tab.id === 'billing') return false;
    if (tab.id === 'account') return true;
    return canAccessSiteSettings;
  });
}

export interface SettingsNavigationProps {
  activeTab: SettingsTabId;
  tabs: SettingsTab[];
  onTabChange: (tab: SettingsTabId) => void;
}

export function SettingsNavigation({ activeTab, tabs, onTabChange }: SettingsNavigationProps) {
  return (
    <nav className="min-w-0" aria-label="Settings navigation">
      <div className="rounded-[20px] border border-border-subtle bg-white p-3 shadow-none">
        <div className="px-2 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Sections</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Open one area at a time so access, billing, and privacy changes stay easy to scan.</p>
        </div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex min-h-[48px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors
                ${activeTab === tab.id
                  ? 'bg-primary/10 text-text-primary font-medium'
                  : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                }
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
