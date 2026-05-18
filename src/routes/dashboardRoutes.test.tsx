import React from 'react';
import { MemoryRouter, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardRoutes } from './dashboardRoutes';

function renderWithPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{DashboardRoutes()}</Routes>
    </MemoryRouter>,
  );
}

vi.mock('./ProtectedPageRoute', async () => {
  const { Route } = await import('react-router-dom');
  return {
    ProtectedPageRoute: ({ path, element }: { path: string; element: React.ReactNode }) => (
      <Route path={path} element={element} />
    ),
  };
});

vi.mock('./routePages', () => ({
  BuilderVariantGallery: () => <div>Builder Variant Gallery</div>,
  DashboardAuditLogs: () => <div>Dashboard Activity</div>,
  DashboardCoordinatorMode: () => <div>Dashboard Coordinator</div>,
  DashboardErrorLogs: () => <div>Dashboard Errors</div>,
  DashboardGuests: () => <div>Dashboard Guests</div>,
  DashboardItinerary: () => <div>Dashboard Itinerary</div>,
  DashboardMessages: () => <div>Dashboard Messages</div>,
  DashboardMoreTools: () => <div>Dashboard Tools</div>,
  DashboardOverview: () => <div>Dashboard Overview</div>,
  DashboardPhotos: () => <div>Dashboard Photos</div>,
  DashboardPlanning: () => <div>Dashboard Planning</div>,
  DashboardRegistry: () => <div>Dashboard Registry</div>,
  DashboardRsvpBoard: () => <div>Dashboard RSVP Board</div>,
  DashboardSeating: () => <div>Dashboard Seating</div>,
  DashboardSeatingLookup: () => <div>Dashboard Seating Lookup</div>,
  DashboardSettings: () => <div>Dashboard Settings</div>,
  DashboardVault: () => <div>Dashboard Vault</div>,
  SiteBuilder: () => <div>Dashboard Builder</div>,
}));

describe('DashboardRoutes', () => {
  it('renders the tools route inside the protected dashboard route group', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/tools']}>
        <Routes>{DashboardRoutes()}</Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Tools')).toBeInTheDocument();
  });

  it('renders the activity route inside the protected dashboard route group', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/activity']}>
        <Routes>{DashboardRoutes()}</Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Activity')).toBeInTheDocument();
  });

  it('renders the registry, settings, and messages routes inside the protected dashboard route group', () => {
    const first = renderWithPath('/dashboard/registry');

    expect(screen.getByText('Dashboard Registry')).toBeInTheDocument();
    first.unmount();

    const second = renderWithPath('/dashboard/settings');

    expect(screen.getByText('Dashboard Settings')).toBeInTheDocument();
    second.unmount();

    renderWithPath('/dashboard/messages');

    expect(screen.getByText('Dashboard Messages')).toBeInTheDocument();
  });

  it('renders the overview, guests, and photos routes inside the protected dashboard route group', () => {
    const first = renderWithPath('/dashboard/overview');

    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    first.unmount();

    const second = renderWithPath('/dashboard/guests');

    expect(screen.getByText('Dashboard Guests')).toBeInTheDocument();
    second.unmount();

    renderWithPath('/dashboard/photos');

    expect(screen.getByText('Dashboard Photos')).toBeInTheDocument();
  });

  it('renders the full overview surface at /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard?bypassPayment=1&analyticsLive=1']}>
        <Routes>{DashboardRoutes()}</Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
  });

  it('renders the itinerary, planning, coordinator, and rsvp board routes inside the protected dashboard route group', () => {
    const first = renderWithPath('/dashboard/itinerary');

    expect(screen.getByText('Dashboard Itinerary')).toBeInTheDocument();
    first.unmount();

    const second = renderWithPath('/dashboard/planning');

    expect(screen.getByText('Dashboard Planning')).toBeInTheDocument();
    second.unmount();

    const third = renderWithPath('/dashboard/coordinator');

    expect(screen.getByText('Dashboard Coordinator')).toBeInTheDocument();
    third.unmount();

    renderWithPath('/dashboard/rsvp-board');

    expect(screen.getByText('Dashboard RSVP Board')).toBeInTheDocument();
  });

  it('renders the seating route inside the protected dashboard route group', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/seating']}>
        <Routes>{DashboardRoutes()}</Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Seating')).toBeInTheDocument();
  });

  it('renders the seating lookup route inside the protected dashboard route group', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/seating-lookup']}>
        <Routes>{DashboardRoutes()}</Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Seating Lookup')).toBeInTheDocument();
  });

  it('renders the vault route inside the protected dashboard route group', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/vault']}>
        <Routes>{DashboardRoutes()}</Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Vault')).toBeInTheDocument();
  });

  it('redirects the legacy /builder route into the dashboard builder route', () => {
    render(
      <MemoryRouter initialEntries={['/builder']}>
        <Routes>{DashboardRoutes()}</Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Builder')).toBeInTheDocument();
  });

  it('keeps direct /builder from falling through to unrelated dashboard surfaces', () => {
    render(
      <MemoryRouter initialEntries={['/builder']}>
        <Routes>{DashboardRoutes()}</Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Dashboard Tools')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard Activity')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard Builder')).toBeInTheDocument();
  });
});
