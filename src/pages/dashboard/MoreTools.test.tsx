import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardMoreTools from './MoreTools';
import {
  DASHBOARD_NAV_PIN_STORAGE_KEY,
  buildDashboardToolPinsStorageKey,
} from './dashboardToolLibrary';

vi.mock('../../components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/dashboard/DashboardPageHero', () => ({
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

vi.mock('../../lib/activeSiteStorage', () => ({
  ACTIVE_SITE_STORAGE_CHANGED_EVENT: 'dayof:active-site-storage-changed',
  getStoredActiveSiteId: () => 'site-1',
}));

describe('DashboardMoreTools', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses pin and unpin language instead of the old show and tuck wording', () => {
    window.localStorage.setItem(
      buildDashboardToolPinsStorageKey(DASHBOARD_NAV_PIN_STORAGE_KEY, 'site-1'),
      JSON.stringify(['planning']),
    );

    render(
      <MemoryRouter>
        <DashboardMoreTools />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Pin to sidebar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unpin from sidebar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Available in More tools').length).toBeGreaterThan(0);
    expect(screen.queryByText('Show in sidebar')).not.toBeInTheDocument();
    expect(screen.queryByText('Keep tucked away')).not.toBeInTheDocument();
    expect(screen.queryByText('Stays in More Tools')).not.toBeInTheDocument();
  });
});
