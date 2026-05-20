import { beforeEach, describe, expect, it } from 'vitest';
import {
  DASHBOARD_TOOL_GROUPS,
  DEFAULT_DASHBOARD_TOOLS,
  PINNABLE_NAV_TOOL_IDS,
  buildDashboardToolPinsStorageKey,
  getAllDashboardTools,
  readStoredToolPins,
  writeStoredToolPins,
} from './dashboardToolLibrary';

describe('dashboardToolLibrary', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the default dashboard navigation calm and exact', () => {
    expect(DEFAULT_DASHBOARD_TOOLS.map((tool) => tool.name)).toEqual([
      'Home',
      'Website',
      'Guests',
      'Registry',
      'Messages',
      'Memories',
      'More Tools',
    ]);
  });

  it('contains the complete More Tools groups and optional sidebar tools', () => {
    expect(DASHBOARD_TOOL_GROUPS.map((group) => group.title)).toEqual([
      'Planning',
      'Wedding Day',
      'Guest Experience',
      'Memories',
      'Advanced',
    ]);
    expect(PINNABLE_NAV_TOOL_IDS).toEqual([
      'wedding-day',
      'planning',
      'seating',
      'vendors',
      'name-change',
      'activity',
      'settings',
    ]);
    expect(getAllDashboardTools().map((tool) => tool.id)).toEqual(expect.arrayContaining([
      'address-collection',
      'qr-codes',
      'coordinator',
      'seating-lookup',
      'song-requests',
      'guest-questions',
      'guestbook-prompts',
      'vaults',
      'photo-recap',
      'video-uploads',
      'anniversary-capsules',
      'collaborators',
      'import-export',
      'privacy-access',
      'advanced-design',
      'data-settings',
    ]));
  });

  it('builds scoped dashboard pin storage keys per wedding site', () => {
    expect(buildDashboardToolPinsStorageKey('dayof.dashboard.navPins.v1')).toBe('dayof.dashboard.navPins.v1');
    expect(buildDashboardToolPinsStorageKey('dayof.dashboard.navPins.v1', 'site-a')).toBe('dayof.dashboard.navPins.v1::site-a');
  });

  it('migrates legacy tool pins into the active site scope when needed', () => {
    localStorage.setItem('dayof.dashboard.navPins.v1', JSON.stringify(['planning', 'settings']));

    expect(readStoredToolPins('dayof.dashboard.navPins.v1', 'site-a')).toEqual(['planning', 'settings']);
    expect(localStorage.getItem('dayof.dashboard.navPins.v1::site-a')).toBe(JSON.stringify(['planning', 'settings']));
    expect(localStorage.getItem('dayof.dashboard.navPins.v1')).toBeNull();

    writeStoredToolPins('dayof.dashboard.navPins.v1', ['guests'], 'site-b');
    expect(readStoredToolPins('dayof.dashboard.navPins.v1', 'site-b')).toEqual(['guests']);
  });

  it('does not copy consumed legacy tool pins into a second wedding scope', () => {
    localStorage.setItem('dayof.dashboard.navPins.v1', JSON.stringify(['planning']));

    expect(readStoredToolPins('dayof.dashboard.navPins.v1', 'site-a')).toEqual(['planning']);
    expect(readStoredToolPins('dayof.dashboard.navPins.v1', 'site-b')).toEqual([]);
    expect(localStorage.getItem('dayof.dashboard.navPins.v1::site-b')).toBeNull();
  });
});
