import { type ReactNode } from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../../components/dashboard/DashboardPageHero';
import { getSiteLanguageLabel } from './settingsDashboardUtils';
import { SettingsNavigation, type SettingsTab, type SettingsTabId } from './SettingsNavigation';
import type { PlannerAccessRole } from '../../../lib/plannerAccess';
import type { SiteLanguageCode } from './settingsDashboardTypes';

const SETTINGS_TAB_SUMMARIES: Record<SettingsTabId, string> = {
  account: 'Update couple details and sign-in settings.',
  team: 'Invite planners and control collaborator access.',
  site: 'Manage privacy, links, translations, and design defaults.',
  rsvp: 'Adjust guest questions, meals, and music prompts.',
  notifications: 'Choose the owner updates that are worth the inbox space.',
  billing: 'Review plan, checkout, and subscription details.',
};

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
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const currentTabSummary = currentTab ? SETTINGS_TAB_SUMMARIES[currentTab.id] : '';

  return (
    <DashboardLayout currentPage="settings">
      <div className="space-y-6">
        <DashboardPageHero
          eyebrow="Settings"
          title="Settings"
          description="Account, site controls, RSVP, notifications, and billing in one place."
          stats={[
            { label: 'Language', value: getSiteLanguageLabel(defaultLanguage), detail: 'public site default' },
            { label: 'Access', value: tabs.some((tab) => tab.id === 'team') ? 'Team ready' : 'Owner only', detail: settingsRole === 'owner' ? 'invite links available' : 'limited by role' },
            { label: 'RSVP', value: rsvpQuestionCount, detail: 'custom questions' },
          ]}
        />

        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <SettingsNavigation activeTab={activeTab} tabs={tabs} onTabChange={onTabChange} />
          <div className="flex-1 space-y-6">
            {currentTab && (
              <section className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Current section</p>
                <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">{currentTab.label}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{currentTabSummary}</p>
              </section>
            )}
            {children}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
