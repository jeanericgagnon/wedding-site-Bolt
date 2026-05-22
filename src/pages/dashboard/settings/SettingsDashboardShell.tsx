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
      <div className="space-y-6">
        <DashboardPageHero
          eyebrow="Settings"
          title="Access, privacy, and account details."
          description="Manage access, privacy, billing, notifications, and account details."
          stats={[
            { label: 'Language', value: getSiteLanguageLabel(defaultLanguage), detail: 'public site default' },
            { label: 'Access', value: tabs.some((tab) => tab.id === 'team') ? 'Team ready' : 'Owner only', detail: settingsRole === 'owner' ? 'invite links available' : 'limited by role' },
            { label: 'RSVP', value: rsvpQuestionCount, detail: 'custom questions' },
          ]}
        />

        <section className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Settings workspace</p>
              <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">Choose the area you want to adjust.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Account, team, privacy, billing, and notifications in one focused place.</p>
            </div>
            <div className="inline-flex flex-wrap gap-2 text-xs text-text-tertiary">
              <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Team and roles</span>
              <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Privacy and defaults</span>
              <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Billing when needed</span>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <SettingsNavigation activeTab={activeTab} tabs={tabs} onTabChange={onTabChange} />
          <div className="flex-1 space-y-6">{children}</div>
        </div>
      </div>
    </DashboardLayout>
  );
}
