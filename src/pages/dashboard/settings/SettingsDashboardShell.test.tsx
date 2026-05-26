import React from 'react';
import { render, screen } from '@testing-library/react';
import { Globe, User } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsDashboardShell } from './SettingsDashboardShell';

vi.mock('../../../components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../components/dashboard/DashboardPageHero', () => ({
  DashboardPageHero: ({
    eyebrow,
    title,
    description,
  }: {
    eyebrow: string;
    title: string;
    description: string;
  }) => (
    <section>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  ),
}));

describe('SettingsDashboardShell', () => {
  it('shows a compact current-section header instead of the older workspace explainer block', () => {
    render(
      <SettingsDashboardShell
        activeTab="site"
        defaultLanguage="en"
        onTabChange={vi.fn()}
        rsvpQuestionCount={3}
        settingsRole="owner"
        tabs={[
          { id: 'account', label: 'Account', icon: User },
          { id: 'site', label: 'Site Settings', icon: Globe },
        ]}
      >
        <div>Site content</div>
      </SettingsDashboardShell>,
    );

    expect(screen.getByText('Current section')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Site Settings' })).toBeInTheDocument();
    expect(screen.getByText('Manage privacy, links, translations, and design defaults.')).toBeInTheDocument();
    expect(screen.queryByText('Settings workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Choose the area you want to adjust.')).not.toBeInTheDocument();
  });
});
