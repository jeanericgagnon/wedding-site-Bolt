import { type ReactNode } from 'react';

export type SettingsTabId = 'account' | 'team' | 'site' | 'rsvp' | 'notifications' | 'billing';

type SettingsTabContentProps = {
  accountContent: ReactNode;
  activeTab: SettingsTabId;
  billingContent: ReactNode;
  notificationsContent: ReactNode;
  rsvpContent: ReactNode;
  siteContent: ReactNode;
  teamContent: ReactNode;
};

export function SettingsTabContent({
  accountContent,
  activeTab,
  billingContent,
  notificationsContent,
  rsvpContent,
  siteContent,
  teamContent,
}: SettingsTabContentProps) {
  switch (activeTab) {
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
