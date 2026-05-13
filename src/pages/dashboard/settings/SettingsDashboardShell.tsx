import { type ReactNode } from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../../components/dashboard/DashboardPageHero';
import { getSiteLanguageLabel } from './settingsDashboardUtils';
import { SettingsNavigation, type SettingsTab, type SettingsTabId } from './SettingsNavigation';
import type { PlannerAccessRole } from '../../../lib/plannerAccess';
import type { SiteLanguageCode } from './settingsDashboardTypes';

interface SettingsDashboardShellProps {
  activeTab: SettingsTabId;
  children: ReactNode;
  defaultLanguage: SiteLanguageCode;
  onTabChange: (tab: SettingsTabId) => void;
  rsvpQuestionCount: number;
  settingsRole: PlannerAccessRole;
  tabs: SettingsTab[];
}

export function SettingsDashboardShell({
  activeTab,
  children,
  defaultLanguage,
  onTabChange,
  rsvpQuestionCount,
  settingsRole,
  tabs,
}: SettingsDashboardShellProps) {
  return (
    <DashboardLayout currentPage="settings">
      <div className="max-w-5xl mx-auto space-y-8">
        <DashboardPageHero
          eyebrow="Settings"
          title="The quiet controls behind your wedding site."
          description="Update access, language, RSVP behavior, notifications, and billing when you need to. The everyday planning tools stay out front."
          stats={[
            { label: 'Language', value: getSiteLanguageLabel(defaultLanguage), detail: 'public site default' },
            { label: 'Access', value: tabs.some((tab) => tab.id === 'team') ? 'Team ready' : 'Owner only', detail: settingsRole === 'owner' ? 'invite links available' : 'limited by role' },
            { label: 'RSVP', value: rsvpQuestionCount, detail: 'custom questions' },
          ]}
        />

        <div className="flex flex-col gap-8 md:flex-row">
          <SettingsNavigation activeTab={activeTab} tabs={tabs} onTabChange={onTabChange} />
          <div className="flex-1 space-y-6">{children}</div>
        </div>
      </div>
    </DashboardLayout>
  );
}
