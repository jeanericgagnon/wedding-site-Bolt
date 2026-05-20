import { type ReactNode } from 'react';
import type { SettingsTab } from './SettingsNavigation';

export type SettingsTabId = 'account' | 'team' | 'site' | 'rsvp' | 'notifications' | 'billing';

type SettingsTabContentProps = {
  accountContent: ReactNode;
  activeTab: SettingsTabId;
  billingContent: ReactNode;
  notificationsContent: ReactNode;
  rsvpContent: ReactNode;
  siteContent: ReactNode;
  tabs: SettingsTab[];
  teamContent: ReactNode;
};

export function SettingsTabContent({
  accountContent,
  activeTab,
  billingContent,
  notificationsContent,
  rsvpContent,
  siteContent,
  tabs,
  teamContent,
}: SettingsTabContentProps) {
  const effectiveTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0]?.id;

  switch (effectiveTab) {
    case 'account':
      return <>{accountContent}</>;
    case 'team':
      return <>{teamContent}</>;
    case 'site':
      return <>{siteContent}</>;
    case 'rsvp':
      return <>{rsvpContent}</>;
    case 'notifications':
      return <>{notificationsContent}</>;
    case 'billing':
      return <>{billingContent}</>;
    default:
      return null;
  }
}
