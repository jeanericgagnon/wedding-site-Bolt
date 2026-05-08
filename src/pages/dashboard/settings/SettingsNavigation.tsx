import React from 'react';
import { Bell, ClipboardList, CreditCard, Globe, User, Users, type LucideIcon } from 'lucide-react';
import type { PlannerAccessRole } from '../../../lib/plannerAccess';

export type SettingsTabId = 'account' | 'team' | 'site' | 'rsvp' | 'notifications' | 'billing';

export type SettingsTab = {
  id: SettingsTabId;
  label: string;
  icon: LucideIcon;
};

export function getSettingsTabs(settingsRole: PlannerAccessRole): SettingsTab[] {
  const tabs: SettingsTab[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'team', label: 'Team Access', icon: Users },
    { id: 'site', label: 'Site Settings', icon: Globe },
    { id: 'rsvp', label: 'RSVP', icon: ClipboardList },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];
  return tabs.filter((tab) => settingsRole === 'owner' || (tab.id !== 'team' && tab.id !== 'billing'));
}

export interface SettingsNavigationProps {
  activeTab: SettingsTabId;
  tabs: SettingsTab[];
  onTabChange: (tab: SettingsTabId) => void;
}

export function SettingsNavigation({ activeTab, tabs, onTabChange }: SettingsNavigationProps) {
  return (
    <nav className="md:w-56 flex-shrink-0" aria-label="Settings navigation">
      <div className="rounded-lg border border-border-subtle bg-white/80 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
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
